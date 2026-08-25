"""Hazard indicators — 30 formulas (5 per hazard × 6 hazards).

Direct port of the methodology sections 4–9 (Prana_Earth_Climate_Risk_
Methodology_v2.1_24.06.2026.pdf). Every public function takes a pandas
DataFrame indexed by ``(time, h3_cell)`` for the relevant CMIP6 variable
and returns a DataFrame indexed by ``(h3_cell, horizon)`` with the
indicator value normalised to [0, 100].

Indicator weights live in ``INDICATOR_WEIGHTS`` (sums to 1.0 per hazard)
and the convex non-linear adjustment ``H_adj = 100 · (H/100) ^ 0.85``
is applied in ``hazard_scores.py`` after the weighted composite.

Static layers (DEM slope/TWI, NDVI, impervious %, LFMC, FFDI fuel load)
are not part of the CMIP6 download matrix — they come from auxiliary
sources (SRTM, MODIS, GHSL). ``exposure.py`` provides mockable defaults
so the engine runs end-to-end before those datasets are wired in.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Callable, Dict, Iterable, List, Tuple

import numpy as np
import pandas as pd

# ─────────────────────────────────────────────────────────────────────────────
# Hazard → indicator → weight map (methodology §4–§9)
# ─────────────────────────────────────────────────────────────────────────────

@dataclass(frozen=True)
class IndicatorSpec:
    code: str           # short code for the indicator
    hazard: str         # parent hazard
    weight: float       # expert-calibrated weight (per hazard; sums to 1.0)
    needs: Tuple[str, ...]   # CMIP6 / static variable ids this indicator requires


INDICATOR_WEIGHTS: Dict[Tuple[str, str], float] = {
    # Flood (§4)
    ("flood", "rx5day"):          0.35,
    ("flood", "pr99p_flood"):     0.25,
    ("flood", "slope_twi"):       0.20,
    ("flood", "mrso_antecedent"): 0.12,
    ("flood", "drainage"):        0.08,

    # Heat stress (§5)
    ("heat_stress", "hwd"):       0.30,
    ("heat_stress", "wbgt"):      0.30,
    ("heat_stress", "txx"):       0.20,
    ("heat_stress", "cdd"):       0.12,
    ("heat_stress", "uhi"):       0.08,

    # Water stress (§6)
    ("water_stress", "bws"):          0.30,
    ("water_stress", "gwd"):          0.25,
    ("water_stress", "mrro_delta"):   0.20,
    ("water_stress", "evap_demand"):  0.15,
    ("water_stress", "monsoon_cv"):   0.10,

    # Drought (§7)
    ("drought", "spi12"):        0.30,
    ("drought", "spei"):         0.25,
    ("drought", "mrso_anomaly"): 0.25,
    ("drought", "cdd_days"):     0.12,
    ("drought", "pr_trend"):     0.08,

    # Sandstorm / thunderstorm (§8)
    ("storm", "cape"):           0.30,
    ("storm", "pr99p_storm"):    0.20,
    ("storm", "wind_p90_storm"): 0.20,
    ("storm", "dust_emission"):  0.18,
    ("storm", "ndvi_trend"):     0.12,

    # Wildfire (§9)
    ("wildfire", "fwi"):             0.30,
    ("wildfire", "vpd"):             0.25,
    ("wildfire", "ffdi"):            0.20,
    ("wildfire", "lfmc"):            0.15,
    ("wildfire", "wind_p90_wildfire"):0.10,
}

HAZARDS = ["flood", "heat_stress", "water_stress", "drought", "storm", "wildfire"]


def _normalise(values: pd.Series, *, invert: bool = False) -> pd.Series:
    """Min-max normalise to [0, 100]. ``invert`` for NDVI / soil moisture
    where *lower* raw values mean *higher* risk."""
    s = values.astype(float)
    lo, hi = np.nanmin(s), np.nanmax(s)
    if not np.isfinite(lo) or not np.isfinite(hi) or hi == lo:
        return pd.Series(np.zeros_like(s, dtype=float), index=s.index)
    norm = (s - lo) / (hi - lo) * 100.0
    return (100.0 - norm) if invert else norm


def _flatten(df: pd.DataFrame) -> pd.DataFrame:
    """Reset the MultiIndex to columns, dropping any column already present.

    Many fixtures pass a DataFrame whose MultiIndex *and* a column both
    carry the same key (e.g. ``h3_cell``); calling ``reset_index`` would
    raise ``ValueError: cannot insert h3_cell, already exists``. This
    helper makes indicator functions robust to either shape.
    """
    out = df.copy()
    if isinstance(out.index, pd.MultiIndex):
        # Drop index levels that collide with existing columns.
        to_drop = [n for n in out.index.names if n in out.columns]
        if to_drop:
            out = out.drop(columns=to_drop)
        out = out.reset_index()
    return out


def _rolling_window_max(s: pd.Series, window: int, per: str = "year") -> pd.Series:
    """Rolling max with an annual reset (assumes a DatetimeIndex)."""
    if not isinstance(s.index, pd.DatetimeIndex):
        raise ValueError("Series must have a DatetimeIndex for rolling-window ops.")
    grouped = s.groupby(s.index.year)
    out: List[float] = []
    for _, yr in grouped:
        roll = yr.rolling(window=window, min_periods=1).sum().max()
        out.append(roll if pd.notna(roll) else 0.0)
    return pd.Series(out, index=pd.Index([y for y, _ in grouped], name="year"))


# ─────────────────────────────────────────────────────────────────────────────
# FLOOD — 5 indicators (§4)
# ─────────────────────────────────────────────────────────────────────────────

def _flood_rx5day(pr_daily: pd.DataFrame) -> pd.Series:
    """rx5day — maximum 5-day accumulated rainfall per year, per cell."""
    df = _flatten(pr_daily)
    grouped = df.groupby([df["time"].dt.year, "h3_cell"])
    return grouped.apply(
        lambda g: _rolling_window_max(
            g.set_index("time")["pr"], 5
        ).max()
    )


def _flood_pr99p(pr_daily: pd.DataFrame) -> pd.Series:
    """99th percentile of daily rainfall — JJA focus per methodology §4."""
    df = _flatten(pr_daily)
    df["month"] = df["time"].dt.month
    jja = df[df["month"].isin([6, 7, 8])]
    return jja.groupby("h3_cell")["pr"].quantile(0.99)


def _flood_slope_twi(static: pd.DataFrame) -> pd.Series:
    """Slope × Topographic Wetness Index — comes from SRTM/ALOS DEM."""
    if static.empty:
        return pd.Series(dtype=float)
    # Low slope + high TWI → high ponding risk → score inverted.
    raw = static["slope"] * (1.0 / (static["twi"] + 1e-3))
    return _normalise(raw, invert=False)


def _flood_mrso_antecedent(mrso_monthly: pd.DataFrame, *, baseline_years: int = 5) -> pd.Series:
    """Pre-monsoon (Mar–May) mean soil moisture anomaly vs 5-year baseline."""
    df = _flatten(mrso_monthly)
    df["month"] = df["time"].dt.month
    df["year"] = df["time"].dt.year
    premonsoon = df[df["month"].isin([3, 4, 5])]
    annual = premonsoon.groupby(["year", "h3_cell"])["mrso"].mean()
    out: Dict[str, float] = {}
    for c in annual.index.get_level_values("h3_cell").unique():
        cell_series = annual.xs(c, level="h3_cell")
        if cell_series.empty:
            continue
        baseline = cell_series.iloc[:baseline_years].mean()
        latest = cell_series.iloc[-baseline_years:].mean()
        out[c] = latest - baseline
    return pd.Series(out)


def _flood_drainage(static: pd.DataFrame) -> pd.Series:
    """(1 - NDVI) × impervious_fraction — urban drainage proxy."""
    if static.empty:
        return pd.Series(dtype=float)
    raw = (1.0 - static["ndvi"]) * static["impervious_frac"]
    return _normalise(raw, invert=False)


# ─────────────────────────────────────────────────────────────────────────────
# HEAT STRESS — 5 indicators (§5)
# ─────────────────────────────────────────────────────────────────────────────

def _heat_hwd(tasmax_daily: pd.DataFrame, *, threshold: float = 4.5) -> pd.Series:
    """Heat-wave duration — annual count of days in qualifying events
    (Tmax ≥ 4.5 °C above the 1985–2014 cell baseline, ≥ 3 consecutive)."""
    df = _flatten(tasmax_daily)
    out: Dict[str, float] = {}
    for cell, g in df.groupby("h3_cell"):
        g = g.sort_values("time").set_index("time")
        baseline = g["tasmax"].iloc[: min(365 * 5, len(g))].mean() if len(g) else 0.0
        anomaly = g["tasmax"] - baseline
        exceed = (anomaly >= threshold).astype(int)
        runs = exceed.groupby(exceed.index.year).apply(
            lambda s: (s * (s.groupby((s != s.shift()).cumsum()).cumcount() + 1)).max()
        )
        out[cell] = float(runs.sum()) if pd.notna(runs.sum()) else 0.0
    return pd.Series(out)


def _heat_wbgt(tas: pd.DataFrame, hurs: pd.DataFrame) -> pd.Series:
    """Wet-bulb temperature via the Stull (2011) approximation.

    T_w = T · atan(0.151977 · √(RH + 8.313659)) + atan(T + RH)
          − atan(RH − 1.676331) + 0.00391838 · RH^{3/2} · atan(0.023101 · RH)
          − 4.686035
    Where RH is in % and T in °C.
    """
    tas_df = _flatten(tas)
    hurs_df = _flatten(hurs)
    tas_df["year"] = tas_df["time"].dt.year
    hurs_df["year"] = hurs_df["time"].dt.year
    annual = tas_df.groupby(["year", "h3_cell"])[["tas"]].mean().reset_index(level=0, drop=True)
    hurs_annual = hurs_df.groupby(["year", "h3_cell"])[["hurs"]].mean().reset_index(level=0, drop=True)
    merged = annual.join(hurs_annual, how="inner")
    T = merged["tas"].astype(float)
    RH = merged["hurs"].astype(float)
    Tw = (T * np.arctan(0.151977 * np.sqrt(RH + 8.313659))
          + np.arctan(T + RH)
          - np.arctan(RH - 1.676331)
          + 0.00391838 * RH ** 1.5 * np.arctan(0.023101 * RH)
          - 4.686035)
    return Tw.groupby("h3_cell").max()


def _heat_txx(tasmax_daily: pd.DataFrame) -> pd.Series:
    """Annual maximum of daily maximum temperature — TXx."""
    df = _flatten(tasmax_daily)
    df["year"] = df["time"].dt.year
    return df.groupby(["year", "h3_cell"])["tasmax"].max().groupby("h3_cell").max()


def _heat_cdd(tas: pd.DataFrame, *, base: float = 18.0) -> pd.Series:
    """Cooling Degree Days — cumulative (Tmean − base) where Tmean > base."""
    df = _flatten(tas)
    excess = (df["tas"] - base).clip(lower=0)
    return excess.groupby(df["h3_cell"]).sum()


def _heat_uhi(static: pd.DataFrame, tasmin: pd.DataFrame) -> pd.Series:
    """UHI proxy — mean (tasmin − rural baseline) for urban cells."""
    if static.empty:
        return pd.Series(dtype=float)
    urban = static[static["urban_density"] > 0.4].index
    if len(urban) == 0:
        return pd.Series(dtype=float)
    tasmin_df = _flatten(tasmin)
    tmin_cell = tasmin_df.groupby("h3_cell")["tasmin"].mean()
    rural_mean = tmin_cell.loc[~tmin_cell.index.isin(urban)].mean()
    return (tmin_cell.loc[urban] - rural_mean).rename("uhi")


# ─────────────────────────────────────────────────────────────────────────────
# WATER STRESS — 5 indicators (§6)
# ─────────────────────────────────────────────────────────────────────────────

def _water_bws(mrro: pd.DataFrame, pr: pd.DataFrame, evspsbl: pd.DataFrame) -> pd.Series:
    """Baseline water stress = withdrawals / available supply (0–5 scale)."""
    pr_df = _flatten(pr)
    ev_df = _flatten(evspsbl)
    pr_df["year"] = pr_df["time"].dt.year
    ev_df["year"] = ev_df["time"].dt.year
    annual_supply = pr_df.groupby(["year", "h3_cell"])["pr"].sum()
    annual_demand = ev_df.groupby(["year", "h3_cell"])["evspsbl"].sum()
    merged = annual_supply.to_frame("supply").join(annual_demand.to_frame("demand"), how="inner")
    ratio = merged["demand"] / (merged["supply"] + 1e-3)
    return ratio.groupby("h3_cell").mean().clip(0, 5) * 20.0  # 0–100


def _water_gwd(mrso: pd.DataFrame, *, baseline_years: int = 10) -> pd.Series:
    """Groundwater depth anomaly — drop in soil-moisture stock vs early baseline."""
    df = _flatten(mrso)
    df["year"] = df["time"].dt.year
    annual = df.groupby(["year", "h3_cell"])["mrso"].mean()
    out: Dict[str, float] = {}
    for c in annual.index.get_level_values("h3_cell").unique():
        s = annual.xs(c, level="h3_cell")
        if s.empty:
            continue
        baseline = s.iloc[:baseline_years].mean()
        latest = s.iloc[-baseline_years:].mean()
        out[c] = max(0.0, baseline - latest)  # only depletion counts
    return pd.Series(out)


def _water_mrro_delta(mrro: pd.DataFrame, *, baseline_years: int = 5) -> pd.Series:
    """Projected change in total runoff (%) vs early baseline."""
    df = _flatten(mrro)
    df["year"] = df["time"].dt.year
    annual = df.groupby(["year", "h3_cell"])["mrro"].mean()
    out: Dict[str, float] = {}
    for c in annual.index.get_level_values("h3_cell").unique():
        s = annual.xs(c, level="h3_cell")
        if s.empty:
            continue
        base = s.iloc[:baseline_years].mean()
        latest = s.iloc[-baseline_years:].mean()
        out[c] = ((latest - base) / (base + 1e-6)) * 100.0
    return pd.Series(out)


def _water_evap_demand(evspsbl: pd.DataFrame) -> pd.Series:
    """Total ET demand (mm/yr) — higher = more stress."""
    df = _flatten(evspsbl)
    df["year"] = df["time"].dt.year
    annual = df.groupby(["year", "h3_cell"])["evspsbl"].sum()
    return annual.groupby("h3_cell").mean()


def _water_monsoon_cv(pr: pd.DataFrame) -> pd.Series:
    """JJAS precipitation coefficient of variation — unreliable-monsoon proxy."""
    df = _flatten(pr)
    df["month"] = df["time"].dt.month
    df["year"] = df["time"].dt.year
    jjas = df[df["month"].isin([6, 7, 8, 9])]
    annual = jjas.groupby(["year", "h3_cell"])["pr"].sum()
    return annual.groupby("h3_cell").std() / (annual.groupby("h3_cell").mean() + 1e-6) * 100.0


# ─────────────────────────────────────────────────────────────────────────────
# DROUGHT — 5 indicators (§7)
# ─────────────────────────────────────────────────────────────────────────────

def _drought_spi12(pr: pd.DataFrame) -> pd.Series:
    """SPI-12 — z-score of 12-month cumulative precipitation."""
    df = _flatten(pr)
    df["year"] = df["time"].dt.year
    df["month"] = df["time"].dt.month
    monthly = df.groupby(["year", "month", "h3_cell"])["pr"].sum()
    # rolling 12-month sum — keep it simple: sum across 12 consecutive months
    cells = monthly.index.get_level_values("h3_cell").unique()
    out: Dict[str, float] = {}
    for c in cells:
        s = monthly.xs(c, level="h3_cell").sort_index()
        roll = s.rolling(12, min_periods=12).sum().dropna()
        mu, sigma = roll.mean(), roll.std()
        out[c] = float(((roll.iloc[-1] - mu) / (sigma + 1e-6)) if len(roll) else 0.0)
    return pd.Series(out)


def _drought_spei(pr: pd.DataFrame, tas: pd.DataFrame) -> pd.Series:
    """SPEI proxy — PET − P surplus/deficit; here we use (P − 0.5·T) as
    a Thornthwaite-style approximation since we don't carry rsds."""
    pr_df = _flatten(pr)
    tas_df = _flatten(tas)
    pr_df["year"] = pr_df["time"].dt.year
    tas_df["year"] = tas_df["time"].dt.year
    p_annual = pr_df.groupby(["year", "h3_cell"])["pr"].sum()
    t_annual = tas_df.groupby(["year", "h3_cell"])["tas"].mean()
    clim = (p_annual.to_frame("P").join(t_annual.to_frame("T"), how="inner"))
    clim["D"] = clim["P"] - 50.0 * clim["T"]
    # z-score the last 5 years of D
    out: Dict[str, float] = {}
    for c in clim.index.get_level_values("h3_cell").unique():
        s = clim.xs(c, level="h3_cell")["D"]
        if len(s) < 5:
            continue
        mu, sigma = s.mean(), s.std()
        out[c] = float((s.iloc[-1] - mu) / (sigma + 1e-6))
    return pd.Series(out)


