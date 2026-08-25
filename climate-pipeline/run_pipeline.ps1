# run_pipeline.ps1 — runs the full pipeline test with the AWS env vars
# that are already set in your PowerShell session.
#
# Usage:
#   PS> $env:AWS_REGION = "ap-south-1"
#   PS> .\run_pipeline.ps1

$ErrorActionPreference = "Stop"

$repo = Split-Path -Parent $PSScriptRoot
Set-Location $repo

$env:PYTHONPATH = "."
$env:PRANA_S3_BUCKET = "prana-earth-data"
$env:PRANA_AWS_REGION = "ap-south-1"
$env:PRANA_MAX_CELLS = "1000"

# Sanity check
if (-not $env:AWS_ACCESS_KEY_ID) {
    Write-Host "ERROR: AWS_ACCESS_KEY_ID not set. Run:" -ForegroundColor Red
    Write-Host '  $env:AWS_REGION="ap-south-1"'
    exit 1
}

# Verify credentials BEFORE running the full pipeline
Write-Host "Verifying S3 access..." -ForegroundColor Cyan
aws s3 ls s3://prana-earth-data/ 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Host "S3 access failed. Check credentials." -ForegroundColor Red
    exit 1
}
Write-Host "S3 OK" -ForegroundColor Green

# Clean any previous processed shards
if (Test-Path "processed") {
    Remove-Item -Recurse -Force "processed"
}

# Run the full pipeline test
Write-Host ""
Write-Host "Launching full pipeline test..." -ForegroundColor Cyan
python tests/test_full_real_pipeline.py
exit $LASTEXITCODE
