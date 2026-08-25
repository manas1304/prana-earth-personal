"""NetCDF validation per spec §7 — dims, coords, time, units, NaNs.

Each validator returns a `(ok: bool, message: str)` tuple so the caller
can either log a warning and continue, or raise on hard failures.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable, List, Tuple

import numpy as np
import xarray as xr

EXPECTED_DIMS = {"time", "lat", "lon"}
EXPECTED_LAT_NAMES = {"lat", "latitude", "nav_lat"}
EXPECTED_LON_NAMES = {"lon", "longitude", "nav_lon"}


@dataclass
class ValidationReport:
    ok: bool
    errors: List[str]
    warnings: List[str]

    def raise_if_failed(self) -> None:
        if not self.ok:
            raise ValueError("NetCDF validation failed:\n  - " + "\n  - ".join(self.errors))


def _norm_dims(ds: xr.Dataset) -> Iterable[str]:
    return {d.lower() for d in ds.dims}


def _coord_present(ds: xr.Dataset, candidates: Iterable[str]) -> Tuple[bool, str | None]:
    for c in candidates:
        if c in ds.coords or c in ds.variables:
            return True, c
    return False, None


def validate(ds: xr.Dataset) -> ValidationReport:
    """Apply the full set of structural + sanity checks."""
    errors: List[str] = []
    warnings: List[str] = []

    # 1. Required dims
    dims = _norm_dims(ds)
    missing = EXPECTED_DIMS - dims
    if missing:
        errors.append(f"Missing required dims: {sorted(missing)}")

    # 2. Lat / lon coords (case-insensitive)
    has_lat, lat_name = _coord_present(ds, EXPECTED_LAT_NAMES)
    has_lon, lon_name = _coord_present(ds, EXPECTED_LON_NAMES)
    if not has_lat or not has_lon:
        errors.append(
            f"Missing lat/lon coords (lat found: {lat_name}, lon found: {lon_name})"
        )

    # 3. Time coverage (tolerate cftime objects from CMIP6 calendars)
    if "time" in ds.coords:
        t = ds["time"].values
        if len(t) == 0:
            errors.append("Empty time axis.")
        else:
            def _year(v):
                # cftime and datetime both expose .year; pandas Timestamp needs conversion.
                return getattr(v, "year", None) or int(str(v)[:4])
            try:
                start = _year(t.min())
                end = _year(t.max())
                if start > 2000:
                    warnings.append(f"Time starts at {start}, after PROCESS_START_YEAR=2000.")
                if end < 2050:
                    warnings.append(f"Time ends at {end}, before PROCESS_END_YEAR=2050.")
            except Exception:
                warnings.append("Could not parse time-axis bounds.")

    # 4. Units — must be present for every data variable
    for v in ds.data_vars:
        units = ds[v].attrs.get("units")
        if units is None:
            warnings.append(f"Variable {v} is missing 'units' attribute.")

    # 5. All-NaN check — only float / numeric variables (CMIP6 files carry
    # auxiliary integer/str arrays like time_bnds that can't be NaN-tested).
    for v in ds.data_vars:
        arr = ds[v].values
        if not np.issubdtype(arr.dtype, np.floating):
            continue
        try:
            if np.isnan(arr).all():
                errors.append(f"Variable {v} is all-NaN.")
        except TypeError:
            continue

    return ValidationReport(
        ok=len(errors) == 0,
        errors=errors,
        warnings=warnings,
    )