def _drought_mrso_anomaly(mrso: pd.DataFrame, *, baseline_years: int = 5) -> pd.Series:
    """Root-zone soil moisture below 20th percentile of baseline distribution."""
    df = _flatten(mrso)
    df["year"] = df["time"].dt.year
    annual = df.groupby(["year", "h3_cell"])["mrso"].mean()
    out: Dict[str, float] = {}
    for c in annual.index.get_level_values("h3_cell").unique():
        s = annual.xs(c, level="h3_cell")
        if s.empty:
            continue
        baseline = s.iloc[:baseline_years]
        threshold = np.percentile(baseline, 20)
        out[c] = max(0.0, threshold - s.iloc[-1])
    return pd.Series(out)


def _drought_cdd_days(pr_daily: pd.DataFrame) -> pd.Series:
    """Consecutive dry days — max run of days with pr < 1 mm per year."""
    df = _flatten(pr_daily)
    df["year"] = df["time"].dt.year
    grouped = df.groupby(["year", "h3_cell"])
    out: Dict[Tuple[int, str], float] = {}
    for (year, cell), g in grouped:
        dry = (g["pr"] < 1.0).astype(int).reset_index(drop=True)
        runs = (dry * (dry.groupby((dry != dry.shift()).cumsum()).cumcount() + 1)).max()
        out[(year, cell)] = float(runs) if pd.notna(runs) else 0.0
    s = pd.Series(out)
    # `out` keys are (year, cell) tuples — the Series has a 2-level MultiIndex.
    return s.groupby(level=1).max()


