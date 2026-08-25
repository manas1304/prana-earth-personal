#!/usr/bin/env python3
"""Stream the full CMIP6 pipeline from ESGF to S3 - never touch disk.

For each (model, variable, scenario, member, frequency) combination this
script:
    1. Resolves the ESGF HTTPS URL for the relevant file(s).
    2. Downloads each one to a temp file (streamed, deleted immediately).
    3. Processes it through ``process_data.py`` -> H3-bucketed Parquet shards.
    4. Uploads every shard to s3://prana-earth-data/processed/...
    5. Cleans up the temp file.

Peak disk usage: one file at a time (~200 MB for the largest).
Cumulative disk: zero.

Run with:
    PYTHONPATH=. python scripts/stream_full_pipeline.py
"""
from __future__ import annotations

import io
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import time
from pathlib import Path
from typing import Iterable

import requests

# Make the project importable regardless of cwd
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from prana_climate.config import (
    GCM_MODELS,
    SCENARIOS,
    S3_BUCKET,
    VARIABLE_CATALOG,
)

BUCKET = S3_BUCKET

# Where to stream-downloaded .nc files (deleted after each one)
TEMP_DIR = Path(tempfile.gettempdir()) / "prana_stream"
TEMP_DIR.mkdir(parents=True, exist_ok=True)

# State file - tracks what's been processed so we can resume
STATE_FILE = ROOT / "logs" / "stream_state.json"
STATE_FILE.parent.mkdir(parents=True, exist_ok=True)


def _state_file_override() -> Path:
    """If --state-file is passed, return that path instead of the default.

    Accepts both ``--state-file=PATH`` and ``--state-file PATH`` (argparse style).
    """
    args = sys.argv[1:]
    for i, arg in enumerate(args):
        if arg.startswith("--state-file="):
            return Path(arg.split("=", 1)[1])
        if arg == "--state-file" and i + 1 < len(args):
            return Path(args[i + 1])
    return STATE_FILE

# ESGF Solr search endpoint. DKRZ is the most reliable mirror right now.
# Both LBNL and ORNL have been returning HTML or 5xx lately.
ESGF_SEARCH = "https://esgf-data.dkrz.de/esg-search/search"

# Frequency mapping per variable
VAR_FREQ = {
    "pr":     "mon",
    "tas":    "mon",
    "tasmax": "mon",
    "tasmin": "mon",
    "hurs":   "mon",
    "huss":   "mon",
    "mrro":   "mon",
    "mrso":   "mon",
    "sfcWind":"mon",
}

# Friendly English - which scenarios to pull (we'll start with historical +
# all 4 SSPs).
SCENARIOS_TO_PULL = ["historical", "ssp126", "ssp245", "ssp370", "ssp585"]

# How many files (time-chunks) per variable to grab. The first file in the
# dataset is usually 1850-1899; we'd grab every chunk for full 2000-2050.
# For this streamer we cap at 5 chunks per (var, model, scenario) to keep
# the total at ~50 GB. 5 chunks × 5 models × 9 vars × 5 scenarios = 1125 files
# at ~50 MB each = ~56 GB raw.
MAX_CHUNKS_PER_DATASET = 5


# ─────────────────────────────────────────────────────────────────────────────
# State management - resumable
# ─────────────────────────────────────────────────────────────────────────────

def _load_state() -> dict:
    sf = _state_file_override()
    if sf.exists():
        return json.loads(sf.read_text())
    return {"completed": [], "failed": []}


def _save_state(state: dict) -> None:
    sf = _state_file_override()
    sf.parent.mkdir(parents=True, exist_ok=True)
    sf.write_text(json.dumps(state, indent=2))


def _clear_failures_if_requested(state: dict) -> dict:
    """If --reset-failures is set, drop the failed[] list so every entry
    in the failed list gets re-attempted. Used when the underlying issue
    (e.g. a missing Python backend) has been fixed and we want to retry
    all the prior failures."""
    import argparse
    parser = argparse.ArgumentParser(add_help=False)
    parser.add_argument("--reset-failures", action="store_true")
    try:
        args, _ = parser.parse_known_args()
    except SystemExit:
        return state
    if args.reset_failures and state.get("failed"):
        log.info("  --reset-failures: clearing %d prior failures for retry", len(state["failed"]))
        state["failed"] = []
        _save_state(state)
    return state


