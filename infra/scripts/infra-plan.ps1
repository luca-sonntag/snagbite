<#
.SYNOPSIS
    Runs terraform plan for Railway infrastructure (prod or dev).
#>
param(
    [ValidateSet('prod', 'dev', 'production', 'development')]
    [string]$Env = 'prod'
)

$ErrorActionPreference = 'Stop'
$normalized = if ($Env -in @('prod', 'production')) { 'production' } else { 'development' }
$tfDir = Join-Path $PSScriptRoot '..\terraform'
if (-not $env:RAILWAY_TOKEN) {
    $cfgPath = "$env:USERPROFILE\.railway\config.json"
    if (Test-Path $cfgPath) {
        $cfg = Get-Content $cfgPath | ConvertFrom-Json
        if ($cfg.user.accessToken) {
            $env:RAILWAY_TOKEN = $cfg.user.accessToken
        }
    }
}

Write-Host "Running terraform plan for environment: $normalized" -ForegroundColor Cyan
Push-Location $tfDir
try {
    $varFile = Join-Path $tfDir "envs\$normalized.tfvars"
    & terraform plan -var-file="$varFile"
} finally {
    Pop-Location
}
