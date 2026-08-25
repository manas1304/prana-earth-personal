#!/usr/bin/env bash
# run_pipeline.sh — convenience wrapper: download → process → upload.
#
# Usage:
#   ./run_pipeline.sh <scenario> <variable> <model> <frequency>
#
# Example:
#   ./run_pipeline.sh ssp245 tas MPI-ESM1-2-HR mon
#
# Order:
#   1. Run the matching ESGF wget script dropped in scripts/
#   2. process_data.py
#   3. upload_to_s3.py processed
#   4. upload_to_s3.py manifest

set -euo pipefail

SCENARIO="${1:-}"
VARIABLE="${2:-}"
MODEL="${3:-}"
FREQ="${4:-mon}"

if [[ -z "${SCENARIO}" || -z "${VARIABLE}" || -z "${MODEL}" ]]; then
  echo "Usage: $0 <scenario> <variable> <model> <frequency>" >&2
  exit 1
fi

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
SCRIPTS="${SCRIPT_DIR}/scripts"
DOWNLOADS="${SCRIPT_DIR}/downloads/${SCENARIO}"
LOGS="${SCRIPT_DIR}/logs"
mkdir -p "${LOGS}"

ts() { date -u +"%Y%m%dT%H%M%SZ"; }

# 1. Find the right wget .sh script (kept untouched per spec §3)
sh_script="$(ls "${SCRIPTS}"/wget-${SCENARIO}-${MODEL}-${VARIABLE}-${FREQ}-*.sh 2>/dev/null | head -1 || true)"
if [[ -n "${sh_script}" ]]; then
  echo "[$(ts)] Running ESGF script: ${sh_script}"
  # .sh scripts assume they're run from a directory containing them
  pushd "$(dirname "${sh_script}")" >/dev/null
  bash "$(basename "${sh_script}")" 2>&1 | tee "${LOGS}/download-$(ts).log"
  popd >/dev/null
else
  echo "[$(ts)] WARN: no wget script matched ${SCENARIO}-${MODEL}-${VARIABLE}-${FREQ} in ${SCRIPTS}; assuming files already in ${DOWNLOADS}/" >&2
fi

# 2. Process
echo "[$(ts)] Processing…"
python3 "${SCRIPT_DIR}/process_data.py" \
  --variable "${VARIABLE}" \
  --scenario "${SCENARIO}" \
  --model "${MODEL}" \
  --frequency "${FREQ}" \
  2>&1 | tee "${LOGS}/process-$(ts).log"

# 3. Upload processed
echo "[$(ts)] Uploading processed shards to S3…"
python3 "${SCRIPT_DIR}/upload_to_s3.py" processed \
  --scenario "${SCENARIO}" \
  --variable "${VARIABLE}" \
  --model "${MODEL}" \
  2>&1 | tee "${LOGS}/upload-$(ts).log"

# 4. Manifest
echo "[$(ts)] Writing manifest…"
python3 "${SCRIPT_DIR}/upload_to_s3.py" manifest \
  --scenario "${SCENARIO}" \
  --variable "${VARIABLE}" \
  --model "${MODEL}" \
  --frequency "${FREQ}" \
  2>&1 | tee -a "${LOGS}/upload-$(ts).log"

echo "[$(ts)] Done."
