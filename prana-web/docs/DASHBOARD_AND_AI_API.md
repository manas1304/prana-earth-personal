# Dashboard & AI Report APIs

Backend developer reference for every HTTP endpoint that backs the **Organization Dashboard**, **Reports**, **Risk-Assessment**, and **AI Summary** UI surfaces. No other endpoints are included — see the climate-pipeline `API_DOC_FOR_AI_DEV.md` for the full FastAPI surface or `API_DOC_FOR_FE_DEV.md` for the complete frontend integration guide.

**Sources**
- prana-web Next.js API routes — `prana-web/src/app/api/...`
- climate-pipeline FastAPI — `climate-pipeline/prana_climate/api.py` (port `8000`)

**Auth**
- prana-web: requires an authenticated user (cookie) + (for org dashboard) `OWNER` or `ADMIN` membership in the org that owns the asset.
- climate-pipeline: open (no auth). Routed via `NEXT_PUBLIC_API_BASE` in the frontend env, or read server-side from the same var.

**Conventions**
- All responses follow `{ success: boolean, data?, message?, errors? }` on the prana-web side.
- Timestamps are ISO-8601 UTC.
- IDs are UUIDv4 unless stated otherwise.
- Error codes: `400` = bad payload, `401` = not signed in, `403` = forbidden, `404` = not found, `409` = conflict, `500` = server error.

---

## A. prana-web Dashboard APIs

### 1. `GET /api/org/dashboard/stats`

Top KPI strip on the **Organization Dashboard**.

**Auth:** org member.

**Query parameters**

| Name | Type | Notes |
|---|---|---|
| `scenario` | string? | (forwarded for parity; the stats are scenario-agnostic today) |
| `horizon` | int? | (forwarded for parity) |

**Response shape**

```ts
{
  success: true,
  data: {
    overallRiskScore: number;          // 0-100, round(avg * 10) / 10
    overallRiskClass: "LOW" | "MODERATE" | "HIGH" | "CRITICAL" | null;
    totalAssets: number;
    totalAssessments: number;
    totalAssessmentsCompleted: number;
    assetsUnderHighRisk: number;        // count of assets with avg >= 50
    recentAssessmentCount: number;     // hard-coded 5
    uniqueLocations: number;           // distinct `Asset.city`
    lastUpdated: string;               // ISO timestamp
  }
}
```

**Sample response**

```json
{
  "success": true,
  "data": {
    "overallRiskScore": 52.4,
    "overallRiskClass": "MODERATE",
    "totalAssets": 84,
    "totalAssessments": 81,
    "totalAssessmentsCompleted": 78,
    "assetsUnderHighRisk": 18,
    "recentAssessmentCount": 5,
    "uniqueLocations": 12,
    "lastUpdated": "2026-08-23T10:42:00.000Z"
  }
}
```

**Source of truth:** `org/dashboard/dashboard.service.ts::getStats`. Computes `overallRiskScore` as the arithmetic mean of the 6 hazard scores per asset, averaged across the org.

---

### 2. `GET /api/org/dashboard/top-risk-assets`

Backs the **Top 3 high-risk assets** table.

**Auth:** org member.

**Query parameters**

| Name | Type | Default | Notes |
|---|---|---|---|
| `limit` | int? | `3` | cap at `50` |

**Response shape**

```ts
{
  success: true,
  data: {
    assets: Array<{
      assetId: string;
      assetName: string;
      assetType: string | null;        // `AssetType` enum
      location: {
        city: string | null;
        state: string | null;
        country: string | null;
        lat: number | null;
        lon: number | null;
      };
      overallRisk: number;              // 0-100
      riskClass: "LOW" | "MODERATE" | "HIGH" | "CRITICAL";
      mainHazard: "flood" | "heat_stress" | "water_stress" | "drought" | "storm" | "wildfire";
      mainHazardScore: number;
    }>;
  }
}
```

**Sample response**

