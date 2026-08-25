"""Map a CMIP6 lat/lon grid to H3 cells at a fixed resolution.

CMIP6 native grids are regular lat/lon (typically 1°–2° spacing). We treat
every *grid-cell centroid* as a point, convert it to an H3 id at the
configured resolution, and group the source values by that id so we can
emit one row per H3 cell per timestep.
"""
from __future__ import annotations

from typing import Dict, Iterable, List, Tuple

import numpy as np
import xarray as xr

from prana_climate.config import H3_RESOLUTION
from prana_climate.h3_index import cell_for

# Lazy import to keep unit tests fast.
_xx = None


def _grid_centroids(lat: np.ndarray, lon: np.ndarray) -> List[Tuple[float, float]]:
    """Return (lat, lng) pairs for every native grid-cell centre.

    CMIP6 longitudes are usually 0–360; we convert to –180/180 here so H3
    doesn't see a discontinuity.
    """
    lats = np.asarray(lat)
    lons = np.asarray(((np.asarray(lon) + 180) % 360) - 180)

    # Cell-centre = mid-point between consecutive coord edges.
    lat_edges = 0.5 * (lats[:-1] + lats[1:])
    lon_edges = 0.5 * (lons[:-1] + lons[1:])
    if lat_edges.size == 0:
        lat_edges = lats
    if lon_edges.size == 0:
        lon_edges = lons

    return [(float(la), float(lo)) for la in lat_edges for lo in lon_edges]


def assign_cells(lat: np.ndarray, lon: np.ndarray, res: int = H3_RESOLUTION) -> Dict[str, List[int]]:
    """Bucket native (lat, lon) grid points into H3 cell ids.

    Returns ``{h3_cell_id: [flat_index, ...]}`` where ``flat_index`` is the
    position into the flattened native grid (row-major: lat fastest, then lon).
    """
    centroids = _grid_centroids(lat, lon)
    bucket: Dict[str, List[int]] = {}
    for flat_idx, (la, lo) in enumerate(centroids):
        cell = cell_for(la, lo, res)
        bucket.setdefault(cell, []).append(flat_idx)
    return bucket


def map_dataset_to_h3(ds: xr.Dataset, variable: str, res: int = H3_RESOLUTION) -> xr.Dataset:
    """Return a new Dataset indexed by H3 cell id and time.

    For each native grid-cell that falls inside an H3 cell, the *mean* of
    the contributing grid cells' values is taken (preserves the spatial
    weighting — multiple native cells in one H3 cell are typical because
    CMIP6 native grids are coarser than H3 res-6).
    """
    if variable not in ds.data_vars:
        raise KeyError(f"Variable {variable!r} not in dataset; have {list(ds.data_vars)}")

    # Slice the time dimension to the project window BEFORE reprojecting.
    # Reprojection materializes the full 3D field (time × lat × lon) in
    # memory, so trimming the time axis here is critical for big files.
    from prana_climate.config import PROCESS_START_YEAR, PROCESS_END_YEAR
    if "time" in ds.dims and ds.sizes.get("time", 0) > 0:
        times = ds["time"].values
        def _year(t):
            if hasattr(t, "year"):
                y = t.year
                if callable(y):
                    y = y()
                try:
                    return int(y)
                except (TypeError, ValueError):
                    return None
            return None
        years = [_year(t) for t in times]
        valid_mask = [y is not None and PROCESS_START_YEAR <= y <= PROCESS_END_YEAR
                      for y in years]
        if any(valid_mask):
            ds = ds.isel(time=valid_mask)

    lat = ds["lat"].values
    lon = ds["lon"].values
    bucket = assign_cells(lat, lon, res)

    da = ds[variable]
    # Ensure (time, lat, lon) layout
    if "lat" in da.dims and "lon" in da.dims:
        flat = da.stack(grid=("lat", "lon")).transpose("time", "grid")
    else:
        flat = da

    cells_sorted = sorted(bucket)
    n_time = flat.sizes["time"]
    n_cells = len(cells_sorted)
    arr = np.empty((n_time, n_cells), dtype=np.float32)
    # Process in time chunks to bound peak memory. For GFDL files the full
    # time×cells array is 420×51000×4B = 86 MB (small) but the latent
    # index lookup in the bucket map explodes to ~4 GB because xarray
    # fans out the index over the lat/lon grid before collapsing. We work
    # around that by loading one time slice at a time.
    TIME_CHUNK = 12  # ~1 year per chunk
    for t_start in range(0, n_time, TIME_CHUNK):
        t_end = min(t_start + TIME_CHUNK, n_time)
        slice_ = flat.isel(time=slice(t_start, t_end))
        for col, cell in enumerate(cells_sorted):
            idx = bucket[cell]
            # Support both single-index and multi-index cells.
            sub = slice_.values[:, idx] if slice_.ndim > 1 else slice_.values
            if sub.ndim == 1:
                arr[t_start:t_end, col] = sub
            else:
                arr[t_start:t_end, col] = np.nanmean(sub, axis=1)
        del slice_  # free memory before next chunk

    out = xr.Dataset(
        {variable: (("time", "h3_cell"), arr)},
        coords={
            "time": flat["time"].values,
            "h3_cell": cells_sorted,
        },
        attrs={
            "h3_resolution": res,
            "source_variable": variable,
            "native_grid": f"{lat.size}x{lon.size}",
            "aggregation": "mean over contributing native grid cells",
        },
    )
    out[variable].attrs.update(da.attrs)
    return out
