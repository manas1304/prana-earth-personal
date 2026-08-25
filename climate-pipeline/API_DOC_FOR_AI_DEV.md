# Climate Pipeline API - Documentation for AI / LLM Developers

> **Purpose:** This document describes the HTTP API exposed by the Prana Earth
> Climate Pipeline (FastAPI service on port 8000). It is designed so an AI /
> LLM application can generate structured climate-risk reports and
> summaries.

---

## 1. Base URL and Auth

| Field | Value |
|---|---|
| **Base URL** | `http://15.252.141.183:8000` (production) / `http://127.0.0.1:8000` (local) |
| **CORS** | `*` (open) |
| **Auth** | None required for `/v1/*`; admin routes require cookie session (see Prana Web Auth Integration guide) |
| **Content-Type** | `application/json` for all POST requests with body |

---

## 2. Endpoints Overview

| # | Method | Path | Purpose |
|---|---|---|---|
| 1 | `GET` | `/v1/health` | Liveness + version + config |
| 2 | `GET` | `/v1/h3/lookup` | Convert (lat, lon) → H3 cell + neighbours |
| 3 | `POST` | `/v1/assess` | Single-location, single-(scenario,horizon) 6-hazard assessment |
| 4 | `POST` | `/v1/assess/cell` | Same as `/v1/assess` but by H3 cell id |
| 5 | `POST` | `/v1/dashboard` | **All scenarios × all horizons** + 30 indicators for one location |
| 6 | `POST` | `/v1/dashboard/compare` | Multi-location comparison (sorted by risk) |
| 7 | `GET` | `/v1/dashboard/catalog` | Static metadata (scenarios, horizons, hazards, indicators, asset_types) |
| 8 | `POST` | `/v1/summary` | **Complete AI-ready context** for one location (5×3 matrix, ranked hazards, narrative) |
| 9 | `GET` | `/metrics` | Prometheus minimal exposition |

---

## 3. Domain Model (for AI prompts)

### 3.1 Scenarios

| Key | Description |
|---|---|
| `historical` | Pre-industrial baseline (1850-2014) |
| `ssp126` | Low-emissions pathway (1.5°C target) |
| `ssp245` | Middle-of-the-road pathway (~2.7°C by 2100) — **default** |
| `ssp370` | High-emissions pathway (~4°C by 2100) |
| `ssp585` | Very-high-emissions pathway (~4.4°C by 2100) |

### 3.2 Horizons

| Year | Notes |
|---|---|
| `2030` | Near-term |
| `2040` | Mid-term — **default for some endpoints** |
| `2050` | Long-term — **default for most endpoints** |

### 3.3 Asset Types

| Key | Used for |
|---|---|
| `residential` | Housing |
| `commercial` | Office, retail |
| `industrial` | Manufacturing |
| `data_center` | IT infrastructure (multiplier on power/cooling risk) |
| `agricultural` | Farms, crops |

### 3.4 Six Hazards

| Hazard | Key | What it measures |
|---|---|---|
| Flood | `flood` | Extreme precipitation, antecedent wetness, terrain, drainage |
| Heat stress | `heat_stress` | Hot days, WBGT, extremes, UHI |
| Water stress | `water_stress` | Balance, groundwater, runoff variability |
| Drought | `drought` | SPI/SPEI, soil moisture anomaly, precipitation trend |
| Storm | `storm` | CAPE, extreme precip, wind, dust, vegetation |
| Wildfire | `wildfire` | FWI/VPD/FFDI, fuel load, wind extremes |

### 3.5 Five Indicators per Hazard (30 total)

| Hazard | Indicators |
|---|---|
| `flood` | `rx5day`, `pr99p_flood`, `slope_twi`, `mrso_antecedent`, `drainage` |
| `heat_stress` | `hwd`, `wbgt`, `txx`, `cdd`, `uhi` |
| `water_stress` | `bws`, `gwd`, `mrro_delta`, `evap_demand`, `monsoon_cv` |
| `drought` | `spi12`, `spei`, `mrso_anomaly`, `cdd_days`, `pr_trend` |
| `storm` | `cape`, `pr99p_storm`, `wind_p90_storm`, `dust_emission`, `ndvi_trend` |
| `wildfire` | `fwi`, `vpd`, `ffdi`, `lfmc`, `wind_p90_wildfire` |

### 3.6 Final Risk Formula (Methodology §10.4)

```
Final risk = 0.60 × H_adj + 0.20 × FE + 0.10 × PE − 0.10 × AC
where:
  H_adj = 100 × (H_raw / 100) ^ 0.85       # convex adjustment
  FE    = financial exposure (0–100)
  PE    = population exposure (0–100)
  AC    = adaptive capacity (0–100)
```

