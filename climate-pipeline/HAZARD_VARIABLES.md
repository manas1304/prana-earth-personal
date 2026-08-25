# Hazard Score Variables — Reference Tables

Source of truth: `climate-pipeline/prana_climate/indicators.py`
(methodology §4–§9).

Every hazard score is a weighted composite of **5 indicators**. Each
indicator is a function of one or more **CMIP6 variables** (from
ESGF) plus a few **static layers** (DEM, NDVI, urban footprint, etc.).

---

## 1. Master CMIP6 variable catalog

Variables the pipeline actually downloads from ESGF, as defined in
`prana_climate/config.py::VARIABLE_CATALOG`.

| Variable | Category | Frequency | Units | What it measures |
|---|---|---|---|---|
| `pr`     | precipitation | mon, day | kg m⁻² s⁻¹ | Precipitation flux |
| `tas`    | temperature   | mon      | K           | Near-surface air temperature (mean) |
| `tasmax` | temperature   | day      | K           | Daily maximum near-surface air temperature |
| `tasmin` | temperature   | day      | K           | Daily minimum near-surface air temperature |
| `hurs`   | humidity      | mon      | %           | Near-surface relative humidity |
| `huss`   | humidity      | mon      | kg kg⁻¹     | Near-surface specific humidity |
| `sfcWind`| wind          | mon      | m s⁻¹       | Near-surface wind speed |
| `mrro`   | runoff        | mon      | kg m⁻² s⁻¹ | Total runoff |
| `mrso`   | soil moisture | mon      | kg m⁻²     | Total soil moisture content |
| `evspsbl`| runoff        | mon      | kg m⁻² s⁻¹ | Evaporation (incl. transpiration) |

> 9 unique variables · 10 unique variable-frequency products ·
> 4 GCMs · 5 scenarios · 1 member = **200 ESGF dataset requests**.

---

## 2. Static / auxiliary layers

Not part of the CMIP6 download matrix — sourced separately.

| Layer | Source | Used by indicators |
|---|---|---|
| `slope` (DEM) | SRTM / ALOS | `slope_twi`, `uhi` (indirect) |
| `twi` (Topographic Wetness Index) | SRTM-derived | `slope_twi` |
| `ndvi` (current) | MODIS | `drainage`, `dust_emission`, `lfmc` |
| `ndvi_slope` (trend) | MODIS time-series | `ndvi_trend` |
| `impervious_frac` | GHSL / ESA WorldCover | `drainage` |
| `urban_density` | GHSL | `uhi` |

---

## 3. Flood — 5 indicators (§4)

| # | Indicator | Weight | What it measures | CMIP6 inputs | Other inputs |
|---|---|---:|---|---|---|
| 1 | `rx5day`           | **0.35** | Max 5-day accumulated rainfall per year | `pr` (day) | — |
| 2 | `pr99p_flood`      | **0.25** | 99th-percentile daily rainfall (JJA) | `pr` (day) | — |
| 3 | `slope_twi`        | **0.20** | Slope × (1 / TWI) — ponding risk | — | `slope`, `twi` |
| 4 | `mrso_antecedent`  | **0.12** | Pre-monsoon soil-moisture anomaly vs 5-yr baseline | `mrso` (mon) | — |
| 5 | `drainage`         | **0.08** | (1 − NDVI) × impervious fraction — urban drainage | — | `ndvi`, `impervious_frac` |

CMIP6 vars used: `pr` (day), `mrso` (mon).
Static vars: `slope`, `twi`, `ndvi`, `impervious_frac`.

---

## 4. Heat Stress — 5 indicators (§5)

| # | Indicator | Weight | What it measures | CMIP6 inputs | Other inputs |
|---|---|---:|---|---|---|
| 1 | `hwd`  | **0.30** | Heat-wave duration (annual sum of qualifying Tmax runs ≥ 4.5 °C above 1985–2014 baseline, ≥ 3 days) | `tasmax` (day) | — |
| 2 | `wbgt` | **0.30** | Wet-bulb temperature via Stull (2011) approximation | `tas` (mon), `hurs` (mon) | — |
| 3 | `txx`  | **0.20** | Annual maximum of daily max temperature (TXx) | `tasmax` (day) | — |
| 4 | `cdd`  | **0.12** | Cooling Degree Days, base 18 °C, summed per cell | `tas` (mon) | — |
| 5 | `uhi`  | **0.08** | Urban Heat Island — (Tmin urban − Tmin rural) for urban cells | `tasmin` (day) | `urban_density` |

CMIP6 vars used: `tasmax` (day), `tas` (mon), `tasmin` (day), `hurs` (mon).
Static vars: `urban_density`.

