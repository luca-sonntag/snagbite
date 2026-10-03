<#
.SYNOPSIS
    Synchronizes environment variables from local .env files to Railway via Railway CLI.

.DESCRIPTION
    Parses backend environment files and sets them on Railway using `railway variable set`.
    - dev: Uses backend/.env (and backend/.env.development if present)
    - prod: Uses backend/.env as base, merged with backend/.env.production overrides

.PARAMETER Environment
    Target environment: 'prod' or 'dev'. Defaults to 'prod'.

.PARAMETER Prod
    Switch for targeting production.

.PARAMETER Dev
    Switch for targeting development.

.PARAMETER RailwayEnv
    Optional Railway environment name override (defaults to 'production' for prod, 'dev' for dev).

.PARAMETER Service
    Optional Railway service name (e.g. 'backend').

.PARAMETER SkipDeploys
    Skip triggering deployments when variables are set.

.PARAMETER DryRun
    Preview variables and overrides without modifying Railway.

.EXAMPLE
    .\scripts\sync-railway-env.ps1 -Prod -DryRun
    .\scripts\sync-railway-env.ps1 -Prod
    .\scripts\sync-railway-env.ps1 -Dev
    .\scripts\sync-railway-env.ps1 -Environment prod -Service backend
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

function Import-EnvFile {
    param([string]$FilePath)
    $vars = [ordered]@{}
    if (-not (Test-Path $FilePath)) {
        return $vars
    }

    $lines = Get-Content $FilePath
    foreach ($line in $lines) {
        $trimmed = $line.Trim()
        if ([string]::IsNullOrWhiteSpace($trimmed) -or $trimmed.StartsWith('#')) {
            continue
        }
        if ($trimmed -match '^\s*export\s+(.*)$') {
            $trimmed = $matches[1]
        }
        if ($trimmed -match '^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$') {
            $key = $matches[1].Trim()
            $val = $matches[2].Trim()

            # Strip unquoted inline comments
            if ($val -notmatch '^["''].*["'']$' -and $val -match '^(.*?)\s+#.*$') {
                $val = $matches[1].Trim()
            }
            # Strip outer quotes
            if (($val.StartsWith('"') -and $val.EndsWith('"')) -or ($val.StartsWith("'") -and $val.EndsWith("'"))) {
                if ($val.Length -ge 2) {
                    $val = $val.Substring(1, $val.Length - 2)
                }
            }
            $vars[$key] = $val
        }
    }
    return $vars
}

function Format-MaskedValue {
    param(
        [string]$Key,
        [string]$Value
    )
    if ([string]::IsNullOrEmpty($Value)) {
        return '<empty>'
    }

    $sensitivePattern = '(?i)(KEY|SECRET|TOKEN|PASSWORD|AUTH|PRIVATE|CREDENTIAL)'
    if ($Key -match $sensitivePattern -or $Value.Length -gt 60) {
        if ($Value.Length -le 8) {
            return '***'
        }
        $prefix = $Value.Substring(0, [Math]::Min(4, $Value.Length))
        return "$prefix...*** (length: $($Value.Length))"
    }

    return $Value
}

# --- Main Flow ---
$target = Get-TargetEnvironment
$targetRailwayEnv = if ($RailwayEnv) {
    $RailwayEnv
} elseif ($target -eq 'prod') {
    'production'
} else {
    'dev'
}

$backendDir = Join-Path $PSScriptRoot '..\backend'
$backendDir = [System.IO.Path]::GetFullPath($backendDir)
$baseEnvPath = Join-Path $backendDir '.env'
$prodEnvPath = Join-Path $backendDir '.env.production'
$devEnvPath  = Join-Path $backendDir '.env.development'

if (-not (Test-Path $baseEnvPath)) {
    throw "Base .env file not found at $baseEnvPath"
}

Write-Host ""
Write-Host "+--------------------------------------------------------+" -ForegroundColor Cyan
Write-Host "|  Sync Environment Variables to Railway                 |" -ForegroundColor Cyan
Write-Host "|  Target: $($target.ToUpper().PadRight(46))|" -ForegroundColor Cyan
Write-Host "+--------------------------------------------------------+" -ForegroundColor Cyan
Write-Host ""

