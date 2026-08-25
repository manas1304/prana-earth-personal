"""Hazard score engine — methodology §10 (normalisation → composite → convex → final risk).

    1. Each indicator → [0, 100] (per-indicator min-max against the
       1985–2014 baseline; see ``_normalise``).
    2. Weighted composite  → Hazard_score = Σ wᵢ · I_norm_i
    3. Convex adjustment   → H_adj = 100 · (H_raw / 100) ^ 0.85
    4. Final risk           → 0.60·H_adj + 0.20·Financial + 0.10·Population
                              − 0.10·Adaptive_Capacity

Public surface:
    HazardEngine.assess(h3_cell, scenario, horizon, asset_type) → dict
    HazardEngine.assess_location(lat, lon, scenario, horizon, asset_type) → dict
"""
from __future__ import annotations

import json
import logging
import math
import os
import shutil
import tempfile
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Tuple

import numpy as np
import pandas as pd

from prana_climate.config import HORIZONS, S3_BUCKET, SCENARIOS
from prana_climate.exposure import (
    ExposureSources,
    adaptive_capacity_norm,
    financial_exposure_norm,
    load_built_up,
    load_census_income,
    load_ndvi_static,
    load_worldpop,
    population_exposure_norm,
)
from prana_climate.h3_index import cell_for
from prana_climate.indicators import HAZARDS, INDICATOR_REGISTRY, INDICATOR_WEIGHTS

log = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────────────────
# Result schema
# ─────────────────────────────────────────────────────────────────────────────

@dataclass
class HazardResult:
    location: Dict[str, float]            # lat, lng, h3_cell, h3_resolution
    scenario: str
    horizon: int
    asset_type: Optional[str]
    hazard_scores: Dict[str, float]       # 6 hazards, 0–100
    composite_risk: float                 # 0–100
    exposure: Dict[str, float]
    adaptive_capacity: float
    contributing_indicators: Dict[str, Dict[str, float]]   # hazard → {indicator: value}
    notes: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "location": self.location,
            "scenario": self.scenario,
            "horizon": self.horizon,
            "asset_type": self.asset_type,
            "hazard_scores": self.hazard_scores,
            "composite_risk": round(self.composite_risk, 2),
            "exposure": self.exposure,
            "adaptive_capacity": round(self.adaptive_capacity, 2),
            "contributing_indicators": self.contributing_indicators,
            "notes": self.notes,
        }


# ─────────────────────────────────────────────────────────────────────────────
# Engine
# ─────────────────────────────────────────────────────────────────────────────

# Per-hazard convex adjustment exponent from methodology §10.3.
NON_LINEAR_EXPONENT = 0.85

# Final-formula weights from methodology §10.4.
WEIGHTS = {"hazard": 0.60, "financial": 0.20, "population": 0.10, "adaptive": 0.10}


def _convex(raw: float) -> float:
    """Methodology §10.3 — H_adj = 100 · (H_raw / 100) ^ 0.85.

    Module-level helper so the test suite can verify the formula directly.
    """
    return 100.0 * math.pow(max(raw, 0.0) / 100.0, NON_LINEAR_EXPONENT)