def _key(dataset_id: str, file_url: str) -> str:
    return f"{dataset_id}::{file_url}"


# ─────────────────────────────────────────────────────────────────────────────
# ESGF search
# ─────────────────────────────────────────────────────────────────────────────

def find_esgf_files(model: str, variable: str, scenario: str, frequency: str,
                    member: str = "r1i1p1f1", limit: int = MAX_CHUNKS_PER_DATASET) -> list[dict]:
    """Return up to `limit` ESGF file URLs for the given combination.

    Only files whose year range **overlaps** the project's processing window
    (PROCESS_START_YEAR..PROCESS_END_YEAR) are returned. ESGF returns results
    in arbitrary order, so we over-fetch then filter+sort.
    """
    table_id = "Amon" if frequency == "mon" else "day"
    # Over-fetch so we still have enough after the date filter.
    over_fetch = max(limit * 6, 30)
    params = {
        "type": "File",
        "project": "CMIP6",
        "source_id": model,
        "variable_id": variable,
        "experiment_id": scenario,
        "member_id": member,
        "frequency": frequency,
        "table_id": table_id,
        "limit": str(over_fetch),
        # DKRZ requires explicit JSON format hint; LBNL/ORNL don't care.
        "format": "application/solr+json",
    }
    try:
        r = requests.get(ESGF_SEARCH, params=params, timeout=60)
        r.raise_for_status()
        # Some bridges occasionally return HTML; guard against it.
        ctype = r.headers.get("content-type", "")
        if "html" in ctype:
            print(f"  [ESGF] non-JSON response from {ESGF_SEARCH} for {model}/{variable}/{scenario}")
            return []
        data = r.json()
    except Exception as e:
        print(f"  [ESGF search] error for {model}/{variable}/{scenario}: {e}")
        return []

    # Skip list - data nodes that are slow / unreachable from your region
    SKIP_HOSTS = (
        "esgf-data04.diasjp.net",   # Japan node, often times out
        "esgf.nci.org.au",          # Australia node, can be slow
    )

    from prana_climate.config import PROCESS_START_YEAR, PROCESS_END_YEAR
    lo, hi = PROCESS_START_YEAR, PROCESS_END_YEAR

    docs = data.get("response", {}).get("docs", [])
    files = []
    for d in docs:
        urls = d.get("url", [])
        url = None
        for u in urls:
            if isinstance(u, str) and "http" in u and "HTTPServer" in u:
                candidate = u.split("|")[0]
                if any(host in candidate for host in SKIP_HOSTS):
                    continue
                url = candidate
                break
        if not url:
            for u in urls:
                if isinstance(u, str) and u.startswith("http") and "opendap" not in u.lower():
                    if any(host in u for host in SKIP_HOSTS):
                        continue
                    url = u.split("|")[0]
                    break
        if not url:
            continue

        # Filter by year range using the filename's `<start>-<end>.nc` part.
        fname = Path(url).name
        m = re.search(r"_(\d{6})-(\d{6})\.nc$", fname)
        if m:
            f_start = int(m.group(1)[:4])
            f_end = int(m.group(2)[:4])
        else:
            # Fall back to metadata fields if filename pattern is unfamiliar.
            try:
                f_start = int(str(d.get("start", ""))[:4] or 0)
                f_end = int(str(d.get("end", ""))[:4] or 0)
            except Exception:
                f_start, f_end = lo, hi

        # Drop chunks that don't overlap the project window.
        if f_end < lo or f_start > hi:
            continue

        files.append({
            "instance_id": d.get("instance_id", "?"),
            "size": d.get("size", 0),
            "url": url,
            "start": f_start,
            "end": f_end,
        })

    # Prefer chunks that overlap the window most (latest first).
    files.sort(key=lambda f: (f["end"], f["start"]), reverse=True)
    files = files[:limit]
    return files


