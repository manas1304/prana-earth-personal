# Dashboard & Reports — Sample Data

Sample data (in tabular form) for the **Organization Dashboard** and
**Reports** pages. Use this as a reference when designing the tables.

Source of truth for the schema:

- Climate-pipeline API — `POST /v1/dashboard`, `POST /v1/assess`,
  `POST /v1/summary` (see `climate-pipeline/API_DOC_FOR_AI_DEV.md`).
- Prisma models — `Assessment`, `Asset`, `ClimateRiskScore`, `Report`
  (in `prana-web/src/generated/prisma/models/`).

---

## 1. Dashboard page

Route: `/sites/predict/organization-profile/dashboard`

### 1.1 Top KPI cards (5 tiles in a row)

| Tile | Value | Subtext | Visual |
|---|---|---|---|
| Org. Overall Risk Score | `72 / 100` | "High Risk" | Circular gauge, orange ring |
| Total Assets | `84` | "Across 12 locations" | Building icon (blue) |
| Total Assessments Done | `81` | "This includes all assets" | Clipboard icon (green) |
| Top 3 Assets Under High Risk | `18` | "21% of total assets" | Alert triangle (red) |
| Last 5 Asset Assessments | `5` | "Most recent assessments" | Calendar icon (purple) |

---

### 1.2 Table — Top 3 Assets Under High Risk

Section heading: **"Top 3 Assets Under High Risk"**
Shown side-by-side with an "Asset Location & Risk Map" placeholder.

| # | Asset | Asset Type | Location | Overall Risk | Main Hazard |
|---|---|---|---|---|---|
| 1 | GreenTech DC-01 | Data Center | Hyderabad | **82** (red pill) | Flood |
| 2 | Plant-03 | Manufacturing Plant | Pune | **78** (red pill) | Heat Stress |
| 3 | Mumbai DC-East | Data Center | Mumbai | **76** (red pill) | Flood |

Column meanings:
- **#** — rank within the table (1, 2, 3 …).
- **Asset** — bold asset name + small grey asset-type label below.
- **Asset Type** — friendly label: "Data Center", "Manufacturing Plant", etc.
- **Location** — city, optionally "City, State".
- **Overall Risk** — composite risk on a 0–100 scale, coloured pill:
  - `low`      → green
  - `moderate` → amber
  - `high`     → orange
  - `extreme`  → red
- **Main Hazard** — the single hazard with the highest score (one of
  `flood`, `heat_stress`, `water_stress`, `drought`, `storm`, `wildfire`).

---

### 1.3 Table — Last 5 Asset Assessments

Section heading: **"Last 5 Asset Assessments"**

| Asset | Asset Type | Location | Date | Scenario | Horizon | Overall Risk | Assessment ID |
|---|---|---|---|---|---|---|---|
| GreenTech DC-01 | Data Center | Hyderabad | 24 Jun 2026, 10:15 AM | SSP3-7.0 | 2050 | 🟠 High (82) | `PE-ORG-2026-06-24-2050-SSP3-7.0` |
| Plant-03 | Manufacturing Plant | Pune | 24 Jun 2026, 08:42 AM | SSP2-4.5 | 2040 | 🟠 High (78) | `PE-ORG-2026-06-24-2040-SSP2-4.5` |
| Chennai Logistics Hub | Commercial | Chennai | 23 Jun 2026, 04:05 PM | SSP2-4.5 | 2050 | 🟠 High (71) | `PE-ORG-2026-06-23-2050-SSP2-4.5` |
| Kolkata Warehouse | Industrial | Kolkata | 23 May 2024, 11:12 AM | SSP2-4.5 | 2050 | 🟠 High (68) | `PE-ORG-2024-05-23-2050-SSP2-4.5` |
| Delhi Office Campus | Commercial | Delhi | 22 Jun 2026, 09:30 AM | SSP1-2.6 | 2030 | 🟡 Moderate (54) | `PE-ORG-2026-06-22-2030-SSP1-2.6` |

