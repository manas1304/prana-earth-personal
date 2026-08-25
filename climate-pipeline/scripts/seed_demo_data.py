#!/usr/bin/env python3
"""Seed demo indicators + exposure overlays so the API can answer
``POST /v1/assess`` queries before the real CMIP6 download pipeline has
populated S3.

Writes:

    s3://prana-climate-vault-prod/derived/indicators/<scenario>/<horizon>/all.parquet
    s3://prana-climate-vault-prod/aux/worldpop/worldpop_100m.parquet
    s3://prana-climate-vault-prod/aux/ghsl/built_up.parquet
    s3://prana-climate-vault-prod/aux/modis/ndvi_static.parquet
    s3://prana-climate-vault-prod/aux/census/income_quintile.parquet

Use ``--local`` to write to ``./demo_data/`` instead of S3 (for tests).
"""
from __future__ import annotations

import argparse
import logging
import sys
from pathlib import Path

import numpy as np
import pandas as pd

from prana_climate.config import HORIZONS, S3_BUCKET, SCENARIOS
from prana_climate.h3_index import cell_for

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(message)s")
log = logging.getLogger("seed_demo")


# 8 demo cities — covers multiple climate zones for quick visual sanity
DEMO_CITIES: list[tuple[str, float, float]] = [
    ("bengaluru", 12.9716, 77.5946),
    ("phoenix", 33.4484, -112.0740),
    ("london", 51.5074, -0.1278),
    ("lagos", 6.5244, 3.3792),
    ("reykjavik", 64.1466, -21.9426),
    ("sydney", -33.8688, 151.2093),
    ("mumbai", 19.0760, 72.8777),
    ("tokyo", 35.6762, 139.6503),
]

