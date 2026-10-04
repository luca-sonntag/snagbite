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

Write-Host "Running terraform plan for environment: $normalized" -ForegroundColor Cyan
& terraform "-chdir=$tfDir" plan -var-file="envs/$normalized.tfvars"