class HazardEngine:
    """Read processed CMIP6 Parquet from S3, compute the 6 hazards per
    H3 cell, apply exposure overlays, and return a JSON-serialisable
    result dict."""

    def __init__(
        self,
        *,
        bucket: str = S3_BUCKET,
        h3_resolution: int = 6,
        indicators_df: Optional[pd.DataFrame] = None,
        exposure_sources: Optional[ExposureSources] = None,
        asset_value_factor: float = 1.0,
        use_cache: bool = True,
    ) -> None:
        self.bucket = bucket
        self.res = h3_resolution
        self.asset_value_factor = asset_value_factor
        self.use_cache = use_cache

        # Optional injected dependencies — useful for tests.
        self._indicators_df = indicators_df
        self._exposure_sources = exposure_sources or ExposureSources()

        # Lazy-loaded on first assess() call.
        self._financial_exp: Optional[pd.Series] = None
        self._population_exp: Optional[pd.Series] = None
        self._adapt_cap: Optional[pd.Series] = None

    # ── public API ──────────────────────────────────────────────────────────

    def assess(
        self,
        h3_cell: str,
        *,
        scenario: str = "ssp245",
        horizon: int = 2050,
        asset_type: Optional[str] = None,
    ) -> HazardResult:
        if scenario not in SCENARIOS:
            raise ValueError(f"scenario must be one of {SCENARIOS}, got {scenario!r}")
        if horizon not in HORIZONS:
            raise ValueError(f"horizon must be one of {HORIZONS}, got {horizon!r}")

        indicators = self._load_indicators(scenario, horizon)
        # If the user's cell isn't in the data, fill missing with nearest
        # available cell so ANY cell lookup returns a real value.
        if (indicators is not None
                and not indicators.empty
                and getattr(indicators.index, "name", None) == "h3_cell"
                and h3_cell not in indicators.index):
            indicators = self._nearest_neighbor_fill(indicators, [h3_cell])
            print(f"DEBUG assess: after fill shape={indicators.shape}, has_8660145b7f={'8660145b7ffffff' in indicators.index}", flush=True)
            if h3_cell in indicators.index:
                print(f"DEBUG assess: cell row = {indicators.loc[h3_cell].to_dict()}", flush=True)
        if isinstance(indicators.index, pd.MultiIndex) and "h3_cell" in indicators.index.names:
            try:
                cell_indicators = indicators.xs(h3_cell, level="h3_cell")
            except KeyError:
                cell_indicators = indicators.iloc[:0]
        elif indicators.index.name == "h3_cell" and h3_cell in indicators.index:
            cell_indicators = indicators.loc[h3_cell]
        else:
            cell_indicators = indicators
        if (isinstance(cell_indicators, (pd.DataFrame, pd.Series)) and len(cell_indicators) == 0) or (
            hasattr(cell_indicators, "empty") and cell_indicators.empty
        ):
            log.warning("No indicator data for %s / %s / %d", h3_cell, scenario, horizon)

        hazard_scores, contributing = self._aggregate_hazards(cell_indicators)
        h_adj = {h: _convex(s) for h, s in hazard_scores.items()}

        fe = self._financial_exposure().reindex([h3_cell]).fillna(0.0).iloc[0]
        pe = self._population_exposure().reindex([h3_cell]).fillna(0.0).iloc[0]
        ac = self._adaptive_capacity().reindex([h3_cell]).fillna(50.0).iloc[0]

        composite = (
            WEIGHTS["hazard"]     * np.mean(list(h_adj.values()))
            + WEIGHTS["financial"]* float(fe)
            + WEIGHTS["population"]* float(pe)
            - WEIGHTS["adaptive"] * float(ac)
        )
        composite = float(np.clip(composite, 0.0, 100.0))

        # Apply asset-type sensitivity multiplier if provided.
        if asset_type:
            mult = _asset_multiplier(asset_type)
            composite = float(np.clip(composite * mult, 0.0, 100.0))

        return HazardResult(
            location={"h3_cell": h3_cell, "h3_resolution": self.res},
            scenario=scenario,
            horizon=horizon,
            asset_type=asset_type,
            hazard_scores={h: round(v, 2) for h, v in hazard_scores.items()},
            composite_risk=round(composite, 2),
            exposure={"financial": round(float(fe), 2), "population": round(float(pe), 2)},
            adaptive_capacity=round(float(ac), 2),
            contributing_indicators=contributing,
            notes=_notes(asset_type),
        )

    def assess_location(
        self,
        lat: float,
        lon: float,
        *,
        scenario: str = "ssp245",
        horizon: int = 2050,
        asset_type: Optional[str] = None,
    ) -> HazardResult:
        cell = cell_for(lat, lon, self.res)
        return self.assess(
            cell,
            scenario=scenario,
            horizon=horizon,
            asset_type=asset_type,
        )

    # ── data loading ────────────────────────────────────────────────────────

    def _load_indicators(self, scenario: str, horizon: int) -> pd.DataFrame:
        """Read precomputed indicators from S3 — or fall back to the
        injected DataFrame for tests / first-launch demos.

        Path 1 (preferred): a single Zarr file at
            s3://<bucket>/derived/indicators/{scenario}/{horizon}.zarr
        with dims (h3_cell, indicator) and a single data array.

        Path 2 (legacy): a Parquet file at
            s3://<bucket>/derived/indicators/{scenario}/{horizon}/all.parquet
        """
        if self._indicators_df is not None:
            df = self._indicators_df.copy()
        else:
            zarr_key = f"derived/indicators/{scenario}/{horizon}.zarr"
            df = self._s3_read_zarr_indicators(zarr_key)
            print(f"DEBUG _load_indicators {scenario}/{horizon}: zarr result shape={df.shape if df is not None else None}", flush=True)
            if df is None:
                parquet_key = f"derived/indicators/{scenario}/{horizon}/all.parquet"
                df = self._s3_read_parquet(parquet_key)
                print(f"DEBUG _load_indicators {scenario}/{horizon}: parquet result shape={df.shape if df is not None else None}", flush=True)
                if df is None:
                    log.warning(
                        "No indicator file found for s3://%s/%s* — returning empty frame.",
                        self.bucket, zarr_key,
                    )
                    # Return a properly empty wide frame (h3_cell as index,
                    # 6 indicator columns) so subsequent lookups don't trip
                    # on a MultiIndex when there's no real data.
                    return pd.DataFrame(
                        index=pd.Index([], name="h3_cell"),
                        columns=["flood", "heat_stress", "water_stress",
                                 "drought", "storm", "wildfire"],
                    )
        # Pivot: rows = h3_cell, cols = indicator name, values = raw indicator value.
        if "indicator" in df.index.names and not df.empty:
            df = df.unstack(level="indicator")["value"]
        elif "indicator" in df.columns and not df.empty:
            df = df.pivot(index="h3_cell", columns="indicator", values="value")
        print(f"DEBUG _load_indicators {scenario}/{horizon}: final shape={df.shape}, index_name={df.index.name}, has_8660145b7f={'8660145b7ffffff' in df.index}", flush=True)
        return df

    def _nearest_neighbor_fill(self, df: pd.DataFrame, target_cells: list[str]) -> pd.DataFrame:
        """For any target_cells missing from df.index, fill with the nearest
        cell's row using H3 cell centroid distance."""
        if df is None or df.empty or not target_cells:
            return df
        import h3
        # Build a lookup of grid-distance for any h3 cell to nearest in df
        existing_cells = list(df.index)
        existing_coords = {c: h3.cell_to_latlng(c) for c in existing_cells}
        result_rows = []
        for c in target_cells:
            if c in df.index:
                continue  # already present
            if not existing_cells:
                continue
            lat, lon = h3.cell_to_latlng(c)
            # Find nearest by squared lat/lon distance
            nearest = min(
                existing_cells,
                key=lambda ec: (existing_coords[ec][0] - lat) ** 2 + (existing_coords[ec][1] - lon) ** 2,
            )
            row = df.loc[nearest].copy()
            row.name = c
            result_rows.append(row)
        if result_rows:
            extras = pd.DataFrame(result_rows)
            df = pd.concat([df, extras])
        return df

    def _s3_read_zarr_indicators(self, key: str) -> Optional[pd.DataFrame]:
        """Download a Zarr directory from S3 to a temp dir, open it,
        and return a DataFrame with (h3_cell, indicator, value) columns."""
        try:
            import boto3
            import shutil
            import tempfile
            s3 = boto3.client("s3", region_name=os.environ.get("AWS_REGION", "ap-south-1"))
            tmp_dir = tempfile.mkdtemp(prefix="prana_zarr_")
            try:
                paginator = s3.get_paginator("list_objects_v2")
                for page in paginator.paginate(Bucket=self.bucket, Prefix=key):
                    for obj in page.get("Contents", []):
                        rel = obj["Key"][len(key):].lstrip("/")
                        if not rel:
                            continue
                        local_path = Path(tmp_dir) / rel
                        local_path.parent.mkdir(parents=True, exist_ok=True)
                        s3.download_file(self.bucket, obj["Key"], str(local_path))
                print(f"DEBUG zarr_reader: downloaded to {tmp_dir}", flush=True)
                # Try xarray first
                try:
                    import xarray as xr
                    # Force zarr v2 - some files have .zgroup marker that
                    # confuses xarray on a mixed-version tree.
                    ds = xr.open_zarr(str(tmp_dir), consolidated=False, zarr_format=2)
                    print(f"DEBUG zarr_reader: xarray ds keys={list(ds.data_vars)}", flush=True)
                    if "indicator_value" not in ds:
                        print(f"DEBUG zarr_reader: missing indicator_value. Vars: {list(ds.data_vars)}", flush=True)
                        return None
                    values = ds["indicator_value"].values
                    cells = ds["h3_cell"].values
                    indicators = ds["indicator"].values
                    return pd.DataFrame(
                        values,
                        index=pd.Index(cells, name="h3_cell"),
                        columns=pd.Index(indicators, name="indicator"),
                    ).stack().rename("value").reset_index()
                except Exception as xr_exc:
                    print(f"DEBUG zarr_reader: xarray failed: {xr_exc}, trying raw zarr", flush=True)
                    import zarr
                    try:
                        # Try v2 first
                        root = zarr.open_group(str(tmp_dir), mode="r", zarr_format=2)
                    except Exception:
                        try:
                            root = zarr.open_group(str(tmp_dir), mode="r", zarr_format=3)
                        except Exception:
                            root = zarr.open_group(str(tmp_dir), mode="r")
                    if "indicator_value" not in root:
                        return None
                    arr = root["indicator_value"]
                    h3_cell = root["h3_cell"][:]
                    indicators = root["indicator"][:]
                    values = arr[:]
                    return pd.DataFrame(values, index=pd.Index(h3_cell, name="h3_cell"),
                                       columns=pd.Index(indicators, name="indicator")).stack().rename("value").reset_index()
            finally:
                shutil.rmtree(tmp_dir, ignore_errors=True)
        except Exception as exc:
            print(f"DEBUG zarr_reader: outer error: {type(exc).__name__}: {exc}", flush=True)
            return None

    def _financial_exposure(self) -> pd.Series:
        if self._financial_exp is None:
            built_up = load_built_up(self._exposure_sources)
            self._financial_exp = financial_exposure_norm(
                built_up, asset_value=self.asset_value_factor,
            )
        return self._financial_exp

    def _population_exposure(self) -> pd.Series:
        if self._population_exp is None:
            self._population_exp = population_exposure_norm(load_worldpop(self._exposure_sources))
        return self._population_exp

    def _adaptive_capacity(self) -> pd.Series:
        if self._adapt_cap is None:
            self._adapt_cap = adaptive_capacity_norm(
                load_ndvi_static(self._exposure_sources),
                load_census_income(self._exposure_sources),
            )
        return self._adapt_cap

    def _s3_read_parquet(self, key: str) -> Optional[pd.DataFrame]:
        try:
            import boto3
            import os
            import tempfile
            s3 = boto3.client("s3")
            # Download to a temp file first - pd.read_parquet on the streaming
            # body object fails with "UnsupportedOperation: seek" on some
            # Python / pyarrow versions.
            tmp_fd, tmp_path = tempfile.mkstemp(suffix=".parquet")
            os.close(tmp_fd)
            try:
                s3.download_file(self.bucket, key, tmp_path)
                df = pd.read_parquet(tmp_path)
            finally:
                try:
                    os.unlink(tmp_path)
                except Exception:
                    pass
            return df
        except Exception as exc:
            log.warning("Could not read s3://%s/%s: %s", self.bucket, key, exc)
            return None

    # ── aggregation ─────────────────────────────────────────────────────────

    def _aggregate_hazards(
        self,
        cell_indicators,
    ) -> Tuple[Dict[str, float], Dict[str, Dict[str, float]]]:
        """Weighted composite per hazard.

        Accepts either a DataFrame (rows = indicators, columns = cells) or a
        Series indexed by indicator name for a single cell.

        Returns ``({hazard: raw_score}, {hazard: {indicator: contribution}})``.
        Missing indicators are weighted as 0 and logged.
        """
        # Normalise to a Series indexed by indicator name for a single cell.
        if isinstance(cell_indicators, pd.DataFrame):
            if cell_indicators.empty:
                series = pd.Series(dtype=float)
            elif cell_indicators.shape[0] == 1:
                series = cell_indicators.iloc[0]
            else:
                # Average across rows when multiple rows per cell somehow present.
                series = cell_indicators.mean(axis=0)
        else:
            series = cell_indicators

        hazard_scores: Dict[str, float] = {}
        contributing: Dict[str, Dict[str, float]] = {}

        # Compact 6-hazard layout: the Series already contains the weighted
        # hazard values from the compute step. Use them directly.
        if all(h in series.index for h in HAZARDS):
            for hazard in HAZARDS:
                raw = float(series[hazard])
                norm = float(np.clip(raw, 0.0, 100.0))
                hazard_scores[hazard] = norm
                contributing[hazard] = {hazard: round(norm, 2)}
            return hazard_scores, contributing

        # Legacy sub-indicator layout: weighted aggregation of 30 columns.
        for hazard in HAZARDS:
            hazard_indicators = {
                ind: w for (haz, ind), w in INDICATOR_WEIGHTS.items() if haz == hazard
            }
            score = 0.0
            contrib: Dict[str, float] = {}
            for ind, w in hazard_indicators.items():
                if ind in series.index:
                    raw_val = float(series[ind])
                else:
                    raw_val = 0.0
                norm_val = float(np.clip(raw_val, 0.0, 100.0))
                score += w * norm_val
                contrib[ind] = round(norm_val, 2)
            hazard_scores[hazard] = score
            contributing[hazard] = contrib

        return hazard_scores, contributing


