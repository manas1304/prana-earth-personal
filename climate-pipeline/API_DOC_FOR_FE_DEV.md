# Climate Pipeline API - Documentation for Frontend Developers

> **Purpose:** This document is the integration guide for the Prana Earth
> frontend (Next.js) team. It covers what data is available, how to
> fetch it, what shape the data has, and what UI components it can
> power.

---

## 1. Base URL

| Environment | URL |
|---|---|
| Production (EC2) | `http://15.252.141.183:8000` |
| Local dev | `http://localhost:8000` |
| Staging | `http://staging.prana-earth.com:8000` |

The frontend (Prana Web) is configured via `NEXT_PUBLIC_API_BASE` in `.env`:
```
NEXT_PUBLIC_API_BASE=http://localhost:8000
```

---

## 2. Endpoints at a Glance

| # | Method | Path | Use case in UI |
|---|---|---|---|
| 1 | `GET` | `/v1/health` | Show "API online" indicator in admin dashboard |
| 2 | `GET` | `/v1/h3/lookup` | Lat/lng input → show H3 cell id + neighbours |
| 3 | `POST` | `/v1/assess` | Single-location risk card / 6-hazard radar |
| 4 | `POST` | `/v1/assess/cell` | Refresh an existing card by H3 cell id |
| 5 | `POST` | `/v1/dashboard` | Full dashboard for one location (all 5×3) |
| 6 | `POST` | `/v1/dashboard/compare` | Compare multiple cities (leaderboard) |
| 7 | `GET` | `/v1/dashboard/catalog` | Populate dropdowns (scenarios, hazards, etc.) |
| 8 | `POST` | `/v1/summary` | **All-in-one for AI summary panels** |
| 9 | `GET` | `/metrics` | Prometheus minimal exposition |

---

## 3. CORS & Headers

```typescript
// The API has CORS = * by default. No special headers required.
const API_BASE = process.env.NEXT_PUBLIC_API_BASE!;

// Always send JSON for POST requests
const headers = { "Content-Type": "application/json" };
```

---

## 4. Fetching the Catalog (do this ONCE on app start)

The catalog tells the UI what scenarios, horizons, hazards, indicators, and asset types are available. Fetch once and cache.

### Request

```typescript
const res = await fetch(`${API_BASE}/v1/dashboard/catalog`);
const catalog = await res.json();
```

### Response

```typescript
interface Catalog {
  scenarios: string[];       // ["historical", "ssp126", "ssp245", "ssp370", "ssp585"]
  horizons: number[];         // [2030, 2040, 2050]
  asset_types: string[];      // ["residential", "commercial", "industrial", "data_center", "agricultural"]
  h3_resolution: number;      // 6
  hazards: Array<{
    key: string;               // "flood" | "heat_stress" | "water_stress" | "drought" | "storm" | "wildfire"
    indicators: string[];      // 5 indicator keys per hazard
  }>;
}
```

**Use**: Build dropdowns, radio buttons, and indicator legends. The list comes from the API so adding a new scenario or asset type needs no frontend change.

---

## 5. Single-Location Risk Card (the most common UI)

### When to use

- User enters an address
- User clicks a map pin
- User submits a "Get my risk" form

### Request

```typescript
async function getRiskCard(lat: number, lon: number, opts?: {
  scenario?: string;       // default: "ssp245"
  horizon?: number;         // default: 2050
  asset_type?: string;      // default: omitted
}) {
  const res = await fetch(`${API_BASE}/v1/assess`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ lat, lon, ...opts }),
  });
  return res.json();
}

const card = await getRiskCard(19.076, 72.8777, { asset_type: "data_center" });
```

### Response type

```typescript
interface AssessResponse {
  location: { h3_cell: string; h3_resolution: number };
  scenario: string;
  horizon: number;
  asset_type?: string;
  hazard_scores: {
    flood: number;        // 0-100
    heat_stress: number;
    water_stress: number;
    drought: number;
    storm: number;
    wildfire: number;
  };
  composite_risk: number;   // 0-100
  exposure: {
    financial: number;     // 0-100
    population: number;     // 0-100
  };
  adaptive_capacity: number; // 0-100
  contributing_indicators: {
    flood: { [indicator: string]: number };
    heat_stress: { [indicator: string]: number };
    water_stress: { [indicator: string]: number };
    drought: { [indicator: string]: number };
    storm: { [indicator: string]: number };
    wildfire: { [indicator: string]: number };
  };
  notes: string[];
  _cache: "hit" | "miss";
}
```

