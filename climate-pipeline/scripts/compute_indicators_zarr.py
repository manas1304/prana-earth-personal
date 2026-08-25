#!/usr/bin/env python3
"""Compute the 6 hazard indicators from processed CMIP6 Zarr and write
Zarr indicator files to S3.

For each (scenario, horizon) the output is:
    s3://<bucket>/derived/indicators/{scenario}/{horizon}.zarr/
    shape (n_cells, 6) with columns: flood, heat_stress, water_stress,
    drought, storm, wildfire.

Reads one Zarr file per (variable, scenario, model, frequency) from
processed/ via xarray + rioxarray-style H3 lookup, then computes the
indicator that derives from each variable.
"""
from __future__ import annotations

import logging
import os
import shutil
import sys
import tempfile
from pathlib import Path
from typing import Dict

import numpy as np
import pandas as pd
import zarr

# Make prana_climate importable
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from prana_climate.config import (
    DOWNLOADS_DIR,
    PROCESSED_DIR,
    S3_BUCKET,
    SCENARIOS,
    HORIZONS,
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger("compute_indicators")


def _s3_client():
    """Build a boto3 S3 client from live env vars, using an explicit
    session so we don't pick up the default session's cached creds."""
    import boto3
    awsk = os.environ.get("AWS_ACCESS_KEY_ID")
    awss = os.environ.get("AWS_SECRET_ACCESS_KEY")
    if awsk and awss:
        sess = boto3.session.Session(
            aws_access_key_id=awsk,
            aws_secret_access_key=awss,
            region_name=os.environ.get("AWS_REGION", "ap-south-1"),
        )
    else:
        sess = boto3.session.Session(
            region_name=os.environ.get("AWS_REGION", "ap-south-1"))
    return sess.client("s3")


def _s3_download_zarr(s3_key: str) -> Path:
    """Download a Zarr directory from S3 to a temp dir, return path."""
    s3 = _s3_client()
    tmp = Path(tempfile.mkdtemp(prefix="prana_zarr_dl_"))
    paginator = s3.get_paginator("list_objects_v2")
    for page in paginator.paginate(Bucket=S3_BUCKET, Prefix=s3_key):
        for obj in page.get("Contents", []):
            rel = obj["Key"][len(s3_key):].lstrip("/")
            if not rel:
                continue
            local = tmp / rel
            local.parent.mkdir(parents=True, exist_ok=True)
            s3.download_file(S3_BUCKET, obj["Key"], str(local))
    return tmp


def _s3_upload_zarr(local_dir: Path, s3_key: str) -> None:
    """Recursively upload a local Zarr directory to S3."""
    s3 = _s3_client()
    for p in sorted(local_dir.rglob("*")):
        if p.is_file():
            rel = p.relative_to(local_dir).as_posix()
            s3.upload_file(str(p), S3_BUCKET, f"{s3_key}/{rel}")


def _slice_to_horizon(zarr_dir: Path, var_name: str, start_year: int, end_year: int) -> tuple[np.ndarray, np.ndarray]:
    """Load a (time, ..., h3_cell) array from Zarr and slice to [start_year, end_year].

    Returns (data_array, h3_cells).
    """
    root = zarr.open(str(zarr_dir), mode="r")
    if var_name not in root:
        raise RuntimeError(f"No {var_name!r} array in {zarr_dir}")
    arr = root[var_name]
    cells = root["h3_cell"][:]

    # The time coordinate lives either as "time" or in the array attrs.
    time_coord = None
    if "time" in root:
        try:
            time_coord = root["time"][:]
        except Exception:
            time_coord = None

    # Slice if we have a time coordinate
    if time_coord is not None and len(time_coord) > 0:
        # cftime or numpy datetimes
        years = np.array([getattr(t, "year", int(str(t)[:4])) for t in time_coord])
        mask = (years >= start_year) & (years <= end_year)
        if not mask.any():
            log.warning("No timesteps in [%d, %d] for %s; using full range",
                        start_year, end_year, zarr_dir)
            return np.asarray(arr), cells
        sliced = np.asarray(arr)[mask]
        return sliced, cells

    return np.asarray(arr), cells


def _horizon_window(horizon: int) -> tuple[int, int]:
    """Return the (start_year, end_year) window for a given horizon year.

    Horizons represent "by year X" so we use a 20-year window ending at X
    (the standard CMIP6 climatology window).
    """
    return (horizon - 19, horizon)


def _compute_flood_indicator(pr_zarr_dir: Path, start_year: int = 2000, end_year: int = 2050) -> pd.Series:
    """Flood indicator: mean of monthly precip normalized to 0-100."""
    pr, cells = _slice_to_horizon(pr_zarr_dir, "pr", start_year, end_year)
    means = pr.mean(axis=tuple(range(pr.ndim - 1)))
    mn, mx = means.min(), means.max()
    scores = (means - mn) / (mx - mn) * 100 if mx > mn else np.zeros_like(means)
    return pd.Series(scores, index=pd.Index(cells, name="h3_cell"), name="flood")


def _compute_heat_indicator(tas_zarr_dir: Path, hurs_zarr_dir: Path | None = None,
                              start_year: int = 2000, end_year: int = 2050) -> pd.Series:
    """Heat stress: temperature-based with optional humidity amplification.

    Base: max(0, (T - 25) * 3) capped at 100.
    Humidex-style amplification when hurs is present:
        T_feel = T + 0.04 * hurs * (T - 10)
    Then: max(0, (T_feel - 25) * 3)
    """
    tas, cells = _slice_to_horizon(tas_zarr_dir, "tas", start_year, end_year)
    t_means = tas.mean(axis=tuple(range(tas.ndim - 1)))

    if hurs_zarr_dir is not None:
        try:
            hurs, _ = _slice_to_horizon(hurs_zarr_dir, "hurs", start_year, end_year)
            h_means = hurs.mean(axis=tuple(range(hurs.ndim - 1)))
            t_feel = t_means + 0.04 * h_means * (t_means - 10)
            scores = np.clip((t_feel - 25.0) * 3.0, 0, 100)
            return pd.Series(scores, index=pd.Index(cells, name="h3_cell"), name="heat_stress")
        except Exception as e:
            log.info("hurs unavailable for heat indicator: %s", e)

    scores = np.clip((t_means - 25.0) * 3.0, 0, 100)
    return pd.Series(scores, index=pd.Index(cells, name="h3_cell"), name="heat_stress")


def _compute_water_indicator(pr_zarr_dir: Path, start_year: int = 2000, end_year: int = 2050) -> pd.Series:
    """Water stress = max(0, mean_precip - 50) clipped."""
    pr, cells = _slice_to_horizon(pr_zarr_dir, "pr", start_year, end_year)
    means = pr.mean(axis=tuple(range(pr.ndim - 1)))
    scores = np.clip(means - 50.0, 0, 100)
    return pd.Series(scores, index=pd.Index(cells, name="h3_cell"), name="water_stress")


def _compute_drought_indicator(pr_zarr_dir: Path, start_year: int = 2000, end_year: int = 2050) -> pd.Series:
    """Drought = max(0, 100 - mean_precip)."""
    pr, cells = _slice_to_horizon(pr_zarr_dir, "pr", start_year, end_year)
    means = pr.mean(axis=tuple(range(pr.ndim - 1)))
    scores = np.clip(100.0 - means, 0, 100)
    return pd.Series(scores, index=pd.Index(cells, name="h3_cell"), name="drought")


def _compute_storm_indicator(pr_zarr_dir: Path, start_year: int = 2000, end_year: int = 2050) -> pd.Series:
    """Storm = max(0, max_precip - 10) clipped."""
    pr, cells = _slice_to_horizon(pr_zarr_dir, "pr", start_year, end_year)
    maxes = pr.max(axis=tuple(range(pr.ndim - 1)))
    scores = np.clip(maxes - 10.0, 0, 100)
    return pd.Series(scores, index=pd.Index(cells, name="h3_cell"), name="storm")


def _compute_wildfire_indicator(tas_zarr_dir: Path, huss_zarr_dir: Path | None = None,
                                 start_year: int = 2000, end_year: int = 2050) -> pd.Series:
    """Wildfire: temperature-based, optionally amplified by aridity (low huss).

    Base: max(0, (T - 20) * 2) capped at 100.
    huss in kg/kg (typical 0-0.025). Drier air amplifies fire risk:
        amp = clip(1 + (0.015 - huss) * 8, 0.7, 1.6)
    """
    tas, cells = _slice_to_horizon(tas_zarr_dir, "tas", start_year, end_year)
    means = tas.mean(axis=tuple(range(tas.ndim - 1)))

    if huss_zarr_dir is not None:
        try:
            huss, _ = _slice_to_horizon(huss_zarr_dir, "huss", start_year, end_year)
            h_means = huss.mean(axis=tuple(range(huss.ndim - 1)))
            amp = np.clip(1.0 + (0.015 - h_means) * 8.0, 0.7, 1.6)
            scores = np.clip((means - 20.0) * 2.0 * amp, 0, 100)
            return pd.Series(scores, index=pd.Index(cells, name="h3_cell"), name="wildfire")
        except Exception as e:
            log.info("huss unavailable for wildfire indicator: %s", e)

    scores = np.clip((means - 20.0) * 2.0, 0, 100)
    return pd.Series(scores, index=pd.Index(cells, name="h3_cell"), name="wildfire")


# Parquet fallback for historical (which still has Parquet-format data)
def _compute_pr_mean_from_parquet(parquet_files: list[Path]) -> pd.Series:
    """Read a bunch of `.nc` style Per-H3-cell Parquet files (legacy format used
    by the original smoke test) and compute mean precip per cell."""
    rows = []
    for f in parquet_files:
        d = pd.read_parquet(f)
        if "pr" in d.columns:
            rows.append(d.groupby("h3_cell")["pr"].mean())
        if "tas" in d.columns:
            rows.append(d.groupby("h3_cell")["tas"].mean())
    if not rows:
        return pd.Series(dtype=float)
    return pd.concat(rows, axis=1).mean(axis=1)


# Combiner: for each (scenario, horizon) compute 6 indicators from
# the appropriate processed variable.
ENSEMBLE_MODELS = ["MPI-ESM1-2-HR", "MRI-ESM2-0"]


def _compute_indicators_for_model(scenario: str, horizon: int, model: str,
                                   tmp_cache: Dict[str, Path]) -> pd.DataFrame:
    """Compute the 6 indicators for a single (scenario, horizon, model) triple."""
    pr_zarr_key = f"processed/precipitation/{scenario}/{model}/pr/mon.zarr"
    tas_zarr_key = f"processed/temperature/{scenario}/{model}/tas/mon.zarr"
    hurs_zarr_key = f"processed/humidity/{scenario}/{model}/hurs/mon.zarr"
    huss_zarr_key = f"processed/humidity/{scenario}/{model}/huss/mon.zarr"

    # Try Zarr first; fall back to legacy Parquet files
    def _fetch(key: str, label: str) -> Path | None:
        if key in tmp_cache:
            return tmp_cache[key]
        try:
            s3 = _s3_client()
            listed = s3.list_objects_v2(Bucket=S3_BUCKET, Prefix=key + "/", MaxKeys=1)
            if listed.get("KeyCount", 0) == 0:
                raise FileNotFoundError(key)
            tmp_cache[key] = _s3_download_zarr(key)
            return tmp_cache[key]
        except Exception:
            log.info("Zarr %s missing for %s/%s", label, scenario, model)
            tmp_cache[key] = None
            return None

    pr_dir = _fetch(pr_zarr_key, "pr")
    tas_dir = _fetch(tas_zarr_key, "tas")
    hurs_dir = _fetch(hurs_zarr_key, "hurs")
    huss_dir = _fetch(huss_zarr_key, "huss")

    # Parquet fallback for historical
    if pr_dir is None or tas_dir is None:
        try:
            from prana_climate.config import DOWNLOADS_DIR, PROCESSED_DIR
            # Look at the processed Parquet shards (output of process_data.py)
            # at processed/<category>/<scenario>/<model>/<var>/*.parquet
            files = []
            for var in ("pr", "tas"):
                for cat_dir in (PROCESSED_DIR / "precipitation", PROCESSED_DIR / "temperature"):
                    scen_dir = cat_dir / scenario
                    if not scen_dir.exists():
                        continue
                    for model_dir in scen_dir.iterdir():
                        var_dir = model_dir / var
                        if not var_dir.exists():
                            continue
                        files.extend(sorted(var_dir.glob("*.parquet"))[:30])
            files = sorted(set(files))
            log.info("Parquet fallback for scenario=%s: %d files", scenario, len(files))
            if not files:
                log.warning("Missing Zarr data + no Parquet fallback for scenario=%s, skipping", scenario)
                return pd.DataFrame(columns=["h3_cell", "indicator", "value"])
            # Read Parquet files locally. Note: process_data.py writes
            # Parquet with h3_cell as the INDEX, not a column.
            pr_vals = []
            tas_vals = []
            for f in files:
                d = pd.read_parquet(f)
                # Move index to a column for uniform handling
                if d.index.name is None:
                    d = d.reset_index()
                if "pr" in d.columns:
                    pr_vals.append(d.set_index("h3_cell")["pr"])
                if "tas" in d.columns:
                    tas_vals.append(d.set_index("h3_cell")["tas"])
            if not pr_vals and not tas_vals:
                return pd.DataFrame(columns=["h3_cell", "indicator", "value"])

            # Concat with concat axis=0 (stacking), then groupby+mean to collapse
            # duplicate h3_cell indices across files.
            pr_mean = (pd.concat(pr_vals, axis=0).groupby(level=0).mean()
                       if pr_vals else None)
            tas_mean = (pd.concat(tas_vals, axis=0).groupby(level=0).mean()
                        if tas_vals else None)
            if pr_mean is None and tas_mean is None:
                return pd.DataFrame(columns=["h3_cell", "indicator", "value"])

            # Compute indicators directly from the Series (skip the in-memory
            # Zarr intermediate that broke under zarr v3).
            cells = sorted(set(pr_mean.index if pr_mean is not None else set()) |
                           set(tas_mean.index if tas_mean is not None else set()))
            pr = pr_mean.reindex(cells).ffill().fillna(0.0).values if pr_mean is not None else np.zeros(len(cells))
            tas = tas_mean.reindex(cells).ffill().fillna(0.0).values if tas_mean is not None else np.zeros(len(cells))

            mn, mx = pr.min(), pr.max()
            pr_norm = (pr - mn) / (mx - mn) * 100 if mx > mn else np.zeros_like(pr)
            pr_max = pr.max() if len(pr) else 0.0
            idx = pd.Index(cells, name="h3_cell")
            flood = pd.Series(pr_norm, index=idx, name="flood")
            water = pd.Series(np.clip(pr - 50.0, 0, 100), index=idx, name="water_stress")
            drought = pd.Series(np.clip(100.0 - pr, 0, 100), index=idx, name="drought")
            storm = pd.Series(np.clip(pr_max - 10.0, 0, 100), index=idx, name="storm")
            heat = pd.Series(np.clip((tas - 25.0) * 3.0, 0, 100), index=idx, name="heat_stress")
            wildfire = pd.Series(np.clip((tas - 20.0) * 2.0, 0, 100), index=idx, name="wildfire")

            df = pd.concat([flood, heat, water, drought, storm, wildfire], axis=1).reset_index()
            df = df.melt(id_vars="h3_cell", var_name="indicator", value_name="value")
            log.info("scenario=%s indicator rows: %d", scenario, len(df))
            return df
        except Exception as e:
            log.warning("Parquet fallback failed for %s: %s", scenario, e)
            return pd.DataFrame(columns=["h3_cell", "indicator", "value"])

    # Zarr path: read from S3 Zarr and compute indicators
    start_year, end_year = _horizon_window(horizon)
    try:
        flood = _compute_flood_indicator(pr_dir, start_year, end_year)
        heat = _compute_heat_indicator(tas_dir, hurs_dir, start_year, end_year)
        water = _compute_water_indicator(pr_dir, start_year, end_year)
        drought = _compute_drought_indicator(pr_dir, start_year, end_year)
        storm = _compute_storm_indicator(pr_dir, start_year, end_year)
        wildfire = _compute_wildfire_indicator(tas_dir, huss_dir, start_year, end_year)
    except Exception as e:
        log.warning("Indicator computation failed for %s/%s: %s", scenario, horizon, e)
        return pd.DataFrame(columns=["h3_cell", "indicator", "value"])

    df = pd.concat([flood, heat, water, drought, storm, wildfire], axis=1).reset_index()
    df = df.melt(id_vars="h3_cell", var_name="indicator", value_name="value")
    log.info("scenario=%s/%s indicator rows: %d", scenario, model, len(df))
    return df


def compute_indicators(scenario: str, horizon: int, tmp_cache: Dict[str, Path]) -> pd.DataFrame:
    """Build the ensemble-median indicator DataFrame for one (scenario, horizon).

    For each GCM in ENSEMBLE_MODELS that has data for this scenario+horizon,
    compute the 6 indicators. Then combine across GCMs by taking the per-cell
    median — the standard CMIP6 ensemble practice.

    If only one GCM is available, returns that GCM's indicators directly.
    """
    per_model_dfs: list[tuple[str, pd.DataFrame]] = []
    for model in ENSEMBLE_MODELS:
        df = _compute_indicators_for_model(scenario, horizon, model, tmp_cache)
        if not df.empty:
            per_model_dfs.append((model, df))

    if not per_model_dfs:
        log.warning("No GCMs produced indicators for %s/%s", scenario, horizon)
        return pd.DataFrame(columns=["h3_cell", "indicator", "value"])

    if len(per_model_dfs) == 1:
        model, df = per_model_dfs[0]
        log.info("Single-GCM ensemble for %s/%s: %s (%d cells)",
                 scenario, horizon, model, len(df) // 6)
        return df

    # Combine: each GCM produces a pivot (n_cells × 6). Outer-union the cells
    # across GCMs and take the per-indicator median where ≥2 GCMs are
    # present; where only 1 GCM has data, use that GCM's value.
    pivots = []
    for model, df in per_model_dfs:
        pivot = df.pivot_table(
            index="h3_cell", columns="indicator", values="value", aggfunc="first"
        )
        pivots.append((model, pivot))

    # Outer-join the pivots on h3_cell
    from functools import reduce
    union = reduce(lambda l, r: l.combine_first(r), [p for _, p in pivots])
    # Now take the count of contributing GCMs per cell
    counts = sum(p.notna().astype(int) for _, p in pivots)  # n_cells x n_ind
    # Median where ≥2 GCMs present; for cells with only 1 GCM, keep that value
    stacked = pd.concat([p for _, p in pivots], axis=0)
    median_by_cell = stacked.groupby(level=0).median()
    # Fill cells where median is NaN (single-GCM only) with the available value
    median_by_cell = median_by_cell.fillna(union)
    median_df = median_by_cell.reset_index().melt(
        id_vars="h3_cell", var_name="indicator", value_name="value"
    )
    log.info("Ensemble median for %s/%s across %d GCMs (%s): %d rows, %d cells",
             scenario, horizon, len(per_model_dfs),
             "+".join(m for m, _ in per_model_dfs),
             len(median_df), median_df["h3_cell"].nunique())
    return median_df


def write_indicator_zarr(df: pd.DataFrame, scenario: str, horizon: int) -> Path:
    """Write indicator DataFrame to a Zarr file. Returns local path."""
    pivot = df.pivot(index="h3_cell", columns="indicator", values="value")
    pivot = pivot.fillna(0.0)

    local_out = Path(tempfile.mkdtemp(prefix=f"prana_ind_{scenario}_{horizon}_"))
    zarr_path = local_out / "indicators.zarr"

    # Use a Zarr Group with explicit named arrays for h3_cell and indicator
    # so the engine can read it with `z["indicator_value"][cell_idx, ind_idx]`.
    # zarr v3 changed the API: create_array uses shape then we write data,
    # or we use data directly but no shape parameter.
    import zarr
    z = zarr.open_group(str(zarr_path), mode="w", zarr_format=2)
    n_cells, n_ind = pivot.shape
    create = getattr(z, "create_array", None) or getattr(z, "create_dataset")
    # Create emtpy array first, then fill
    arr = create(
        "indicator_value",
        shape=(n_cells, n_ind),
        chunks=(n_cells, n_ind),
        dtype="f4",
    )
    arr[:] = pivot.values.astype("f4")
    # h3_cell and indicator arrays
    arr2 = create(
        "h3_cell",
        shape=(n_cells,),
        chunks=(n_cells,),
        dtype="U15",
    )
    arr2[:] = np.asarray(list(pivot.index), dtype="U15")
    arr3 = create(
        "indicator",
        shape=(n_ind,),
        chunks=(n_ind,),
        dtype="U30",
    )
    arr3[:] = np.asarray(list(pivot.columns), dtype="U30")
    # CRITICAL: set _ARRAY_DIMENSIONS so xarray can read the Zarr
    arr.attrs["_ARRAY_DIMENSIONS"] = ["h3_cell", "indicator"]
    arr2.attrs["_ARRAY_DIMENSIONS"] = ["h3_cell"]
    arr3.attrs["_ARRAY_DIMENSIONS"] = ["indicator"]
    z.attrs["scenario"] = scenario
    z.attrs["horizon"] = horizon
    z.attrs["h3_resolution"] = 6
    return zarr_path


def main() -> int:
    scenarios = ["historical", "ssp126", "ssp245", "ssp370", "ssp585"]
    horizons = HORIZONS  # [2030, 2040, 2050]

    tmp_cache: Dict[str, Path] = {}
    for scen in scenarios:
        for horizon in horizons:
            log.info("=== Computing indicators for scenario=%s horizon=%s ===", scen, horizon)
            df = compute_indicators(scen, horizon, tmp_cache)
            if df.empty:
                continue
            zarr_path = write_indicator_zarr(df, scen, horizon)
            s3_key = f"derived/indicators/{scen}/{horizon}.zarr"
            log.info("Uploading to s3://%s/%s", S3_BUCKET, s3_key)
            _s3_upload_zarr(zarr_path, s3_key)
            shutil.rmtree(zarr_path.parent, ignore_errors=True)
            log.info("Done scenario=%s horizon=%s", scen, horizon)
        # Free per-scenario cache between scenarios to control memory
        for k in [k for k in tmp_cache if f"/{scen}/" in k]:
            if tmp_cache[k] is not None:
                shutil.rmtree(tmp_cache[k], ignore_errors=True)
            tmp_cache.pop(k, None)

    # Final cache cleanup
    for d in tmp_cache.values():
        if d is not None:
            shutil.rmtree(d, ignore_errors=True)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
