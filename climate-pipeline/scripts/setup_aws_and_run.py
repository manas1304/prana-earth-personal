#!/usr/bin/env python3
"""One-time AWS credential setup + run the full pipeline test.

Run this once. It will:
   1. Prompt for your AWS access key + secret (input is hidden).
   2. Write them to ~/.aws/credentials with mode 600 (OS-protected).
   3. Verify the bucket is reachable.
   4. Run the full real-pipeline test.

After this, you can re-run the test any time with:
    python tests/test_full_real_pipeline.py
"""
from __future__ import annotations

import getpass
import os
import subprocess
import sys
from pathlib import Path


def main() -> int:
    print("=" * 70)
    print("  Prana Earth — AWS credential setup + full pipeline test")
    print("=" * 70)
    print()
    print("This script will save your credentials to ~/.aws/credentials so")
    print("boto3 can authenticate against S3. Your input is hidden.")
    print()

    # 1. Get credentials
    key_id = input("AWS Access Key ID [AKIAXAGX6DJQ2LLROTOQ]: ").strip()
    if not key_id:
        key_id = "AKIAXAGX6DJQ2LLROTOQ"
    secret = getpass.getpass("AWS Secret Access Key: ").strip()
    if not secret:
        print("ERROR: Secret access key cannot be empty.")
        return 1
    region = input("AWS Region [ap-south-1]: ").strip() or "ap-south-1"

    # 2. Write ~/.aws/credentials and ~/.aws/config
    aws_dir = Path.home() / ".aws"
    aws_dir.mkdir(parents=True, exist_ok=True)

    creds_path = aws_dir / "credentials"
    creds_path.write_text(
        f"[default]\n"
        f"aws_access_key_id = {key_id}\n"
        f"aws_secret_access_key = {secret}\n"
    )
    # chmod 600 — POSIX only; on Windows we rely on the user's profile ACL
    try:
        os.chmod(creds_path, 0o600)
    except (OSError, AttributeError):
        pass

    config_path = aws_dir / "config"
    config_path.write_text(
        f"[default]\n"
        f"region = {region}\n"
        f"output = json\n"
    )
    try:
        os.chmod(config_path, 0o600)
    except (OSError, AttributeError):
        pass

    print(f"  Wrote {creds_path}")
    print(f"  Wrote {config_path}")

    # 3. Verify
    print()
    print("Verifying credentials…")
    try:
        import boto3
        s3 = boto3.client("s3", region_name=region)
        r = s3.list_buckets()
        print(f"  list_buckets OK, {len(r.get('Buckets', []))} buckets")
        prana_buckets = [b["Name"] for b in r.get("Buckets", []) if "prana" in b["Name"].lower()]
        if prana_buckets:
            print(f"  Prana buckets: {prana_buckets}")
        for b in prana_buckets:
            s3.head_bucket(Bucket=b)
            print(f"  s3://{b}/ reachable")
    except Exception as e:
        print(f"  boto3 error: {type(e).__name__}: {e}")
        print("  Double-check the credentials in the AWS console:")
        print("  https://481489197665.signin.aws.amazon.com/console")
        print("  IAM -> Users -> prana_earth_development -> Security credentials")
        return 1

    # 4. Run the full pipeline test
    print()
    print("=" * 70)
    print("  Launching the full pipeline test")
    print("=" * 70)
    print()

    repo = Path(__file__).resolve().parent.parent
    env = {**os.environ,
           "PRANA_S3_BUCKET": "prana-earth-data",
           "PRANA_MAX_CELLS": "1000"}

    result = subprocess.run(
        [sys.executable, str(repo / "tests" / "test_full_real_pipeline.py")],
        cwd=str(repo),
        env=env,
    )
    return result.returncode


if __name__ == "__main__":
    raise SystemExit(main())
