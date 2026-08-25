#!/usr/bin/env python3
"""Reorganize sliced/ files into the expected scenario/ subdirectory structure.

The original slice_gfdl.py put files flat in sliced/. The upload script
looks for them in sliced/ssp126/ etc. Move them to the right place.
"""
import re
import shutil
from pathlib import Path

DOWNLOADS = Path("/home/ubuntu/climate-pipeline/downloads")
SLICED = DOWNLOADS / "sliced"

# Filename pattern: slice_<var>_Amon_GFDL-ESM4_<scenario>_<...>.nc
# e.g. slice_hurs_Amon_GFDL-ESM4_ssp126_r1i1p1f1_gr1_201501-210012.nc
PAT = re.compile(r"slice_(\w+)_Amon_GFDL-ESM4_(ssp\d+|historical)_")


def main() -> int:
    moved = 0
    for f in sorted(SLICED.glob("slice_*.nc")):
        m = PAT.match(f.name)
        if not m:
            print(f"  skip (no scenario): {f.name}")
            continue
        var, scen = m.group(1), m.group(2)
        # Create target dir
        target_dir = SLICED / scen
        target_dir.mkdir(exist_ok=True)
        # Strip the "slice_" prefix when moving
        new_name = f.name.removeprefix("slice_")
        target = target_dir / new_name
        if target.exists():
            print(f"  skip (exists): {target.name}")
            continue
        # Move
        shutil.move(str(f), str(target))
        moved += 1
        print(f"  moved {f.name} -> {scen}/{new_name}")

    print(f"\nMoved {moved} files")
    return 0


if __name__ == "__main__":
    import sys
    sys.exit(main())