### 3.7 Risk Classification

| Composite Risk | Class |
|---|---|
| 0 – 24 | `low` |
| 25 – 49 | `moderate` |
| 50 – 74 | `high` |
| 75 – 100 | `extreme` |

---

## 4. Endpoint Specifications

### 4.1 `GET /v1/health`

**Response**:
```json
{
  "status": "ok",
  "version": "0.1.0",
  "region": "ap-south-1",
  "h3_resolution": 6,
  "scenarios": ["historical", "ssp126", "ssp245", "ssp370", "ssp585"],
  "horizons": [2030, 2040, 2050]
}
```

**AI use**: Use as a heartbeat check before generating reports.

---

### 4.2 `GET /v1/h3/lookup`

**Query params**:
- `lat` (float, -90 to 90, **required**)
- `lon` (float, -180 to 180, **required**)
- `res` (int, 0 to 15, default 6)
- `k` (int, 0 to 3, default 0) — neighbour ring distance

**Response** (`H3LookupResponse`):
```json
{
  "h3_cell": "86608b0b7ffffff",
  "resolution": 6,
  "lat": 19.076,
  "lon": 72.8777,
  "neighbours": []
}
```

**AI use**: Convert user-typed address → canonical cell id for caching.

---

### 4.3 `POST /v1/assess`

**Request body** (`AssessRequest`):
```json
{
  "lat": 19.076,
  "lon": 72.8777,
  "scenario": "ssp245",   // default
  "horizon": 2050,         // default
  "asset_type": "data_center",  // optional
  "res": 6                  // optional override
}
```

**Response**:
```json
{
  "location": {"h3_cell": "86608b0b7ffffff", "h3_resolution": 6},
  "scenario": "ssp245",
  "horizon": 2050,
  "asset_type": "data_center",
  "hazard_scores": {
    "flood": 23.4,
    "heat_stress": 78.9,
    "water_stress": 54.5,
    "drought": 62.3,
    "storm": 61.2,
    "wildfire": 12.8
  },
  "composite_risk": 47.86,
  "exposure": {
    "financial": 58.85,
    "population": 58.85
  },
  "adaptive_capacity": 61.11,
  "contributing_indicators": {
    "flood": {"rx5day": 21.4, "pr99p_flood": 18.0, ...},
    "heat_stress": {"hwd": 95.0, "wbgt": 85.4, "txx": 92.0, "cdd": 78.4, "uhi": 12.6},
    "water_stress": {"bws": 45.0, ...},
    "drought": {"spi12": 75.0, ...},
    "storm": {"cape": 320.0, ...},
    "wildfire": {"fwi": 12.0, ...}
  },
  "notes": [
    "Hazard scores are weighted composites per methodology §10.2.",
    "Convex adjustment H_adj = 100·(H_raw/100)^0.85 applied per §10.3.",
    "Final risk = 0.60·H_adj + 0.20·FE + 0.10·PE − 0.10·AC per §10.4.",
    "Asset-type multiplier applied: mean over 'data_center' sensitivities."
  ],
  "_cache": "miss"  // or "hit" if served from cache
}
```

**AI use**: Single-point risk with all 30 indicators — feed directly into a structured report.

---

### 4.4 `POST /v1/assess/cell`

Same response as `/v1/assess` but request uses `h3_cell` instead of lat/lon.

**Request body**:
```json
{
  "h3_cell": "86608b0b7ffffff",
  "scenario": "ssp245",
  "horizon": 2050,
  "asset_type": "data_center"
}
```

**AI use**: Re-fetch for previously-cached cells.

---

### 4.5 `POST /v1/dashboard` (RECOMMENDED FOR DASHBOARDS)

**Request body**:
```json
{
  "lat": 19.076,
  "lon": 72.8777,
  "asset_type": "data_center",
  "scenarios": ["ssp245", "ssp370", "ssp585"],  // optional, default all 5
  "horizons": [2030, 2050]                       // optional, default all 3
}
```