---

## 5. Water Stress — 5 indicators (§6)

| # | Indicator | Weight | What it measures | CMIP6 inputs | Other inputs |
|---|---|---:|---|---|---|
| 1 | `bws`         | **0.30** | Baseline Water Stress — withdrawals / available supply (0–5 → 0–100) | `mrro` (mon), `pr` (mon), `evspsbl` (mon) | — |
| 2 | `gwd`         | **0.25** | Groundwater depletion — drop in soil-moisture stock vs 10-yr baseline (only depletion counts) | `mrso` (mon) | — |
| 3 | `mrro_delta`  | **0.20** | Projected % change in total runoff vs 5-yr baseline | `mrro` (mon) | — |
| 4 | `evap_demand` | **0.15** | Total evapotranspiration demand (mm/yr) | `evspsbl` (mon) | — |
| 5 | `monsoon_cv`  | **0.10** | JJAS precipitation coefficient of variation — unreliable monsoon | `pr` (mon) | — |

CMIP6 vars used: `mrro` (mon), `pr` (mon), `evspsbl` (mon), `mrso` (mon).

---

## 6. Drought — 5 indicators (§7)

| # | Indicator | Weight | What it measures | CMIP6 inputs | Other inputs |
|---|---|---:|---|---|---|
| 1 | `spi12`        | **0.30** | SPI-12 — z-score of 12-month cumulative precipitation | `pr` (mon) | — |
| 2 | `spei`         | **0.25** | SPEI proxy — z-score of (P − 50·T) | `pr` (mon), `tas` (mon) | — |
| 3 | `mrso_anomaly` | **0.25** | Root-zone soil moisture deficit vs 20th-percentile baseline | `mrso` (mon) | — |
| 4 | `cdd_days`     | **0.12** | Max consecutive dry days per year (pr < 1 mm) | `pr` (day) | — |
| 5 | `pr_trend`     | **0.08** | Sen's slope of annual precipitation (mm/decade; negative = drying) | `pr` (mon) | — |

CMIP6 vars used: `pr` (mon, day), `tas` (mon), `mrso` (mon).

---

## 7. Storm (sandstorm / thunderstorm) — 5 indicators (§8)

