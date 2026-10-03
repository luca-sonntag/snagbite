<#
.SYNOPSIS
    Synchronizes environment variables from local .env files to Railway via Railway CLI.
    Deletes obsolete variables from Railway that are not defined locally (excluding RAILWAY_*).
#>

[CmdletBinding(DefaultParameterSetName = 'ByName')]
param(
    [Parameter(Position = 0, ParameterSetName = 'ByName')]
    [ValidateSet('dev', 'prod', 'development', 'production')]
    [string]$Environment = 'prod',

    [Parameter(ParameterSetName = 'ProdSwitch')]
    [switch]$Prod,

    [Parameter(ParameterSetName = 'DevSwitch')]
    [switch]$Dev,

    [string]$RailwayEnv,
    [string]$Service,
    [switch]$SkipDeploys,
    [switch]$DryRun
)

$ErrorActionPreference = 'Stop'

function Get-TargetEnvironment {
    if ($Prod) { return 'prod' }
    if ($Dev) { return 'dev' }
    if ($Environment -in @('dev', 'development')) { return 'dev' }
    return 'prod'
}

function Resolve-RailwayEnvironment {
    param([string]$Target, [string]$ExplicitEnv)
    if ($ExplicitEnv) { return $ExplicitEnv }
    try {
        $envJson = & railway environment list --json 2>$null
        if ($LASTEXITCODE -eq 0 -and $envJson) {
            $envNames = @(($envJson | ConvertFrom-Json).environments | ForEach-Object { $_.name })
            $pattern = if ($Target -eq 'prod') { '^(production|prod)$' } else { '^(development|dev)$' }
            $match = $envNames | Where-Object { $_ -match $pattern } | Select-Object -First 1
            if ($match) { return $match }
        }
    } catch {}
    if ($Target -eq 'prod') { return 'production' }
    return 'development'
}

function Import-EnvFile {
    param([string]$FilePath)
    $vars = [ordered]@{}
    if (-not (Test-Path $FilePath)) { return $vars }
    foreach ($line in (Get-Content $FilePath)) {
        $trimmed = $line.Trim()
        if ([string]::IsNullOrWhiteSpace($trimmed) -or $trimmed.StartsWith('#')) { continue }
        if ($trimmed -match '^\s*export\s+(.*)$') { $trimmed = $matches[1] }
        if ($trimmed -match '^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$') {
            $key = $matches[1].Trim()
            $val = $matches[2].Trim()
            if ($val -notmatch '^["''].*["'']$' -and $val -match '^(.*?)\s+#.*$') { $val = $matches[1].Trim() }
            if (($val.StartsWith('"') -and $val.EndsWith('"')) -or ($val.StartsWith("'") -and $val.EndsWith("'"))) {
                if ($val.Length -ge 2) { $val = $val.Substring(1, $val.Length - 2) }
            }
            $vars[$key] = $val
        }
    }
    return $vars
}

function Format-MaskedValue {
    param([string]$Key, [string]$Value)
    if ([string]::IsNullOrEmpty($Value)) { return '<empty>' }
    if ($Key -match '(?i)(KEY|SECRET|TOKEN|PASSWORD|AUTH|PRIVATE|CREDENTIAL)' -or $Value.Length -gt 60) {
        if ($Value.Length -le 8) { return '***' }
        return "$($Value.Substring(0, [Math]::Min(4, $Value.Length)))...*** (length: $($Value.Length))"
    }
    return $Value
}

# --- Main Flow ---
$target = Get-TargetEnvironment
$targetService = if ($Service) { $Service } else { 'backend' }
$targetRailwayEnv = Resolve-RailwayEnvironment -Target $target -ExplicitEnv $RailwayEnv

$backendDir = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\backend'))
$baseEnvPath = Join-Path $backendDir '.env'
$prodEnvPath = Join-Path $backendDir '.env.production'
$devEnvPath  = Join-Path $backendDir '.env.development'

if (-not (Test-Path $baseEnvPath)) { throw "Base .env file not found at $baseEnvPath" }

Write-Host ""
Write-Host "+--------------------------------------------------------+" -ForegroundColor Cyan
Write-Host "|  Sync Environment Variables to Railway                 |" -ForegroundColor Cyan
Write-Host "|  Target: $($target.ToUpper().PadRight(20)) Service: $($targetService.PadRight(18))|" -ForegroundColor Cyan
Write-Host "|  Railway Environment: $($targetRailwayEnv.PadRight(33))|" -ForegroundColor Cyan
Write-Host "+--------------------------------------------------------+" -ForegroundColor Cyan
Write-Host ""

$envMap = [ordered]@{}
$sourceMap = @{}

# 1. Base .env
$baseVars = Import-EnvFile $baseEnvPath
foreach ($k in $baseVars.Keys) {
    $envMap[$k] = $baseVars[$k]
    $sourceMap[$k] = '.env'
}

# 2. Overrides
if ($target -eq 'prod') {
    if (Test-Path $prodEnvPath) {
        $prodVars = Import-EnvFile $prodEnvPath
        foreach ($k in $prodVars.Keys) {
            $envMap[$k] = $prodVars[$k]
            $sourceMap[$k] = '.env.production'
        }
        Write-Host "Merged production overrides from backend/.env.production" -ForegroundColor Green
    }
    $envMap['NODE_ENV'] = 'production'
} else {
    if (Test-Path $devEnvPath) {
        $devVars = Import-EnvFile $devEnvPath
        foreach ($k in $devVars.Keys) {
            $envMap[$k] = $devVars[$k]
            $sourceMap[$k] = '.env.development'
        }
    }
    if (-not $envMap.Contains('NODE_ENV')) { $envMap['NODE_ENV'] = 'development' }
}