# Per-city risk profiles tuned to the methodology narrative — purely for demo.
# Higher number = higher raw indicator value = higher risk contribution.
CITY_PROFILES: dict[str, dict[str, float]] = {
    "bengaluru":   {"rx5day": 60, "pr99p": 55, "slope_twi": 35, "mrso_antecedent": 40, "drainage": 70,
                     "hwd": 30, "wbgt": 50, "txx": 55, "cdd": 60, "uhi": 65,
                     "bws": 75, "gwd": 80, "mrro_delta": 30, "evap_demand": 60, "monsoon_cv": 45,
                     "spi12": 50, "spei": 55, "mrso_anomaly": 60, "cdd_days": 40, "pr_trend": -10,
                     "cape": 50, "pr99p_storm": 55, "wind_p90_storm": 25, "dust_emission": 30, "ndvi_trend": 15,
                     "fwi": 35, "vpd": 55, "ffdi": 30, "lfmc": 60, "wind_p90_wildfire": 25},
    "phoenix":     {"rx5day": 25, "pr99p": 30, "slope_twi": 20, "mrso_antecedent": 15, "drainage": 50,
                     "hwd": 90, "wbgt": 85, "txx": 95, "cdd": 90, "uhi": 80,
                     "bws": 90, "gwd": 95, "mrro_delta": -20, "evap_demand": 90, "monsoon_cv": 60,
                     "spi12": 85, "spei": 90, "mrso_anomaly": 85, "cdd_days": 80, "pr_trend": -25,
                     "cape": 40, "pr99p_storm": 25, "wind_p90_storm": 35, "dust_emission": 70, "ndvi_trend": 25,
                     "fwi": 85, "vpd": 95, "ffdi": 70, "lfmc": 85, "wind_p90_wildfire": 35},
    "london":      {"rx5day": 35, "pr99p": 40, "slope_twi": 30, "mrso_antecedent": 50, "drainage": 65,
                     "hwd": 20, "wbgt": 30, "txx": 40, "cdd": 25, "uhi": 55,
                     "bws": 30, "gwd": 25, "mrro_delta": 5, "evap_demand": 30, "monsoon_cv": 25,
                     "spi12": 30, "spei": 35, "mrso_anomaly": 30, "cdd_days": 25, "pr_trend": 0,
                     "cape": 30, "pr99p_storm": 40, "wind_p90_storm": 60, "dust_emission": 10, "ndvi_trend": 5,
                     "fwi": 15, "vpd": 25, "ffdi": 10, "lfmc": 30, "wind_p90_wildfire": 60},
    "lagos":       {"rx5day": 75, "pr99p": 85, "slope_twi": 50, "mrso_antecedent": 70, "drainage": 75,
                     "hwd": 35, "wbgt": 80, "txx": 50, "cdd": 75, "uhi": 70,
                     "bws": 55, "gwd": 50, "mrro_delta": 15, "evap_demand": 60, "monsoon_cv": 50,
                     "spi12": 55, "spei": 60, "mrso_anomaly": 55, "cdd_days": 35, "pr_trend": -5,
                     "cape": 70, "pr99p_storm": 85, "wind_p90_storm": 45, "dust_emission": 25, "ndvi_trend": 20,
                     "fwi": 25, "vpd": 55, "ffdi": 20, "lfmc": 50, "wind_p90_wildfire": 45},
    "reykjavik":   {"rx5day": 20, "pr99p": 25, "slope_twi": 40, "mrso_antecedent": 60, "drainage": 20,
                     "hwd": 5, "wbgt": 10, "txx": 15, "cdd": 5, "uhi": 10,
                     "bws": 10, "gwd": 5, "mrro_delta": 25, "evap_demand": 10, "monsoon_cv": 15,
                     "spi12": 15, "spei": 15, "mrso_anomaly": 10, "cdd_days": 10, "pr_trend": 10,
                     "cape": 15, "pr99p_storm": 25, "wind_p90_storm": 85, "dust_emission": 5, "ndvi_trend": 0,
                     "fwi": 5, "vpd": 10, "ffdi": 5, "lfmc": 10, "wind_p90_wildfire": 85},
    "sydney":      {"rx5day": 55, "pr99p": 60, "slope_twi": 30, "mrso_antecedent": 35, "drainage": 60,
                     "hwd": 45, "wbgt": 45, "txx": 65, "cdd": 40, "uhi": 50,
                     "bws": 50, "gwd": 55, "mrro_delta": 0, "evap_demand": 55, "monsoon_cv": 35,
                     "spi12": 45, "spei": 50, "mrso_anomaly": 55, "cdd_days": 35, "pr_trend": -5,
                     "cape": 55, "pr99p_storm": 60, "wind_p90_storm": 50, "dust_emission": 20, "ndvi_trend": 10,
                     "fwi": 75, "vpd": 60, "ffdi": 60, "lfmc": 55, "wind_p90_wildfire": 50},
    "mumbai":      {"rx5day": 90, "pr99p": 95, "slope_twi": 50, "mrso_antecedent": 75, "drainage": 90,
                     "hwd": 40, "wbgt": 75, "txx": 60, "cdd": 75, "uhi": 80,
                     "bws": 85, "gwd": 75, "mrro_delta": 20, "evap_demand": 70, "monsoon_cv": 70,
                     "spi12": 60, "spei": 65, "mrso_anomaly": 65, "cdd_days": 45, "pr_trend": -10,
                     "cape": 85, "pr99p_storm": 95, "wind_p90_storm": 70, "dust_emission": 25, "ndvi_trend": 15,
                     "fwi": 40, "vpd": 70, "ffdi": 35, "lfmc": 55, "wind_p90_wildfire": 70},
    "tokyo":       {"rx5day": 70, "pr99p": 75, "slope_twi": 55, "mrso_antecedent": 55, "drainage": 80,
                     "hwd": 55, "wbgt": 65, "txx": 70, "cdd": 60, "uhi": 75,
                     "bws": 45, "gwd": 35, "mrro_delta": 10, "evap_demand": 50, "monsoon_cv": 40,
                     "spi12": 40, "spei": 45, "mrso_anomaly": 40, "cdd_days": 30, "pr_trend": 0,
                     "cape": 65, "pr99p_storm": 75, "wind_p90_storm": 65, "dust_emission": 15, "ndvi_trend": 5,
                     "fwi": 50, "vpd": 50, "ffdi": 45, "lfmc": 45, "wind_p90_wildfire": 65},
}


def _build_indicators_frame() -> pd.DataFrame:
    """Long-form DataFrame: one row per (h3_cell, indicator)."""
    rows: list[dict] = []
    for name, lat, lon in DEMO_CITIES:
        cell = cell_for(lat, lon, 6)
        for ind, val in CITY_PROFILES[name].items():
            rows.append({"h3_cell": cell, "indicator": ind, "value": float(val)})
    return pd.DataFrame(rows)


def _build_worldpop() -> pd.DataFrame:
    rows = [
        {"h3_cell": cell_for(lat, lon, 6), "population": _demo_population(name)}
        for name, lat, lon in DEMO_CITIES
    ]
    return pd.DataFrame(rows)


