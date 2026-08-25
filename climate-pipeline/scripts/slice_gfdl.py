#!/usr/bin/env python3
"""Pre-slice GFDL files to 2015-2050 window to reduce OOM.

The GFDL-ESM4 files contain 2015-2100 (~85 years). xarray reprojection
materializes the full 3D field, so the OOM killer on t2.large (7.5 GB)
reaps the worker. By pre-slicing to 2015-2050 (~35 years), we cut
peak memory by ~2.5x.
"""
import subprocess
import sys
from pathlib import Path

DOWNLOADS = Path("/home/ubuntu/climate-pipeline/downloads")
SLICED = DOWNLOADS / "sliced"
SLICED.mkdir(exist_ok=True)

# Date strings for ncks -d time
START = "2015-01-01"
END = "2050-12-31"

def main() -> int:
    # Find all GFDL files in ssp* directories
    gfdl_files = []
    for ssp in ["ssp126", "ssp245", "ssp370", "ssp585"]:
        d = DOWNLOADS / ssp
        if not d.exists():
            continue
        for f in sorted(d.glob("*GFDL-ESM4*.nc")):
            gfdl_files.append(f)

    print(f"Found {len(gfdl_files)} GFDL files to slice")
    if not gfdl_files:
        return 1

    sliced_count = 0
    for f in gfdl_files:
        # Use a "sliced" sub-name to avoid overwriting originals
        out = SLICED / f"slice_{f.name}"
        if out.exists():
            print(f"  SKIP {f.name} (already sliced)")
            sliced_count += 1
            continue
        # ncks -d time,2015-01-01,2050-12-31 in.nc out.nc
        cmd = ["ncks", "-d", f"time,{START},{END}", str(f), str(out)]
        try:
            subprocess.run(cmd, check=True, capture_output=True, text=True, timeout=300)
            sz_orig = f.stat().st_size / 1024 / 1024
            sz_new = out.stat().st_size / 1024 / 1024
            print(f"  OK {f.name[:60]}... {sz_orig:.0f}MB -> {sz_new:.0f}MB")
            sliced_count += 1
        except subprocess.CalledProcessError as e:
            print(f"  FAIL {f.name}: {e.stderr[:200]}")
        except subprocess.TimeoutExpired:
            print(f"  TIMEOUT {f.name}")

    print(f"\nSliced {sliced_count} files to {SLICED}")
    return 0

if __name__ == "__main__":
    sys.exit(main())
