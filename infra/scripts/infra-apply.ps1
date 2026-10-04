<#
.SYNOPSIS
    Runs terraform apply for Railway infrastructure (prod or dev).
#>
param(
    [ValidateSet('prod', 'dev', 'production', 'development')]
    [string]$Env = 'prod',
    [switch]$AutoApprove
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

Write-Host "Running terraform apply for environment: $normalized" -ForegroundColor Cyan
Push-Location $tfDir
try {
    $varFile = Join-Path $tfDir "envs\$normalized.tfvars"
    $cmdArgs = @("apply", "-var-file=$varFile")
    if ($AutoApprove) { $cmdArgs += "-auto-approve" }
    & terraform @cmdArgs
} finally {
    Pop-Location
}