# 3. Inlining local JSON credential files
if ($envMap.Contains('FCM_SERVICE_ACCOUNT_JSON')) {
    $fcmVal = $envMap['FCM_SERVICE_ACCOUNT_JSON']
    if ($fcmVal -and -not $fcmVal.StartsWith('{') -and $fcmVal.EndsWith('.json')) {
        $fcmFilePath = Join-Path $backendDir $fcmVal
        if (Test-Path $fcmFilePath) {
            $envMap['FCM_SERVICE_ACCOUNT_JSON'] = ((Get-Content $fcmFilePath -Raw | ConvertFrom-Json | ConvertTo-Json -Compress))
            Write-Host "Inlined FCM_SERVICE_ACCOUNT_JSON from local file ($fcmVal)" -ForegroundColor DarkCyan
        }
    }
}

# 4. Check existing Railway variables to detect obsolete variables to prune
$varsToDelete = @()
try {
    $existingJson = & railway variable list -s $targetService -e $targetRailwayEnv --json 2>$null
    if ($LASTEXITCODE -eq 0 -and $existingJson) {
        $parsedExisting = $existingJson | ConvertFrom-Json
        foreach ($prop in $parsedExisting.PSObject.Properties) {
            $k = $prop.Name
            if ($k -notmatch '^RAILWAY_' -and -not $envMap.Contains($k)) {
                $varsToDelete += $k
            }
        }
    }
} catch {}

# 5. Display planned changes
Write-Host ""
Write-Host "Variables to set ($($envMap.Count) total):" -ForegroundColor White
foreach ($k in $envMap.Keys) {
    $src = $sourceMap[$k]
    if (-not $src) { $src = 'default' }
    $srcColor = if ($src -eq '.env.production') { 'Green' } else { 'DarkGray' }
    Write-Host "  $($k.PadRight(35)) = $(Format-MaskedValue -Key $k -Value $envMap[$k]) " -NoNewline
    Write-Host "[$src]" -ForegroundColor $srcColor
}

Write-Host ""
if ($varsToDelete.Count -gt 0) {
    Write-Host "Variables to delete from Railway ($($varsToDelete.Count) obsolete):" -ForegroundColor Red
    foreach ($k in $varsToDelete) {
        Write-Host "  - $k (not in .env)" -ForegroundColor Red
    }
} else {
    Write-Host "No obsolete variables to remove on Railway." -ForegroundColor DarkGray
}
Write-Host ""

if ($DryRun) {
    Write-Host "[DRY RUN] No changes were made to Railway." -ForegroundColor Yellow
    exit 0
}

# 6. Verify Railway CLI
if (-not (Get-Command railway -ErrorAction SilentlyContinue)) {
    throw "Railway CLI is not installed. Install with 'npm i -g @railway/cli'"
}

$statusOutput = & railway status 2>&1
if ($LASTEXITCODE -ne 0) {
    throw "Railway project is not linked. Run 'railway link' first."
}

# 7. Delete obsolete variables
if ($varsToDelete.Count -gt 0) {
    Write-Host "Pruning $($varsToDelete.Count) obsolete variables from Railway..." -ForegroundColor Yellow
    foreach ($k in $varsToDelete) {
        Write-Host "  Deleting $k..." -ForegroundColor DarkYellow
        & railway variable delete $k -s $targetService -e $targetRailwayEnv --json | Out-Null
        if ($LASTEXITCODE -ne 0) {
            Write-Host "  Warning: Failed to delete $k from Railway (exit code $LASTEXITCODE)" -ForegroundColor Yellow
        }
    }
}

# 8. Separate and set variables
$complexVars = [ordered]@{}
$standardVars = [ordered]@{}
foreach ($k in $envMap.Keys) {
    $val = $envMap[$k]
    if ($val -match '[\r\n"{}]') { $complexVars[$k] = $val } else { $standardVars[$k] = $val }
}

Write-Host "Setting $($envMap.Count) variables on Railway ($targetService / $targetRailwayEnv)..." -ForegroundColor Cyan

foreach ($k in $complexVars.Keys) {
    Write-Host "Setting $k via stdin..." -ForegroundColor DarkCyan
    $complexVars[$k] | & railway variable set $k --stdin -s $targetService -e $targetRailwayEnv --skip-deploys
    if ($LASTEXITCODE -ne 0) { throw "Failed to set $k via stdin on Railway" }
}

if ($standardVars.Count -gt 0) {
    $cliArgs = @("variable", "set", "-s", $targetService, "-e", $targetRailwayEnv)
    if ($SkipDeploys) { $cliArgs += "--skip-deploys" }
    foreach ($k in $standardVars.Keys) { $cliArgs += "$k=$($standardVars[$k])" }
    & railway @cliArgs
    if ($LASTEXITCODE -ne 0) { throw "Failed to set standard variables on Railway (exit code $LASTEXITCODE)" }
}

Write-Host ""
$pruneMsg = if ($varsToDelete.Count -gt 0) { ", pruned $($varsToDelete.Count) obsolete" } else { "" }
Write-Host "Successfully synchronized $($envMap.Count) variables$pruneMsg on Railway ($targetService / $targetRailwayEnv)!" -ForegroundColor Green