### UI mappings

| API field | UI component |
|---|---|
| `hazard_scores` | Radar chart (6 axes) |
| `composite_risk` | Big number + color (green/orange/red) |
| `risk_classification` (derived) | `low (<25)`, `moderate (<50)`, `high (<75)`, `extreme (>=75)` |
| `contributing_indicators` | Drill-down table |
| `notes` | Footer disclaimers |
| `_cache === "hit"` | Show "cached" badge |

### Risk classification helper

```typescript
function classify(score: number): "low" | "moderate" | "high" | "extreme" {
  if (score < 25) return "low";
  if (score < 50) return "moderate";
  if (score < 75) return "high";
  return "extreme";
}

const cls = classify(card.composite_risk);
// "low" | "moderate" | "high" | "extreme"
```

---

## 6. H3 Lookup (lat/lng → cell)

### When to use

- User searches by address or clicks a map pin
- You need the canonical H3 cell id for caching / sharing

### Request

```typescript
const res = await fetch(
  `${API_BASE}/v1/h3/lookup?lat=19.076&lon=72.8777&res=6&k=0`
);
const cell = await res.json();
```

### Response

```typescript
interface H3LookupResponse {
  h3_cell: string;       // e.g. "86608b0b7ffffff"
  resolution: number;    // 6
  lat: number;            // canonical centroid lat
  lon: number;            // canonical centroid lon
  neighbours: string[];  // k=0 → empty; k=1 → 6 neighbours
}
```

---

## 7. Multi-Location Comparison (leaderboard / sortable table)

### When to use

- "Compare this city to other cities" page
- Top 10 riskiest locations table
- Search-results list sorted by risk

### Request

```typescript
async function compareLocations(
  locations: Array<{ name: string; lat: number; lon: number }>,
  opts?: { scenario?: string; horizon?: number; asset_type?: string }
) {
  const res = await fetch(`${API_BASE}/v1/dashboard/compare`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      locations,
      scenario: opts?.scenario ?? "ssp245",
      horizon: opts?.horizon ?? 2050,
      asset_type: opts?.asset_type,
    }),
  });
  return res.json();
}

const data = await compareLocations([
  { name: "Mumbai",   lat: 19.076, lon: 72.8777 },
  { name: "Delhi",    lat: 28.6139, lon: 77.2090 },
  { name: "London",   lat: 51.5074, lon: -0.1278 },
  { name: "Tokyo",    lat: 35.6762, lon: 139.6503 },
  { name: "New York", lat: 40.7128, lon: -74.0060 },
]);
```

### Response

```typescript
interface CompareResponse {
  scenario: string;
  horizon: number;
  asset_type?: string;
  count: number;
  results: Array<{
    name: string;
    lat: number;
    lon: number;
    h3_cell: string;
    hazard_scores: { flood: number; heat_stress: number; water_stress: number; drought: number; storm: number; wildfire: number };
    composite_risk: number;
    exposure: { financial: number; population: number };
    adaptive_capacity: number;
  }>;
  // ↑ results are already sorted by composite_risk descending
}
```

### UI mappings