def _demo_population(name: str) -> int:
    return {
        "bengaluru": 13_000_000,
        "phoenix": 1_600_000,
        "london": 9_000_000,
        "lagos": 15_000_000,
        "reykjavik": 130_000,
        "sydney": 5_300_000,
        "mumbai": 20_000_000,
        "tokyo": 14_000_000,
    }[name]


def _build_built_up() -> pd.DataFrame:
    rows = [
        {"h3_cell": cell_for(lat, lon, 6), "built_up_m2": _demo_population(name) * 35.0}
        for name, lat, lon in DEMO_CITIES
    ]
    return pd.DataFrame(rows)


def _build_ndvi_static() -> pd.DataFrame:
    rows = []
    for name, lat, lon in DEMO_CITIES:
        cell = cell_for(lat, lon, 6)
        # NDVI higher in wetter climates, slope slightly negative in arid zones.
        ndvi = {"bengaluru": 0.55, "phoenix": 0.20, "london": 0.60, "lagos": 0.50,
                "reykjavik": 0.45, "sydney": 0.55, "mumbai": 0.55, "tokyo": 0.65}[name]
        slope = {"bengaluru": 0.001, "phoenix": -0.005, "london": 0.002, "lagos": 0.000,
                 "reykjavik": 0.003, "sydney": -0.001, "mumbai": 0.000, "tokyo": 0.002}[name]
        rows.append({"h3_cell": cell, "ndvi": ndvi, "ndvi_slope": slope})
    return pd.DataFrame(rows)


def _build_census() -> pd.DataFrame:
    rows = []
    for name, lat, lon in DEMO_CITIES:
        cell = cell_for(lat, lon, 6)
        # Higher income quintile = more adaptive capacity.
        q = {"bengaluru": 0.55, "phoenix": 0.70, "london": 0.85, "lagos": 0.40,
             "reykjavik": 0.90, "sydney": 0.85, "mumbai": 0.55, "tokyo": 0.80}[name]
        rows.append({"h3_cell": cell, "income_quintile": q})
    return pd.DataFrame(rows)


def upload(local_dir: Path) -> None:
    import boto3
    s3 = boto3.client("s3")

    files = {
        "derived/indicators/{scenario}/{horizon}/all.parquet": _build_indicators_frame(),
        "aux/worldpop/worldpop_100m.parquet": _build_worldpop(),
        "aux/ghsl/built_up.parquet": _build_built_up(),
        "aux/modis/ndvi_static.parquet": _build_ndvi_static(),
        "aux/census/income_quintile.parquet": _build_census(),
    }

    for template, df in files.items():
        if "{scenario}" in template:
            for scen in SCENARIOS:
                for horizon in HORIZONS:
                    key = template.format(scenario=scen, horizon=horizon)
                    body = df.to_parquet(index=False)
                    s3.put_object(Bucket=S3_BUCKET, Key=key, Body=body)
                    log.info("Uploaded s3://%s/%s", S3_BUCKET, key)
        else:
            body = df.to_parquet(index=False)
            s3.put_object(Bucket=S3_BUCKET, Key=template, Body=body)
            log.info("Uploaded s3://%s/%s", S3_BUCKET, template)


def write_local(local_dir: Path) -> None:
    local_dir.mkdir(parents=True, exist_ok=True)

    files = {
        "derived/indicators": {f"{s}/{h}/all.parquet": _build_indicators_frame()
                                for s in SCENARIOS for h in HORIZONS},
        "aux/worldpop/worldpop_100m.parquet": _build_worldpop(),
        "aux/ghsl/built_up.parquet": _build_built_up(),
        "aux/modis/ndvi_static.parquet": _build_ndvi_static(),
        "aux/census/income_quintile.parquet": _build_census(),
    }
    for template, payload in files.items():
        if isinstance(payload, dict):
            for rel, df in payload.items():
                p = local_dir / template / rel
                p.parent.mkdir(parents=True, exist_ok=True)
                df.to_parquet(p, index=False)
                log.info("Wrote %s", p)
        else:
            p = local_dir / template
            p.parent.mkdir(parents=True, exist_ok=True)
            payload.to_parquet(p, index=False)
            log.info("Wrote %s", p)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--local", type=Path, default=None, help="Write to a local directory instead of S3")
    args = parser.parse_args()

    if args.local:
        write_local(args.local)
    else:
        upload(None)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
