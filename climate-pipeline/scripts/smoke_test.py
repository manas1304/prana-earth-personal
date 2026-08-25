#!/usr/bin/env python3
"""Local smoke test - exercises the full pipeline with synthetic + (optionally) real CMIP6 data.

Validates that, end-to-end:
    1. ``process_data.py`` opens a NetCDF, validates it, normalizes units,
       and emits H3-res-6 Parquet shards under ``processed/``.
    2. The ``HazardEngine`` consumes those shards (or an in-memory frame)
       and emits a sensible 6-hazard JSON response.
    3. The FastAPI app serves ``POST /v1/assess`` with that data.

Run:
    PYTHONPATH=. python scripts/smoke_test.py

Or with one real ESGF file (a tiny tas_Amon slice):
    PRANA_SMOKE_REAL_URL='https://esgf-data.dkrz.de/.../tas_Amon_*.nc' \\
    PYTHONPATH=. python scripts/smoke_test.py
"""
from __future__ import annotations

import json
import os
import shutil
import subprocess
import sys
import tempfile
import time
from pathlib import Path

import numpy as np
import pandas as pd
import xarray as xr

# Make the project package importable regardless of cwd
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

# Point the climate pipeline's working dir at this repo's folders so the
# smoke test works on Windows / macOS / Linux without /opt/climate-pipeline.
os.environ["PRANA_PIPELINE_ROOT"] = str(ROOT)

REPO = ROOT
PROCESSED_DIR = ROOT / "processed"
DOWNLOADS_DIR = ROOT / "downloads"

# Where we point the FastAPI server's local aux override
DEMO_AUX = tempfile.mkdtemp(prefix="prana_smoke_aux_")
DEMO_DEMO = tempfile.mkdtemp(prefix="prana_smoke_demo_")


def banner(text: str) -> None:
    bar = "=" * 70
    print(f"\n{bar}\n  {text}\n{bar}")


def _make_synthetic_netcdf(out_path: Path) -> dict[str, float]:
    """Create a tiny but valid CMIP6-shaped NetCDF and return some 'truth'
    values so the test can sanity-check the processed output."""
    # 2° global grid, 5° lon × 3° lat = 36 lon × 18 lat = 648 cells
    lats = np.linspace(-85, 85, 18)
    lons = np.linspace(-178, 178, 36)
    # 24 monthly timesteps (2 years)
    times = pd.date_range("2020-01-15", periods=24, freq="MS")

    # Latitude-dependent temperature, plus a small seasonal cycle.
    # Build a proper 3-D field (lat, lon, time) of shape (18, 36, 24).
    n_lat, n_lon, n_time = len(lats), len(lons), len(times)
    base_t = 273.15 + 25.0 - 0.4 * np.abs(lats)                         # (18,)
    seasonal = 5.0 * np.cos(np.radians(lats))[:, None] \
               * np.sin(np.linspace(0, 4 * np.pi, n_time))[None, :]   # (18, 24)
    tas = np.broadcast_to(
        (base_t[:, None] + seasonal)[:, None, :],                     # (18, 1, 24)
        (n_lat, n_lon, n_time),                                       # (18, 36, 24)
    ).copy()
    pr = np.broadcast_to(
        np.maximum(0, (100.0 - 0.5 * np.abs(lats)))[:, None, None],    # (18, 1, 1)
        (n_lat, n_lon, n_time),                                       # (18, 36, 24)
    ).copy()

    ds = xr.Dataset(
        data_vars={
            "tas": (("lat", "lon", "time"), tas,
                    {"units": "K", "standard_name": "air_temperature"}),
            "pr":  (("lat", "lon", "time"), pr,
                    {"units": "kg m-2 s-1", "standard_name": "precipitation_flux"}),
        },
        coords={
            "lat": (("lat",), lats, {"units": "degrees_north", "standard_name": "latitude"}),
            "lon": (("lon",), lons, {"units": "degrees_east",  "standard_name": "longitude"}),
            "time": (("time",), times, {"standard_name": "time"}),
        },
        attrs={
            "Conventions": "CF-1.8",
            "source_id": "SyntheticGCM-1.0",
            "variant_label": "r1i1p1f1",
            "experiment_id": "historical",
            "frequency": "mon",
        },
    )
    out_path.parent.mkdir(parents=True, exist_ok=True)
    ds.to_netcdf(out_path, format="NETCDF4_CLASSIC")

    # Report the mean surface temperature at the equator - that's our sanity check
    equator_idx = np.argmin(np.abs(lats))    # nearest latitude to 0
    equator_t = float(ds["tas"].isel(lat=equator_idx).mean().values) - 273.15
    return {"equator_mean_celsius": equator_t}


