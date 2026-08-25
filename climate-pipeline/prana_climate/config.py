"""Centralised configuration for the climate pipeline.

Single source of truth for H3 resolution, AWS region, S3 bucket name,
the GCM ensemble, scenarios, variables and processing window.
"""
from __future__ import annotations

import os
from pathlib import Path
from typing import Dict, List

# ─── Storage / AWS ────────────────────────────────────────────────────────────
AWS_REGION: str = os.getenv("AWS_REGION", "ap-south-1")
S3_BUCKET: str = os.getenv("PRANA_S3_BUCKET", "prana-earth-data")

# ─── Spatial index ───────────────────────────────────────────────────────────
H3_RESOLUTION: int = int(os.getenv("PRANA_H3_RES", "6"))  # ~36 km² / ~6 km edge
# H3 resolution 6 ⇒ 65,532 cells globally (land + ocean); ~411k at res 7

# ─── CMIP6 matrix ────────────────────────────────────────────────────────────
# Four GCMs currently active in the pipeline (methodology §2.2 recommended
# ensemble minus IPSL-CM6A-LR, which has no local source data yet).
# To re-enable IPSL-CM6A-LR, download the full set of variables for it from
# ESGF via `python scripts/download_only.py --models IPSL-CM6A-LR --variables
# pr tas tasmax tasmin hurs huss` and add it back below.
GCM_MODELS: List[str] = [
    "MRI-ESM2-0",
    "EC-Earth3",
    "GFDL-ESM4",
    "MPI-ESM1-2-HR",
]

# Five future scenarios + historical per the spec §11
SCENARIOS: List[str] = [
    "historical",
    "ssp126",
    "ssp245",
    "ssp370",
    "ssp585",
]

PRIMARY_MEMBER: str = "r1i1p1f1"

# ─── Variables for the 6 hazards ─────────────────────────────────────────────
# Maps CMIP6 variable_id → (category, frequency(s))
# Categories drive the processed/ folder layout in S3 (spec §5).
VARIABLE_CATALOG: Dict[str, Dict[str, object]] = {
    # ────── Flood / Heat / Storm / Wildfire ──────
    "pr":     {"category": "precipitation", "frequencies": ["mon", "day"], "units": "kg m-2 s-1"},
    "tas":    {"category": "temperature",   "frequencies": ["mon"],         "units": "K"},
    "tasmax": {"category": "temperature",   "frequencies": ["day"],         "units": "K"},
    "tasmin": {"category": "temperature",   "frequencies": ["day"],         "units": "K"},
    "hurs":   {"category": "humidity",      "frequencies": ["mon"],         "units": "%"},
    "huss":   {"category": "humidity",      "frequencies": ["mon"],         "units": "kg kg-1"},
    "sfcWind":{"category": "wind",          "frequencies": ["mon"],         "units": "m s-1"},
    # ────── Hydrology ──────
    "mrro":   {"category": "runoff",        "frequencies": ["mon"],         "units": "kg m-2 s-1"},
    "mrso":   {"category": "soil_moisture", "frequencies": ["mon"],         "units": "kg m-2"},
    # ────── Storm (optional extras — only if present in ESGF for our GCMs) ──────
    "evspsbl":{"category": "runoff",        "frequencies": ["mon"],         "units": "kg m-2 s-1"},
}

CATEGORIES: List[str] = sorted({v["category"] for v in VARIABLE_CATALOG.values()})

# ─── Time window ─────────────────────────────────────────────────────────────
# Per spec §7 — slice processed data to this continuous range.
PROCESS_START_YEAR: int = 2000
PROCESS_END_YEAR: int = 2050

# Horizons surfaced by the API (matches methodology §2.4)
HORIZONS: List[int] = [2030, 2040, 2050]

# ─── EC2 working paths (mirror spec §4) ───────────────────────────────────────
PIPELINE_ROOT: Path = Path(os.getenv("PRANA_PIPELINE_ROOT", "/opt/climate-pipeline"))
SCRIPTS_DIR: Path = PIPELINE_ROOT / "scripts"
DOWNLOADS_DIR: Path = PIPELINE_ROOT / "downloads"
PROCESSED_DIR: Path = PIPELINE_ROOT / "processed"
LOGS_DIR: Path = PIPELINE_ROOT / "logs"

# ─── S3 layout (mirror spec §5, with model+frequency refinement) ─────────────
S3_RAW_PREFIX: str = "raw/cmip6"
S3_PROCESSED_PREFIX: str = "processed"
S3_DERIVED_PREFIX: str = "derived/hazard_scores"
S3_MANIFESTS_PREFIX: str = "manifests"


def s3_raw_key(scenario: str, model: str, variable: str, frequency: str, member: str, filename: str) -> str:
    """Return the S3 key for a raw CMIP6 .nc file."""
    return f"{S3_RAW_PREFIX}/{scenario}/{model}/{variable}/{frequency}/{member}/{filename}"


def s3_processed_key(category: str, scenario: str, model: str, variable: str, h3_cell: str) -> str:
    """Return the S3 key for an H3-indexed processed Parquet shard.

    Flat layout (matches the existing bucket):

        s3://<bucket>/processed/<category>/<scenario>/<model>/<variable>/<h3_cell>.parquet

    The earlier spec §5 mentioned partitioning by the first 2 hex chars of the
    H3 cell id, but the live bucket uses the flat layout — keep this code in
    sync with what's already uploaded so re-uploads don't double up.
    """
    return f"{S3_PROCESSED_PREFIX}/{category}/{scenario}/{model}/{variable}/{h3_cell}.parquet"


def s3_derived_key(scenario: str, horizon: int, h3_cell: str) -> str:
    """Return the S3 key for a derived hazard-score shard. Flat layout."""
    return f"{S3_DERIVED_PREFIX}/{scenario}/{horizon}/{h3_cell}.parquet"


def s3_manifest_key(scenario: str, model: str, variable: str, frequency: str) -> str:
    return f"{S3_MANIFESTS_PREFIX}/{scenario}/{model}/{variable}/{frequency}/manifest.json"


def ensure_local_dirs() -> None:
    """Create the EC2 working directory tree (idempotent)."""
    for d in (SCRIPTS_DIR, DOWNLOADS_DIR, LOGS_DIR):
        d.mkdir(parents=True, exist_ok=True)
    for scen in SCENARIOS:
        (DOWNLOADS_DIR / scen).mkdir(parents=True, exist_ok=True)
