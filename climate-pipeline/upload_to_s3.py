#!/usr/bin/env python3
"""upload_to_s3.py — push processed Parquet shards to the S3 Climate Data Vault.

Layout (per spec §5, refined):

    s3://prana-climate-vault-prod/
    ├── raw/cmip6/<scenario>/<model>/<variable>/<frequency>/<member>/<file>.nc
    ├── processed/<category>/<scenario>/<model>/<variable>/<h3_prefix>/<cell>.parquet
    ├── derived/hazard_scores/<scenario>/<horizon>/<h3_prefix>/<cell>.parquet
    └── manifests/<scenario>/<model>/<variable>/<frequency>/manifest.json

Usage
-----
    # Upload all processed shards for one (scenario, variable, model) combination
    python upload_to_s3.py processed --scenario ssp245 --variable tas --model MPI-ESM1-2-HR

    # Upload all raw .nc files for a scenario
    python upload_to_s3.py raw --scenario ssp245

    # Write manifest only (skip the actual upload)
    python upload_to_s3.py manifest --scenario ssp245 --variable tas \\
            --model MPI-ESM1-2-HR --frequency mon
"""
from __future__ import annotations

import argparse
import logging
import sys
from pathlib import Path

import boto3

from prana_climate.config import (
    DOWNLOADS_DIR,
    PROCESSED_DIR,
    S3_BUCKET,
    VARIABLE_CATALOG,
    s3_manifest_key,
    s3_processed_key,
    s3_raw_key,
)
from prana_climate.manifest import build_from_files, write_manifest

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
log = logging.getLogger("upload_to_s3")


def _client():
    return boto3.client("s3")


def upload_processed(scenario: str, variable: str, model: str) -> int:
    """Upload all processed Parquet shards for one (scenario, model, variable)."""
    category = VARIABLE_CATALOG[variable]["category"]
    base = PROCESSED_DIR / category / scenario / model / variable
    if not base.exists():
        raise FileNotFoundError(f"Nothing processed yet at {base}. Run process_data.py first.")

    files = sorted(base.rglob("*.parquet"))
    log.info("Uploading %d processed shards for %s / %s / %s / %s…", len(files), category, scenario, model, variable)

    s3 = _client()
    uploaded = 0
    for path in files:
        h3_cell = path.stem
        key = s3_processed_key(category, scenario, model, variable, h3_cell)
        s3.upload_file(str(path), S3_BUCKET, key)
        uploaded += 1
    log.info("Uploaded %d shards to s3://%s/processed/…", uploaded, S3_BUCKET)
    return uploaded


def upload_raw(scenario: str) -> int:
    """Upload every raw .nc under ``downloads/<scenario>/`` to the S3 raw/ prefix."""
    base = DOWNLOADS_DIR / scenario
    if not base.exists():
        raise FileNotFoundError(f"No raw downloads at {base}.")
    files = sorted(base.rglob("*.nc"))
    log.info("Uploading %d raw .nc files for scenario=%s…", len(files), scenario)

    s3 = _client()
    uploaded = 0
    for path in files:
        # Parse "<model>/<variable>/<frequency>/<member>/<filename>" from the
        # path layout we agreed on in spec §4.
        try:
            model, variable, frequency, member = path.relative_to(base).parts[:4]
        except ValueError:
            log.warning("Skipping %s — does not match expected <model>/<variable>/<frequency>/<member>/<filename> layout.", path)
            continue
        key = s3_raw_key(scenario, model, variable, frequency, member, path.name)
        s3.upload_file(str(path), S3_BUCKET, key)
        uploaded += 1
    log.info("Uploaded %d raw files to s3://%s/raw/…", uploaded, S3_BUCKET)
    return uploaded


def write_and_upload_manifest(scenario: str, variable: str, model: str, frequency: str, member: str = "r1i1p1f1") -> str:
    """Build a manifest.json for one (scenario, model, variable, frequency) tuple and upload it."""
    base = DOWNLOADS_DIR / scenario
    files = sorted(base.rglob("*.nc"))
    m = build_from_files(
        variable=variable,
        scenario=scenario,
        model=model,
        frequency=frequency,
        member=member,
        files=files,
    )
    key = s3_manifest_key(scenario, model, variable, frequency)
    s3 = _client()
    s3.put_object(
        Bucket=S3_BUCKET,
        Key=key,
        Body=str(m.to_dict()).encode("utf-8"),
        ContentType="application/json",
    )
    log.info("Wrote manifest → s3://%s/%s", S3_BUCKET, key)
    return key


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    sub = parser.add_subparsers(dest="cmd", required=True)

    p_raw = sub.add_parser("raw", help="Upload raw .nc files to S3")
    p_raw.add_argument("--scenario", required=True)

    p_proc = sub.add_parser("processed", help="Upload processed Parquet shards to S3")
    p_proc.add_argument("--scenario", required=True)
    p_proc.add_argument("--variable", required=True)
    p_proc.add_argument("--model", required=True)

    p_man = sub.add_parser("manifest", help="Write + upload manifest.json")
    p_man.add_argument("--scenario", required=True)
    p_man.add_argument("--variable", required=True)
    p_man.add_argument("--model", required=True)
    p_man.add_argument("--frequency", required=True, choices=["mon", "day"])
    p_man.add_argument("--member", default="r1i1p1f1")

    args = parser.parse_args()

    if args.cmd == "raw":
        upload_raw(args.scenario)
    elif args.cmd == "processed":
        upload_processed(args.scenario, args.variable, args.model)
    elif args.cmd == "manifest":
        write_and_upload_manifest(
            scenario=args.scenario,
            variable=args.variable,
            model=args.model,
            frequency=args.frequency,
            member=args.member,
        )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