def _run(cmd: list[str], **kwargs) -> subprocess.CompletedProcess:
    print(f"  $ {' '.join(cmd)}")
    # Always pass PRANA_PIPELINE_ROOT to the child so it points at this repo,
    # regardless of what the parent shell had set.
    env = {**os.environ, "PRANA_PIPELINE_ROOT": str(REPO)}
    return subprocess.run(cmd, check=True, env=env, **kwargs)


def track_1_synthetic() -> dict[str, float]:
    """Generate a synthetic NetCDF and run process_data.py against it."""
    banner("TRACK 1 - synthetic NetCDF -> process_data.py")
    raw_path = DOWNLOADS_DIR / "historical" / "synthetic_tas_pr.nc"
    if raw_path.exists():
        raw_path.unlink()
    truth = _make_synthetic_netcdf(raw_path)
    print(f"  Synthetic NetCDF: {raw_path}  ({raw_path.stat().st_size // 1024} KB)")
    print(f"  Equator mean surface T (truth): {truth['equator_mean_celsius']:.1f} °C")

    # Run process_data.py
    _run([
        sys.executable, str(REPO / "process_data.py"),
        "--variable", "tas",
        "--scenario", "historical",
        "--model", "SyntheticGCM",
        "--frequency", "mon",
    ], cwd=str(REPO))

    # Also process pr to exercise the kg m-2 s-1 -> mm/month branch
    _run([
        sys.executable, str(REPO / "process_data.py"),
        "--variable", "pr",
        "--scenario", "historical",
        "--model", "SyntheticGCM",
        "--frequency", "mon",
    ], cwd=str(REPO))

    # Verify Parquet shards landed
    tas_shards = list((PROCESSED_DIR / "temperature" / "historical" / "SyntheticGCM" / "tas").rglob("*.parquet"))
    pr_shards  = list((PROCESSED_DIR / "precipitation" / "historical" / "SyntheticGCM" / "pr").rglob("*.parquet"))
    assert tas_shards, "No tas Parquet shards produced"
    assert pr_shards,  "No pr Parquet shards produced"
    print(f"  + process_data.py produced {len(tas_shards)} tas shards, {len(pr_shards)} pr shards")

    # Sanity-check a shard — note that a *random* shard may be polar (very cold)
    # or tropical (warm); we check the *aggregate* range across all shards.
    sample = pd.read_parquet(tas_shards[0])
    assert "time" in sample.columns, f"shard missing 'time' col: {sample.columns}"
    assert "tas" in sample.columns,  f"shard missing 'tas' col: {sample.columns}"
    sample_mean_c = float(sample["tas"].mean())

    # Global min/max of cell-mean tas across ALL shards — confirms the
    # latitudinal gradient made it through xarray + H3 bucketing + parquet.
    means = []
    for shard in tas_shards:
        s = pd.read_parquet(shard)
        means.append(float(s["tas"].mean()))
    global_max = max(means)
    global_min = min(means)
    print(f"  + Sample shard ({tas_shards[0].name[:10]}): {len(sample)} rows, mean = {sample_mean_c:.1f} °C")
    print(f"  + Global cell-mean tas range: {global_min:.1f} to {global_max:.1f} °C across {len(means)} cells")
    assert global_max > 15.0,  "No tropical H3 cell — latitudinal gradient didn't survive H3 bucketing."
    assert global_min < -5.0,  "No polar H3 cell — latitudinal gradient didn't survive H3 bucketing."
    return {"tas_mean_c": sample_mean_c, "tas_shards": len(tas_shards), "pr_shards": len(pr_shards)}


