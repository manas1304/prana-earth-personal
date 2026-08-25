#!/usr/bin/env python3
"""process_data.py — convert raw CMIP6 .nc files into H3-bucketed Zarr.

Per spec §7:
    1. Open multiple time-chunked NetCDF files with xarray/open_mfdataset.
    2. Validate dimensions, coordinates, time range, units and NaNs.
    3. Extract the required project period (target: 2000-2050).
    4. Clip spatially where appropriate.
    5. Normalize units (K → °C for temperature, etc.).
    6. Map climate values to the agreed H3 resolution.
    7. Store compact processed data in S3 (as Zarr, not 1000s of Parquet files).

The output is a single Zarr file per (model, variable, scenario, frequency):
    s3://<bucket>/processed/<variable>/<scenario>/<model>/<freq>.zarr/
    with dims (time, h3_cell) and the variable as the data array.

H3 cell IDs are stored as a coordinate so the API can do efficient
slicing. Compared to the previous 1-Parquet-per-cell approach (~1000s
of small files), this is 1 Zarr per dataset — uploads in seconds
instead of hours.
"""
from __future__ import annotations

import argparse
import logging
import os
import shutil
import sys
import tempfile
from pathlib import Path

import numpy as np
import pandas as pd
import xarray as xr

# Make prana_climate package importable
ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))

from prana_climate.config import (
    DOWNLOADS_DIR,
    PROCESSED_DIR,
    PROCESS_END_YEAR,
    PROCESS_START_YEAR,
    S3_BUCKET,
    VARIABLE_CATALOG,
)
from prana_climate.h3_grid import map_dataset_to_h3
from prana_climate.units import NORMALIZERS
from prana_climate.validators import validate

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
log = logging.getLogger("process_data")


def _resolve_paths(scenario: str, model: str, variable: str, frequency: str) -> list[Path]:
    """Find .nc files matching the (scenario, model, variable) tuple."""
    base = DOWNLOADS_DIR / scenario
    if not base.exists():
        raise FileNotFoundError(f"No downloads found at {base}.")
    candidates = []
    for p in sorted(base.rglob("*.nc")):
        name = p.name
        if not any(tok in name for tok in (f"{variable}_", f"{variable}.", f"-{variable}-")):
            continue
        if model.lower() != "syntheticgcm" and model not in name:
            continue
        candidates.append(p)
    return candidates


def _open(files: list[Path]) -> xr.Dataset:
    """Open multiple time-chunked NetCDFs as a single Dataset."""
    if not files:
        raise FileNotFoundError("No .nc files provided to open.")
    log.info("Opening %d NetCDF file(s) with xarray.open_mfdataset...", len(files))
    ds = xr.open_mfdataset(
        [str(p) for p in files],
        combine="by_coords",
        use_cftime=True,
        data_vars="minimal",
        coords="minimal",
        compat="override",
    )
    return ds.load()


def _slice_period(ds: xr.Dataset) -> xr.Dataset:
    """Trim the dataset to the project time window."""
    if "time" not in ds.coords:
        return ds
    times = ds["time"].values
    mask = np.array([
        (PROCESS_START_YEAR <= getattr(t, "year", None) <= PROCESS_END_YEAR)
        for t in times
    ], dtype=bool)
    return ds.sel(time=times[mask])


def _normalize(ds: xr.Dataset, variable: str, frequency: str) -> xr.Dataset:
    """Apply the CMIP6 unit conversions defined in ``prana_climate.units``."""
    if variable not in NORMALIZERS:
        log.warning("No unit normalizer registered for %s — leaving as-is.", variable)
        return ds
    fn = NORMALIZERS[variable]
    if variable == "pr":
        ds = ds.assign({variable: fn(ds[variable], frequency)})
    else:
        ds = ds.assign({variable: fn(ds[variable])})
    ds[variable].attrs["units"] = (
        "mm/day" if variable == "pr" and frequency == "day" else
        "mm/month" if variable in {"pr", "mrro", "evspsbl"} else
        "degC" if variable in {"tas", "tasmax", "tasmin"} else
        ds[variable].attrs.get("units", "")
    )
    return ds


