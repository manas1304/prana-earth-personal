"""Tiny launcher that boots uvicorn with the demo data loaded into a
HazardEngine. Lets us curl the real HTTP surface locally without S3.

    PYTHONPATH=. python serve_demo.py
"""
from __future__ import annotations

import os
from pathlib import Path

import pandas as pd
import uvicorn

from prana_climate.api import create_app
from prana_climate.exposure import ExposureSources
from prana_climate.hazard_scores import HazardEngine


def _load_demo_indicators(root: Path, scenario: str = "ssp245", horizon: int = 2050) -> pd.DataFrame:
    path = root / "derived" / "indicators" / scenario / str(horizon) / "all.parquet"
    df = pd.read_parquet(path)
    return df.pivot(index="h3_cell", columns="indicator", values="value")


def main() -> None:
    root = Path(os.environ.get("PRANA_DEMO_DATA",
                                os.path.join(os.environ.get("TEMP", "/tmp"), "demo_data")))
    scenario = os.environ.get("PRANA_DEMO_SCENARIO", "ssp245")
    horizon = int(os.environ.get("PRANA_DEMO_HORIZON", "2050"))

    print(f"[serve_demo] Loading demo indicators from {root} ({scenario}/{horizon})…")
    indicators = _load_demo_indicators(root, scenario, horizon)

    # Point the exposure loaders at the demo's aux/ directory so financial /
    # population / adaptive-capacity overlays come from real seeded values
    # instead of the 50.0 / 0.0 defaults.
    os.environ["PRANA_AUX_DIR"] = str(root)
    print(f"[serve_demo] PRANA_AUX_DIR = {os.environ.get('PRANA_AUX_DIR')}")
    print(f"[serve_demo] local worldpop parquet exists? {(root / 'aux' / 'worldpop' / 'worldpop_100m.parquet').exists()}")

    engine = HazardEngine(
        indicators_df=indicators,
        exposure_sources=ExposureSources(),
        asset_value_factor=1.0,
        use_cache=False,
    )
    app = create_app(engine=engine, use_cache=False)
    uvicorn.run(app, host="127.0.0.1", port=8000, log_level="info")


if __name__ == "__main__":
    main()