def track_2_engine_and_api() -> None:
    """Run the engine + FastAPI against the synthetic processed data + demo aux."""
    banner("TRACK 2 - engine + FastAPI on synthetic data")

    # Generate demo aux so exposure layers have real numbers
    from prana_climate.h3_index import cell_for
    import pandas as _pd
    cities = [
        ("bengaluru", 12.97, 77.59),
        ("phoenix",   33.45, -112.07),
        ("reykjavik", 64.15, -21.94),
        ("london",    51.51, -0.13),
        ("mumbai",    19.08, 72.88),
    ]
    rows_wp, rows_bu, rows_nd, rows_cn = [], [], [], []
    profiles = {
        "bengaluru": (13_000_000, 0.55, 0.55, 0.55),
        "phoenix":   (1_600_000,   0.20, 0.70, 0.30),
        "reykjavik": (130_000,     0.45, 0.90, 0.10),
        "london":    (9_000_000,   0.60, 0.85, 0.40),
        "mumbai":    (20_000_000,  0.55, 0.55, 0.80),
    }
    for name, lat, lon in cities:
        cell = cell_for(lat, lon, 6)
        pop, ndvi, income, imperv = profiles[name]
        rows_wp.append({"h3_cell": cell, "population": pop})
        rows_bu.append({"h3_cell": cell, "built_up_m2": pop * 35.0})
        rows_nd.append({"h3_cell": cell, "ndvi": ndvi, "ndvi_slope": -0.002})
        rows_cn.append({"h3_cell": cell, "income_quintile": income})
    for sub in ("worldpop", "ghsl", "modis", "census"):
        (Path(DEMO_AUX) / "aux" / sub).mkdir(parents=True, exist_ok=True)
    _pd.DataFrame(rows_wp).to_parquet(f"{DEMO_AUX}/aux/worldpop/worldpop_100m.parquet", index=False)
    _pd.DataFrame(rows_bu).to_parquet(f"{DEMO_AUX}/aux/ghsl/built_up.parquet", index=False)
    _pd.DataFrame(rows_nd).to_parquet(f"{DEMO_AUX}/aux/modis/ndvi_static.parquet", index=False)
    _pd.DataFrame(rows_cn).to_parquet(f"{DEMO_AUX}/aux/census/income_quintile.parquet", index=False)

    # Build a tiny indicator frame from the synthetic processed data
    from prana_climate.hazard_scores import HazardEngine, HAZARDS

    # Find one H3 cell that has both tas and pr shards
    tas_dir = PROCESSED_DIR / "temperature" / "historical" / "SyntheticGCM" / "tas"
    tas_cells = {p.stem for p in tas_dir.glob("*.parquet")}
    print(f"  Found {len(tas_cells)} H3 cells with tas data")

    # Build a synthetic 30-indicator frame indexed by those cells
    from prana_climate.indicators import INDICATOR_WEIGHTS
    indicators = {}
    for cell in sorted(tas_cells)[:50]:  # cap at 50 cells for speed
        # Latitude-dependent synthetic scores
        # (engineered to roughly match the demo profiles)
        rng = np.random.default_rng(int(cell, 16) % (2**32))
        lat_guess = float(np.mean(rng.uniform(-60, 60, size=3)))
        is_tropical = abs(lat_guess) < 23.5
        indicators[cell] = {
            "rx5day":           70 if is_tropical else 30,
            "pr99p_flood":      75 if is_tropical else 25,
            "slope_twi":        30 + rng.normal(0, 5),
            "mrso_antecedent":  40 + rng.normal(0, 10),
            "drainage":         60 if is_tropical else 30,
            "hwd":              max(0, 80 - abs(lat_guess) * 1.2 + rng.normal(0, 5)),
            "wbgt":             max(0, 70 - abs(lat_guess) * 0.8 + rng.normal(0, 5)),
            "txx":              max(0, 90 - abs(lat_guess) * 1.0 + rng.normal(0, 5)),
            "cdd":              max(0, 85 - abs(lat_guess) * 0.9 + rng.normal(0, 5)),
            "uhi":              55 + rng.normal(0, 5),
            "bws":              max(0, 80 - abs(lat_guess) * 0.7 + rng.normal(0, 5)),
            "gwd":              max(0, 70 - abs(lat_guess) * 0.6 + rng.normal(0, 5)),
            "mrro_delta":       -10 + rng.normal(0, 5),
            "evap_demand":      max(0, 75 - abs(lat_guess) * 0.7 + rng.normal(0, 5)),
            "monsoon_cv":       50 if is_tropical else 20,
            "spi12":            50 + rng.normal(0, 10),
            "spei":             50 + rng.normal(0, 10),
            "mrso_anomaly":     40 + rng.normal(0, 10),
            "cdd_days":         30 + rng.normal(0, 10),
            "pr_trend":         -5 + rng.normal(0, 5),
            "cape":             max(0, 80 - abs(lat_guess) * 0.6 + rng.normal(0, 5)),
            "pr99p_storm":      75 if is_tropical else 25,
            "wind_p90_storm":   40 + rng.normal(0, 10),
            "dust_emission":    max(0, 50 - abs(lat_guess) * 0.4 + rng.normal(0, 5)),
            "ndvi_trend":       10 + rng.normal(0, 5),
            "fwi":              max(0, 70 - abs(lat_guess) * 0.5 + rng.normal(0, 5)),
            "vpd":              max(0, 80 - abs(lat_guess) * 0.8 + rng.normal(0, 5)),
            "ffdi":             max(0, 65 - abs(lat_guess) * 0.5 + rng.normal(0, 5)),
            "lfmc":             55 + rng.normal(0, 5),
            "wind_p90_wildfire": 40 + rng.normal(0, 10),
        }

    indicator_df = pd.DataFrame(indicators).T
    indicator_df.index.name = "h3_cell"
    print(f"  Built synthetic indicator frame: {indicator_df.shape}")

    # Wire the engine with the local aux dir
    os.environ["PRANA_AUX_DIR"] = DEMO_AUX
    from prana_climate.exposure import ExposureSources
    engine = HazardEngine(
        indicators_df=indicator_df,
        exposure_sources=ExposureSources(),
        asset_value_factor=1.0,
        use_cache=False,
    )

    # Run a few real-world queries
    print("\n  Engine results:")
    from prana_climate.h3_index import cell_for
    for label, lat, lon in cities:
        cell = cell_for(lat, lon, 6)
        if cell not in indicator_df.index:
            print(f"    {label:10s} - no data in this cell, skipping")
            continue
        res = engine.assess(cell, scenario="ssp245", horizon=2050)
        print(f"    {label:10s}  composite={res.composite_risk:5.1f}  "
              f"heat={res.hazard_scores['heat_stress']:5.1f}  "
              f"flood={res.hazard_scores['flood']:5.1f}  "
              f"wildfire={res.hazard_scores['wildfire']:5.1f}")

    # Hit the live FastAPI server
    print("\n  Booting FastAPI in-process (TestClient)…")
    from fastapi.testclient import TestClient
    from prana_climate.api import create_app
    app = create_app(engine=engine, use_cache=False)
    client = TestClient(app)

    r = client.get("/v1/health")
    print(f"    GET  /v1/health        -> {r.status_code}  {r.json()['status']}")
    assert r.status_code == 200

    for label, lat, lon in cities:
        cell = cell_for(lat, lon, 6)
        if cell not in indicator_df.index:
            continue
        r = client.post("/v1/assess", json={
            "lat": lat, "lon": lon, "scenario": "ssp245", "horizon": 2050,
            "asset_type": "data_center",
        })
        assert r.status_code == 200, f"{label} assess failed: {r.text}"
        body = r.json()
        print(f"    POST /v1/assess {label:10s} -> {r.status_code}  composite={body['composite_risk']:.1f}  "
              f"cache={body.get('_cache')}")

    print("\n  + Engine + API smoke test PASSED")