- `results[i].composite_risk` → row color (red/amber/green)
- `results[i].hazard_scores` → small radar chart per row
- Click a row → open detail card (call `/v1/assess` with that cell's lat/lon)

---

## 8. Full Dashboard (one location, all data)

### When to use

- Dashboard page for a single city/asset
- "Deep dive" view after clicking a comparison row
- AI report context

### Request

```typescript
async function getDashboard(
  lat: number, lon: number, opts?: {
    asset_type?: string;
    scenarios?: string[];   // default: all 5
    horizons?: number[];     // default: all 3
  }
) {
  const res = await fetch(`${API_BASE}/v1/dashboard`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ lat, lon, ...opts }),
  });
  return res.json();
}
```

### Response

```typescript
interface DashboardResponse {
  h3_cell: string;
  lat: number;
  lon: number;
  current: AssessResponse;             // current ssp245/2050 assessment
  by_scenario: {
    [scenario: string]: {              // 5 entries by default
      flood: number; heat_stress: number; water_stress: number;
      drought: number; storm: number; wildfire: number;
    };
  };
  by_horizon: {
    [horizon: string]: {               // 3 entries by default (as strings)
      flood: number; heat_stress: number; water_stress: number;
      drought: number; storm: number; wildfire: number;
    };
  };
  indicators: {
    flood: { [indicator: string]: number };
    heat_stress: { [indicator: string]: number };
    water_stress: { [indicator: string]: number };
    drought: { [indicator: string]: number };
    storm: { [indicator: string]: number };
    wildfire: { [indicator: string]: number };
  };
}
```

### UI mappings

| API field | UI component |
|---|---|
| `current.hazard_scores` | Big radar chart |
| `by_scenario` | Bar chart (5 bars per hazard, one per scenario) |
| `by_horizon` | Line chart (one line per hazard, 3 points) |
| `indicators` | Stacked-bar drill-down per hazard |

### Sample component (Recharts)

```tsx
import { Radar, RadarChart, PolarGrid, Legend, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from "recharts";

function HazardRadar({ scores }: { scores: AssessResponse["hazard_scores"] }) {
  const data = Object.entries(scores).map(([hazard, score]) => ({
    hazard,
    score: Number(score.toFixed(1)),
  }));
  return (
    <ResponsiveContainer width="100%" height={300}>
      <RadarChart data={data}>
        <PolarGrid />
        <PolarAngleAxis dataKey="hazard" />
        <PolarRadiusAxis angle={90} domain={[0, 100]} />
        <Radar dataKey="score" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
      </RadarChart>
    </ResponsiveContainer>
  );
}
```

---

## 9. AI Summary Endpoint (use for "AI Insights" panels)

### When to use

- Right-side "AI Insights" panel in the dashboard
- Auto-generated text on city detail pages
- "Why this matters" expandable section

### Request

```typescript
async function getAiSummary(
  lat: number, lon: number, opts?: {
    asset_type?: string;
    scenarios?: string[];
    horizons?: number[];
  }
) {
  const res = await fetch(`${API_BASE}/v1/summary`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ lat, lon, ...opts }),
  });
  return res.json();
}

const summary = await getAiSummary(19.076, 72.8777, { asset_type: "data_center" });
```

### Response

```typescript
interface SummaryResponse {
  meta: {
    lat: number; lon: number; h3_cell: string; asset_type?: string;
    scenarios: Scenario[]; horizons: Horizon[]; generated_at: string;
  };
  current: AssessResponse;             // current ssp245/2050
  risk_classification: "low" | "moderate" | "high" | "extreme";
  top_hazards: Array<{ hazard: HazardKey; avg_score: number; rank: number }>;
  matrix: {
    [scenario: string]: {
      [horizon: string]: {
        hazard_scores: { ... };
        composite_risk: number;
        adaptive_capacity: number;
        exposure: { ... };
        contributing_indicators: { ... };
      };
    };
  };
  trend: {
    scenario: Scenario;
    from_year: Horizon;
    to_year: Horizon;
    delta: number;
    pct_change: number | null;
  };
  narrative: string;  // ← pre-computed LLM-ready paragraph
}
```

### UI mappings

| API field | UI component |
|---|---|
| `risk_classification` | Badge color (low/moderate/high/extreme) |
| `composite_risk` | Big number with color |
| `top_hazards` | Ordered list (top 3) |
| `matrix` | 5×3 heatmap (scenarios × horizons) |
| `trend.delta` | Arrow indicator (↑ ↓ →) |
| `narrative` | Pre-written paragraph (show to user as the "AI explanation") |

### Direct usage

```tsx
function AiSummaryPanel({ summary }: { summary: SummaryResponse }) {
  return (
    <div className="ai-summary">
      <h2>Risk: {summary.risk_classification.toUpperCase()}</h2>
      <div className="score">{summary.current.composite_risk}/100</div>
      <p className="narrative">{summary.narrative}</p>
      <h3>Top hazards</h3>
      <ol>
        {summary.top_hazards.slice(0, 3).map(h => (
          <li key={h.hazard}>
            {h.rank}. {h.hazard} — avg {h.avg_score}/100
          </li>
        ))}
      </ol>
    </div>
  );
}
```

---

## 10. Component Recipes

### 10.1 Risk gauge (single number)

```tsx
function RiskGauge({ score }: { score: number }) {
  const cls = score < 25 ? "low" : score < 50 ? "moderate" : score < 75 ? "high" : "extreme";
  const color = { low: "green", moderate: "amber", high: "orange", extreme: "red" }[cls];
  return (
    <div className={`risk-gauge risk-${cls}`} style={{ background: color }}>
      <div className="score">{Math.round(score)}</div>
      <div className="label">{cls.toUpperCase()}</div>
    </div>
  );
}
```

### 10.2 Scenario comparison (bar chart)

```tsx
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from "recharts";

function ScenarioCompare({ byScenario }: { byScenario: SummaryResponse["matrix"] }) {
  const data = Object.entries(byScenario).map(([scenario, horizons]) => {
    const h2050 = horizons["2050"]?.hazard_scores ?? {};
    return {
      scenario,
      flood: h2050.flood ?? 0,
      heat_stress: h2050.heat_stress ?? 0,
      drought: h2050.drought ?? 0,
      storm: h2050.storm ?? 0,
    };
  });
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <CartesianGrid />
        <XAxis dataKey="scenario" />
        <YAxis domain={[0, 100]} />
        <Tooltip />
        <Legend />
        <Bar dataKey="flood" fill="#1f77b4" />
        <Bar dataKey="heat_stress" fill="#ff7f0e" />
        <Bar dataKey="drought" fill="#2ca02c" />
        <Bar dataKey="storm" fill="#d62728" />
      </BarChart>
    </ResponsiveContainer>
  );
}
```

### 10.3 Indicator drill-down (stacked bar)

```tsx
function IndicatorDrilldown({ indicators }: { indicators: { [hazard: string]: Record<string, number> } }) {
  return Object.entries(indicators).map(([hazard, inds]) => {
    const data = Object.entries(inds).map(([k, v]) => ({ indicator: k, value: Number(v.toFixed(1)) }));
    return (
      <div key={hazard}>
        <h4>{hazard}</h4>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data} layout="vertical">
            <XAxis type="number" domain={[0, 100]} />
            <YAxis type="category" dataKey="indicator" width={100} />
            <Tooltip />
            <Bar dataKey="value" fill="#8884d8" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  });
}
```

### 10.4 Multi-city leaderboard (sortable table)

```tsx
function Leaderboard({ results }: { results: CompareResponse["results"] }) {
  return (
    <table>
      <thead>
        <tr>
          <th>Rank</th><th>City</th><th>Risk</th><th>Top hazard</th>
        </tr>
      </thead>
      <tbody>
        {results.map((r, i) => {
          const top = Object.entries(r.hazard_scores).sort((a, b) => b[1] - a[1])[0];
          return (
            <tr key={r.h3_cell}>
              <td>{i + 1}</td>
              <td>{r.name}</td>
              <td style={{ color: r.composite_risk > 50 ? "red" : "green" }}>
                {Math.round(r.composite_risk)}
              </td>
              <td>{top[0]} ({Math.round(top[1])})</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
```

---

## 11. SWR / React Query patterns

```tsx
// useRiskCard.ts
import useSWR from "swr";

const fetcher = (url: string, body: any) =>
  fetch(url, {
    method: body ? "POST" : "GET",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  }).then(r => r.json());

export function useRiskCard(lat: number, lon: number, assetType?: string) {
  const { data, error, isLoading } = useSWR(
    ["/v1/assess", { lat, lon, asset_type: assetType }],
    fetcher,
    { refreshInterval: 5 * 60 * 1000 }  // 5 min
  );
  return { card: data, error, isLoading };
}
```

---

## 12. TypeScript types (copy-paste)

```typescript
// types/api.ts
export type Scenario = "historical" | "ssp126" | "ssp245" | "ssp370" | "ssp585";
export type Horizon = 2030 | 2040 | 2050;
export type AssetType = "residential" | "commercial" | "industrial" | "data_center" | "agricultural";
export type HazardKey = "flood" | "heat_stress" | "water_stress" | "drought" | "storm" | "wildfire";
export type RiskClass = "low" | "moderate" | "high" | "extreme";

export interface HazardScores {
  flood: number;
  heat_stress: number;
  water_stress: number;
  drought: number;
  storm: number;
  wildfire: number;
}

export interface Indicators {
  flood: Record<string, number>;
  heat_stress: Record<string, number>;
  water_stress: Record<string, number>;
  drought: Record<string, number>;
  storm: Record<string, number>;
  wildfire: Record<string, number>;
}

export interface AssessResponse {
  location: { h3_cell: string; h3_resolution: number };
  scenario: Scenario;
  horizon: Horizon;
  asset_type?: AssetType;
  hazard_scores: HazardScores;
  composite_risk: number;
  exposure: { financial: number; population: number };
  adaptive_capacity: number;
  contributing_indicators: Indicators;
  notes: string[];
  _cache: "hit" | "miss";
}

export interface CompareLocation {
  name: string;
  lat: number;
  lon: number;
  h3_cell: string;
  hazard_scores: HazardScores;
  composite_risk: number;
  exposure: { financial: number; population: number };
  adaptive_capacity: number;
}

export interface CompareResponse {
  scenario: Scenario;
  horizon: Horizon;
  asset_type?: AssetType;
  count: number;
  results: CompareLocation[];  // sorted by composite_risk desc
}

export interface DashboardResponse {
  h3_cell: string;
  lat: number;
  lon: number;
  current: AssessResponse;
  by_scenario: Record<Scenario, HazardScores>;
  by_horizon: Record<string, HazardScores>;
  indicators: Indicators;
}

export interface SummaryResponse {
  meta: {
    lat: number;
    lon: number;
    h3_cell: string;
    asset_type?: AssetType;
    scenarios: Scenario[];
    horizons: Horizon[];
    generated_at: string;
  };
  current: AssessResponse;
  risk_classification: RiskClass;
  top_hazards: Array<{ hazard: HazardKey; avg_score: number; rank: number }>;
  matrix: Record<Scenario, Record<string, {
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
  narrative: string;
}

export interface CatalogResponse {
  scenarios: Scenario[];
  horizons: Horizon[];
  asset_types: AssetType[];
  hazards: Array<{ key: HazardKey; indicators: string[] }>;
  h3_resolution: number;
}

export interface H3LookupResponse {
  h3_cell: string;
  resolution: number;
  lat: number;
  lon: number;
  neighbours: string[];
}
```

---

## 13. Loading & Error States

```tsx
function RiskCard({ lat, lon, assetType }: { lat: number; lon: number; assetType?: string }) {
  const { card, error, isLoading } = useRiskCard(lat, lon, assetType);

  if (isLoading) return <Skeleton className="h-40" />;
  if (error)   return <ErrorAlert message="Failed to load risk data" />;
  if (!card)   return null;

  return <RiskGauge score={card.composite_risk} />;
}
```

---

## 14. Caching strategy

| Endpoint | Cache TTL | Storage | Notes |
|---|---|---|---|
| `/v1/assess` | 5 min (server) | Redis (optional) | Mark with `_cache: "hit"` |
| `/v1/dashboard` | none | none | Each call ~1s, re-fetch on param change |
| `/v1/dashboard/compare` | none | none | Cache by sorted locations hash |
| `/v1/dashboard/catalog` | 1 hr (client) | localStorage | Rarely changes |
| `/v1/health` | 30 sec (client) | SWR | Cheap to call frequently |

---

## 15. Testing locally

```bash
# Start the API (in climate-pipeline/):
cd climate-pipeline
python -m venv venv
source venv/bin/activate
pip install -e .
uvicorn api:app --reload --port 8000

# In another terminal:
curl http://localhost:8000/v1/health
```

Set in `prana-web/.env.local`:
```
NEXT_PUBLIC_API_BASE=http://localhost:8000
```

Then `npm run dev` in prana-web.

---

## 16. Production deployment

The Prana Web already has `NEXT_PUBLIC_API_BASE` configured in `.env`. On EC2:

- **API**: systemd service `prana-api.service` on `127.0.0.1:8000`
- **Frontend**: systemd service `prana-web.service` on `0.0.0.0:3000`
- **Public URL**: `http://15.252.141.183:3000` (frontend) — it talks to the API at `http://15.252.141.183:8000`

If deploying the frontend elsewhere, set `NEXT_PUBLIC_API_BASE` to wherever the API runs.

---

## 17. Error handling cheat sheet

```typescript
async function safeFetch<T>(url: string, opts?: RequestInit): Promise<T | null> {
  try {
    const res = await fetch(url, opts);
    if (!res.ok) {
      console.error(`API error: ${res.status} ${res.statusText}`);
      return null;
    }
    return res.json();
  } catch (err) {
    console.error("API request failed:", err);
    return null;
  }
}
```

Always:
- Show a loading state during request
- Show a fallback when API is unavailable
- Display the `notes` array from `/v1/assess` as methodology disclaimers

---
