"""Unit normalisation for CMIP6 variables.

CMIP6 variables come in physical units that aren't what we want to compute
hazard scores with. This module applies the conversions listed in spec §7
("e.g. Kelvin → Celsius for temperature outputs") so the processed Parquet
files always carry the units the hazard engine expects.

Conversions are idempotent: if the input is already in the target unit
the data is returned unchanged (we sniff for `degC` / `mm` / `%`).
"""
from __future__ import annotations

import xarray as xr

_KELVIN_TO_CELSIUS = 273.15
_KG_M2_S_TO_MM_DAY = 86_400.0       # 1 kg m-2 s-1 ≈ 86,400 mm/day
_KG_M2_S_TO_MM_MONTH = 86_400.0 * 30 # approximate monthly mm
_KG_M2_TO_MM = 1.0                   # soil moisture (kg m-2) ≈ mm water


def _looks_like_kelvin(units: str) -> bool:
    return units.lower().startswith("k") and "c" not in units.lower()


def normalize_tas(da: xr.DataArray) -> xr.DataArray:
    """Air / max / min temperature: K → °C."""
    units = (da.attrs.get("units") or "K").lower()
    if "degc" in units or units in {"c", "°c", "celsius"}:
        return da
    return da - _KELVIN_TO_CELSIUS


def normalize_pr(da: xr.DataArray, frequency: str) -> xr.DataArray:
    """Precipitation flux → mm / timestep (day or month)."""
    units = (da.attrs.get("units") or "").lower()
    if "mm" in units:
        return da  # already a depth
    factor = _KG_M2_S_TO_MM_MONTH if frequency == "mon" else _KG_M2_S_TO_MM_DAY
    return da * factor


def normalize_mrro(da: xr.DataArray) -> xr.DataArray:
    """Surface runoff flux → mm/month."""
    units = (da.attrs.get("units") or "").lower()
    if "mm" in units:
        return da
    return da * _KG_M2_S_TO_MM_MONTH


def normalize_mrso(da: xr.DataArray) -> xr.DataArray:
    """Total soil moisture content (kg m-2) is already a depth equivalent."""
    return da


def normalize_evspsbl(da: xr.DataArray) -> xr.DataArray:
    """Evapotranspiration flux → mm/month."""
    units = (da.attrs.get("units") or "").lower()
    if "mm" in units:
        return da
    return da * _KG_M2_S_TO_MM_MONTH


# Wind, humidity, specific humidity are kept as-is (m/s, %, kg/kg).
NORMALIZERS = {
    "tas": normalize_tas,
    "tasmax": normalize_tas,
    "tasmin": normalize_tas,
    "pr": normalize_pr,
    "mrro": normalize_mrro,
    "mrso": normalize_mrso,
    "evspsbl": normalize_evspsbl,
}