def stream_to_bytes(url: str, progress_cb=None) -> bytes:
    """Download a URL into a BytesIO buffer with progress reporting."""
    r = requests.get(url, stream=True, timeout=600)
    r.raise_for_status()
    total = int(r.headers.get("content-length", 0))
    buf = bytearray()
    got = 0
    for chunk in r.iter_content(chunk_size=1024 * 1024):
        if not chunk:
            continue
        buf.extend(chunk)
        got += len(chunk)
        if progress_cb:
            progress_cb(got, total)
    return bytes(buf)


def stream_to_tempfile(url: str, progress_cb=None) -> Path:
    """Download a URL to a temp file (deleted by caller)."""
    tmp_path = TEMP_DIR / Path(url).name
    r = requests.get(url, stream=True, timeout=600)
    r.raise_for_status()
    total = int(r.headers.get("content-length", 0))
    got = 0
    with open(tmp_path, "wb") as f:
        for chunk in r.iter_content(chunk_size=1024 * 1024):
            if not chunk:
                continue
            f.write(chunk)
            got += len(chunk)
            if progress_cb:
                progress_cb(got, total)
    return tmp_path


# ─────────────────────────────────────────────────────────────────────────────
# Single boto3 client reused across all uploads in this script run.
# The earlier version created a new client per file; that caused
# SignatureDoesNotMatch errors after ~200 uploads because boto3's
# credential cache lost sync with the live credentials.
# ─────────────────────────────────────────────────────────────────────────────

_SESSION = None
_CLIENT = None


def _get_s3_client():
    """Return a cached boto3 S3 client for this process.

    Creates ONE Session + ONE client at the start of the script run,
    reuses them for every upload. The previous version created a fresh
    client per call, which caused sporadic SignatureDoesNotMatch errors
    after ~50 uploads because boto3's metadata cache lost sync with the
    live credentials.
    """
    global _SESSION, _CLIENT
    if _CLIENT is not None:
        return _CLIENT
    import boto3
    from botocore.config import Config

    # Try env vars first, then fall back to a config file the user can
    # drop in (./.aws-credentials.json). Embedding the credentials in
    # source code itself is opt-in via PRANA_AWS_KEY_ID / PRANA_AWS_SECRET.
    awsk = (
        os.environ.get("PRANA_AWS_KEY_ID")
        or os.environ.get("AWS_ACCESS_KEY_ID")
    )
    awss = (
        os.environ.get("PRANA_AWS_SECRET")
        or os.environ.get("AWS_SECRET_ACCESS_KEY")
    )
    region = os.environ.get("AWS_REGION", "ap-south-1")
    if awsk and awss:
        _SESSION = boto3.session.Session(
            aws_access_key_id=awsk,
            aws_secret_access_key=awss,
            region_name=region,
        )
    else:
        _SESSION = boto3.session.Session(region_name=region)
    _CLIENT = _SESSION.client(
        "s3",
        config=Config(
            signature_version="s3v4",
            retries={"max_attempts": 5, "mode": "adaptive"},
            connect_timeout=10,
            read_timeout=60,
        ),
    )
    return _CLIENT


def _upload_with_retry(local_path: Path, s3_key: str, max_attempts: int = 3) -> bool:
    """Upload one file with simple retry on transient errors."""
    import time as _time
    s3 = _get_s3_client()
    for attempt in range(1, max_attempts + 1):
        try:
            s3.upload_file(str(local_path), BUCKET, s3_key)
            return True
        except Exception as exc:
            err = str(exc)
            if attempt < max_attempts and ("SignatureDoesNotMatch" in err or "Throttling" in err):
                print(f"  ! {type(exc).__name__} on {s3_key} (attempt {attempt}) — retrying")
                _time.sleep(2 ** attempt)
                global _CLIENT
                _CLIENT = None  # force the next call to rebuild the client
                s3 = _get_s3_client()
                continue
            raise
    return False


def upload_file_to_s3(local_path: Path, s3_key: str) -> None:
    """Upload a single file to S3 (with retry on transient errors)."""
    _upload_with_retry(local_path, s3_key)


def upload_parquet_dir_to_s3(local_dir: Path, s3_prefix: str) -> int:
    """Upload every *.parquet under local_dir to s3://<bucket>/<s3_prefix>/."""
    count = 0
    for path in sorted(local_dir.rglob("*.parquet")):
        rel = path.relative_to(local_dir)
        key = f"{s3_prefix}/{rel.as_posix()}"
        _upload_with_retry(path, key)
        count += 1
    return count