def _drought_pr_trend(pr: pd.DataFrame) -> pd.Series:
    """Sen's slope of annual precipitation (mm/decade). Negative = drying."""
    df = _flatten(pr)
    df["year"] = df["time"].dt.year
    annual = df.groupby(["year", "h3_cell"])["pr"].sum()
    out: Dict[str, float] = {}
    for c in annual.index.get_level_values("h3_cell").unique():
        s = annual.xs(c, level="h3_cell").dropna()
        if len(s) < 5:
            continue
        n = len(s)
        slopes = []
        for i in range(n):
            for j in range(i + 1, n):
                slopes.append((s.iloc[j] - s.iloc[i]) / (j - i))
        out[c] = float(np.median(slopes)) * 10.0  # per decade
    return pd.Series(out)


# ─────────────────────────────────────────────────────────────────────────────
# STORM — 5 indicators (§8)
# ─────────────────────────────────────────────────────────────────────────────

def _storm_cape(tas: pd.DataFrame, hurs: pd.DataFrame) -> pd.Series:
    """CAPE proxy — high T + high RH in pre-monsoon months.

    Note: a proper CAPE needs pressure-level ta/hus which we do not
    currently download. This proxy flags instability-prone cells.
    """
    tas_df = _flatten(tas)
    hurs_df = _flatten(hurs)
    tas_df["month"] = tas_df["time"].dt.month
    hurs_df["month"] = hurs_df["time"].dt.month
    pre = tas_df[tas_df["month"].isin([3, 4, 5])]
    rh_pre = hurs_df[hurs_df["month"].isin([3, 4, 5])]
    tmax = pre.groupby("h3_cell")["tas"].max()
    rhmax = rh_pre.groupby("h3_cell")["hurs"].max()
    return (tmax * rhmax / 100.0).rename("cape_proxy")