def _write_zarr(ds_h3: xr.Dataset, variable: str, scenario: str, model: str,
                frequency: str, out_dir: Path) -> Path:
    """Write the H3-bucketed dataset to a single Zarr file.

    Returns the path to the local Zarr directory (caller uploads to S3).
    """
    category = VARIABLE_CATALOG[variable]["category"]
    target_dir = out_dir / category / scenario / model / variable / frequency
    target_dir.mkdir(parents=True, exist_ok=True)

    # Use h3_cell as a real coordinate so the API can do
    # ds.sel(h3_cell="8660145b7ffffff") without a manual pivot.
    out = ds_h3.copy()
    out.attrs.update({
        "source_model": model,
        "source_scenario": scenario,
        "source_frequency": frequency,
        "h3_resolution": 6,
        "processed_at": pd.Timestamp.utcnow().isoformat(),
    })

    # Use zarr v2 format for max compatibility.
    out.to_zarr(str(target_dir), mode="w", consolidated=True)
    log.info("Wrote Zarr to %s", target_dir)
    return target_dir


def _upload_to_s3(local_path: Path, s3_key: str) -> None:
    """Recursively upload a Zarr directory to S3 using the AWS CLI.

    boto3 in this Python sandbox is hitting SignatureDoesNotMatch
    errors. The AWS CLI works correctly. So shell out to `aws s3 sync`
    which uses the system's working credentials.

    On Windows the `aws` command may not be on PATH (e.g. when launched
    from a subprocess without inheriting the parent shell env), so we
    look up the absolute path first.
    """
    import shutil
    import subprocess
    aws_exe = shutil.which("aws")
    if aws_exe is None:
        # Common Windows install location
        for candidate in (
            r"C:\Program Files\Amazon\AWSCLIV2\aws.exe",
            r"C:\Program Files\Amazon\AWSCLI\bin\aws.exe",
        ):
            if Path(candidate).exists():
                aws_exe = candidate
                break
    if aws_exe is None:
        raise RuntimeError(
            "AWS CLI not found on PATH. Install from "
            "https://aws.amazon.com/cli/ or set PRANA_AWS_CLI."
        )
    cmd = [
        aws_exe, "s3", "sync",
        str(local_path),
        f"s3://{S3_BUCKET}/{s3_key}/",
        "--only-show-errors",
    ]
    print(f"    CMD: {' '.join(cmd)}", flush=True)
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"    AWS CLI stderr: {result.stderr}", flush=True)
        raise RuntimeError(f"aws s3 sync failed: {result.stderr}")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--variable", required=True)
    parser.add_argument("--scenario", required=True)
    parser.add_argument("--model", required=True)
    parser.add_argument("--frequency", required=True, choices=["mon", "day"])
    parser.add_argument("--member", default="r1i1p1f1")
    parser.add_argument("--upload", action="store_true",
                        help="Also upload the Zarr to S3 after writing locally.")
    args = parser.parse_args()

    files = _resolve_paths(args.scenario, args.model, args.variable, args.frequency)
    if not files:
        raise FileNotFoundError(f"No {args.variable} files for {args.model}/{args.scenario}")

    from prana_climate.config import ensure_local_dirs
    ensure_local_dirs()

    ds = _open(files)
    report = validate(ds)
    for w in report.warnings:
        log.warning("VALIDATE: %s", w)
    if not report.ok:
        for e in report.errors:
            log.error("VALIDATE: %s", e)
        return 1

    ds = _slice_period(ds)
    if ds.sizes.get("time", 1) == 0:
        # No timesteps remain after slicing to the project window
        # (e.g. historical .nc chunks that fall entirely before 2000).
        log.warning("No timesteps remain after slicing %s/%s to %s-%s. Skipping.",
                    args.variable, args.scenario, PROCESS_START_YEAR, PROCESS_END_YEAR)
        return 0
    ds = _normalize(ds, args.variable, args.frequency)
    ds_h3 = map_dataset_to_h3(ds, args.variable)

    local_path = _write_zarr(ds_h3, args.variable, args.scenario, args.model,
                              args.frequency, PROCESSED_DIR)

    if args.upload:
        s3_key = f"processed/{VARIABLE_CATALOG[args.variable]['category']}/{args.scenario}/{args.model}/{args.variable}/{args.frequency}.zarr"
        log.info("Uploading Zarr to s3://%s/%s...", S3_BUCKET, s3_key)
        _upload_to_s3(local_path, s3_key)
        log.info("Upload complete.")

    log.info("Done.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