# ─────────────────────────────────────────────────────────────────────────────
# xarray processing - open from BytesIO, validate, write H3 shards
# ─────────────────────────────────────────────────────────────────────────────

def process_in_memory(nc_bytes: bytes, variable: str, scenario: str, model: str,
                       frequency: str) -> int:
    """Open a .nc file from bytes, validate, emit H3-bucketed Parquet shards.

    The netCDF4 C library needs a real file handle (it can't seek inside a
    BytesIO reliably), so we write to a temp file that gets deleted
    immediately after xarray closes the file.

    Returns the number of shards written.
    """
    import numpy as np
    import os
    import pandas as pd
    import tempfile
    import xarray as xr

    from prana_climate.h3_grid import map_dataset_to_h3
    from prana_climate.units import NORMALIZERS
    from prana_climate.validators import validate

    # Write to a temp file (closed before xarray opens it) so the netCDF4
    # C library has a real file path. Deleted after processing.
    tmp_fd, tmp_path = tempfile.mkstemp(suffix=".nc")
    os.close(tmp_fd)
    try:
        with open(tmp_path, "wb") as f:
            f.write(nc_bytes)
        # Try several xarray open strategies. Skip use_cftime=True because
        # it hangs in some Windows/sandbox environments. h5netcdf is the
        # only backend that can read GFDL-ESM4's HDF5-based NetCDF4 files
        # (their files use HDF5 features that netcdf4 chokes on with
        # "Errno -101 NetCDF: HDF error").
        last_err = None
        ds = None
        for kwargs in (
            {"engine": "h5netcdf"},  # GFDL files need this
            {},                      # auto-detect (default)
            {"engine": "netcdf4"},   # explicit netcdf4
            {"engine": "scipy"},     # pure Python fallback
        ):
            try:
                ds = xr.open_dataset(tmp_path, decode_times=False, **kwargs)
                # Eager load: small files (post-ncks slice, <70 MB) fit in
                # memory easily. dask chunking caused worker deadlock on
                # 2-core instances so we don't use it.
                ds = ds.load()
                # Decode time manually as datetime64 from whatever units it has.
                if "time" in ds:
                    try:
                        ds["time"] = xr.decode_cf(ds.time, use_cftime=False)
                    except Exception:
                        pass
                break
            except Exception as exc:
                last_err = exc
                ds = None
        if ds is None:
            raise RuntimeError(f"xarray could not open NetCDF: {last_err}")
    finally:
        try:
            os.unlink(tmp_path)
        except Exception:
            pass

    report = validate(ds)
    if not report.ok:
        print(f"  Validation failed: {report.errors}")
        return 0

    # Slice to whatever year range the file contains. CMIP6 historical
    # files start in 1850, SSPs start in 2015. We slice to the project
    # window (PROCESS_START_YEAR..PROCESS_END_YEAR) and skip the file
    # entirely if no timestep overlaps — otherwise we'd upload 127k
    # empty H3 shards for every pre-2000 chunk.
    from prana_climate.config import PROCESS_START_YEAR, PROCESS_END_YEAR
    times = ds["time"].values

    def _year(t):
        if hasattr(t, "year"):
            y = t.year
            if callable(y):
                y = y()
            try:
                return int(y)
            except (TypeError, ValueError):
                return None
        return None

    years = [_year(t) for t in times]
    if not years or all(y is None for y in years):
        # No usable time axis — keep everything (better than dropping the file).
        mask = np.ones(len(times), dtype=bool)
    else:
        lo, hi = PROCESS_START_YEAR, PROCESS_END_YEAR
        mask = np.array([y is not None and lo <= y <= hi for y in years], dtype=bool)

    if not mask.any():
        # Nothing in the file falls in the project window. Skip the upload.
        print(f"  No timesteps in {PROCESS_START_YEAR}-{PROCESS_END_YEAR} for "
              f"{scenario}/{model}/{variable} — skipping.")
        return 0

    ds = ds.sel(time=mask)

    # Normalize units
    if variable in NORMALIZERS:
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

    # Map to H3 res-6
    ds_h3 = map_dataset_to_h3(ds, variable)

    # Convert cftime -> pandas Timestamp for pyarrow
    df = ds_h3[variable].to_dataset(name=variable).to_dataframe().reset_index()
    df = df.dropna(subset=[variable])
    if "time" in df.columns:
        df["time"] = pd.to_datetime(
            df["time"].apply(lambda t: pd.Timestamp(t.isoformat())
                             if hasattr(t, "isoformat") else t),
            errors="coerce",
        )
        df = df.dropna(subset=["time"])

    # Write to a temp dir, then upload to S3
    out_dir = TEMP_DIR / f"shards_{int(time.time()*1000)}"
    out_dir.mkdir(parents=True, exist_ok=True)
    category = VARIABLE_CATALOG[variable]["category"]
    target_dir = out_dir / category / scenario / model / variable
    target_dir.mkdir(parents=True, exist_ok=True)

    written = 0
    for cell_id, sub in df.groupby("h3_cell"):
        path = target_dir / f"{cell_id}.parquet"
        sub.to_parquet(path, engine="pyarrow", index=False)
        written += 1

    # Upload to S3
    s3_prefix = f"processed/{category}/{scenario}/{model}/{variable}"
    uploaded = upload_parquet_dir_to_s3(target_dir, s3_prefix)

    # Clean up local
    shutil.rmtree(out_dir, ignore_errors=True)
    return uploaded


