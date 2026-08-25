"""Validation harness — Spearman ρ ≥ 0.65 against observed historical events
(methodology §12.3).

This module computes rank correlation between computed hazard scores and
ground-truth event frequencies:

    Flood     → CWC discharge exceedances / NDMA flood-affected districts
    Heat      → IMD heat-wave death tolls by district
    Drought   → NDMC declared drought districts by year
    Wildfire  → FSI fire point density by forest division
    Water     → CGWB over-exploited block classifications

Inputs are simple CSV/Parquet tables; the harness doesn't pull from
external APIs in v1 — the operator provides a ground-truth file.
"""
from __future__ import annotations

import argparse
import json
import logging
import sys
from pathlib import Path
from typing import Iterable, Optional

import numpy as np
import pandas as pd
from scipy.stats import spearmanr

from prana_climate.hazard_scores import HAZARDS

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(message)s")
log = logging.getLogger("validation")


def _validate_one(
    computed: pd.Series,
    observed: pd.Series,
    target_rho: float = 0.65,
) -> dict:
    aligned = computed.dropna().rename("c").to_frame().join(
        observed.dropna().rename("o"), how="inner"
    )
    if len(aligned) < 5:
        return {
            "n": int(len(aligned)),
            "rho": None,
            "pvalue": None,
            "passes": None,
            "reason": "insufficient paired samples (need ≥ 5)",
        }
    rho, p = spearmanr(aligned["c"], aligned["o"])
    return {
        "n": int(len(aligned)),
        "rho": float(rho),
        "pvalue": float(p),
        "passes": bool(rho >= target_rho),
        "target_rho": target_rho,
    }


def run(
    hazard_scores_csv: Path,
    ground_truth_csv: Path,
    *,
    target_rho: float = 0.65,
    output_json: Optional[Path] = None,
) -> dict:
    scores = pd.read_csv(hazard_scores_csv).set_index("h3_cell")
    truth = pd.read_csv(ground_truth_csv).set_index("h3_cell")
    report = {}
    overall_pass = True

    for hazard in HAZARDS:
        if hazard not in scores.columns:
            continue
        obs_col = f"{hazard}_observed"
        if obs_col not in truth.columns:
            log.warning("No observed column %s in %s — skipping %s", obs_col, ground_truth_csv, hazard)
            continue
        result = _validate_one(scores[hazard], truth[obs_col], target_rho=target_rho)
        report[hazard] = result
        log.info("  %-13s n=%3d  ρ=%s  passes=%s", hazard,
                 result["n"], f"{result['rho']:.3f}" if result["rho"] is not None else "n/a",
                 result.get("passes"))
        if result.get("passes") is False:
            overall_pass = False

    summary = {"overall_pass": overall_pass, "per_hazard": report}
    if output_json:
        output_json.write_text(json.dumps(summary, indent=2))
        log.info("Wrote %s", output_json)
    return summary


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--scores", type=Path, required=True,
                        help="CSV with columns h3_cell, <hazard>, …")
    parser.add_argument("--truth", type=Path, required=True,
                        help="CSV with columns h3_cell, <hazard>_observed, …")
    parser.add_argument("--target-rho", type=float, default=0.65)
    parser.add_argument("--output", type=Path, default=None)
    args = parser.parse_args()

    summary = run(
        args.scores,
        args.truth,
        target_rho=args.target_rho,
        output_json=args.output,
    )
    return 0 if summary["overall_pass"] else 2


if __name__ == "__main__":
    raise SystemExit(main())
