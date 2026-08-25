# deploy_ec2.ps1 — deploys the Prana Earth climate API to a single EC2
# instance behind an ALB. Reads from s3://prana-earth-data/.
#
# Prerequisites:
#   1. AWS CLI configured (aws configure)
#   2. You have at least one public subnet in a VPC in ap-south-1
#   3. You have an EC2 key pair in ap-south-1
#   4. The CloudFormation template lives at:
#        climate-pipeline/ec2/cloudformation.yaml
#
# Usage:
#   cd C:\Users\Aadhar\Downloads\prana-earth-main\prana-earth-main\climate-pipeline
#   powershell -ExecutionPolicy Bypass -File .\deploy_ec2.ps1
#       -VpcId vpc-xxxxxxxx -SubnetIds subnet-aaa,subnet-bbb
#       -KeyPairName prana-earth -S3Bucket prana-earth-data

param(
    [Parameter(Mandatory=$true)][string]$VpcId,
    [Parameter(Mandatory=$true)][string]$SubnetIds,
    [Parameter(Mandatory=$true)][string]$KeyPairName,
    [string]$S3Bucket = "prana-earth-data",
    [string]$StackName = "prana-climate-api",
    [string]$InstanceType = "t3.large",
    [string]$Region = "ap-south-1"
)

$ErrorActionPreference = "Stop"

Write-Host "============================================="
Write-Host "  Prana Earth Climate API deployment"
Write-Host "============================================="
Write-Host "  VPC:          $VpcId"
Write-Host "  Subnets:      $SubnetIds"
Write-Host "  Key pair:     $KeyPairName"
Write-Host "  S3 bucket:    s3://$S3Bucket/"
Write-Host "  Region:       $Region"
Write-Host ""

# 1. Verify the S3 bucket exists
Write-Host "Verifying S3 bucket..." -ForegroundColor Cyan
$bucket_check = aws s3api head-bucket --bucket $S3Bucket --region $Region 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "  ERROR: bucket s3://$S3Bucket/ not reachable" -ForegroundColor Red
    exit 1
}
Write-Host "  OK" -ForegroundColor Green

# 2. Upload the project to a CodeCommit or S3 bootstrap bucket
#    For simplicity, we use git clone on the EC2 box. Change the repo URL
#    in ec2/cloudformation.yaml (UserData) to point at your repo.
$repoUrl = $env:PRANA_REPO_URL
if (-not $repoUrl) {
    $repoUrl = "https://github.com/prana-earth/prana-earth.git"
    Write-Host "  Using default repo URL: $repoUrl" -ForegroundColor Yellow
    Write-Host "  Set `$env:PRANA_REPO_URL before running to use a different repo." -ForegroundColor Yellow
}

# 3. Pack the parameters
$params = @(
    "ParameterKey=VpcId,ParameterValue=$VpcId"
    "ParameterKey=SubnetIds,ParameterValue=`"$SubnetIds`""
    "ParameterKey=KeyPairName,ParameterValue=$KeyPairName"
    "ParameterKey=S3Bucket,ParameterValue=$S3Bucket"
    "ParameterKey=InstanceType,ParameterValue=$InstanceType"
)

# 4. Deploy the CloudFormation stack
Write-Host ""
Write-Host "Creating CloudFormation stack..." -ForegroundColor Cyan
aws cloudformation create-stack `
    --stack-name $StackName `
    --template-body file://ec2/cloudformation.yaml `
    --parameters $params `
    --capabilities CAPABILITY_IAM `
    --region $Region

if ($LASTEXITCODE -ne 0) {
    Write-Host "  Stack creation failed" -ForegroundColor Red
    exit 1
}

Write-Host "  Stack: $StackName" -ForegroundColor Green
Write-Host "  Waiting for stack to complete (this can take 5-10 minutes)..." -ForegroundColor Yellow

aws cloudformation wait stack-create-complete `
    --stack-name $StackName `
    --region $Region

if ($LASTEXITCODE -ne 0) {
    Write-Host "  Stack creation did not complete successfully" -ForegroundColor Red
    aws cloudformation describe-stack-events --stack-name $StackName --region $Region `
        | Select-Object -ExpandProperty StackEvents `
        | Where-Object { $_.ResourceStatus -like "*FAILED*" } `
        | Format-Table -AutoSize
    exit 1
}

# 5. Get the API URL
$apiUrl = aws cloudformation describe-stacks `
    --stack-name $StackName `
    --query "Stacks[0].Outputs[?OutputKey=='ApiUrl'].OutputValue" `
    --output text `
    --region $Region

$sshCmd = aws cloudformation describe-stacks `
    --stack-name $StackName `
    --query "Stacks[0].Outputs[?OutputKey=='SshCommand'].OutputValue" `
    --output text `
    --region $Region

Write-Host ""
Write-Host "============================================="
Write-Host "  Deployment complete"
Write-Host "============================================="
Write-Host "  API URL:  $apiUrl"
Write-Host "  SSH:      $sshCmd"
Write-Host ""

# 6. Sanity check
Write-Host "Sanity check..." -ForegroundColor Cyan
Start-Sleep -Seconds 30   # give uvicorn + systemd time to come up
try {
    $health = Invoke-RestMethod -Uri $apiUrl -TimeoutSec 10
    Write-Host "  Health check: $($health.status)" -ForegroundColor Green
    Write-Host "  Region: $($health.region)"
    Write-Host "  H3 resolution: $($health.h3_resolution)"
    Write-Host "  Scenarios: $($health.scenarios -join ', ')"
    Write-Host "  Horizons: $($health.horizons -join ', ')"

    # Quick smoke test
    $body = @{
        lat = 12.9716
        lon = 77.5946
        scenario = "ssp245"
        horizon = 2050
        asset_type = "data_center"
    } | ConvertTo-Json
    $assess = Invoke-RestMethod -Uri ($apiUrl -replace "/v1/health","/v1/assess") `
        -Method POST `
        -Body $body `
        -ContentType "application/json" `
        -TimeoutSec 10
    Write-Host ""
    Write-Host "  Mumbai / Bengaluru test:"
    Write-Host "    Composite: $($assess.composite_risk)"
    Write-Host "    Heat:      $($assess.hazard_scores.heat_stress)"
    Write-Host "    Flood:     $($assess.hazard_scores.flood)"
    Write-Host "    Wildfire:  $($assess.hazard_scores.wildfire)"
} catch {
    Write-Host "  Health check failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "  The instance may still be booting. Try again in 1 minute:" -ForegroundColor Yellow
    Write-Host "    $apiUrl" -ForegroundColor Cyan
}