```json
{
  "success": true,
  "data": {
    "assets": [
      {
        "assetId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
        "assetName": "GreenTech DC-01",
        "assetType": "DATA_CENTER",
        "location": {
          "city": "Hyderabad", "state": "Telangana", "country": "India",
          "lat": 17.385, "lon": 78.4867
        },
        "overallRisk": 78.2,
        "riskClass": "HIGH",
        "mainHazard": "flood",
        "mainHazardScore": 78.2
      },
      {
        "assetId": "f47ac10b-58cc-4372-a567-0e02b2c3d470",
        "assetName": "Plant-03",
        "assetType": "INDUSTRIAL_FACILITY",
        "location": {
          "city": "Pune", "state": "Maharashtra", "country": "India",
          "lat": 18.5204, "lon": 73.8567
        },
        "overallRisk": 65.1,
        "riskClass": "HIGH",
        "mainHazard": "heat_stress",
        "mainHazardScore": 65.1
      }
    ]
  }
}
```

---

### 3. `GET /api/org/dashboard/recent-assessments`

Backs the **Last 5 Asset Assessments** table.

**Auth:** org member.

**Query parameters**

| Name | Type | Default | Notes |
|---|---|---|---|
| `limit` | int? | `5` | cap at `50` |

**Response shape**

```ts
{
  success: true,
  data: {
    rows: Array<{
      id: string;                    // Assessment.id (UUID)
      assetId: string;
      assetName: string | null;
      assetType: string | null;
      location: { city: string | null };
      startedAt: string;             // ISO
      scenario: null;                // not stored on Assessment model
      horizon: null;                 // not stored on Assessment model
      compositeRisk: number;
      riskClass: "LOW" | "MODERATE" | "HIGH" | "CRITICAL";
      mainHazard: "flood" | "heat_stress" | "water_stress" | "drought" | "storm" | "wildfire";
      mainHazardScore: number;
      status: "QUEUED" | "PENDING" | "VALIDATING" | "DATA_FETCHING" | "PROCESSING" | "COMPLETED" | "FAILED" | "CANCELLED" | null;
      assessmentId: string;          // constructed: `PE-ORG-{date}-{short-uuid}`
    }>;
  }
}
```

**Sample response**

```json
{
  "success": true,
  "data": {
    "rows": [
      {
        "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
        "assetId": "a47ac10b-58cc-4372-a567-0e02b2c3d400",
        "assetName": "GreenTech DC-01",
        "assetType": "DATA_CENTER",
        "location": { "city": "Hyderabad" },
        "startedAt": "2026-08-23T10:15:00.000Z",
        "scenario": null,
        "horizon": null,
        "compositeRisk": 78.2,
        "riskClass": "HIGH",
        "mainHazard": "flood",
        "mainHazardScore": 78.2,
        "status": "COMPLETED",
        "assessmentId": "PE-ORG-2026-08-23-f47ac10b"
      }
    ]
  }
}
```

---

### 4. `GET /api/org/dashboard/asset-points`

Backs the **Asset Location & Risk** map. Returns a GeoJSON `FeatureCollection`.

**Auth:** org member.

**Response shape**

```ts
{
  success: true,
  data: GeoJSON.FeatureCollection<{
    type: "Feature";
    geometry: { type: "Point"; coordinates: [lon, lat] };
    properties: {
      assetId: string;
      assetName: string;
      assetType: string | null;
      city: string | null;
      country: string | null;
      riskScore: number;
      mainHazard: "flood" | "heat_stress" | "water_stress" | "drought" | "storm" | "wildfire";
    };
  }>;
}
```

**Sample response**

```json
{
  "success": true,
  "data": {
    "type": "FeatureCollection",
    "features": [
      {
        "type": "Feature",
        "geometry": { "type": "Point", "coordinates": [78.4867, 17.385] },
        "properties": {
          "assetId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
          "assetName": "GreenTech DC-01",
          "assetType": "DATA_CENTER",
          "city": "Hyderabad",
          "country": "India",
          "riskScore": 78.2,
          "mainHazard": "flood"
        }
      }
    ]
  }
}
```

