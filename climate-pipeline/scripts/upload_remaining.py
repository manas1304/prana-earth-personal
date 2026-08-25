#!/usr/bin/env python3
"""upload_remaining.py — push every locally-processed parquet shard to S3
that's not yet there.

Uses the existing `s3_inventory.txt` snapshot (generated previously by the
EC2 box) as the "already uploaded" baseline, then walks
`processed/<category>/<scenario>/<model>/<variable>/` and uploads every
`.parquet` shard under S3's expected key.

Re-running is safe: the script skips keys already present in
`s3_inventory.txt`. Use `--refresh-inventory` to re-list the bucket first
(requires AWS credentials).

Usage
-----
    # 1. Offline (uses cached s3_inventory.txt as baseline)
    python scripts/upload_remaining.py

    # 2. Refresh inventory from S3 first, then upload
    python scripts/upload_remaining.py --refresh-inventory

    # 3. Only upload a specific category/scenario/model/variable
    python scripts/upload_remaining.py \\
        --category temperature --scenario ssp245 \\
        --model MPI-ESM1-2-HR --variable tas

    # 4. Dry-run
    python scripts/upload_remaining.py --dry-run
"""
from __future__ import annotations

import argparse
import logging
import os
import sys
import time
from pathlib import Path
from typing import Dict, Set, Tuple

import boto3
from boto3.s3.transfer import TransferConfig
from botocore.exceptions import ClientError

# Project root
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from prana_climate.config import (
    S3_BUCKET,
    S3_PROCESSED_PREFIX,
    s3_processed_key,
)

# Auto-detect local processed/ dir — EC2 default is /opt/climate-pipeline/processed,
# but on Windows dev boxes we want <repo>/climate-pipeline/processed.
_default_processed = Path("/opt/climate-pipeline/processed")
if not _default_processed.exists():
    PROCESSED_DIR = ROOT / "processed"
else:
    PROCESSED_DIR = _default_processed

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
log = logging.getLogger("upload_remaining")

INVENTORY_PATH = ROOT / "s3_inventory.txt"


# ─── Inventory helpers ────────────────────────────────────────────────────────
def _parse_inventory(path: Path) -> Set[str]:
    """Return the set of S3 keys present in the cached inventory file."""
    if not path.exists():
        log.warning("No cached inventory at %s — assuming nothing uploaded.", path)
        return set()
    import re
    keys: Set[str] = set()
    pat = re.compile(r"^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}\s+\d+\s+(\S+)\s*$")
    for line in path.read_text(encoding="utf-8", errors="replace").splitlines():
        m = pat.match(line)
        if m:
            keys.add(m.group(1))
    log.info("Inventory: %d keys cached in %s", len(keys), path.name)
    return keys


def _list_s3_keys(bucket: str, prefix: str) -> Set[str]:
    """Paginate through S3 and return every key under <prefix>."""
    s3 = boto3.client("s3")
    keys: Set[str] = set()
    paginator = s3.get_paginator("list_objects_v2")
    for page in paginator.paginate(Bucket=bucket, Prefix=prefix):
        for obj in page.get("Contents", []):
            keys.add(obj["Key"])
    return keys


def _list_s3_inventory(bucket: str, out_path: Path) -> int:
    """Walk the full bucket and write a snapshot matching `s3_inventory.txt` format."""
    s3 = boto3.client("s3")
    log.info("Listing s3://%s/ ...", bucket)
    n = 0
    out_path.write_text("", encoding="utf-8")
    paginator = s3.get_paginator("list_objects_v2")
    for page in paginator.paginate(Bucket=bucket):
        bucket_name = page.get("Name", bucket)
        for obj in page.get("Contents", []):
            ts = obj["LastModified"].strftime("%Y-%m-%d %H:%M:%S")
            line = f"{ts} {obj['Size']:>10} {obj['Key']}\n"
            with out_path.open("a", encoding="utf-8") as f:
                f.write(line)
            n += 1
    log.info("Wrote %d keys -> %s", n, out_path)
    return n


# ─── Core walk + upload ──────────────────────────────────────────────────────
def _walk_processed(
    category: str | None,
    scenario: str | None,
    model: str | None,
    variable: str | None,
) -> list[Tuple[str, str, str, str, Path]]:
    """Return every (category, scenario, model, variable, parquet_path) tuple
    under processed/, optionally filtered by the given dimensions."""
    if not PROCESSED_DIR.exists():
        raise FileNotFoundError(f"processed dir missing: {PROCESSED_DIR}")
    out: list[Tuple[str, str, str, str, Path]] = []
    cat_dirs = [PROCESSED_DIR / category] if category else sorted(p for p in PROCESSED_DIR.iterdir() if p.is_dir())
    for cat_dir in cat_dirs:
        cat = cat_dir.name
        scen_dirs = [cat_dir / scenario] if scenario else sorted(p for p in cat_dir.iterdir() if p.is_dir())
        for scen_dir in scen_dirs:
            scen = scen_dir.name
            model_dirs = [scen_dir / model] if model else sorted(p for p in scen_dir.iterdir() if p.is_dir())
            for model_dir in model_dirs:
                mdl = model_dir.name
                var_dirs = [model_dir / variable] if variable else sorted(p for p in model_dir.iterdir() if p.is_dir())
                for var_dir in var_dirs:
                    var = var_dir.name
                    for parq in sorted(var_dir.rglob("*.parquet")):
                        out.append((cat, scen, mdl, var, parq))
    return out


