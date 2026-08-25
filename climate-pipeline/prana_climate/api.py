"""FastAPI surface for the Prana Earth hazard engine.

Endpoints
---------
    POST /v1/assess         → full 6-hazard assessment for a lat/lng
    POST /v1/assess/cell    → same, but caller passes an H3 cell id
    GET  /v1/h3/lookup      → cell info for a lat/lng
    GET  /v1/health         → liveness + version
    GET  /metrics           → Prometheus exposition

Live lookups always read from S3 (or the cache). The ESGF download path
runs as an offline batch — never on the request path (spec §9).
"""
from __future__ import annotations

import logging
import os
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from prana_climate.cache import cache_key, make_cache
from prana_climate.config import (
    AWS_REGION,
    H3_RESOLUTION,
    HORIZONS,
    SCENARIOS,
)
from prana_climate.h3_index import cell_for, latlng_of, neighbours
from prana_climate.hazard_scores import HazardEngine

log = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────────────────
# Schemas
# ─────────────────────────────────────────────────────────────────────────────

class AssessRequest(BaseModel):
    lat: float = Field(..., ge=-90.0, le=90.0)
    lon: float = Field(..., ge=-180.0, le=180.0)
    scenario: str = Field("ssp245")
    horizon: int = Field(2050)
    asset_type: Optional[str] = None
    res: Optional[int] = Field(None, description="Override default H3 resolution")


class CellAssessRequest(BaseModel):
    h3_cell: str
    scenario: str = Field("ssp245")
    horizon: int = Field(2050)
    asset_type: Optional[str] = None


class H3LookupResponse(BaseModel):
    h3_cell: str
    resolution: int
    lat: float
    lon: float
    neighbours: List[str]


# ─────────────────────────────────────────────────────────────────────────────
# App factory
# ─────────────────────────────────────────────────────────────────────────────