---

### 5. `GET /api/org/dashboard/export?format=csv`

Streams the top-risk-assets view as a CSV download.

**Auth:** org member.

**Query parameters**

| Name | Type | Default | Notes |
|---|---|---|---|
| `format` | `"csv"` \| `"pdf"` | `"csv"` | `pdf` returns a JSON envelope referencing the CSV (placeholder — wire pdfkit) |

**Response**

`Content-Type: text/csv; charset=utf-8`
`Content-Disposition: attachment; filename="org-dashboard-YYYY-MM-DD.csv"`

```csv
# Prana Earth — Org Risk Export (YYYY-MM-DD)
# Overall Risk Score: 52.4 (MODERATE)
# Total Assets: 84, High-Risk: 18
Asset ID,Asset Name,Type,City,Overall Risk,Risk Class,Main Hazard,Main Hazard Score
f47ac10b-...,GreenTech DC-01,DATA_CENTER,Hyderabad,78.2,HIGH,flood,78.2
f47ac10b-...,Plant-03,INDUSTRIAL_FACILITY,Pune,65.1,HIGH,heat_stress,65.1
```

---

### 6. `GET /api/org/dashboard/indicator-breakdown`

The 30 contributing indicators grouped by hazard — for the dashboard's per-hazard drill-down panel.

**Auth:** org member.

**Query parameters**

| Name | Type | Required | Notes |
|---|---|---|---|
| `assetId` | uuid | yes | the asset to fetch |
| `scenario` | string? | no | e.g. `ssp245`. If omitted, returns the latest for whatever scenario was last persisted. |
| `horizon` | int? | no | e.g. `2050`. Same fallback rule. |

**Response shape**

```ts
{
  success: true,
  data: {
    assetId: string;
    scenario: string | null;
    horizon: number | null;
    byHazard: Record<HazardKey, {
      composite: number | null;      // the 6-axis risk score from ClimateRiskScore
      class: "LOW" | "MODERATE" | "HIGH" | "CRITICAL" | null;
      weights: Record<IndicatorCode, number>;  // e.g. { rx5day: 0.35, ... }
      indicators: Record<IndicatorCode, {
        value: number | null;        // 0-100 normalized
        weight: number;              // methodology §10.2
        rawValue: string | null;     // pre-normalization text
      }>;
    }>;
    computedAt: string;             // ISO
  };
}
```

**Sample response**

```json
{
  "success": true,
  "data": {
    "assetId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "scenario": "ssp245",
    "horizon": 2050,
    "byHazard": {
      "flood": {
        "composite": 78.2,
        "class": "HIGH",
        "weights": {
          "rx5day": 0.35,
          "pr99p_flood": 0.25,
          "slope_twi": 0.20,
          "mrso_antecedent": 0.12,
          "drainage": 0.08
        },
        "indicators": {
          "rx5day":          { "value": 95.0, "weight": 0.35, "rawValue": "95" },
          "pr99p_flood":      { "value": 88.2, "weight": 0.25, "rawValue": "88.2" },
          "slope_twi":        { "value": 12.0, "weight": 0.20, "rawValue": "12" },
          "mrso_antecedent":  { "value": 76.4, "weight": 0.12, "rawValue": "76.4" },
          "drainage":         { "value": 50.0, "weight": 0.08, "rawValue": "50" }
        }
      },
      "heat_stress":  { "...": "..." },
      "water_stress": { "...": "..." },
      "drought":      { "...": "..." },
      "storm":        { "...": "..." },
      "wildfire":     { "...": "..." }
    },
    "computedAt": "2026-08-23T10:42:13.000Z"
  }
}
```

If the asset has no persisted indicators yet, `data` is `null` and the message tells the caller to trigger a reassessment.