def _plan(
    tuples: list[Tuple[str, str, str, str, Path]],
    existing: Set[str],
) -> list[Tuple[str, str, str, str, Path, str]]:
    """Return the subset of tuples whose expected S3 key is NOT in `existing`."""
    plan: list[Tuple[str, str, str, str, Path, str]] = []
    for cat, scen, mdl, var, path in tuples:
        h3_cell = path.stem
        key = s3_processed_key(cat, scen, mdl, var, h3_cell)
        if key in existing:
            continue
        plan.append((cat, scen, mdl, var, path, key))
    return plan


def _upload(plan: list[Tuple[str, str, str, str, Path, str]]) -> Dict[str, int]:
    """Upload each (category, scenario, model, variable, path, key) tuple."""
    s3 = boto3.client("s3")
    cfg = TransferConfig(
        multipart_threshold=8 * 1024 * 1024,
        multipart_chunksize=8 * 1024 * 1024,
        max_concurrency=8,
        use_threads=True,
    )
    by_tuple: Dict[str, int] = {}
    total = len(plan)
    t0 = time.time()
    log.info("Uploading %d shards to s3://%s/ ...", total, S3_BUCKET)
    for i, (cat, scen, mdl, var, path, key) in enumerate(plan, 1):
        tup = f"{cat}/{scen}/{mdl}/{var}"
        try:
            s3.upload_file(str(path), S3_BUCKET, key, Config=cfg)
        except ClientError as exc:
            log.error("  X %s — %s: %s", tup, path.name, exc)
            continue
        by_tuple[tup] = by_tuple.get(tup, 0) + 1
        if i % 200 == 0 or i == total:
            elapsed = time.time() - t0
            rate = i / elapsed if elapsed > 0 else 0
            log.info("  %d/%d uploaded (%.1f shards/sec, %.1fs elapsed)", i, total, rate, elapsed)
    return by_tuple


def _dry_print(plan: list[Tuple[str, str, str, str, Path, str]]) -> None:
    by_tuple: Dict[str, int] = {}
    for cat, scen, mdl, var, _path, _key in plan:
        tup = f"{cat}/{scen}/{mdl}/{var}"
        by_tuple[tup] = by_tuple.get(tup, 0) + 1
    log.info("Dry-run: %d shards across %d tuples would be uploaded", len(plan), len(by_tuple))
    for tup in sorted(by_tuple):
        log.info("  %5d  %s", by_tuple[tup], tup)


# ─── CLI ──────────────────────────────────────────────────────────────────────
def main() -> int:
    p = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    p.add_argument("--category", help="Filter: precipitation|temperature|humidity|...")
    p.add_argument("--scenario", help="Filter: historical|ssp126|...")
    p.add_argument("--model", help="Filter: MPI-ESM1-2-HR|MRI-ESM2-0|...")
    p.add_argument("--variable", help="Filter: pr|tas|tasmax|...")
    p.add_argument("--refresh-inventory", action="store_true",
                   help="Re-list the S3 bucket and rewrite s3_inventory.txt before planning.")
    p.add_argument("--dry-run", action="store_true",
                   help="Show what would be uploaded without actually uploading.")
    p.add_argument("--bucket", default=S3_BUCKET, help=f"S3 bucket (default: {S3_BUCKET})")
    p.add_argument("--region", default=os.getenv("AWS_REGION", "ap-south-1"))
    args = p.parse_args()

    log.info("Bucket: s3://%s/   Region: %s", args.bucket, args.region)
    log.info("Local processed dir: %s", PROCESSED_DIR)

    # 1. Build the "already uploaded" set
    if args.refresh_inventory:
        _list_s3_inventory(args.bucket, INVENTORY_PATH)
    existing = _parse_inventory(INVENTORY_PATH)
    log.info("Already uploaded (per inventory): %d keys", len(existing))

    # 2. Walk local processed/
    tuples = _walk_processed(args.category, args.scenario, args.model, args.variable)
    if not tuples:
        log.warning("No local parquet shards found for the given filter.")
        return 0
    log.info("Local parquet shards in scope: %d", len(tuples))

    # 3. Plan the diff
    plan = _plan(tuples, existing)
    if not plan:
        log.info("Nothing to upload — every local shard is already in S3.")
        return 0

    # 4. Dry-run or upload
    if args.dry_run:
        _dry_print(plan)
        return 0

    by_tuple = _upload(plan)
    log.info("=" * 70)
    log.info("  Uploaded %d shards across %d (scenario, model, variable) tuples", len(plan), len(by_tuple))
    for tup in sorted(by_tuple):
        log.info("    %5d  %s", by_tuple[tup], tup)
    log.info("=" * 70)
    log.info("Refresh the inventory snapshot to confirm:")
    log.info("  python scripts/upload_remaining.py --refresh-inventory")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