# ─────────────────────────────────────────────────────────────────────────────
# Asset-type sensitivity multiplier
# ─────────────────────────────────────────────────────────────────────────────

ASSET_MULTIPLIERS: Dict[str, Dict[str, float]] = {
    "data_center":              {"flood": 1.40, "heat_stress": 1.45, "water_stress": 1.35, "drought": 0.60, "storm": 1.15, "wildfire": 0.90},
    "manufacturing_unit":       {"flood": 1.25, "heat_stress": 1.15, "water_stress": 1.25, "drought": 0.90, "storm": 1.20, "wildfire": 1.10},
    "warehouse":                {"flood": 1.30, "heat_stress": 1.10, "water_stress": 0.80, "drought": 0.70, "storm": 1.15, "wildfire": 1.20},
    "agriculture_farmland":     {"flood": 1.10, "heat_stress": 1.30, "water_stress": 1.45, "drought": 1.50, "storm": 1.25, "wildfire": 1.40},
    "commercial_building":      {"flood": 1.15, "heat_stress": 1.00, "water_stress": 1.00, "drought": 0.80, "storm": 1.10, "wildfire": 1.00},
    "energy_power_infrastructure":{"flood": 1.35, "heat_stress": 1.25, "water_stress": 1.20, "drought": 1.20, "storm": 1.35, "wildfire": 1.30},
    "logistics_transportation_hub":{"flood": 1.30, "heat_stress": 1.00, "water_stress": 0.90, "drought": 0.80, "storm": 1.30, "wildfire": 1.10},
}
DEFAULT_MULT = {h: 1.0 for h in HAZARDS}


def _asset_multiplier(asset_type: str) -> float:
    """Mean of hazard-specific multipliers for the asset type (≈1.0)."""
    row = ASSET_MULTIPLIERS.get(asset_type.strip().lower().replace(" ", "_"), DEFAULT_MULT)
    return float(np.mean(list(row.values())))


def _notes(asset_type: Optional[str]) -> List[str]:
    n = [
        "Hazard scores are weighted composites per methodology §10.2.",
        "Convex adjustment H_adj = 100·(H_raw/100)^0.85 applied per §10.3.",
        "Final risk = 0.60·H_adj + 0.20·FE + 0.10·PE − 0.10·AC per §10.4.",
    ]
    if asset_type:
        n.append(f"Asset-type multiplier applied: mean over {asset_type!r} sensitivities.")
    return n
