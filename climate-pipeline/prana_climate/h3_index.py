"""H3 helpers — convert lat/lng to H3 cells and back, build neighbour rings.

All public helpers are thin wrappers over the `h3` Python bindings so the
rest of the codebase doesn't need to know the resolution at call sites.
"""
from __future__ import annotations

from typing import Iterable, List, Tuple

import h3

from prana_climate.config import H3_RESOLUTION

# Type aliases keep call-sites short and self-documenting.
LatLng = Tuple[float, float]
H3Cell = str


def cell_for(lat: float, lon: float, res: int = H3_RESOLUTION) -> H3Cell:
    """Return the H3 cell id that contains the given lat/lng."""
    return h3.latlng_to_cell(lat, lon, res)


def latlng_of(cell: H3Cell) -> LatLng:
    """Return the centroid (lat, lng) of an H3 cell."""
    lat, lng = h3.cell_to_latlng(cell)
    return lat, lng


def boundary(cell: H3Cell) -> List[LatLng]:
    """Return the cell boundary as a list of (lat, lng) vertices."""
    return [(lat, lng) for lat, lng in h3.cell_to_boundary(cell)]


def neighbours(cell: H3Cell, k: int = 1) -> List[H3Cell]:
    """Return all cells within grid distance k (the cell itself is included)."""
    return list(h3.grid_disk(cell, k))


def neighbours_only(cell: H3Cell, k: int = 1) -> List[H3Cell]:
    """Like neighbours() but excludes the centre cell."""
    return [c for c in h3.grid_disk(cell, k) if c != cell]


def cell_area_km2(cell: H3Cell) -> float:
    """Spherical area of the cell in km²."""
    return h3.cell_area(cell, unit="km^2")


def parent(cell: H3Cell, res: int) -> H3Cell:
    """Return the ancestor cell at a coarser resolution."""
    return h3.cell_to_parent(cell, res)


def children(cell: H3Cell, res: int) -> List[H3Cell]:
    """Return the child cells at a finer resolution."""
    return list(h3.cell_to_children(cell, res))


def is_valid_cell(cell: H3Cell) -> bool:
    try:
        return h3.is_valid_cell(cell)
    except Exception:
        return False


def batch_cell_for(points: Iterable[LatLng], res: int = H3_RESOLUTION) -> List[H3Cell]:
    """Vectorised lat/lng → H3 cell for a list of points."""
    return [h3.latlng_to_cell(lat, lng, res) for lat, lng in points]