# ─────────────────────────────────────────────────────────────────────────────
# Main runner
# ─────────────────────────────────────────────────────────────────────────────

def _print_progress(done: int, total: int, msg: str, start: float) -> None:
    elapsed = time.time() - start
    rate = done / elapsed if elapsed > 0 else 0
    eta = (total - done) / rate if rate > 0 else 0
    print(f"  [{done}/{total}] {msg}  total={elapsed/60:.1f}min  ETA={eta/60:.1f}min")


def main() -> int:
    import argparse
    p = argparse.ArgumentParser()
    p.add_argument("--models", nargs="*", default=GCM_MODELS,
                   help="Subset of GCMs to pull (default: all 5)")
    p.add_argument("--variables", nargs="*", default=list(VAR_FREQ.keys()),
                   help="Subset of variables (default: pr,tas,tasmax,tasmin,hurs,huss,mrro,mrso,sfcWind)")
    p.add_argument("--scenarios", nargs="*", default=SCENARIOS_TO_PULL)
    p.add_argument("--max-chunks", type=int, default=MAX_CHUNKS_PER_DATASET,
                   help="Time-chunked files per dataset (default 5)")
    p.add_argument("--upload-only", action="store_true",
                   help="Skip ESGF download, just upload from existing local dir")
    p.add_argument("--local-dir", type=Path, default=ROOT / "downloads",
                   help="If --upload-only, read .nc from here")
    p.add_argument("--state-file", type=Path,
                   help="Override the path to stream_state.json. Use to run parallel batches with isolated state.")
    p.add_argument("--reset-failures", action="store_true",
                   help="Clear the failed[] list at startup so every prior failure is retried.")
    args = p.parse_args()

    start = time.time()
    state = _load_state()
    # If --reset-failures, drop the prior failures so they get re-tried.
    if args.reset_failures and state.get("failed"):
        print(f"--reset-failures: clearing {len(state['failed'])} prior failures for retry")
        state["failed"] = []
        _save_state(state)
    done = len(state["completed"])
    total_jobs = (
        len(args.models) * len(args.variables) *
        len(args.scenarios) * args.max_chunks
    )

    print("=" * 70)
    print("  Prana Earth - streaming CMIP6 -> S3 pipeline")
    print("=" * 70)
    print(f"  Bucket: s3://{BUCKET}/")
    print(f"  Models: {args.models}")
    print(f"  Variables: {args.variables}")
    print(f"  Scenarios: {args.scenarios}")
    print(f"  Max chunks per dataset: {args.max_chunks}")
    print(f"  Total file jobs: {total_jobs}")
    print(f"  Already completed: {done}")
    print(f"  Local disk used: 0 (everything streams)")
    print()

    for model in args.models:
        for variable in args.variables:
            frequency = VAR_FREQ.get(variable, "mon")
            for scenario in args.scenarios:
                if args.upload_only:
                    # Look in BOTH layouts:
                    #   downloads/<scenario>/<model>/<variable>/*.nc  (nested)
                    #   downloads/<scenario>/*.nc                     (flat from `--download-only`)
                    nc_files = []
                    nested = args.local_dir / scenario / model / variable
                    flat = args.local_dir / scenario
                    if nested.exists():
                        nc_files = sorted(nested.glob("*.nc"))
                    if not nc_files and flat.exists():
                        nc_files = sorted([
                            p for p in flat.glob(f"{variable}_*.nc")
                            if model in p.name
                        ])
                    if not nc_files:
                        print(f"  SKIP {model}/{variable}/{scenario}: no {variable}*.nc in {flat}")
                        continue

                    # Drop chunks that fall entirely outside the project window.
                    # Pre-2000 historical chunks would otherwise upload 127k
                    # empty shards each.
                    from prana_climate.config import PROCESS_START_YEAR, PROCESS_END_YEAR
                    lo, hi = PROCESS_START_YEAR, PROCESS_END_YEAR
                    filtered = []
                    for p in nc_files:
                        m = re.search(r"_(\d{6})-(\d{6})\.nc$", p.name)
                        if not m:
                            filtered.append(p)
                            continue
                        f_start = int(m.group(1)[:4])
                        f_end = int(m.group(2)[:4])
                        if f_end < lo or f_start > hi:
                            print(f"  drop {p.name}: {f_start}-{f_end} outside [{lo},{hi}]")
                            continue
                        filtered.append(p)
                    nc_files = filtered
                    if not nc_files:
                        print(f"  SKIP {model}/{variable}/{scenario}: all chunks outside {lo}-{hi}")
                        continue
                    for nc_path in nc_files:
                        key = _key(f"local:{nc_path}", "local")
                        if key in state["completed"]:
                            continue
                        t0 = time.time()
                        print(f"\n[{model}/{variable}/{scenario}] {nc_path.name}")
                        try:
                            data = nc_path.read_bytes()
                            uploaded = process_in_memory(
                                data, variable, scenario, model, frequency,
                            )
                            elapsed = time.time() - t0
                            print(f"  + {uploaded} shards uploaded in {elapsed:.1f}s")
                            state["completed"].append(key)
                            _save_state(state)
                        except Exception as exc:
                            print(f"  X failed: {exc}")
                            state["failed"].append((key, str(exc)))
                            _save_state(state)
                    continue

                # ESGF search -> stream -> process -> upload
                files = find_esgf_files(
                    model, variable, scenario, frequency,
                    limit=args.max_chunks,
                )
                if not files:
                    print(f"  [{model}/{variable}/{scenario}] no ESGF files")
                    continue

                for f in files:
                    key = _key(f["instance_id"], f["url"])
                    if key in state["completed"]:
                        continue

                    size_mb = (f["size"] or 0) / (1024 * 1024)
                    t0 = time.time()
                    print(f"\n[{model}/{variable}/{scenario}] "
                          f"{Path(f['url']).name}  ({size_mb:.1f} MB)")

                    def _cb(got, total, chunk=size_mb):
                        sys.stdout.write(
                            f"\r  downloading {got/(1024*1024):.1f}/{chunk:.1f} MB "
                        )
                        sys.stdout.flush()

                    try:
                        nc_bytes = stream_to_bytes(f["url"], progress_cb=_cb)
                        sys.stdout.write("\n")
                        uploaded = process_in_memory(
                            nc_bytes, variable, scenario, model, frequency,
                        )
                        elapsed = time.time() - t0
                        print(f"  + {uploaded} shards uploaded in {elapsed:.1f}s")
                        state["completed"].append(key)
                        _save_state(state)
                    except Exception as exc:
                        print(f"  X failed: {exc}")
                        state["failed"].append((key, str(exc)))
                        _save_state(state)

    elapsed = time.time() - start
    print()
    print("=" * 70)
    print(f"  Done. {len(state['completed'])} files processed in {elapsed/60:.1f} min")
    print(f"  Failed: {len(state['failed'])}")
    print(f"  Local disk used: 0 GB (everything streamed)")
    print(f"  S3 uploaded to: s3://{BUCKET}/processed/...")
    print("=" * 70)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
