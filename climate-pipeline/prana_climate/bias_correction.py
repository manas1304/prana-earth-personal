"""Quantile Delta Mapping (QDM) — methodology §2.3.

    x_bc = x_obs,hist + F_obs,hist^(-1)( F_GCM,hist(x_GCM) ) · (x_GCM,fut / x_GCM,hist)

For temperature and precipitation, QDM is the recommended ISIMIP3b
bias-correction approach. This module is a thin xarray-friendly wrapper
that uses scipy's empirical CDF and inverse-CDF utilities.
"""
from __future__ import annotations

from typing import Tuple

import numpy as np
import xarray as xr
from scipy.interpolate import interp1d
from scipy.stats import ecdf


def empirical_cdf(values: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
    """Return (sorted_values, empirical_cdf) for a 1-D array, dropping NaNs."""
    v = np.asarray(values, dtype=float)
    v = v[~np.isnan(v)]
    if v.size == 0:
        return np.array([0.0]), np.array([0.0])
    res = ecdf(v)
    return v[np.argsort(v)], res.cdf.evaluate(v[np.argsort(v)])


def inverse_cdf(sorted_values: np.ndarray, cdf: np.ndarray, quantile: np.ndarray) -> np.ndarray:
    """Linear interpolation inverse-CDF. Quantiles clipped to [0, 1]."""
    q = np.clip(quantile, 0.0, 1.0)
    return interp1d(cdf, sorted_values, bounds_error=False, fill_value=(sorted_values[0], sorted_values[-1]))(q)


def qdm_correct(
    gcm_hist: xr.DataArray,
    gcm_fut: xr.DataArray,
    obs_hist: xr.DataArray,
    *,
    relative: bool = False,
) -> xr.DataArray:
    """Apply Quantile Delta Mapping.

    Args:
        gcm_hist:  GCM historical (will become the quantile-space anchor).
        gcm_fut:   GCM future projection.
        obs_hist:  Observed historical baseline (IMD for India / CHIRPS global).
        relative:  If True, apply a multiplicative delta (for precipitation);
                   otherwise additive (for temperature).

    Returns:
        Bias-corrected ``gcm_fut`` aligned with ``obs_hist``.
    """
    flat_hist = gcm_hist.values.flatten()
    flat_fut = gcm_fut.values.flatten()
    flat_obs = obs_hist.values.flatten()

    sorted_obs, cdf_obs = empirical_cdf(flat_obs)
    sorted_gcm, cdf_gcm = empirical_cdf(flat_hist)

    # Quantile for each future value under the historical GCM CDF.
    q = np.interp(flat_fut, sorted_gcm, cdf_gcm, left=0.0, right=1.0)
    obs_quantile = inverse_cdf(sorted_obs, cdf_obs, q)

    if relative:
        # Per-quantile ratio: future / historical at the same quantile.
        hist_at_quantile = inverse_cdf(sorted_gcm, cdf_gcm, q)
        # Avoid division-by-zero; precip < 1 mm/day treated as 1 mm.
        ratio = np.where(hist_at_quantile < 1.0, 1.0, flat_fut / np.where(hist_at_quantile == 0, 1.0, hist_at_quantile))
        bc = np.where(hist_at_quantile < 1.0, obs_quantile, obs_quantile * ratio)
    else:
        # Per-quantile additive delta.
        hist_at_quantile = inverse_cdf(sorted_gcm, cdf_gcm, q)
        delta = flat_fut - hist_at_quantile
        bc = obs_quantile + delta

    out = xr.full_like(gcm_fut, np.nan, dtype=float)
    out.values = bc.reshape(gcm_fut.shape)
    out.attrs["bias_correction"] = "QDM (ISIMIP3b)"
    out.attrs["relative_delta"] = str(relative)
    return out