**Response**:
```json
{
  "h3_cell": "86608b0b7ffffff",
  "lat": 19.076,
  "lon": 72.8777,
  "current": {  // current ssp245/2050 — same shape as /v1/assess response
    "hazard_scores": {...},
    "composite_risk": 47.86,
    "exposure": {...},
    "adaptive_capacity": 61.11,
    "contributing_indicators": {...},
    "notes": [...]
  },
  "by_scenario": {  // one entry per requested scenario (all 5 by default)
    "ssp126": {"flood": 15.2, "heat_stress": 65.4, ...},
    "ssp245": {"flood": 23.4, "heat_stress": 78.9, ...},
    "ssp370": {"flood": 30.1, "heat_stress": 88.0, ...},
    "ssp585": {"flood": 35.8, "heat_stress": 92.4, ...},
    "historical": {"flood": 5.0, "heat_stress": 40.0, ...}
  },
  "by_horizon": {  // one entry per requested horizon (all 3 by default)
    "2030": {"flood": 18.0, "heat_stress": 70.0, ...},
    "2040": {"flood": 21.0, "heat_stress": 75.0, ...},
    "2050": {"flood": 23.4, "heat_stress": 78.9, ...}
  },
  "indicators": {  // 30 indicators from the current scenario
    "flood": {"rx5day": 21.4, ...},
    ...
  }
}
```

**AI use**: All data needed for one chart series × multiple scenarios + horizons.

---

### 4.6 `POST /v1/dashboard/compare` (RECOMMENDED FOR CITY-LEVEL COMPARISON)

**Request body**:
```json
{
  "locations": [
    {"name": "Mumbai",   "lat": 19.0760, "lon": 72.8777},
    {"name": "Delhi",    "lat": 28.6139, "lon": 77.2090},
    {"name": "London",   "lat": 51.5074, "lon": -0.1278},
    {"name": "Tokyo",    "lat": 35.6762, "lon": 139.6503},
    {"name": "New York", "lat": 40.7128, "lon": -74.0060}
  ],
  "scenario": "ssp245",       // default
  "horizon": 2050,            // default
  "asset_type": "data_center" // optional
}
```

**Response**:
```json
{
  "scenario": "ssp245",
  "horizon": 2050,
  "asset_type": "data_center",
  "count": 5,
  "results": [
    {
      "name": "Mumbai",
      "lat": 19.076, "lon": 72.8777,
      "h3_cell": "86608b0b7ffffff",
      "hazard_scores": {"flood": 23.4, "heat_stress": 78.9, ...},
      "composite_risk": 47.86,
      "exposure": {"financial": 58.85, "population": 58.85},
      "adaptive_capacity": 61.11
    },
    {
      "name": "Delhi",
      ...
      "composite_risk": 65.2,
      ...
    },
    ...  // sorted by composite_risk descending
  ]
}
```

**AI use**: Lead with sorted result list. Use for "compare this city vs other cities" / "top 10 riskiest cities" reports.

---

### 4.7 `GET /v1/dashboard/catalog`

**Response** (use this to build UI dropdowns / form selectors):
```json
{
  "scenarios": ["historical", "ssp126", "ssp245", "ssp370", "ssp585"],
  "horizons": [2030, 2040, 2050],
  "asset_types": ["residential", "commercial", "industrial", "data_center", "agricultural"],
  "hazards": [
    {"key": "flood", "indicators": ["rx5day", "pr99p_flood", "slope_twi", "mrso_antecedent", "drainage"]},
    {"key": "heat_stress", "indicators": ["hwd", "wbgt", "txx", "cdd", "uhi"]},
    {"key": "water_stress", "indicators": ["bws", "gwd", "mrro_delta", "evap_demand", "monsoon_cv"]},
    {"key": "drought", "indicators": ["spi12", "spei", "mrso_anomaly", "cdd_days", "pr_trend"]},
    {"key": "storm", "indicators": ["cape", "pr99p_storm", "wind_p90_storm", "dust_emission", "ndvi_trend"]},
    {"key": "wildfire", "indicators": ["fwi", "vpd", "ffdi", "lfmc", "wind_p90_wildfire"]}
  ],
  "h3_resolution": 6
}
```

**AI use**: Use this to populate the prompt context with the complete inventory of what the API can return. Don't hardcode scenario / horizon / indicator names anywhere.

---

### 4.8 `POST /v1/summary` (RECOMMENDED FOR AI-GENERATED REPORTS)

**Purpose**: One call gives an LLM everything it needs to write a complete, structured climate-risk narrative.

**Request body**:
```json
{
  "lat": 19.076,
  "lon": 72.8777,
  "asset_type": "data_center",
  "scenarios": ["historical", "ssp126", "ssp245", "ssp370", "ssp585"],
  "horizons": [2030, 2040, 2050]
}
```

