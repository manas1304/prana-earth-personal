# Prana Earth — Climate Data Pipeline

Centralized ESGF → EC2 → S3 climate data vault that feeds the Prana Earth hazard-scoring engine. Implements the **Prana Earth – Climate Data Vault & ESGF Download Pipeline** spec.

## TL;DR

```
ESGF portal → wget .sh scripts (manual selection)
   → EC2 climate-pipeline box (ap-south-1)
       ├── downloads/<scenario>/<model>/<variable>/<frequency>/<member>/*.nc
       └── process_data.py → processed/<category>/<variable>/<h3_cell>.parquet
   → upload_to_s3.py
       → s3://prana-climate-vault-prod/
            ├── raw/cmip6/...
            ├── processed/...
            ├── derived/hazard_scores/...
            └── manifests/...
   → FastAPI: POST /v1/assess { lat, lon, scenario, year } → 6 hazard scores
```

## Configured for this deployment

| Setting | Value | Override |
|---|---|---|
| AWS region | `ap-south-1` | env `AWS_REGION` |
| S3 bucket | `prana-climate-vault-prod` | env `PRANA_S3_BUCKET` |
| H3 resolution | `6` (~36 km² / ~6 km edge) | env `PRANA_H3_RES` |
| GCM ensemble | `MRI-ESM2-0`, `EC-Earth3`, `GFDL-ESM4`, `MPI-ESM1-2-HR`, `IPSL-CM6A-LR` | [config.py](prana_climate/config.py) |
| Scenarios | `historical`, `ssp126`, `ssp245`, `ssp370`, `ssp585` | [config.py](prana_climate/config.py) |
| Processing window | `2000` – `2050` | [config.py](prana_climate/config.py) |
| Horizons served by API | `2030`, `2040`, `2050` | [config.py](prana_climate/config.py) |

## EC2 directory layout

```
climate-pipeline/
├── scripts/                              # ESGF wget .sh scripts (untouched, per spec §3)
├── downloads/
│   ├── historical/
│   ├── ssp126/
│   ├── ssp245/
│   ├── ssp370/
│   └── ssp585/
├── processed/<category>/<scenario>/<model>/<variable>/<h3_cell>.parquet
├── logs/
├── prana_climate/                        # supporting Python package
│   ├── config.py
│   ├── h3_index.py
│   ├── h3_grid.py
│   ├── units.py
│   ├── validators.py
│   ├── manifest.py
│   └── ...
├── process_data.py                       # spec §7 — NetCDF → H3 Parquet
├── upload_to_s3.py                       # spec §5 — push to S3
├── run_pipeline.sh                       # convenience wrapper
├── pyproject.toml
└── ec2/
    ├── iam-policy.json                   # least-privilege S3 access
    └── user-data.sh                      # EC2 bootstrap
```

## S3 layout

```
s3://prana-climate-vault-prod/
├── raw/cmip6/<scenario>/<model>/<variable>/<frequency>/<member>/<file>.nc
├── processed/<category>/<scenario>/<model>/<variable>/<h3_cell>.parquet
├── derived/hazard_scores/<scenario>/<horizon>/<h3_cell>.parquet
└── manifests/<scenario>/<model>/<variable>/<frequency>/manifest.json
```

`<h3_prefix>` = first 2 hex chars of the H3 cell id (range-scan friendly).

## Daily workflow

```bash
# 1. Manually grab the wget .sh from https://esgf-metagrid.cloud.dkrz.de/search
#    Drop it into scripts/ keeping its original name.

# 2. Run the whole chain
./run_pipeline.sh ssp245 tas MPI-ESM1-2-HR mon

# Or run each step individually
python3 process_data.py \
    --variable tas \
    --scenario ssp245 \
    --model MPI-ESM1-2-HR \
    --frequency mon

python3 upload_to_s3.py processed \
    --scenario ssp245 --variable tas --model MPI-ESM1-2-HR

python3 upload_to_s3.py manifest \
    --scenario ssp245 --variable tas \
    --model MPI-ESM1-2-HR --frequency mon
```

## What each step does (mapped to the spec)

| Step | File | Spec ref |
|---|---|---|
| Open NetCDFs (multi-chunk safe) | `process_data.py::_open` | §7.1 |
| Validate dims / coords / time / units / NaNs | `prana_climate/validators.py` | §7.2 |
| Slice 2000–2050 | `process_data.py::_slice_period` | §7.3 |
| Spatial clip (no-op for global) | `process_data.py::main` | §7.4 |
| Normalize units (K→°C, kg m⁻² s⁻¹→mm) | `prana_climate/units.py` | §7.5 |
| Map to H3 res-6 (mean over contributing native cells) | `prana_climate/h3_grid.py` | §7.6 |
| Write Parquet shards, push to S3 | `upload_to_s3.py` | §7.7 + §5 |

## Variables × frequency for the 6 hazards

