#!/usr/bin/env python3
"""Pre-download CMIP6 .nc files from ESGF to local disk.

This is the *safe* download path - it does NOT upload to S3, it just
fetches files to downloads/<scenario>/<model>/<variable>/. Once files
are on disk, you can run the smoke test:

    python scripts/stream_full_pipeline.py --upload-only \\
        --models MPI-ESM1-2-HR --variables pr tas --max-chunks 5

...and the smoke test uploads them to S3.

This split avoids the SignatureDoesNotMatch + xarray-hang issues that
plague the combined streaming script.
"""
from __future__ import annotations

import os
import sys
import time
from pathlib import Path
from typing import Iterable

import requests

# Project root
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

# Reuse the streaming script's ESGF search + skip-list
from scripts.stream_full_pipeline import (
    find_esgf_files,
    VAR_FREQ,
    SCENARIOS_TO_PULL,
    MAX_CHUNKS_PER_DATASET,
)

DOWNLOADS_DIR = ROOT / "downloads"


def download_one(url: str, dest: Path) -> int:
    """Stream a URL to dest, return bytes downloaded."""
    if dest.exists() and dest.stat().st_size > 1_000_000:
        print(f"  Cached: {dest.name} ({dest.stat().st_size // 1024} KB)")
        return dest.stat().st_size
    dest.parent.mkdir(parents=True, exist_ok=True)
    r = requests.get(url, stream=True, timeout=600)
    r.raise_for_status()
    total = int(r.headers.get("content-length", 0))
    got = 0
    with open(dest, "wb") as f:
        for chunk in r.iter_content(chunk_size=1024 * 1024):
            if not chunk:
                continue
            f.write(chunk)
            got += len(chunk)
    print(f"  Downloaded {dest.name} ({got // 1024} KB)")
    return got


def main():
    import argparse
    p = argparse.ArgumentParser()
    p.add_argument("--models", nargs="*", default=["MPI-ESM1-2-HR"])
    p.add_argument("--variables", nargs="*", default=["pr", "tas"])
    p.add_argument("--scenarios", nargs="*", default=["historical", "ssp126", "ssp245", "ssp370", "ssp585"])
    p.add_argument("--max-chunks", type=int, default=5)
    args = p.parse_args()

    print(f"[download] Bucket target: not uploading (--download-only mode)")
    print(f"[download] Models: {args.models}")
    print(f"[download] Variables: {args.variables}")
    print(f"[download] Scenarios: {args.scenarios}")
    print(f"[download] Max chunks per dataset: {args.max_chunks}")
    print(f"[download] Local dir: {DOWNLOADS_DIR}")
    print()

    total_files = 0
    total_bytes = 0
    start = time.time()

    for model in args.models:
        for variable in args.variables:
            freq = VAR_FREQ.get(variable, "mon")
            for scenario in args.scenarios:
                files = find_esgf_files(model, variable, scenario, freq, limit=args.max_chunks)
                if not files:
                    print(f"  [{model}/{variable}/{scenario}] no ESGF files")
                    continue
                for f in files:
                    url = f["url"]
                    fname = Path(url).name
                    dest = DOWNLOADS_DIR / scenario / fname
                    got = download_one(url, dest)
                    total_files += 1
                    total_bytes += got

    elapsed = time.time() - start
    print()
    print("=" * 70)
    print(f"  Downloaded {total_files} files, {total_bytes / 1024 / 1024:.1f} MB")
    print(f"  in {elapsed / 60:.1f} min")
    print(f"  to {DOWNLOADS_DIR}/")
    print()
    print("  Now upload to S3 with the upload-only smoke test:")
    print("    python scripts/stream_full_pipeline.py --upload-only \\")
    print("        --models MPI-ESM1-2-HR --variables pr tas --max-chunks 5")
    print("=" * 70)


if __name__ == "__main__":
    main()