**Response**:
```json
{
  "meta": {
    "lat": 19.076, "lon": 72.8777,
    "h3_cell": "86608b0b7ffffff",
    "asset_type": "data_center",
    "scenarios": ["historical", ...],
    "horizons": [2030, 2040, 2050],
    "generated_at": "HazardEngine"
  },
  "current": {
    "hazard_scores": {"flood": 23.4, ...},
    "composite_risk": 47.86,
    "exposure": {...},
    "adaptive_capacity": 61.11,
    "contributing_indicators": {...},
    "notes": [...]
  },
  "risk_classification": "moderate",  // low | moderate | high | extreme
  "top_hazards": [
    {"hazard": "heat_stress", "avg_score": 78.9, "rank": 1},
    {"hazard": "drought",      "avg_score": 65.0, "rank": 2},
    {"hazard": "storm",        "avg_score": 58.0, "rank": 3},
    {"hazard": "water_stress", "avg_score": 45.0, "rank": 4},
    {"hazard": "flood",        "avg_score": 22.0, "rank": 5},
    {"hazard": "wildfire",     "avg_score": 12.0, "rank": 6}
  ],
  "matrix": {
    "historical": {
      "2030": {"hazard_scores": {...}, "composite_risk": 12.0, "adaptive_capacity": 65.0, "exposure": {...}, "contributing_indicators": {...}},
      "2040": {...},
      "2050": {...}
    },
    "ssp126": { "2030": {...}, "2040": {...}, "2050": {...} },
    "ssp245": { "2030": {...}, "2040": {...}, "2050": {...} },
    "ssp370": { "2030": {...}, "2040": {...}, "2050": {...} },
    "ssp585": { "2030": {...}, "2040": {...}, "2050": {...} }
  },
  "trend": {
    "scenario": "ssp245",
    "from_year": 2030,
    "to_year": 2050,
    "delta": 5.2,
    "pct_change": 12.8
  },
  "narrative": "This is a moderate-risk location (composite risk 47.86/100). The dominant hazard is heat_stress (avg score 78.9/100). Under SSP2-4.5 (ssp245), risk is projected to change by 5.2 points (12.8%) from 2030 to 2050. Across all 5 scenarios × 3 horizons, the hazard profile is: heat_stress=78.9, drought=65.0, storm=58.0, water_stress=45.0, flood=22.0, wildfire=12.0."
}
```

**AI use**: Inject the entire response into the LLM context. The `narrative` field is human-readable and can be the seed of a report. The `matrix` is the data to drive charts. `top_hazards` and `risk_classification` are pre-computed summaries.

---

## 5. Suggested AI Report Workflow

### 5.1 One-shot report (recommended for simple use)

```python
# 1. Get summary
summary = POST /v1/summary {lat, lon, asset_type}

# 2. Get catalog (so the LLM knows what indicators exist)
catalog = GET /v1/dashboard/catalog

# 3. Build a prompt
prompt = f"""
You are a climate risk analyst. Here is data from the Prana Earth
Climate Pipeline for location ({lat}, {lon}), asset type {asset_type}.

Risk classification: {summary['risk_classification']}
Composite risk score: {summary['current']['composite_risk']}/100
Top hazards (ranked): {summary['top_hazards']}
Trend (2030→2050 under ssp245): {summary['trend']}

Full scenario × horizon matrix:
{matrix}

Pre-computed narrative:
{summary['narrative']}

Available indicators: {catalog}

Write a structured climate-risk report for an executive audience.
Use markdown headings, include charts data, and actionable recommendations.
"""
# 4. Send to LLM
report = llm.generate(prompt)
```

### 5.2 Multi-location comparison report

```python
# 1. Compare multiple locations
compare = POST /v1/dashboard/compare {locations: [...]}

# 2. Get summary for each top-risk location
for loc in compare['results'][:3]:  # top 3
    summary = POST /v1/summary {lat: loc['lat'], lon: loc['lon']}
    # generate per-location narrative
    ...

# 3. Get catalog for indicator descriptions
catalog = GET /v1/dashboard/catalog
```

### 5.3 Sensitivity / scenario report

```python
# 1. Single location, all 5 scenarios
dashboard = POST /v1/dashboard {lat, lon, asset_type}

# 2. Use the matrix to drive a scenario comparison chart
#    dashboard['matrix']['ssp126']['2050']['hazard_scores']
#    dashboard['matrix']['ssp245']['2050']['hazard_scores']
#    dashboard['matrix']['ssp370']['2050']['hazard_scores']
#    dashboard['matrix']['ssp585']['2050']['hazard_scores']

# 3. Inject into LLM with prompt:
#    "Explain why the same location shows different risk under
#     different emissions scenarios. Use the indicator-level data
#     in dashboard['matrix'] to support your reasoning."
```

---

## 6. Sample Prompts for Common Reports

### 6.1 Executive summary