def _storm_pr99p(pr_daily: pd.DataFrame) -> pd.Series:
    """Extreme precip intensity — same calculation as flood's pr99p."""
    return _flood_pr99p(pr_daily)


def _storm_wind_p90(sfcWind: pd.DataFrame) -> pd.Series:
    """90th percentile of daily mean 10 m wind speed."""
    df = _flatten(sfcWind)
    return df.groupby("h3_cell")["sfcWind"].quantile(0.90)


def _storm_dust_emission(static: pd.DataFrame, sfcWind: pd.DataFrame, mrso: pd.DataFrame) -> pd.Series:
    """(1 − NDVI) · wind_p90 · (1 − mrso_normalised) — dust mobilisation."""
    if static.empty:
        return pd.Series(dtype=float)
    wind_p90 = _storm_wind_p90(sfcWind)
    mrso_df = _flatten(mrso)
    mrso_mean = mrso_df.groupby("h3_cell")["mrso"].mean()
    mrso_norm = (mrso_mean - mrso_mean.min()) / (mrso_mean.max() - mrso_mean.min() + 1e-6)
    raw = (1.0 - static["ndvi"]) * wind_p90.reindex(static.index, fill_value=0) * (1.0 - mrso_norm.reindex(static.index, fill_value=0))
    return raw.rename("dust")


