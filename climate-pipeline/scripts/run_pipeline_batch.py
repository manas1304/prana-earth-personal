#!/usr/bin/env python3
"""run_pipeline_batch.py — drive the streaming pipeline over every (model,
variable, scenario) tuple that has local source data but hasn't yet been
uploaded to S3.

For each missing tuple this script shells out to
``stream_full_pipeline.py --upload-only --models M --variables V --scenarios S``
so the existing state file tracks progress and the run is resumable.

Reads the cached ``s3_inventory.txt`` for the "already uploaded" baseline.
Use ``--refresh-inventory`` to re-list the bucket first (requires AWS
credentials).

Usage
-----
    # 1. Plan only (no AWS calls) — shows what would be processed
    python scripts/run_pipeline_batch.py --plan

    # 2. Run all missing tuples (requires AWS + ESGF connectivity)
    python scripts/run_pipeline_batch.py

    # 3. Refresh inventory from S3 first, then run
    python scripts/run_pipeline_batch.py --refresh-inventory

    # 4. Limit scope
    python scripts/run_pipeline_batch.py --models GFDL-ESM4 --variables pr --scenarios ssp245

    # 5. Run two batches in parallel (different --state-file, disjoint scopes)
    python scripts/run_pipeline_batch.py --variables hurs huss pr \
        --state-file logs/state_humidity.json --max-chunks 1 \
        --refresh-inventory
    python scripts/run_pipeline_batch.py --variables tas tasmax tasmin \
        --state-file logs/state_temperature.json --max-chunks 1 \
        --refresh-inventory
"""
from __future__ import annotations