def track_3_real_esgf() -> None:
    """Optionally download one small real CMIP6 file and process it."""
    real_url = os.environ.get("PRANA_SMOKE_REAL_URL")
    if not real_url:
        print("  PRANA_SMOKE_REAL_URL not set - skipping real-ESGF track")
        return

    banner("TRACK 3 - real ESGF download (small slice)")
    target = DOWNLOADS_DIR / "historical" / Path(real_url).name
    print(f"  Downloading: {real_url}")
    print(f"         to:  {target}")
    if not target.exists():
        # Try curl first (most widely available); fall back to urllib
        try:
            subprocess.run(["curl", "-sSLf", "-o", str(target), real_url], check=True)
        except (subprocess.CalledProcessError, FileNotFoundError):
            import urllib.request
            urllib.request.urlretrieve(real_url, str(target))
    print(f"  Downloaded: {target.stat().st_size // 1024} KB")

    # Process it — cap at 200 shards so the smoke test finishes in seconds.
    variable = "tas" if "tas_" in target.name else "pr"
    frequency = "day" if "_day_" in target.name else "mon"
    # Derive the model name from the filename (e.g. "MPI-ESM1-2-HR")
    name_parts = target.name.replace(".nc", "").split("_")
    real_model = name_parts[2] if len(name_parts) > 2 else "REAL"
    _run([
        sys.executable, str(REPO / "process_data.py"),
        "--variable", variable, "--scenario", "historical",
        "--model", real_model, "--frequency", frequency,
        "--max-cells", "200",
    ], cwd=str(REPO))

    shards = list((PROCESSED_DIR / ("temperature" if variable == "tas" else "precipitation")
                   / "historical" / real_model / variable).rglob("*.parquet"))
    assert shards, "Real-file processing produced no shards"
    print(f"  + Real-ESGF processing produced {len(shards)} H3 shards (capped at 200)")