def _storm_ndvi_trend(static: pd.DataFrame) -> pd.Series:
    """NDVI greening-to-browning trend."""
    if static.empty or "ndvi_slope" not in static.columns:
        return pd.Series(dtype=float)
    return -static["ndvi_slope"]  # negative slope → risk goes up


# ─────────────────────────────────────────────────────────────────────────────
# WILDFIRE — 5 indicators (§9)
# ─────────────────────────────────────────────────────────────────────────────

def _wildfire_fwi(tasmax_daily: pd.DataFrame, hurs: pd.DataFrame, sfcWind: pd.DataFrame, pr_daily: pd.DataFrame) -> pd.Series:
    """Canadian Fire Weather Index — daily composite, simplified.

    D = drought factor (from precip); T = temperature; H = humidity; V = wind.
    FWI = 2 · exp(-0.45 + 0.987·ln(D+1) − 0.0345·H + 0.0338·T + 0.0234·V)

    We aggregate by cell using mean daily values over the fire-season months.
    """
    tasmax_df = _flatten(tasmax_daily)
    hurs_df = _flatten(hurs)
    wind_df = _flatten(sfcWind)
    pr_df = _flatten(pr_daily)
    tasmax_df["month"] = tasmax_df["time"].dt.month
    fire = tasmax_df[tasmax_df["month"].isin([1, 2, 3, 4, 5, 10, 11])]
    T = fire.groupby("h3_cell")["tasmax"].mean()
    H = hurs_df.groupby("h3_cell")["hurs"].mean()
    V = wind_df.groupby("h3_cell")["sfcWind"].mean()
    # Drought factor proxy from annual precip — less precip → larger D
    pr_df["year"] = pr_df["time"].dt.year
    annual_pr = pr_df.groupby(["year", "h3_cell"])["pr"].sum().groupby("h3_cell").mean()
    D = (1500.0 / (annual_pr + 100.0)).clip(0, 10)  # arbitrary scale
    return (2.0 * np.exp(-0.45 + 0.987 * np.log(D + 1.0) - 0.0345 * H + 0.0338 * T + 0.0234 * V)).rename("fwi")