**Source of truth:** rows in `indicator_scores` + `climate_risk_scores` tables, populated via `POST /api/org/assets/{id}/reassess` (below).

---

## B. prana-web Reassessment

### 7. `POST /api/org/assets/{id}/reassess`

Kicks off a fresh assessment for the asset: demotes previous `isLatest=true`, inserts a new `Assessment`, calls the climate-pipeline `/v1/assess`, persists 6 `ClimateRiskScore` rows + 30 `IndicatorScore` rows.

**Auth:** org member.

**Request body**

```json
{
  "scenario": "ssp245",
  "horizon": 2050,
  "assetType": "data_center"
}
```

| Field | Type | Default | Notes |
|---|---|---|---|
| `scenario` | string | `"ssp245"` | One of `historical`, `ssp126`, `ssp245`, `ssp370`, `ssp585` |
| `horizon` | int | `2050` | One of `2030`, `2040`, `2050` |
| `assetType` | string? | — | Optional, forwarded to the pipeline for asset-type multipliers |

**Response shape**

```ts
{ success: true, data: { assessmentId, assetId, scenario, horizon, climateRiskScores: 6, indicatorScores: 30, status: "COMPLETED" } }
```

**Sample response**

```json
{
  "success": true,
  "data": {
    "assessmentId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "assetId": "f47ac10b-58cc-4372-a567-0e02b2c3d400",
    "scenario": "ssp245",
    "horizon": 2050,
    "climateRiskScores": 6,
    "indicatorScores": 30,
    "status": "COMPLETED"
  }
}
```

**Errors**
- `404` — asset not found, or missing `latitude`/`longitude`
- `502`-ish — wrapped: the climate pipeline returned non-2xx (the upstream error message is preserved)

---

## C. climate-pipeline AI / Dashboard APIs

The endpoints below live on the FastAPI service (default `http://localhost:8000`). They are documented in full at [climate-pipeline/API_DOC_FOR_AI_DEV.md](../../climate-pipeline/API_DOC_FOR_AI_DEV.md) and [climate-pipeline/API_DOC_FOR_FE_DEV.md](../../climate-pipeline/API_DOC_FOR_FE_DEV.md); included here are the response shapes relevant to the dashboard and AI-summary panels.

### 8. `POST /v1/dashboard`

**One location, all scenarios × all horizons + 30 indicators.** Powers the dashboard's "scenario comparison" and "horizon trend" charts.

**Request body**