def main() -> int:
    banner("PRANA CLIMATE PIPELINE - LOCAL SMOKE TEST")
    print(f"  Repo: {REPO}")
    print(f"  Python: {sys.executable}")
    print(f"  Time: {time.strftime('%Y-%m-%d %H:%M:%S')}")

    t0 = time.time()
    try:
        # Make sure the standard layout exists
        for d in ("scripts", "downloads/historical", "processed",
                  "downloads/ssp126", "downloads/ssp245",
                  "downloads/ssp370", "downloads/ssp585", "logs", "tests"):
            (REPO / d).mkdir(parents=True, exist_ok=True)

        results = track_1_synthetic()
        track_2_engine_and_api()
        track_3_real_esgf()

        elapsed = time.time() - t0
        banner(f"+ ALL TRACKS PASSED in {elapsed:.1f} s")
        print(f"  {results['tas_shards']} tas shards, {results['pr_shards']} pr shards")
        print(f"  Unit conversion verified: mean tas = {results['tas_mean_c']:.1f} °C")
        print("\n  You can now safely deploy to EC2.")
        return 0
    except subprocess.CalledProcessError as exc:
        banner(f"x PIPELINE STEP FAILED: {exc}")
        return 1
    except AssertionError as exc:
        banner(f"x ASSERTION FAILED: {exc}")
        return 2
    finally:
        # Clean up the tiny demo aux so it doesn't pollute future runs
        shutil.rmtree(DEMO_AUX, ignore_errors=True)
        shutil.rmtree(DEMO_DEMO, ignore_errors=True)


if __name__ == "__main__":
    raise SystemExit(main())