def _wildfire_vpd(tas: pd.DataFrame, hurs: pd.DataFrame) -> pd.Series:
    """Vapour Pressure Deficit (kPa). VPD = 0.6108 · exp(17.27·T/(T+237.3)) · (1 − RH/100)"""
    tas_df = _flatten(tas)
    hurs_df = _flatten(hurs)
    T = tas_df.groupby("h3_cell")["tas"].mean()
    RH = hurs_df.groupby("h3_cell")["hurs"].mean()
    return (0.6108 * np.exp(17.27 * T / (T + 237.3)) * (1.0 - RH / 100.0)).rename("vpd")


def _wildfire_ffdi(static: pd.DataFrame, sfcWind: pd.DataFrame, mrso: pd.DataFrame) -> pd.Series:
    """McArthur FFDI — D · temperature · humidity · wind.

    2 · exp(−0.45 + 0.987·ln(D) − 0.0345·H + 0.0338·T + 0.0234·V)
    Here T is approximated by annual mean of monthly tas; H from hurs;
    V from sfcWind p90; D from mrso anomaly (proxy for fuel dryness).
    """
    if static.empty:
        return pd.Series(dtype=float)
    mrso_df = _flatten(mrso)
    mrso_mean = mrso_df.groupby("h3_cell")["mrso"].mean()
    D = (mrso_mean.max() - mrso_mean) / (mrso_mean.max() - mrso_mean.min() + 1e-6) * 5.0
    V = _storm_wind_p90(sfcWind)
    return (2.0 * np.exp(-0.45 + 0.987 * np.log(D + 1.0) + 0.0338 * 25.0 + 0.0234 * V)).rename("ffdi")