def create_app(
    *,
    engine: Optional[HazardEngine] = None,
    use_cache: bool = True,
) -> FastAPI:
    app = FastAPI(
        title="Prana Earth Climate Engine",
        version="0.1.0",
        description=(
            "6-hazard physical climate risk assessment backed by CMIP6 data on S3, "
            "indexed by H3 res-6 cells."
        ),
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=os.getenv("PRANA_CORS_ORIGINS", "*").split(","),
        allow_methods=["*"],
        allow_headers=["*"],
    )

    cache = make_cache() if use_cache else None

    def _engine_for(res: int) -> HazardEngine:
        if engine is not None:
            return engine
        return HazardEngine(h3_resolution=res)

    @app.get("/v1/health")
    def health() -> Dict[str, Any]:
        return {
            "status": "ok",
            "version": app.version,
            "region": AWS_REGION,
            "h3_resolution": H3_RESOLUTION,
            "scenarios": SCENARIOS,
            "horizons": HORIZONS,
        }

    @app.get("/v1/h3/lookup", response_model=H3LookupResponse)
    def h3_lookup(
        lat: float = Query(..., ge=-90, le=90),
        lon: float = Query(..., ge=-180, le=180),
        res: int = Query(H3_RESOLUTION, ge=0, le=15),
        k: int = Query(0, ge=0, le=3, description="Neighbour ring distance"),
    ) -> H3LookupResponse:
        cell = cell_for(lat, lon, res)
        clat, clon = latlng_of(cell)
        return H3LookupResponse(
            h3_cell=cell,
            resolution=res,
            lat=clat,
            lon=clon,
            neighbours=neighbours(cell, k=k),
        )

    @app.post("/v1/assess")
    def assess(req: AssessRequest) -> Dict[str, Any]:
        if req.scenario not in SCENARIOS:
            raise HTTPException(400, f"scenario must be one of {SCENARIOS}")
        if req.horizon not in HORIZONS:
            raise HTTPException(400, f"horizon must be one of {HORIZONS}")
        res = req.res or H3_RESOLUTION
        key = cache_key("assess", req.lat, req.lon, req.scenario, req.horizon, req.asset_type or "", res) if cache else None
        if key:
            cached = cache.get(key)
            if cached is not None:
                return {**cached, "_cache": "hit"}

        eng = _engine_for(res)
        result = eng.assess_location(
            lat=req.lat,
            lon=req.lon,
            scenario=req.scenario,
            horizon=req.horizon,
            asset_type=req.asset_type,
        ).to_dict()

        if key:
            cache.set(key, result)
        return {**result, "_cache": "miss"}

    @app.post("/v1/assess/cell")
    def assess_cell(req: CellAssessRequest) -> Dict[str, Any]:
        eng = _engine_for(H3_RESOLUTION)
        try:
            return eng.assess(
                h3_cell=req.h3_cell,
                scenario=req.scenario,
                horizon=req.horizon,
                asset_type=req.asset_type,
            ).to_dict()
        except ValueError as exc:
            raise HTTPException(400, str(exc))

    @app.post("/v1/dashboard")
    def dashboard(req: Dict[str, Any]) -> Dict[str, Any]:
        """Bulk assessment for dashboard rendering.

        Body: {"lat": float, "lon": float, "asset_type": str (optional),
                "scenarios": [str] (optional, defaults to all 5),
                "horizons": [int] (optional, defaults to all 3)}
        Returns: {h3_cell, current: {...}, by_scenario: {...}, by_horizon: {...},
                  indicators: {hazard: {indicator: [values]}, summary: {...}}
        """
        lat = float(req.get("lat", 0))
        lon = float(req.get("lon", 0))
        asset_type = req.get("asset_type")
        scenarios = req.get("scenarios") or SCENARIOS
        horizons = req.get("horizons") or HORIZONS

        eng = _engine_for(H3_RESOLUTION)
        cell = cell_for(lat, lon, H3_RESOLUTION)

        # Current (default ssp245 / 2050)
        current = eng.assess_location(
            lat=lat, lon=lon,
            scenario="ssp245", horizon=2050,
            asset_type=asset_type,
        ).to_dict()

        # By scenario (using 2050)
        by_scenario = {}
        for s in scenarios:
            r = eng.assess_location(
                lat=lat, lon=lon, scenario=s, horizon=2050, asset_type=asset_type,
            ).to_dict()
            by_scenario[s] = r["hazard_scores"]

        # By horizon (using ssp245)
        by_horizon = {}
        for h in horizons:
            r = eng.assess_location(
                lat=lat, lon=lon, scenario="ssp245", horizon=h, asset_type=asset_type,
            ).to_dict()
            by_horizon[str(h)] = r["hazard_scores"]

        # Indicators breakdown
        indicators = current.get("contributing_indicators", {})

        return {
            "h3_cell": str(cell),
            "lat": lat,
            "lon": lon,
            "current": current,
            "by_scenario": by_scenario,
            "by_horizon": by_horizon,
            "indicators": indicators,
        }

    @app.post("/v1/dashboard/compare")
    def dashboard_compare(req: Dict[str, Any]) -> Dict[str, Any]:
        """Multi-location comparison for dashboard.

        Body: {"locations": [{"name": str, "lat": float, "lon": float}],
                "scenario": str (default "ssp245"),
                "horizon": int (default 2050),
                "asset_type": str (optional)}
        Returns: per-location risk + radar-friendly format
        """
        locations = req.get("locations") or []
        scenario = req.get("scenario", "ssp245")
        horizon = int(req.get("horizon", 2050))
        asset_type = req.get("asset_type")

        eng = _engine_for(H3_RESOLUTION)
        results = []
        for loc in locations:
            try:
                lat = float(loc["lat"])
                lon = float(loc["lon"])
                name = loc.get("name", f"{lat:.2f},{lon:.2f}")
            except (KeyError, TypeError, ValueError):
                continue
            r = eng.assess_location(
                lat=lat, lon=lon, scenario=scenario,
                horizon=horizon, asset_type=asset_type,
            ).to_dict()
            results.append({
                "name": name,
                "lat": lat,
                "lon": lon,
                "h3_cell": str(cell_for(lat, lon, H3_RESOLUTION)),
                "hazard_scores": r["hazard_scores"],
                "composite_risk": r["composite_risk"],
                "exposure": r.get("exposure"),
                "adaptive_capacity": r.get("adaptive_capacity"),
            })

        # Sort by composite risk descending
        results.sort(key=lambda x: x["composite_risk"], reverse=True)
        return {
            "scenario": scenario,
            "horizon": horizon,
            "asset_type": asset_type,
            "count": len(results),
            "results": results,
        }

    @app.get("/v1/dashboard/catalog")
    def dashboard_catalog() -> Dict[str, Any]:
        """Static catalog of available scenarios, horizons, hazards, and indicators
        for building dashboards / form UIs without hardcoding."""
        from prana_climate.indicators import INDICATOR_REGISTRY
        # Group indicators by hazard
        hazards_map: Dict[str, list] = {}
        for ind_name, (hazard, _fn, _deps) in INDICATOR_REGISTRY.items():
            hazards_map.setdefault(hazard, []).append(ind_name)
        return {
            "scenarios": SCENARIOS,
            "horizons": HORIZONS,
            "asset_types": ["residential", "commercial", "industrial", "data_center", "agricultural"],
            "hazards": [
                {
                    "key": h,
                    "indicators": hazards_map.get(h, []),
                }
                for h in ["flood", "heat_stress", "water_stress", "drought", "storm", "wildfire"]
            ],
            "h3_resolution": H3_RESOLUTION,
        }

    @app.post("/v1/summary")
    def ai_summary(req: Dict[str, Any]) -> Dict[str, Any]:
        """Comprehensive summary endpoint optimised for AI/LLM report generation.

        Computes a full risk profile for a location:
        - Current risk (default ssp245/2050)
        - All scenarios × all horizons matrix (15 combinations)
        - All 30 contributing indicators
        - Exposure & adaptive capacity
        - Trend analysis (delta 2030 → 2050)
        - Top hazards ranking
        - Risk classification (low/medium/high/extreme)
        - Human-readable narrative fields for LLM context

        Body: {"lat": float, "lon": float, "asset_type": str (optional),
                "scenarios": [str] (optional, default all 5),
                "horizons": [int] (optional, default all 3)}
        """
        lat = float(req.get("lat", 0))
        lon = float(req.get("lon", 0))
        asset_type = req.get("asset_type")
        scenarios = req.get("scenarios") or SCENARIOS
        horizons = req.get("horizons") or HORIZONS
        eng = _engine_for(H3_RESOLUTION)
        cell = cell_for(lat, lon, H3_RESOLUTION)

        # Build full scenario × horizon matrix (default 5×3 = 15 cells)
        matrix: Dict[str, Dict[str, Dict[str, Any]]] = {}
        for s in scenarios:
            matrix[s] = {}
            for h in horizons:
                r = eng.assess_location(
                    lat=lat, lon=lon, scenario=s, horizon=h, asset_type=asset_type,
                ).to_dict()
                matrix[s][str(h)] = {
                    "hazard_scores": r["hazard_scores"],
                    "composite_risk": r["composite_risk"],
                    "adaptive_capacity": r.get("adaptive_capacity"),
                    "exposure": r.get("exposure"),
                    "contributing_indicators": r.get("contributing_indicators", {}),
                }

        # Identify top hazards across the full matrix
        hazard_totals: Dict[str, float] = {h: 0.0 for h in
            ["flood", "heat_stress", "water_stress", "drought", "storm", "wildfire"]}
        scenario_count = 0
        for s, hs_by_h in matrix.items():
            for h, payload in hs_by_h.items():
                for haz, score in payload["hazard_scores"].items():
                    if score is not None:
                        hazard_totals[haz] += score
                scenario_count += 1
        if scenario_count > 0:
            hazard_averages = {h: round(v / scenario_count, 2) for h, v in hazard_totals.items()}
        else:
            hazard_averages = hazard_totals
        ranked_hazards = sorted(
            hazard_averages.items(), key=lambda x: x[1], reverse=True
        )

        # Trend: 2030 → 2050 (default ssp245)
        if "ssp245" in matrix and "2030" in matrix["ssp245"] and "2050" in matrix["ssp245"]:
            start_risk = matrix["ssp245"]["2030"]["composite_risk"]
            end_risk = matrix["ssp245"]["2050"]["composite_risk"]
            trend_delta = round(end_risk - start_risk, 2)
            pct_change = round((end_risk - start_risk) / start_risk * 100, 2) if start_risk else None
        else:
            trend_delta = 0.0
            pct_change = None

        # Current risk (default ssp245 / 2050)
        current = matrix.get("ssp245", {}).get("2050", {})

        # Classify risk
        cr = current.get("composite_risk", 0)
        if cr < 25:
            risk_class = "low"
        elif cr < 50:
            risk_class = "moderate"
        elif cr < 75:
            risk_class = "high"
        else:
            risk_class = "extreme"

        # Generate narrative fields for LLM context
        top_hazard = ranked_hazards[0][0] if ranked_hazards else "unknown"
        top_score = ranked_hazards[0][1] if ranked_hazards else 0.0
        narrative = (
            f"This is a {risk_class}-risk location (composite risk {cr}/100). "
            f"The dominant hazard is {top_hazard} (avg score {top_score}/100). "
            f"Under SSP2-4.5 (ssp245), risk is projected to change by "
            f"{trend_delta} points ({pct_change}%) from 2030 to 2050. "
            f"Across all 5 scenarios × 3 horizons, the hazard profile is: "
            + ", ".join(f"{h}={v}" for h, v in ranked_hazards)
            + "."
        )

        return {
            "meta": {
                "lat": lat,
                "lon": lon,
                "h3_cell": str(cell),
                "asset_type": asset_type,
                "scenarios": scenarios,
                "horizons": horizons,
                "generated_at": eng.__class__.__name__,
            },
            "current": current,
            "risk_classification": risk_class,
            "top_hazards": [
                {"hazard": h, "avg_score": v, "rank": i + 1}
                for i, (h, v) in enumerate(ranked_hazards)
            ],
            "matrix": matrix,
            "trend": {
                "scenario": "ssp245",
                "from_year": 2030,
                "to_year": 2050,
                "delta": trend_delta,
                "pct_change": pct_change,
            },
            "narrative": narrative,
        }

    @app.get("/metrics")
    def metrics() -> str:
        # Minimal Prometheus exposition; replace with prometheus_client in prod.
        body = (
            "# HELP prana_up Whether the engine is up.\n"
            "# TYPE prana_up gauge\n"
            "prana_up 1\n"
        )
        return body

    return app


# Convenience for `uvicorn prana_climate.api:app --reload`
app = create_app()