```json
{ "lat": 19.076, "lon": 72.8777, "asset_type": "data_center" }
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `lat` | float | yes | -90..90 |
| `lon` | float | yes | -180..180 |
| `asset_type` | string? | no | applies asset-type hazard multipliers |
| `scenario` | string? | no | filter the `by_scenario` block |
| `horizon` | int? | no | filter the `by_horizon` block |

**Response shape**

```ts
{
  h3_cell: string;
  h3_resolution: number;
  current: AssessResponse;          // current scenario + horizon
  by_scenario: {
    historical?: HazardScores;
    ssp126?:     HazardScores;
    ssp245?:     HazardScores;
    ssp370?:     HazardScores;
    ssp585?:     HazardScores;
  };
  by_horizon: {
    "2030"?: HazardScores;
    "2040"?: HazardScores;
    "2050"?: HazardScores;
  };
  indicators: {
    flood:        { rx5day: number, pr99p_flood: number, ... };
    heat_stress:  { ... };
    water_stress: { ... };
    drought:      { ... };
    storm:        { ... };
    wildfire:     { ... };
  };
}
```

**Sample response (excerpt)**

```json
{
  "h3_cell": "86608b0b7ffffff",
  "h3_resolution": 6,
  "current": {
    "scenario": "ssp245",
    "horizon": 2050,
    "composite_risk": 47.86,
    "hazard_scores": {
      "flood": 23.4,
      "heat_stress": 78.9,
      "water_stress": 54.5,
      "drought": 62.3,
      "storm": 61.2,
      "wildfire": 12.8
    },
    "exposure": { "financial": 58.85, "population": 58.85 },
    "adaptive_capacity": 61.11,
    "contributing_indicators": {
      "flood": { "rx5day": 21.4, "pr99p_flood": 18.0 },
      "heat_stress": { "hwd": 95.0, "wbgt": 85.4, "txx": 92.0, "cdd": 78.4, "uhi": 12.6 }
    }
  },
  "by_scenario": {
    "ssp126": { "flood": 18.5, "heat_stress": 70.0, ... },
    "ssp245": { "flood": 23.4, "heat_stress": 78.9, ... },
    "ssp370": { "flood": 30.1, "heat_stress": 88.0, ... }
  },
  "by_horizon": {
    "2030": { "flood": 18.0, "heat_stress": 70.0, ... },
    "2050": { "flood": 23.4, "heat_stress": 78.9, ... }
  },
  "indicators": { "flood": { "rx5day": 21.4 }, ... }
}
```

---

### 9. `POST /v1/summary`

**Complete AI-ready context** for one location. The "AI Insights" / "AI Summary" panel calls this. Bundle it into your LLM prompt to generate a structured climate-risk narrative.

**Request body**

```json
{
  "lat": 19.076,
  "lon": 72.8777,
  "asset_type": "data_center",
  "scenarios": ["historical", "ssp126", "ssp245", "ssp370", "ssp585"],
  "horizons": [2030, 2040, 2050]
}
```

All fields optional except `lat` + `lon`. Defaults: all 5 scenarios, 3 horizons.

**Response shape**

```ts
{
  meta: {
    lat: number;
    lon: number;
    h3_cell: string;
    asset_type?: string;
    scenarios: Scenario[];
    horizons: Horizon[];
    generated_at: string;
  };
  current: AssessResponse;
  risk_classification: "low" | "moderate" | "high" | "extreme";
  top_hazards: Array<{ hazard: HazardKey; avg_score: number; rank: number }>;
  matrix: Record<Scenario, Record<Horizon, {
    hazard_scores: HazardScores;
    composite_risk: number;
    adaptive_capacity: number;
    exposure: { financial: number; population: number };
    contributing_indicators: Indicators;
  }>>;
  trend: {
    scenario: Scenario;
    from_year: Horizon;
    to_year: Horizon;
    delta: number;
    pct_change: number | null;
  };
  narrative: string;        // pre-computed human-readable paragraph
}
```

**Sample response**

```json
{
  "meta": {
    "lat": 19.076,
    "lon": 72.8777,
    "h3_cell": "86608b0b7ffffff",
    "asset_type": "data_center",
    "scenarios": ["historical", "ssp126", "ssp245", "ssp370", "ssp585"],
    "horizons": [2030, 2040, 2050],
    "generated_at": "HazardEngine"
  },
  "current": {
    "scenario": "ssp245",
    "horizon": 2050,
    "composite_risk": 47.86,
    "hazard_scores": {
      "flood": 23.4, "heat_stress": 78.9, "water_stress": 54.5,
      "drought": 62.3, "storm": 61.2, "wildfire": 12.8
    },
    "exposure": { "financial": 58.85, "population": 58.85 },
    "adaptive_capacity": 61.11,
    "contributing_indicators": { "...": "..." }
  },
  "risk_classification": "moderate",
  "top_hazards": [
    { "hazard": "heat_stress", "avg_score": 78.9, "rank": 1 },
    { "hazard": "drought",      "avg_score": 65.0, "rank": 2 },
    { "hazard": "storm",        "avg_score": 58.0, "rank": 3 },
    { "hazard": "water_stress", "avg_score": 45.0, "rank": 4 },
    { "hazard": "flood",        "avg_score": 22.0, "rank": 5 },
    { "hazard": "wildfire",     "avg_score": 12.0, "rank": 6 }
  ],
  "matrix": {
    "historical": {
      "2030": { "hazard_scores": { "...": "..." }, "composite_risk": 12.0, "...": "..." },
      "2050": { "...": "..." }
    },
    "ssp245": {
      "2030": { "...": "..." },
      "2040": { "...": "..." },
      "2050": { "...": "..." }
    }
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

---

### 10. `POST /v1/dashboard/compare`

**Multi-location comparison**, sorted by composite risk descending. Backed by the "Compare Cities" table on the dashboard.

**Request body**

```json
{
  "locations": [
    { "name": "Mumbai",   "lat": 19.076, "lon": 72.8777 },
    { "name": "Delhi",    "lat": 28.6139, "lon": 77.2090 },
    { "name": "London",   "lat": 51.5074, "lon": -0.1278 }
  ],
  "scenario": "ssp245",
  "horizon": 2050
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `locations` | Array<{name, lat, lon}> | yes | up to ~50 |
| `scenario` | string? | no | default `ssp245` |
| `horizon` | int? | no | default `2050` |
| `asset_type` | string? | no | applies multipliers |

**Response shape**

```ts
{
  scenario: Scenario;
  horizon: Horizon;
  asset_type?: string;
  count: number;
  results: Array<{
    name: string;
    lat: number;
    lon: number;
    h3_cell: string;
    hazard_scores: HazardScores;       // 6 axes
    composite_risk: number;
    exposure: { financial: number; population: number };
    adaptive_capacity: number;
  }>;
}
```

`results` is sorted by `composite_risk` descending.

**Sample response**

```json
{
  "scenario": "ssp245",
  "horizon": 2050,
  "count": 3,
  "results": [
    {
      "name": "Delhi",
      "lat": 28.6139, "lon": 77.2090,
      "h3_cell": "866a7ffffffffff",
      "hazard_scores": {
        "flood": 32.1, "heat_stress": 92.3, "water_stress": 71.0,
        "drought": 45.5, "storm": 18.2, "wildfire": 9.4
      },
      "composite_risk": 65.2,
      "exposure": { "financial": 71.0, "population": 71.0 },
      "adaptive_capacity": 55.4
    },
    {
      "name": "Mumbai",
      "lat": 19.076, "lon": 72.8777,
      "h3_cell": "86608b0b7ffffff",
      "hazard_scores": {
        "flood": 78.2, "heat_stress": 64.3, "water_stress": 48.5,
        "drought": 41.0, "storm": 55.2, "wildfire": 12.6
      },
      "composite_risk": 47.86,
      "exposure": { "financial": 58.85, "population": 58.85 },
      "adaptive_capacity": 61.11
    },
    {
      "name": "London",
      "lat": 51.5074, "lon": -0.1278,
      "h3_cell": "861a0bfffffff",
      "hazard_scores": {
        "flood": 25.4, "heat_stress": 12.0, "water_stress": 18.2,
        "drought": 14.5, "storm": 32.0, "wildfire": 4.1
      },
      "composite_risk": 18.5,
      "exposure": { "financial": 42.0, "population": 42.0 },
      "adaptive_capacity": 78.2
    }
  ]
}
```

---

### 11. `GET /v1/dashboard/catalog`

Static metadata used to populate the scenario / horizon / asset-type / indicator dropdowns in the UI. No request body.

**Response shape**

```ts
{
  scenarios: Scenario[];                 // ["historical", "ssp126", "ssp245", ...]
  horizons: Horizon[];                  // [2030, 2040, 2050]
  asset_types: AssetType[];             // ["residential", "commercial", ...]
  hazards: Array<{
    key: HazardKey;
    indicators: IndicatorCode[];       // 5 per hazard
  }>;
  h3_resolution: number;                // 6
}
```

**Sample response**

```json
{
  "scenarios": ["historical", "ssp126", "ssp245", "ssp370", "ssp585"],
  "horizons": [2030, 2040, 2050],
  "asset_types": ["residential", "commercial", "industrial", "data_center", "agricultural"],
  "hazards": [
    { "key": "flood",        "indicators": ["rx5day", "pr99p_flood", "slope_twi", "mrso_antecedent", "drainage"] },
    { "key": "heat_stress",  "indicators": ["hwd", "wbgt", "txx", "cdd", "uhi"] },
    { "key": "water_stress", "indicators": ["bws", "gwd", "mrro_delta", "evap_demand", "monsoon_cv"] },
    { "key": "drought",      "indicators": ["spi12", "spei", "mrso_anomaly", "cdd_days", "pr_trend"] },
    { "key": "storm",        "indicators": ["cape", "pr99p_storm", "wind_p90_storm", "dust_emission", "ndvi_trend"] },
    { "key": "wildfire",     "indicators": ["fwi", "vpd", "ffdi", "lfmc", "wind_p90_wildfire"] }
  ],
  "h3_resolution": 6
}
```

---

### 12. `POST /v1/assess` (referenced)

Single-location, single-(scenario,horizon) 6-hazard assessment. Returns the full `AssessResponse` — basis for the `reassess` endpoint in §B above.

**Request body**

```json
{
  "lat": 19.076,
  "lon": 72.8777,
  "scenario": "ssp245",
  "horizon": 2050,
  "asset_type": "data_center"
}
```

**Response shape** — see [climate-pipeline/API_DOC_FOR_AI_DEV.md §4.5](../../climate-pipeline/API_DOC_FOR_AI_DEV.md).

This is the endpoint `src/modules/org/indicators/indicators.service.ts::persistIndicatorsForAsset` calls server-side to fetch hazard + indicator data before persisting it.

---

## D. Where each endpoint is consumed in the UI

| Endpoint | Consumer |
|---|---|
| §A.1 `/api/org/dashboard/stats` | Organization Dashboard — KPI strip |
| §A.2 `/api/org/dashboard/top-risk-assets` | Organization Dashboard — "Top 3 Assets Under High Risk" table |
| §A.3 `/api/org/dashboard/recent-assessments` | Organization Dashboard — "Last 5 Asset Assessments" table |
| §A.4 `/api/org/dashboard/asset-points` | Organization Dashboard — Asset map |
| §A.5 `/api/org/dashboard/export` | Organization Dashboard — "Export Report" button |
| §A.6 `/api/org/dashboard/indicator-breakdown` | Organization Dashboard — per-hazard drill-down (post-rebuild) |
| §B.7 `/api/org/assets/{id}/reassess` | Reassessment page — "Start Assessment" / "Reassess" button |
| §C.8 `/v1/dashboard` | Dashboard — by_scenario + by_horizon charts |
| §C.9 `/v1/summary` | Dashboard — "AI Insights" / "AI Summary" panel |
| §C.10 `/v1/dashboard/compare` | Dashboard — "Compare Cities" table |
| §C.11 `/v1/dashboard/catalog` | All UI surfaces — populates scenario/horizon/asset/indicator dropdowns |
| §C.12 `/v1/assess` | Risk-Assessment form + prana-web `reassess` server-side |

---

## E. Quick test commands

```bash
# After prana-web migrations are applied + climate pipeline is running:

# Trigger a reassessment that populates all 30 indicators
curl -X POST http://localhost:3000/api/org/assets/<asset-uuid>/reassess \
  -H "Cookie: access_token=$TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"scenario":"ssp245","horizon":2050}'

# Read the per-hazard indicator breakdown
curl "http://localhost:3000/api/org/dashboard/indicator-breakdown?assetId=<asset-uuid>&scenario=ssp245&horizon=2050" \
  -H "Cookie: access_token=$TOKEN"

# AI summary (climate pipeline)
curl -X POST http://localhost:8000/v1/summary \
  -H "Content-Type: application/json" \
  -d '{"lat":19.076,"lon":72.8777,"asset_type":"data_center"}'
```