| Hazard | Variables (frequency) |
|---|---|
| Flood | `pr` (day+mon), `mrro` (mon), `mrso` (mon), `tasmax` (day) |
| Heat Stress | `tasmax` (day), `tasmin` (day), `tas` (mon), `hurs` (mon), `huss` (mon), `sfcWind` (mon) |
| Water Stress | `pr` (mon), `mrro` (mon), `mrso` (mon), `tas` (mon) |
| Drought | `pr` (mon), `mrso` (mon), `tas` (mon), `hurs` (mon), `mrro` (mon) |
| Storm | `sfcWind` (mon), `pr` (day+mon), `mrso` (mon), `tas` (mon), `hurs` (mon) |
| Wildfire | `tasmax` (day), `tas` (mon), `hurs` (mon), `pr` (mon), `sfcWind` (mon), `mrso` (mon) |

Unique variables to download: 9. Unique var-frequency products: 14.
With 5 GCMs × 6 experiments × 1 member: **420 ESGF dataset requests**.

## EC2 bootstrap

Launch an Ubuntu 22.04 instance (recommended `r6i.2xlarge` for xarray) in `ap-south-1`, attach the IAM role from [ec2/iam-policy.json](ec2/iam-policy.json), and paste [ec2/user-data.sh](ec2/user-data.sh) as user-data. The script provisions the directory tree, Python venv, and required system libs.

## Next components (not in this drop)

- [x] `hazard_scores.py` — 6 hazard formulas from the methodology PDF.
- [x] `api.py` — FastAPI `POST /v1/assess`.
- [x] Bias-correction (QDM against IMD for India / CHIRPS for global).
- [x] Validation harness (Spearman ρ ≥ 0.65 against EM-DAT / CWC / NDMA / FSI / CGWB).

## Engine architecture

```
lat/lng ──► H3 cell (res 6) ──► read precomputed indicators from S3
                                  │
                                  ├──► 30 indicators (5 per hazard × 6 hazards)
                                  ├──► weighted composite → hazard_score
                                  ├──► convex adjustment H_adj = 100·(H/100)^0.85
                                  ├──► + exposure + adaptive capacity
                                  └──► final risk = 0.60·H_adj + 0.20·FE + 0.10·PE − 0.10·AC
                                                       │
                                                       ▼
                                              JSON response (6 hazards + composite)
```

## Live API

```bash
uvicorn api:app --host 0.0.0.0 --port 8000
```

Endpoints:

| Method | Path | Purpose |
|---|---|---|
| GET | `/v1/health` | Liveness + version + region/bucket config |
| GET | `/v1/h3/lookup?lat&lon&res&k` | H3 cell + neighbours for a point |
| POST | `/v1/assess` | Full 6-hazard assessment for a lat/lng |
| POST | `/v1/assess/cell` | Same, but caller passes an H3 cell id |
| GET | `/metrics` | Prometheus exposition |

Example:

```bash
curl -X POST http://localhost:8000/v1/assess \
  -H 'Content-Type: application/json' \
  -d '{"lat": 12.9716, "lon": 77.5946, "scenario": "ssp245", "horizon": 2050, "asset_type": "data_center"}'
```

## Demo data (no S3 needed)

To exercise the API before the real CMIP6 dataset lands, generate demo indicators + exposure overlays:

```bash
# Writes to s3://prana-climate-vault-prod/derived/... and s3://.../aux/...
python scripts/seed_demo_data.py

# Or write to disk for local testing
python scripts/seed_demo_data.py --local ./demo_data
```

The demo ships 8 cities (Bengaluru, Phoenix, London, Lagos, Reykjavik, Sydney, Mumbai, Tokyo) with hand-tuned indicator values that match the methodology narrative — Phoenix skews hot + dry, Reykjavik skews cold + windy, Mumbai skews flood + monsoon.

## Validation harness

```bash
python -m prana_climate.validation \
    --scores computed_scores.csv \
    --truth observed_events.csv \
    --target-rho 0.65 \
    --output report.json
```

CSV schema:

```
# computed_scores.csv
h3_cell,flood,heat_stress,water_stress,drought,storm,wildfire
cellA,72,68,55,49,33,28
…

# observed_events.csv
h3_cell,flood_observed,heat_stress_observed,water_stress_observed,drought_observed,storm_observed,wildfire_observed
cellA,3.2,2.8,1.1,1.5,2.0,0.5
…
```

Target: **Spearman ρ ≥ 0.65** per hazard (methodology §12.3).

## Running tests

```bash
pip install -e '.[dev]'
pytest -q
```

The test suite covers:
- H3 helpers (determinism, neighbour rings, area ratios)
- All 30 indicator functions (weights sum to 1.0 per hazard)
- Hazard aggregation + convex adjustment + final formula
- Full FastAPI round-trip via `TestClient`
- NetCDF validators + unit normalizers
- QDM bias correction (additive and relative)
