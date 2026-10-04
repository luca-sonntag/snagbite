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

Write-Host "Running terraform apply for environment: $normalized" -ForegroundColor Cyan
$cmdArgs = @("-chdir=$tfDir", "apply", "-var-file=envs/$normalized.tfvars")
if ($AutoApprove) { $cmdArgs += "-auto-approve" }

& terraform @cmdArgs