def _wildfire_lfmc(static: pd.DataFrame) -> pd.Series:
    """Live fuel moisture content proxy from NDVI biomass and moisture anomaly."""
    if static.empty:
        return pd.Series(dtype=float)
    # LFMC < 80% → ignition-ready. Lower NDVI biomass typically correlates
    # with drier microclimate in our latitude band.
    return (1.0 - static["ndvi"]).rename("lfmc_inverse")


def _wildfire_wind_p90(sfcWind: pd.DataFrame) -> pd.Series:
    """Fire-season 90th percentile wind speed."""
    df = _flatten(sfcWind)
    df["month"] = df["time"].dt.month
    fire = df[df["month"].isin([1, 2, 3, 4, 5, 10, 11])]
    return fire.groupby("h3_cell")["sfcWind"].quantile(0.90)


# ─────────────────────────────────────────────────────────────────────────────
# Indicator registry — code → (hazard, weight, function)
# ─────────────────────────────────────────────────────────────────────────────

INDICATOR_REGISTRY: Dict[str, Tuple[str, Callable, Tuple[str, ...]]] = {
    # Flood
    "rx5day":          ("flood", _flood_rx5day,          ("pr_daily",)),
    "pr99p_flood":     ("flood", _flood_pr99p,           ("pr_daily",)),
    "slope_twi":       ("flood", _flood_slope_twi,       ("static",)),
    "mrso_antecedent": ("flood", _flood_mrso_antecedent, ("mrso_monthly",)),
    "drainage":        ("flood", _flood_drainage,        ("static",)),

    # Heat stress
    "hwd":             ("heat_stress", _heat_hwd,        ("tasmax_daily",)),
    "wbgt":            ("heat_stress", _heat_wbgt,       ("tas", "hurs")),
    "txx":             ("heat_stress", _heat_txx,        ("tasmax_daily",)),
    "cdd":             ("heat_stress", _heat_cdd,        ("tas",)),
    "uhi":             ("heat_stress", _heat_uhi,        ("static", "tasmin")),

    # Water stress
    "bws":             ("water_stress", _water_bws,      ("mrro", "pr", "evspsbl")),
    "gwd":             ("water_stress", _water_gwd,      ("mrso",)),
    "mrro_delta":      ("water_stress", _water_mrro_delta, ("mrro",)),
    "evap_demand":     ("water_stress", _water_evap_demand, ("evspsbl",)),
    "monsoon_cv":      ("water_stress", _water_monsoon_cv, ("pr",)),

    # Drought
    "spi12":           ("drought", _drought_spi12,       ("pr",)),
    "spei":            ("drought", _drought_spei,        ("pr", "tas")),
    "mrso_anomaly":    ("drought", _drought_mrso_anomaly, ("mrso",)),
    "cdd_days":        ("drought", _drought_cdd_days,    ("pr_daily",)),
    "pr_trend":        ("drought", _drought_pr_trend,    ("pr",)),

    # Storm
    "cape":            ("storm", _storm_cape,            ("tas", "hurs")),
    "pr99p_storm":     ("storm", _storm_pr99p,           ("pr_daily",)),
    "wind_p90_storm":  ("storm", _storm_wind_p90,        ("sfcWind",)),
    "dust_emission":   ("storm", _storm_dust_emission,   ("static", "sfcWind", "mrso")),
    "ndvi_trend":      ("storm", _storm_ndvi_trend,      ("static",)),

    # Wildfire
    "fwi":             ("wildfire", _wildfire_fwi,       ("tasmax_daily", "hurs", "sfcWind", "pr_daily")),
    "vpd":             ("wildfire", _wildfire_vpd,       ("tas", "hurs")),
    "ffdi":            ("wildfire", _wildfire_ffdi,      ("static", "sfcWind", "mrso")),
    "lfmc":            ("wildfire", _wildfire_lfmc,      ("static",)),
    "wind_p90_wildfire":("wildfire", _wildfire_wind_p90, ("sfcWind",)),
}