Column meanings:
- **Asset** — bold asset name + small grey asset-type label below.
- **Location** — city only.
- **Date** — format `dd MMM yyyy, hh:mm AM/PM` (e.g. `24 Jun 2026, 10:15 AM`).
- **Scenario** — friendly label: `Historical`, `SSP1-2.6`, `SSP2-4.5`,
  `SSP3-7.0`, `SSP5-8.5`.
- **Horizon** — one of `2030`, `2040`, `2050`.
- **Overall Risk** — coloured status dot + label + score in parens:
  - 🟢 Low (`< 25`)
  - 🟡 Moderate (`< 50`)
  - 🟠 High (`< 75`)
  - 🔴 Extreme (`≥ 75`)
- **Assessment ID** — unique id, e.g.
  `PE-ORG-{yyyy-mm-dd}-{horizon}-{scenario}`.

A footer row beneath the table shows:
- "Assessment Date: 24 Jun 2026"
- "Last Updated: 2 hours ago"
- "Assessment ID: PE-ORG-2026-06-24-2040-SSP3-7.0"

---

## 2. Reports page

Route: `/sites/predict/organization-profile/reports`

### 2.1 Top KPI cards (5 tiles in a row)

| Tile | Value | Icon colour |
|---|---|---|
| Total Reports | `18` | Blue |
| Completed | `16` | Green |
| In Progress | `1` | Orange |
| Failed | `1` | Red |
| Total Downloads | `32` | Purple |

Statuses map to the Prisma `ReportStatus` enum:
- `READY` → "Completed"
- `GENERATING` / `QUEUED` → "In Progress"
- `FAILED` → "Failed"
- `ARCHIVED` → "Archived"

---

### 2.2 Table — All Reports

Section heading: **"All Reports"**
Shown side-by-side with the "Report Generation Trend" chart.

| Report Name | Type | Asset Name | Scenario | Horizon | Version | Generated On | Status | Downloads | Actions |
|---|---|---|---|---|---|---|---|---|---|
| Mumbai Data Center | CLIMATE_RISK | Mumbai Data Center | SSP2-4.5 | 2050 | v2 | 31 May 2024, 10:30 AM | ✅ Completed | 4 | ⬇ |
| Pune Manufacturing Unit | CLIMATE_RISK | Pune Manufacturing Unit | SSP2-4.5 | 2040 | v1 | 29 May 2024, 04:15 PM | ✅ Completed | 3 | ⬇ |
| Hyderabad Warehouse | CLIMATE_RISK | Hyderabad Warehouse | SSP3-7.0 | 2050 | v1 | 28 May 2024, 11:20 AM | ✅ Completed | 5 | ⬇ |
| Delhi Office Campus | EXECUTIVE | Delhi Office Campus | SSP2-4.5 | 2030 | v3 | 26 May 2024, 09:45 AM | ✅ Completed | 2 | ⬇ |
| Bengaluru Facility | CLIMATE_RISK | Bengaluru Facility | SSP2-4.5 | 2040 | v1 | 24 May 2024, 02:30 PM | ✅ Completed | 1 | ⬇ |
| Chennai Logistics Hub | EXECUTIVE | Chennai Logistics Hub | SSP2-4.5 | 2050 | v1 | 22 May 2024, 01:10 PM | 🕒 In Progress | 0 | — |
| Kolkata Warehouse | CLIMATE_RISK | Kolkata Warehouse | SSP2-4.5 | 2050 | v1 | 20 May 2024, 10:05 AM | ⚠ Failed | 0 | — |

Column meanings:
- **Report Name** — file-icon + bold name + small grey type label below
  ("Risk Assessment Report", "Climate Risk Summary", "ESG Disclosure", "Dashboard Snapshot").