$envMap = [ordered]@{}
$sourceMap = @{}

# 1. Load base .env
$baseVars = Import-EnvFile $baseEnvPath
foreach ($k in $baseVars.Keys) {
    $envMap[$k] = $baseVars[$k]
    $sourceMap[$k] = '.env'
}

# 2. Merge overrides
if ($target -eq 'prod') {
    if (Test-Path $prodEnvPath) {
        $prodVars = Import-EnvFile $prodEnvPath
        foreach ($k in $prodVars.Keys) {
            $envMap[$k] = $prodVars[$k]
            $sourceMap[$k] = '.env.production'
        }
        Write-Host "Merged production overrides from backend/.env.production" -ForegroundColor Green
    } else {
        Write-Host "Warning: backend/.env.production not found, using .env only" -ForegroundColor Yellow
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
    if (-not $envMap.Contains('NODE_ENV')) {
        $envMap['NODE_ENV'] = 'development'
    }
}

# 3. Special handling: FCM Service Account JSON path -> Inline minified JSON
if ($envMap.Contains('FCM_SERVICE_ACCOUNT_JSON')) {
    $fcmVal = $envMap['FCM_SERVICE_ACCOUNT_JSON']
    if ($fcmVal -and -not $fcmVal.StartsWith('{') -and $fcmVal.EndsWith('.json')) {
        $fcmFilePath = Join-Path $backendDir $fcmVal
        if (Test-Path $fcmFilePath) {
            $rawJson = Get-Content $fcmFilePath -Raw
            $minified = $rawJson | ConvertFrom-Json | ConvertTo-Json -Compress
            $envMap['FCM_SERVICE_ACCOUNT_JSON'] = $minified
            Write-Host "Inlined FCM_SERVICE_ACCOUNT_JSON from local file ($fcmVal)" -ForegroundColor DarkCyan
        }
    }
}

# 4. Display planned variables
Write-Host ""
Write-Host "Variables to set ($($envMap.Count) total):" -ForegroundColor White
foreach ($k in $envMap.Keys) {
    $src = $sourceMap[$k]
    if (-not $src) { $src = 'default' }
    $srcColor = if ($src -eq '.env.production') { 'Green' } else { 'DarkGray' }
    $masked = Format-MaskedValue -Key $k -Value $envMap[$k]
    Write-Host "  $($k.PadRight(35)) = $masked " -NoNewline
    Write-Host "[$src]" -ForegroundColor $srcColor
}
Write-Host ""

if ($DryRun) {
    Write-Host "[DRY RUN] No changes were made to Railway." -ForegroundColor Yellow
    exit 0
}

# 5. Pre-flight Railway CLI checks
$railwayCommand = Get-Command railway -ErrorAction SilentlyContinue
if (-not $railwayCommand) {
    throw "Railway CLI is not installed. Install with 'npm i -g @railway/cli' or see https://docs.railway.app/guides/cli"
}

Write-Host "Checking Railway connection..." -ForegroundColor Yellow
$statusOutput = & railway status 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "Error: Railway project is not linked or not authenticated." -ForegroundColor Red
    Write-Host "Please run 'railway link' first to link your project." -ForegroundColor Yellow
    exit 1
}

# 6. Execute railway variable set
Write-Host "Setting $($envMap.Count) variables on Railway (environment: $targetRailwayEnv)..." -ForegroundColor Cyan

$cliArgs = @("variable", "set")
if ($Service) {
    $cliArgs += @("-s", $Service)
}
if ($targetRailwayEnv) {
    $cliArgs += @("-e", $targetRailwayEnv)
}
if ($SkipDeploys) {
    $cliArgs += "--skip-deploys"
}

foreach ($k in $envMap.Keys) {
    $cliArgs += "$k=$($envMap[$k])"
}

& railway @cliArgs
if ($LASTEXITCODE -ne 0) {
    throw "Failed to set variables on Railway (exit code $LASTEXITCODE)"
}

Write-Host ""
Write-Host "Successfully synchronized $($envMap.Count) environment variables to Railway ($targetRailwayEnv)!" -ForegroundColor Green
