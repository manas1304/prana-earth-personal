# API Quick Reference Card

> **Print this and stick on your wall.** One page, all the data an AI/LLM
> needs to write a complete climate-risk report.

---

## All Endpoints at a Glance

| Method | Path | Returns |
|---|---|---|
| `GET` | `/v1/health` | Liveness |
| `GET` | `/v1/h3/lookup?lat=&lon=` | `{h3_cell, lat, lon, neighbours}` |
| `POST` | `/v1/assess` | Single (scenario, horizon) assessment + 30 indicators |
| `POST` | `/v1/assess/cell` | Same, by H3 cell id |
| `POST` | `/v1/dashboard` | All 5 scenarios × 3 horizons + 30 indicators for one location |
| `POST` | `/v1/dashboard/compare` | Multi-location comparison (sorted by risk) |
| `GET` | `/v1/dashboard/catalog` | Scenarios, horizons, hazards, indicators, asset_types |
| `POST` | `/v1/summary` | **All-in-one AI context** (5×3 matrix + ranked hazards + narrative) |
| `GET` | `/metrics` | Prometheus minimal |

Base URL: `http://15.252.141.183:8000` (prod) / `http://localhost:8000` (dev)

---

## Vocab (paste into LLM context)

- **5 scenarios**: `historical`, `ssp126`, `ssp245`, `ssp370`, `ssp585`
- **3 horizons**: `2030`, `2040`, `2050`
- **6 hazards**: `flood`, `heat_stress`, `water_stress`, `drought`, `storm`, `wildfire`
- **5 indicators per hazard** (30 total): see `/v1/dashboard/catalog`
- **5 asset types**: `residential`, `commercial`, `industrial`, `data_center`, `agricultural`
- **Risk classes**: `low` (<25), `moderate` (<50), `high` (<75), `extreme` (≥75)

---

## Risk Formula (Methodology §10.4)

```
Final = 0.60 × H_adj + 0.20 × FE + 0.10 × PE − 0.10 × AC
where:
  H_adj = 100 × (H_raw / 100) ^ 0.85        # convex adjustment
  FE    = financial exposure (0–100)
  PE    = population exposure (0–100)
  AC    = adaptive capacity (0–100)
```

---

## One-Shot AI Report Recipe

```bash
# 1. Get everything in one call
curl -X POST http://15.252.141.183:8000/v1/summary \
  -H "Content-Type: application/json" \
  -d '{"lat": 19.076, "lon": 72.8777, "asset_type": "data_center"}' \
  > summary.json

# 2. Get catalog (for indicator descriptions)
curl http://15.252.141.183:8000/v1/dashboard/catalog > catalog.json

# 3. Feed both into the LLM
```

---

## For Frontend Devs: Data Shapes

```ts
// Single assessment
{
  hazard_scores: { flood, heat_stress, water_stress, drought, storm, wildfire },  // 0-100
  composite_risk: 47.86,
  exposure: { financial, population },
  adaptive_capacity: 61.11,
  contributing_indicators: { flood: {rx5day, pr99p_flood, ...}, ... },  // 30 total
  notes: ["Hazard scores are weighted composites per methodology §10.2.", ...],
  _cache: "miss" | "hit"
}

// Dashboard (for charts)
{
  current: {...},
  by_scenario: { ssp126: {...}, ssp245: {...}, ssp370: {...}, ssp585: {...}, historical: {...} },
  by_horizon: { "2030": {...}, "2040": {...}, "2050": {...} },
  indicators: { flood: {...}, heat_stress: {...}, ... }  // 30 indicators
}

// Summary (all-in-one)
{
  meta, current, risk_classification, top_hazards, matrix, trend, narrative
}
```

---

## Component Mapping

| UI | API field | Chart type |
|---|---|---|
| Big risk number | `composite_risk` | Color-coded number + gauge |
| Risk badge | `risk_classification` | Pill (low/moderate/high/extreme) |
| 6-hazard radar | `hazard_scores` | Radar chart |
| 30-indicator drilldown | `contributing_indicators` | Stacked bar per hazard |
| Scenario comparison | `by_scenario` | Grouped bar (5 scenarios × 6 hazards) |
| Time trend | `by_horizon` | Line chart (3 points × 6 hazards) |
| Scenario × horizon heatmap | `matrix` | Heatmap (5 × 3) |
| City leaderboard | `/v1/dashboard/compare` | Sortable table |
| AI narrative | `summary.narrative` | Pre-formatted paragraph |
| Top hazards list | `top_hazards` | Ordered list |

---

## How to get the most data in one call

```bash
# Maximum data: /v1/summary returns:
# - meta (lat, lon, h3_cell, scenarios, horizons, asset_type)
# - current (full assessment, 30 indicators)
# - risk_classification (low/moderate/high/extreme)
# - top_hazards (ranked)
# - matrix (5 × 3 = 15 full assessments)
# - trend (2030 → 2050 delta)
# - narrative (LLM-ready paragraph)
# Total: 16 full assessments + 30 indicators + summary stats
```

This is **one call** for a complete AI report.