- **Type** — `CLIMATE_RISK` / `EXECUTIVE` / `ESG` / `DASHBOARD`.
- **Asset Name** — asset the report is for.
- **Scenario** — friendly emissions label.
- **Horizon** — target year (`2030`, `2040`, `2050`).
- **Version** — `v{n}` (Prisma `reportVersion`).
- **Generated On** — `dd MMM yyyy` (top) + `hh:mm AM/PM` (subtext).
- **Status** — coloured icon + label:
  - ✅ green "Completed" (`READY`)
  - 🕒 orange "In Progress" (`GENERATING`)
  - 🕒 grey "Queued" (`QUEUED`)
  - ⚠ red "Failed" (`FAILED`)
  - 📦 grey "Archived" (`ARCHIVED`)
- **Downloads** — count of times the report has been downloaded.
- **Actions** — download icon (only enabled for `READY` reports with a file URL).

Pagination row at the bottom:
- Page buttons `1 2 3 … 5` (active = blue).
- Counter: `Showing 1 to 7 of 18 reports`.

---

### 2.3 Table — Report Generation Trend

Section heading: **"Report Generation Trend"**

Top KPI strip (3 tiles):

| Tile | Sample value |
|---|---|
| Generated | `47` (across 6 periods) |
| Success Rate | `95%` (45 / 47) |
| Latest Period Δ | `+25.0%` (vs prior period) |

Trend table:

| Period | Generated | Completed | Failed | Success Rate | Δ |
|---|---|---|---|---|---|
| Dec 23 | 5  | 5 | 0 | 100% | — |
| Jan 24 | 7  | 7 | 0 | 100% | +40.0% |
| Feb 24 | 8  | 7 | 1 | 88%  | +14.3% |
| Mar 24 | 9  | 9 | 0 | 100% | +12.5% |
| Apr 24 | 8  | 8 | 0 | 100% | −11.1% |
| May 24 | 10 | 9 | 1 | 90%  | +25.0% |

Column meanings:
- **Period** — month label (`Dec 23`, `Jan 24`) or quarter (`Q1`, `Q2`) or year.
- **Generated** — total reports generated in the period.
- **Completed** — those whose final status became `READY`.
- **Failed** — those whose final status became `FAILED`.
- **Success Rate** — coloured pill: green ≥90%, amber 70–89%, red <70%.
- **Δ** — period-over-period change in Generated, with arrow icon:
  - ↑ green `+N.N%`
  - ↓ red `−N.N%`
  - → grey `0.0%` (or `—` for first row).

---

## 3. Domain glossary

Use this when designing labels, colour codes, and empty states.

| Concept | Possible values |
|---|---|
| Scenarios | `Historical`, `SSP1-2.6`, `SSP2-4.5`, `SSP3-7.0`, `SSP5-8.5` |
| Horizons | `2030`, `2040`, `2050` |
| Hazards | `Flood`, `Heat Stress`, `Water Stress`, `Drought`, `Storm`, `Wildfire` |
| Asset types (5) | `Residential`, `Commercial`, `Industrial`, `Data Center`, `Agricultural` |
| Risk class (4) | `Low` (<25), `Moderate` (<50), `High` (<75), `Extreme` (≥75) |
| Assessment status | `Queued`, `Pending`, `Validating`, `Data Fetching`, `Processing`, `Completed`, `Failed`, `Cancelled` |
| Report status | `Queued`, `Generating`, `Ready`, `Failed`, `Archived` |
| Report type | `Climate Risk`, `ESG`, `Executive`, `Dashboard` |

Final-risk formula (methodology §10.4) for the tooltip / explainer copy:

```
Final risk = 0.60 × H_adj + 0.20 × FE + 0.10 × PE − 0.10 × AC
H_adj     = 100 × (H_raw / 100) ^ 0.85
FE        = financial exposure (0–100)
PE        = population exposure (0–100)
AC        = adaptive capacity (0–100)
```