import argparse
import logging
import re
import subprocess
import sys
import time
from pathlib import Path
from typing import Dict, List, Set, Tuple

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from prana_climate.config import (
    GCM_MODELS,
    SCENARIOS,
    S3_BUCKET,
    VARIABLE_CATALOG,
    s3_processed_key,
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
log = logging.getLogger("run_pipeline_batch")

INVENTORY_PATH = ROOT / "s3_inventory.txt"
STREAM_PY = ROOT / "scripts" / "stream_full_pipeline.py"


# ─── Inventory helpers (mirror upload_remaining.py) ──────────────────────────
def _parse_inventory(path: Path) -> Set[str]:
    """Return S3 keys cached in `s3_inventory.txt`."""
    if not path.exists():
        log.warning("No cached inventory at %s — assuming nothing uploaded.", path)
        return set()
    keys: Set[str] = set()
    pat = re.compile(r"^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}\s+\d+\s+(\S+)\s*$")
    for line in path.read_text(encoding="utf-8", errors="replace").splitlines():
        m = pat.match(line)
        if m:
            keys.add(m.group(1))
    log.info("Inventory: %d cached keys", len(keys))
    return keys


def _refresh_inventory(bucket: str, out: Path) -> int:
    import boto3
    s3 = boto3.client("s3")
    log.info("Listing s3://%s/ ...", bucket)
    n = 0
    out.write_text("", encoding="utf-8")
    paginator = s3.get_paginator("list_objects_v2")
    for page in paginator.paginate(Bucket=bucket):
        for obj in page.get("Contents", []):
            ts = obj["LastModified"].strftime("%Y-%m-%d %H:%M:%S")
            with out.open("a", encoding="utf-8") as f:
                f.write(f"{ts} {obj['Size']:>10} {obj['Key']}\n")
            n += 1
    log.info("Wrote %d keys -> %s", n, out)
    return n


# ─── Source-data discovery ────────────────────────────────────────────────────
def _list_local_sources(downloads: Path) -> Set[Tuple[str, str, str]]:
    """Walk `downloads/<scenario>/` and infer every (scenario, model, variable)
    tuple from the .nc filenames.
    """
    if not downloads.exists():
        return set()
    out: Set[Tuple[str, str, str]] = set()
    # CMIP6 CMIP filename convention: <var>_Amon_<model>_<scenario>_<member>_<grid>_<years>.nc
    pat = re.compile(r"^([a-zA-Z]+)_Amon_([A-Za-z0-9\-\.]+)_([a-z0-9]+)_")
    for nc in downloads.rglob("*.nc"):
        m = pat.match(nc.name)
        if not m:
            continue
        variable, model, scenario = m.group(1), m.group(2), m.group(3)
        if model not in GCM_MODELS:
            continue
        if variable not in VARIABLE_CATALOG:
            continue
        out.add((scenario, model, variable))
    return out


def _uploaded_tuples(existing: Set[str]) -> Set[Tuple[str, str, str]]:
    """Inspect the S3 keys and extract every (scenario, model, variable)
    tuple that has at least one parquet shard present."""
    tuples: Set[Tuple[str, str, str]] = set()
    pat = re.compile(r"^processed/([^/]+)/([^/]+)/([^/]+)/([^/]+)/")
    for key in existing:
        m = pat.match(key)
        if not m:
            continue
        category, scenario, model, variable = m.group(1), m.group(2), m.group(3), m.group(4)
        if model not in GCM_MODELS or variable not in VARIABLE_CATALOG:
            continue
        if VARIABLE_CATALOG[variable]["category"] != category:
            continue
        tuples.add((scenario, model, variable))
    return tuples


def _plan(local: Set[Tuple[str, str, str]],
          uploaded: Set[Tuple[str, str, str]]) -> List[Tuple[str, str, str]]:
    """Return the (scenario, model, variable) tuples that have local source
    data but no S3 parquet shards yet."""
    return sorted(local - uploaded)


def _s3_tuple_exists(bucket: str, scenario: str, model: str, variable: str) -> bool:
    """Return True iff S3 already has at least one parquet shard for this tuple.

    Cheap check: list_objects_v2 with MaxKeys=1, prefix = the S3 prefix.
    Race-safe: every batch performs this check before starting work, so if
    another batch already uploaded the tuple, we skip it.
    """
    import boto3
    from prana_climate.config import VARIABLE_CATALOG, s3_processed_key
    category = VARIABLE_CATALOG[variable]["category"]
    # Build a prefix that any shard would live under. We probe with a
    # well-known sentinel H3 cell id (just any 16-char hex string); if any
    # object exists under the prefix, the tuple is already done.
    sentinel = "860000307ffffff"
    key = s3_processed_key(category, scenario, model, variable, sentinel)
    prefix = key.rsplit("/", 1)[0] + "/"
    s3 = boto3.client("s3")
    try:
        resp = s3.list_objects_v2(Bucket=bucket, Prefix=prefix, MaxKeys=1)
    except Exception as exc:
        log.warning("  S3 probe failed for %s/%s/%s: %s", scenario, model, variable, exc)
        return False  # on probe failure, attempt the upload anyway
    return resp.get("KeyCount", 0) > 0


# ─── Driver ──────────────────────────────────────────────────────────────────
def _run_tuple(tuple_: Tuple[str, str, str], py: str, max_chunks: int,
               state_file: Path | None = None, bucket: str | None = None,
               keep_failures: bool = False,
               local_dir: Path | None = None) -> int:
    """Invoke stream_full_pipeline.py --upload-only for one tuple.

    If `bucket` is given, skip the tuple if S3 already has shards for it.
    This makes parallel batches safe — only one batch ever uploads a given
    (scenario, model, variable) tuple.
    """
    scenario, model, variable = tuple_
    if bucket and _s3_tuple_exists(bucket, scenario, model, variable):
        log.info("  ⊘ %s/%s/%s already in S3 — skipping (parallel batch likely handled it)",
                 scenario, model, variable)
        return 0
    cmd = [
        py,
        "scripts/stream_full_pipeline.py",
        "--upload-only",
        "--models", model,
        "--variables", variable,
        "--scenarios", scenario,
        "--max-chunks", str(max_chunks),
    ]
    if local_dir is not None:
        cmd.extend(["--local-dir", str(local_dir)])
    if state_file is not None:
        cmd.extend(["--state-file", str(state_file)])
        # Always reset failures for the per-tuple state when the batch
        # driver has been told to use a specific state file. The previous
        # failures in that file are usually from an earlier run that
        # had a bug now fixed; the user can pass --keep-failures to
        # preserve them (default for the shared default state file).
        if not keep_failures:
            cmd.append("--reset-failures")
    log.info("  CMD: %s", " ".join(str(c) for c in cmd))
    t0 = time.time()
    result = subprocess.run(cmd, cwd=str(ROOT))
    elapsed = time.time() - t0
    if result.returncode == 0:
        log.info("  ✓ %s/%s/%s finished in %.1fs", scenario, model, variable, elapsed)
    else:
        log.error("  X %s/%s/%s failed (rc=%d, %.1fs)", scenario, model, variable,
                  result.returncode, elapsed)
    return result.returncode


def main() -> int:
    p = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    p.add_argument("--refresh-inventory", action="store_true",
                   help="Re-list S3 first (requires AWS creds).")
    p.add_argument("--plan", action="store_true",
                   help="Show the work queue and exit.")
    p.add_argument("--max-chunks", type=int, default=5,
                   help="Chunks per (model, variable, scenario) tuple. "
                        "Lower this (e.g. 1) for fast feedback; higher for fuller coverage.")
    p.add_argument("--models", nargs="*", default=list(GCM_MODELS),
                   help="Restrict to these GCMs.")
    p.add_argument("--variables", nargs="*", default=list(VARIABLE_CATALOG.keys()),
                   help="Restrict to these variables.")
    p.add_argument("--scenarios", nargs="*", default=list(SCENARIOS),
                   help="Restrict to these scenarios.")
    p.add_argument("--bucket", default=S3_BUCKET)
    p.add_argument("--limit", type=int, default=0,
                   help="Process at most N tuples (0 = no cap).")
    p.add_argument("--py", default=sys.executable,
                   help="Python interpreter for the subprocess.")
    p.add_argument("--state-file", type=Path,
                   help="Override the path to stream_state.json. Use to run parallel batches with isolated state.")
    p.add_argument("--skip-existing", action="store_true",
                   help="Before each tuple, probe S3 and skip if shards already exist. "
                        "Required when running parallel batches to avoid duplicate work.")
    p.add_argument("--keep-failures", action="store_true",
                   help="Don't pass --reset-failures to workers (preserve prior failures).")
    p.add_argument("--local-dir", type=Path, default=ROOT / "downloads",
                   help="Where stream_full_pipeline.py should read .nc files. "
                        "Use --local-dir downloads/sliced for pre-sliced GFDL files.")
    args = p.parse_args()

    log.info("Bucket: s3://%s/", args.bucket)
    log.info("Local downloads: %s/downloads", ROOT)

    # 1. Build "already uploaded" set
    if args.refresh_inventory:
        _refresh_inventory(args.bucket, INVENTORY_PATH)
    existing = _parse_inventory(INVENTORY_PATH)
    uploaded = _uploaded_tuples(existing)
    log.info("Tuples already in S3: %d", len(uploaded))

    # 2. Find local source data
    downloads = ROOT / "downloads"
    local = _list_local_sources(downloads)
    log.info("Tuples with local source .nc: %d", len(local))

    # 3. Filter by user-supplied scope
    scope_filter = set()
    for s in args.scenarios:
        for m in args.models:
            for v in args.variables:
                scope_filter.add((s, m, v))
    local = local & scope_filter
    log.info("Tuples in scope: %d", len(local))

    # 4. Plan
    queue = _plan(local, uploaded)
    log.info("Tuples to process: %d", len(queue))
    if args.limit:
        queue = queue[: args.limit]
        log.info("  (capped to first %d by --limit)", len(queue))

    # 5. Show or run
    if args.plan or not queue:
        for tup in queue:
            log.info("  - %s", "/".join(tup))
        if not queue:
            log.info("Nothing to do — every local tuple is already in S3.")
        return 0

    ok = 0
    fail = 0
    for i, tup in enumerate(queue, 1):
        log.info("[%d/%d] Starting %s/%s/%s", i, len(queue), *tup)
        rc = _run_tuple(tup, args.py, args.max_chunks, args.state_file,
                       bucket=args.bucket if args.skip_existing else None,
                       keep_failures=args.keep_failures,
                       local_dir=args.local_dir)
        if rc == 0:
            ok += 1
        else:
            fail += 1

    log.info("=" * 70)
    log.info("  Done.  ok=%d  fail=%d", ok, fail)
    if args.state_file:
        log.info("  State file: %s", args.state_file)
    else:
        log.info("  Re-run this script to retry failed tuples (state is persisted in logs/stream_state.json).")
    log.info("  After all tuples finish, refresh the inventory:")
    log.info("    python scripts/run_pipeline_batch.py --refresh-inventory --plan")
    return 0 if fail == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
