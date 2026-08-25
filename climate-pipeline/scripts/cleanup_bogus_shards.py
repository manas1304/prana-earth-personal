#!/usr/bin/env python3
"""cleanup_bogus_shards.py — remove the empty shards from the 1850s "historical"
chunks that the previous run uploaded.

The previous (``stream_full_pipeline.py``) run had a bug where:
  1. ``find_esgf_files`` returned the *first* 5 ESGF chunks, which for
     ``historical`` are 1850-1899.
  2. The date filter used the file's own year range, not 2000-2050, so
     pre-2000 chunks were not skipped.
  3. Each chunk uploaded 127,849 empty H3 parquet shards to S3.

The safe cleanup steps are:
  1. Identify every ``completed`` entry in ``logs/stream_state.json`` whose
     filename contains a year range entirely outside [PROCESS_START_YEAR,
     PROCESS_END_YEAR]. Remove those entries.
  2. For each (category, scenario, model, variable) tuple that had bogus
     uploads, delete the entire S3 prefix
     ``processed/<category>/<scenario>/<model>/<variable>/`` — then let the
     fixed pipeline re-upload real data.
  3. Print a report so the user can audit what was changed.

Dry-run by default. Pass ``--apply`` to actually mutate S3 / state.
"""
from __future__ import annotations

import argparse
import json
import logging
import re
import sys
from pathlib import Path
from typing import Dict, List, Set, Tuple

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from prana_climate.config import (
    PROCESS_START_YEAR,
    PROCESS_END_YEAR,
    S3_BUCKET,
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
log = logging.getLogger("cleanup_bogus_shards")

STATE_FILE = ROOT / "logs" / "stream_state.json"
INVENTORY_PATH = ROOT / "s3_inventory.txt"

# Match "<start>-<end>.nc" anywhere in a path/filename.
YEAR_RANGE_PAT = re.compile(r"_(\d{6})-(\d{6})\.nc")


def _file_year_range(path_or_name: str) -> Tuple[int, int] | None:
    """Return (start_year, end_year) from a CMIP6 filename, or None."""
    m = YEAR_RANGE_PAT.search(path_or_name)
    if not m:
        return None
    return int(m.group(1)[:4]), int(m.group(2)[:4])


def _is_bogus(completed_entry: str) -> bool:
    """A 'completed' entry is bogus if the underlying file's year range
    lies entirely outside [PROCESS_START_YEAR, PROCESS_END_YEAR]."""
    years = _file_year_range(completed_entry)
    if years is None:
        return False  # can't tell — leave it alone
    f_start, f_end = years
    return f_end < PROCESS_START_YEAR or f_start > PROCESS_END_YEAR


def _bogus_to_s3_prefix(entry: str) -> str | None:
    """Map a bogus completed entry to the S3 prefix it polluted.

    Returns ``processed/<category>/<scenario>/<model>/<variable>/`` or None.
    """
    # Local entries look like: local:<abs-path>::local
    # The .nc filename has the variable + model + scenario.
    m = re.search(
        r"[/\\](?P<variable>[a-zA-Z]+)_Amon_(?P<model>[A-Za-z0-9\-\.]+)_"
        r"(?P<scenario>[a-z0-9]+)_.*\.nc",
        entry,
    )
    if not m:
        return None
    variable = m.group("variable")
    model = m.group("model")
    scenario = m.group("scenario")
    from prana_climate.config import VARIABLE_CATALOG
    if variable not in VARIABLE_CATALOG:
        return None
    category = VARIABLE_CATALOG[variable]["category"]
    return f"processed/{category}/{scenario}/{model}/{variable}/"


def _load_state() -> dict:
    if not STATE_FILE.exists():
        return {"completed": [], "failed": []}
    return json.loads(STATE_FILE.read_text())


def _save_state(state: dict) -> None:
    STATE_FILE.write_text(json.dumps(state, indent=2))
    log.info("Updated %s  (completed=%d, failed=%d)",
             STATE_FILE, len(state["completed"]), len(state["failed"]))


def _list_s3_keys(bucket: str, prefix: str) -> List[str]:
    import boto3
    s3 = boto3.client("s3")
    keys: List[str] = []
    paginator = s3.get_paginator("list_objects_v2")
    for page in paginator.paginate(Bucket=bucket, Prefix=prefix):
        for obj in page.get("Contents", []):
            keys.append(obj["Key"])
    return keys


def _delete_s3_prefix(bucket: str, prefix: str) -> int:
    """Delete every key under <prefix>. Returns the count deleted."""
    import boto3
    s3 = boto3.client("s3")
    keys = _list_s3_keys(bucket, prefix)
    if not keys:
        return 0
    # Batch delete in chunks of 1000 (S3 hard limit per request).
    deleted = 0
    for i in range(0, len(keys), 1000):
        batch = [{"Key": k} for k in keys[i:i + 1000]]
        s3.delete_objects(Bucket=bucket, Delete={"Objects": batch})
        deleted += len(batch)
    return deleted


def main() -> int:
    p = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    p.add_argument("--apply", action="store_true",
                   help="Actually delete S3 objects and rewrite stream_state.json.")
    p.add_argument("--bucket", default=S3_BUCKET)
    args = p.parse_args()

    log.info("Bucket: s3://%s/", args.bucket)
    log.info("Project window: %d-%d", PROCESS_START_YEAR, PROCESS_END_YEAR)
    log.info("Mode: %s", "APPLY" if args.apply else "DRY-RUN")

    state = _load_state()
    completed = state.get("completed", [])
    failed = state.get("failed", [])

    bogus = [e for e in completed if _is_bogus(e)]
    log.info("Bogus completed entries (outside %d-%d): %d / %d",
             PROCESS_START_YEAR, PROCESS_END_YEAR, len(bogus), len(completed))

    if not bogus:
        log.info("Nothing to clean up.")
        return 0

    # Show what would be cleaned
    by_prefix: Dict[str, List[str]] = {}
    for e in bogus:
        prefix = _bogus_to_s3_prefix(e)
        if prefix is None:
            log.warning("  Could not derive S3 prefix from: %s", e[:200])
            continue
        by_prefix.setdefault(prefix, []).append(e)

    log.info("Bogus S3 prefixes to wipe:")
    for prefix, entries in sorted(by_prefix.items()):
        log.info("  %s  (%d bogus entries)", prefix, len(entries))

    if not args.apply:
        log.info("Dry-run: pass --apply to actually delete S3 objects and rewrite state.")
        return 0

    # 1. Wipe polluted S3 prefixes
    total_deleted = 0
    for prefix in sorted(by_prefix.keys()):
        log.info("Deleting s3://%s/%s ...", args.bucket, prefix)
        n = _delete_s3_prefix(args.bucket, prefix)
        log.info("  deleted %d keys", n)
        total_deleted += n

    # 2. Strip bogus entries from stream_state.json
    bogus_set = set(bogus)
    new_completed = [e for e in completed if e not in bogus_set]
    state["completed"] = new_completed
    _save_state(state)

    # 3. Refresh the local inventory snapshot so future runs see the cleanup.
    log.info("Refreshing s3_inventory.txt ...")
    from scripts.upload_remaining import _list_s3_inventory
    _list_s3_inventory(args.bucket, INVENTORY_PATH)

    log.info("=" * 70)
    log.info("  Cleanup complete.")
    log.info("  S3 keys deleted: %d", total_deleted)
    log.info("  Completed entries before/after: %d / %d",
             len(completed), len(new_completed))
    log.info("=" * 70)
    log.info("  Re-run the batch:")
    log.info("    python scripts/run_pipeline_batch.py --refresh-inventory")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
