"""Exposure + Adaptive Capacity overlays (methodology §10.4).

    Risk_final = 0.60·H_adj + 0.20·Financial_Exposure_norm
               + 0.10·Population_Exposure_norm − 0.10·AdaptCap_norm

All three overlays live outside the CMIP6 download matrix. They are loaded
from auxiliary Earth Engine exports (CHIRPS, WorldPop, GHSL, MODIS NDVI,
census) and exposed here as small DataFrame-backed interfaces so the
hazard engine stays decoupled from the data source.

The loader tries, in order:
    1. A local file under ``PRANA_AUX_DIR`` if set (dev / demo mode).
    2. An S3 object under the configured bucket.
"""
from __future__ import annotations

import logging
import os
from dataclasses import dataclass
from pathlib import Path
from typing import Optional

import numpy as np
import pandas as pd

from prana_climate.config import S3_BUCKET

log = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────────────────
# Data sources — swappable via env vars
# ─────────────────────────────────────────────────────────────────────────────
@dataclass(frozen=True)
class ExposureSources:
    worldpop_s3_key: str = os.getenv(
        "PRANA_WORLDPOP_KEY",
        "aux/worldpop/worldpop_100m.parquet",
    )
    built_up_s3_key: str = os.getenv(
        "PRANA_BUILTUP_KEY",
        "aux/ghsl/built_up.parquet",
    )
    ndvi_s3_key: str = os.getenv(
        "PRANA_NDVI_KEY",
        "aux/modis/ndvi_static.parquet",
    )
    census_s3_key: str = os.getenv(
        "PRANA_CENSUS_KEY",
        "aux/census/income_quintile.parquet",
    )


# ─────────────────────────────────────────────────────────────────────────────
# Loaders — return DataFrames indexed by h3_cell
# ─────────────────────────────────────────────────────────────────────────────

def _try_load_parquet(s3_key: str, bucket: str = S3_BUCKET) -> Optional[pd.DataFrame]:
    """Load a parquet file, returning None if neither local nor S3 works.

    Resolution order:
        1. ``<PRANA_AUX_DIR>/<s3_key>`` (env override for offline dev).
        2. ``s3://<bucket>/<s3_key>`` — downloaded to a temp file (closed before
           reading so Windows doesn't hold an exclusive lock).

    Returns a pandas DataFrame indexed by ``h3_cell`` if found, otherwise None.
    """
    aux_dir = os.getenv("PRANA_AUX_DIR")
    if aux_dir:
        local_path = Path(aux_dir) / s3_key
        if local_path.exists():
            df = pd.read_parquet(local_path)
            log.info("Loaded %d rows from local %s", len(df), local_path)
            return df
    try:
        import boto3
        import tempfile
        s3 = boto3.client("s3")
        # mkstemp returns (fd, path) — explicitly close the fd so Windows
        # releases the file lock before pyarrow opens the file.
        tmp_fd, tmp_path = tempfile.mkstemp(suffix=".parquet")
        os.close(tmp_fd)
        try:
            s3.download_file(bucket, s3_key, tmp_path)
            df = pd.read_parquet(tmp_path)
        finally:
            try:
                Path(tmp_path).unlink(missing_ok=True)
            except Exception:
                pass
        log.info("Loaded %d rows from s3://%s/%s", len(df), bucket, s3_key)
        return df
    except Exception as exc:
        log.warning("Aux parquet %s unavailable locally or on S3: %s", s3_key, exc)
        return None


def load_worldpop(sources: ExposureSources = ExposureSources()) -> pd.DataFrame:
    """WorldPop 100 m population density (summed into each H3 cell)."""
    df = _try_load_parquet(sources.worldpop_s3_key)
    if df is None:
        # Sensible default: empty index → 0 population everywhere.
        return pd.DataFrame(columns=["h3_cell", "population"]).set_index("h3_cell")
    return df.set_index("h3_cell")[["population"]]


def load_built_up(sources: ExposureSources = ExposureSources()) -> pd.DataFrame:
    """GHSL built-up surface per H3 cell — used as financial-exposure proxy."""
    df = _try_load_parquet(sources.built_up_s3_key)
    if df is None:
        return pd.DataFrame(columns=["h3_cell", "built_up_m2"]).set_index("h3_cell")
    return df.set_index("h3_cell")[["built_up_m2"]]


def load_ndvi_static(sources: ExposureSources = ExposureSources()) -> pd.DataFrame:
    """Static NDVI mean + slope (greening/browning trend)."""
    df = _try_load_parquet(sources.ndvi_s3_key)
    if df is None:
        return pd.DataFrame(columns=["h3_cell", "ndvi", "ndvi_slope"]).set_index("h3_cell")
    return df.set_index("h3_cell")[["ndvi", "ndvi_slope"]]


def load_census_income(sources: ExposureSources = ExposureSources()) -> pd.DataFrame:
    """Census income quintile rank (0–1) per H3 cell."""
    df = _try_load_parquet(sources.census_s3_key)
    if df is None:
        return pd.DataFrame(columns=["h3_cell", "income_quintile"]).set_index("h3_cell")
    return df.set_index("h3_cell")[["income_quintile"]]


# ─────────────────────────────────────────────────────────────────────────────
# Normalisation + final overlays
# ─────────────────────────────────────────────────────────────────────────────

def _normalise(series: pd.Series) -> pd.Series:
    s = series.astype(float)
    lo, hi = np.nanmin(s), np.nanmax(s)
    if not np.isfinite(lo) or not np.isfinite(hi) or hi == lo:
        return pd.Series(np.zeros_like(s, dtype=float), index=s.index)
    return (s - lo) / (hi - lo) * 100.0


def financial_exposure_norm(
    built_up: pd.DataFrame,
    asset_value: float = 1.0,
    national_avg: float = 0.5,
) -> pd.Series:
    """Normalised financial exposure per H3 cell.

    ``asset_value_at_location / national_avg_asset_value`` × 100 per
    methodology §10.4. The default ``asset_value`` and ``national_avg``
    are placeholders until the asset registry is wired in.
    """
    if built_up.empty:
        return pd.Series(dtype=float, name="financial_exposure")
    raw = built_up["built_up_m2"] * asset_value / national_avg
    return _normalise(raw).rename("financial_exposure")


def population_exposure_norm(worldpop: pd.DataFrame) -> pd.Series:
    if worldpop.empty:
        return pd.Series(dtype=float, name="population_exposure")
    return _normalise(worldpop["population"]).rename("population_exposure")


def adaptive_capacity_norm(ndvi: pd.DataFrame, census: pd.DataFrame) -> pd.Series:
    """Composite adaptive-capacity layer — NDVI + census income quintile.

    The methodology says NDVI + census income quintile (normalised to [0, 1]).
    Higher values mean *better* adaptive capacity, so this layer is
    SUBTRACTED in the final formula (more capacity → less risk).
    """
    if ndvi.empty or census.empty:
        return pd.Series(dtype=float, name="adaptive_capacity")
    aligned = ndvi.join(census, how="outer").fillna(0.5)
    raw = 0.5 * aligned["ndvi"] + 0.5 * aligned["income_quintile"]
    return _normalise(raw).rename("adaptive_capacity")