```
ROLE: Senior climate-risk analyst
AUDIENCE: C-suite (CEO, CFO, COO)
INPUT: {{summary response}}
TASK: Write a 200-word executive summary suitable for a board report.
INCLUDE: (1) overall risk classification, (2) top 2 hazards, (3) trend under
mid-emissions scenario, (4) one strategic recommendation.
TONE: data-driven, cautious, action-oriented.
```

### 6.2 Underwriter memo

```
ROLE: Climate-risk analyst for an insurance underwriter
INPUT: {{summary response}} + {{catalog}}
TASK: Produce a 1-page underwriting memo that quantifies physical climate
risk for the asset. Include: hazard-by-hazard score table, top 3
contributing indicators, expected risk evolution 2030→2050, recommended
risk premium adjustment.
```

### 6.3 Engineering / data-center report

```
ROLE: Climate-resilience engineer
INPUT: {{summary response}} with asset_type='data_center'
TASK: Identify which hazards threaten the data center, what
specific risks (cooling failure, power grid stress, etc.) are
implied by each indicator, and what engineering controls would
mitigate them. Use the contributing_indicators values as evidence.
```

---

## 7. Error Handling

All endpoints return standard HTTP errors:

| Code | When |
|---|---|
| 200 | Success |
| 400 | Invalid input (e.g. scenario not in allowed list) |
| 500 | Server error (e.g. S3 unreachable, DB error) |

Error body:
```json
{
  "detail": "scenario must be one of ['historical', 'ssp126', 'ssp245', 'ssp370', 'ssp585'], got 'ssp999'"
}
```

---

## 8. Caching

The `/v1/assess` endpoint supports a simple in-process cache (TTL 5 min by default).
Cached responses include `"_cache": "hit"`. Other endpoints are not cached.

For AI use, treat cache hits and misses the same — the data is identical.

---

## 9. Performance

- p50 latency: ~200–500ms (cold) / 10–50ms (cached)
- p95 latency: ~1–2s (cold) / 100–200ms (cached)
- Throughput: ~50 RPS single-process, ~200 RPS multi-worker

---

## 10. Quick Test Commands

```bash
# Health
curl http://localhost:8000/v1/health

# Single assessment
curl -X POST http://localhost:8000/v1/assess \
  -H "Content-Type: application/json" \
  -d '{"lat": 19.076, "lon": 72.8777, "scenario": "ssp245", "horizon": 2050}'

# Full AI context
curl -X POST http://localhost:8000/v1/summary \
  -H "Content-Type: application/json" \
  -d '{"lat": 19.076, "lon": 72.8777, "asset_type": "data_center"}'

# Compare cities
curl -X POST http://localhost:8000/v1/dashboard/compare \
  -H "Content-Type: application/json" \
  -d '{"locations": [{"name":"Mumbai","lat":19.076,"lon":72.8777},{"name":"Delhi","lat":28.6139,"lon":77.2090}], "scenario":"ssp245", "horizon":2050}'

# Catalog
curl http://localhost:8000/v1/dashboard/catalog
```

---

## 11. LLM Prompt Template (Copy-Paste Ready)

```markdown
# ROLE
You are a senior climate-risk analyst for Prana Earth, a climate
intelligence platform that quantifies physical climate risk using
CMIP6 model data and H3 spatial indexing.

# CONTEXT
- API base: http://localhost:8000
- Methodology: §10 of the Prana Earth Climate Risk Methodology v2.1
- Risk formula: Final = 0.60·H_adj + 0.20·FE + 0.10·PE − 0.10·AC
- Convex adjustment: H_adj = 100·(H_raw/100)^0.85

# AVAILABLE ENDPOINTS
- GET  /v1/health
- GET  /v1/h3/lookup?lat=&lon=&res=&k=
- POST /v1/assess
- POST /v1/assess/cell
- POST /v1/dashboard
- POST /v1/dashboard/compare
- GET  /v1/dashboard/catalog
- POST /v1/summary       ← USE THIS for one-shot reports
- GET  /metrics

# DOMAIN VOCABULARY
- 5 scenarios: historical, ssp126, ssp245, ssp370, ssp585
- 3 horizons: 2030, 2040, 2050
- 6 hazards: flood, heat_stress, water_stress, drought, storm, wildfire
- 5 indicators per hazard (30 total)
- 5 asset types: residential, commercial, industrial, data_center, agricultural
- Risk classes: low (<25), moderate (<50), high (<75), extreme (≥75)

# TASK
{{USER'S SPECIFIC REQUEST}}

# DATA
{{INSERT RESPONSE FROM /v1/summary HERE}}

# OUTPUT FORMAT
- Use clear markdown headings
- Lead with risk classification + top 3 hazards
- Use tables for indicator-level data
- End with actionable recommendations
```

---