| # | Indicator | Weight | What it measures | CMIP6 inputs | Other inputs |
|---|---|---:|---|---|---|
| 1 | `cape`           | **0.30** | CAPE proxy — max T × max RH in pre-monsoon months | `tas` (mon), `hurs` (mon) | — |
| 2 | `pr99p_storm`    | **0.20** | Extreme precip intensity (same calc as flood's pr99p) | `pr` (day) | — |
| 3 | `wind_p90_storm` | **0.20** | 90th-percentile daily mean 10 m wind | `sfcWind` (mon) | — |
| 4 | `dust_emission`  | **0.18** | (1 − NDVI) × wind_p90 × (1 − mrso_norm) — dust mobilisation | `sfcWind` (mon), `mrso` (mon) | `ndvi` |
| 5 | `ndvi_trend`     | **0.12** | Negative of NDVI greening/browning slope | — | `ndvi_slope` |

CMIP6 vars used: `tas` (mon), `hurs` (mon), `pr` (day), `sfcWind` (mon), `mrso` (mon).
Static vars: `ndvi`, `ndvi_slope`.

---

## 8. Wildfire — 5 indicators (§9)

| # | Indicator | Weight | What it measures | CMIP6 inputs | Other inputs |
|---|---|---:|---|---|---|
| 1 | `fwi`              | **0.30** | Canadian Fire Weather Index — D · T · H · V composite (fire-season months) | `tasmax` (day), `hurs` (mon), `sfcWind` (mon), `pr` (day) | — |
| 2 | `vpd`              | **0.25** | Vapour Pressure Deficit (kPa) | `tas` (mon), `hurs` (mon) | — |
| 3 | `ffdi`             | **0.20** | McArthur FFDI — D · T · H · V, with T approximated at 25 °C | `sfcWind` (mon), `mrso` (mon) | — |
| 4 | `lfmc`             | **0.15** | Live Fuel Moisture Content proxy = 1 − NDVI | — | `ndvi` |
| 5 | `wind_p90_wildfire`| **0.10** | Fire-season 90th-percentile wind speed | `sfcWind` (mon) | — |

CMIP6 vars used: `tasmax` (day), `hurs` (mon), `sfcWind` (mon), `pr` (day), `tas` (mon), `mrso` (mon).
Static vars: `ndvi`.

---

## 9. Variable → hazard cross-reference

Which CMIP6 variable feeds which hazards (counts include frequency-aware usages):

| Variable | Frequency | Flood | Heat Stress | Water Stress | Drought | Storm | Wildfire | Total uses |
|---|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| `pr`      | day | ✅ |  |  | ✅ | ✅ | ✅ | 4 |
| `pr`      | mon |  |  | ✅ | ✅ |  |  | 2 |
| `tas`     | mon |  | ✅ |  | ✅ | ✅ | ✅ | 4 |
| `tasmax`  | day |  | ✅ |  |  |  | ✅ | 2 |
| `tasmin`  | day |  | ✅ |  |  |  |  | 1 |
| `hurs`    | mon |  | ✅ |  |  | ✅ | ✅ | 3 |
| `sfcWind` | mon |  |  |  |  | ✅ | ✅ | 2 |
| `mrro`    | mon |  |  | ✅ |  |  |  | 1 |
| `mrso`    | mon | ✅ |  | ✅ | ✅ | ✅ | ✅ | 5 |
| `evspsbl` | mon |  |  | ✅ |  |  |  | 1 |
| `huss`    | mon |  |  |  |  |  |  | 0 |
| Static layers | — | ✅ | ✅ |  |  | ✅ | ✅ | 4 |

---

## 10. Indicator → variable matrix (per indicator, all variables needed)

| Indicator | Hazard | Variables needed (CMIP6 + static) | Frequency |
|---|---|---|---|
| `rx5day`           | flood        | `pr` | day |
| `pr99p_flood`      | flood        | `pr` | day |
| `slope_twi`        | flood        | `slope`, `twi` | static |
| `mrso_antecedent`  | flood        | `mrso` | mon |
| `drainage`         | flood        | `ndvi`, `impervious_frac` | static |
| `hwd`              | heat_stress  | `tasmax` | day |
| `wbgt`             | heat_stress  | `tas`, `hurs` | mon |
| `txx`              | heat_stress  | `tasmax` | day |
| `cdd`              | heat_stress  | `tas` | mon |
| `uhi`              | heat_stress  | `tasmin`, `urban_density` | day, static |
| `bws`              | water_stress | `mrro`, `pr`, `evspsbl` | mon |
| `gwd`              | water_stress | `mrso` | mon |
| `mrro_delta`       | water_stress | `mrro` | mon |
| `evap_demand`      | water_stress | `evspsbl` | mon |
| `monsoon_cv`       | water_stress | `pr` | mon |
| `spi12`            | drought      | `pr` | mon |
| `spei`             | drought      | `pr`, `tas` | mon |
| `mrso_anomaly`     | drought      | `mrso` | mon |
| `cdd_days`         | drought      | `pr` | day |
| `pr_trend`         | drought      | `pr` | mon |
| `cape`             | storm        | `tas`, `hurs` | mon |
| `pr99p_storm`      | storm        | `pr` | day |
| `wind_p90_storm`   | storm        | `sfcWind` | mon |
| `dust_emission`    | storm        | `sfcWind`, `mrso`, `ndvi` | mon, static |
| `ndvi_trend`       | storm        | `ndvi_slope` | static |
| `fwi`              | wildfire     | `tasmax`, `hurs`, `sfcWind`, `pr` | day, mon |
| `vpd`              | wildfire     | `tas`, `hurs` | mon |
| `ffdi`             | wildfire     | `sfcWind`, `mrso` | mon |
| `lfmc`             | wildfire     | `ndvi` | static |
| `wind_p90_wildfire`| wildfire     | `sfcWind` | mon |

---

## 11. Risk formula (for tooltips)

Each hazard score is a weighted sum of its 5 indicators (all
normalised to 0–100). A convex adjustment is applied to the
composite, then the final risk adds exposure and adaptive capacity:

```
H_raw  = Σ weight_i × indicator_i                        (per hazard)
H_adj  = 100 × (H_raw / 100) ^ 0.85                      (convex adj)
Final  = 0.60 × H_adj + 0.20 × FE + 0.10 × PE − 0.10 × AC
```

Where:
- **FE** = financial exposure (0–100)
- **PE** = population exposure (0–100)
- **AC** = adaptive capacity (0–100)

---

## 12. Asset-type multipliers

Per the API, an asset-type multiplier is applied to each hazard for
asset-specific sensitivities (e.g. data centers are more sensitive to
heat, farms to drought). Source: `prana_climate/exposure.py`.

| Asset type        | Primary amplified hazards (suggested) |
|---|---|
| `residential`     | flood, heat_stress |
| `commercial`      | flood, storm |
| `industrial`      | flood, water_stress |
| `data_center`     | heat_stress (cooling), storm (power) |
| `agricultural`    | drought, water_stress |
