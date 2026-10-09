<#
.SYNOPSIS
    Synchronizes environment variables from local .env files to Railway via Railway CLI.
    Compares local values with Railway, only applies changed/added variables,
    deletes obsolete variables from Railway (excluding RAILWAY_*), displays a diff overview,
    and asks for confirmation before applying changes.
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
    [string[]]$Service,
    [switch]$SkipDeploys,
    [switch]$DryRun,
    [switch]$Force,
    [switch]$Yes
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
$targetServices = if ($Service) {
    @($Service | ForEach-Object { $_ -split ',' } | ForEach-Object { $_.Trim() } | Where-Object { $_ })
} else {
    @('backend')
}
$targetRailwayEnv = Resolve-RailwayEnvironment -Target $target -ExplicitEnv $RailwayEnv

$backendDir = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\backend'))
$baseEnvPath = Join-Path $backendDir '.env'
$prodEnvPath = Join-Path $backendDir '.env.production'
$devEnvPath  = Join-Path $backendDir '.env.development'

if (-not (Test-Path $baseEnvPath)) { throw "Base .env file not found at $baseEnvPath" }

# Verify Railway CLI early
if (-not (Get-Command railway -ErrorAction SilentlyContinue)) {
    throw "Railway CLI is not installed. Install with 'npm i -g @railway/cli'"
}

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

foreach ($targetService in $targetServices) {
    Write-Host ""
    Write-Host "+--------------------------------------------------------+" -ForegroundColor Cyan
    Write-Host "|  Sync Environment Variables to Railway                 |" -ForegroundColor Cyan
    Write-Host "|  Target: $($target.ToUpper().PadRight(20)) Service: $($targetService.PadRight(18))|" -ForegroundColor Cyan
    Write-Host "|  Railway Environment: $($targetRailwayEnv.PadRight(33))|" -ForegroundColor Cyan
    Write-Host "+--------------------------------------------------------+" -ForegroundColor Cyan
    Write-Host ""

    # 4. Fetch existing Railway variables
    Write-Host "Fetching current variables from Railway ($targetService / $targetRailwayEnv)..." -ForegroundColor Gray
    $existingMap = [ordered]@{}
    $existingJson = & railway variable list -s $targetService -e $targetRailwayEnv --json 2>$null
    if ($LASTEXITCODE -ne 0 -or -not $existingJson) {
        throw "Failed to fetch variables from Railway ($targetService / $targetRailwayEnv). Please ensure you are logged in ('railway whoami') and linked ('railway link')."
    }

    $parsedExisting = $existingJson | ConvertFrom-Json
    foreach ($prop in $parsedExisting.PSObject.Properties) {
        $existingMap[$prop.Name] = [string]$prop.Value
    }

# 5. Diff calculation
$varsToAdd = [ordered]@{}
$varsToUpdate = [ordered]@{}
$varsToDelete = @()
$varsUnchanged = @()

foreach ($k in $envMap.Keys) {
    $desiredVal = [string]$envMap[$k]
    if (-not $existingMap.Contains($k)) {
        $varsToAdd[$k] = $desiredVal
    } elseif ($existingMap[$k] -ne $desiredVal) {
        $varsToUpdate[$k] = @{
            NewValue = $desiredVal
            OldValue = $existingMap[$k]
        }
    } else {
        $varsUnchanged += $k
    }
}

foreach ($k in $existingMap.Keys) {
    if ($k -notmatch '^RAILWAY_' -and -not $envMap.Contains($k)) {
        $varsToDelete += $k
    }
}

$hasChanges = ($varsToAdd.Count -gt 0) -or ($varsToUpdate.Count -gt 0) -or ($varsToDelete.Count -gt 0)

# 6. Display Diff Overview
Write-Host ""
Write-Host "========================== DIFF OVERVIEW ==========================" -ForegroundColor White

if ($varsToAdd.Count -gt 0) {
    Write-Host ""
    Write-Host " [NEW] Variables to add ($($varsToAdd.Count)):" -ForegroundColor Green
    foreach ($k in $varsToAdd.Keys) {
        $src = if ($sourceMap.ContainsKey($k)) { $sourceMap[$k] } else { 'default' }
        Write-Host "   + $($k.PadRight(35)) = $(Format-MaskedValue -Key $k -Value $varsToAdd[$k]) [$src]" -ForegroundColor Green
    }
}

if ($varsToUpdate.Count -gt 0) {
    Write-Host ""
    Write-Host " [CHANGED] Variables to update ($($varsToUpdate.Count)):" -ForegroundColor Yellow
    foreach ($k in $varsToUpdate.Keys) {
        $oldMasked = Format-MaskedValue -Key $k -Value $varsToUpdate[$k].OldValue
        $newMasked = Format-MaskedValue -Key $k -Value $varsToUpdate[$k].NewValue
        $src = if ($sourceMap.ContainsKey($k)) { $sourceMap[$k] } else { 'default' }
        Write-Host "   ~ $($k.PadRight(35)) : $oldMasked -> $newMasked [$src]" -ForegroundColor Yellow
    }
}

if ($varsToDelete.Count -gt 0) {
    Write-Host ""
    Write-Host " [OBSOLETE] Variables to delete ($($varsToDelete.Count)):" -ForegroundColor Red
    foreach ($k in $varsToDelete) {
        $oldMasked = Format-MaskedValue -Key $k -Value $existingMap[$k]
        Write-Host "   - $($k.PadRight(35)) (Current: $oldMasked)" -ForegroundColor Red
    }
}

if ($varsUnchanged.Count -gt 0) {
    Write-Host ""
    Write-Host " [MATCH] Variables in sync ($($varsUnchanged.Count) unchanged, skipped):" -ForegroundColor DarkGray
    Write-Host "   $($varsUnchanged -join ', ')" -ForegroundColor DarkGray
}

Write-Host ""
Write-Host "Summary: $($varsToAdd.Count) to add, $($varsToUpdate.Count) to update, $($varsToDelete.Count) to delete, $($varsUnchanged.Count) unchanged." -ForegroundColor White
Write-Host "===================================================================" -ForegroundColor White
Write-Host ""

    if (-not $hasChanges) {
        Write-Host "Service $targetService is already in sync with Railway ($targetRailwayEnv)! No action needed." -ForegroundColor Green
        continue
    }

    if ($DryRun) {
        Write-Host "[DRY RUN] No changes were made to Railway ($targetService)." -ForegroundColor Yellow
        continue
    }

    # 7. Ask for confirmation
    $confirmed = $Force -or $Yes
    if (-not $confirmed) {
        $promptMsg = "Do you want to apply these changes to Railway ($targetService / $targetRailwayEnv)? [y/N]"
        $userResponse = Read-Host -Prompt $promptMsg
        if ($userResponse -notmatch '^(y|yes)$') {
            Write-Host "Sync aborted for $targetService. No changes were made." -ForegroundColor DarkYellow
            continue
        }
    }

    # 8. Delete obsolete variables
    if ($varsToDelete.Count -gt 0) {
        Write-Host "Pruning $($varsToDelete.Count) obsolete variables from Railway ($targetService)..." -ForegroundColor Yellow
        foreach ($k in $varsToDelete) {
            Write-Host "  Deleting $k..." -ForegroundColor DarkYellow
            & railway variable delete $k -s $targetService -e $targetRailwayEnv --json | Out-Null
            if ($LASTEXITCODE -ne 0) {
                Write-Host "  Warning: Failed to delete $k from Railway (exit code $LASTEXITCODE)" -ForegroundColor Yellow
            }
        }
    }

    # 9. Separate changed/added into standard vs complex (multi-line / JSON)
    $varsToSet = [ordered]@{}
    foreach ($k in $varsToAdd.Keys) { $varsToSet[$k] = $varsToAdd[$k] }
    foreach ($k in $varsToUpdate.Keys) { $varsToSet[$k] = $varsToUpdate[$k].NewValue }

    $complexVars = [ordered]@{}
    $standardVars = [ordered]@{}
    foreach ($k in $varsToSet.Keys) {
        $val = $varsToSet[$k]
        if ($val -match '[\r\n"{}]') { $complexVars[$k] = $val } else { $standardVars[$k] = $val }
    }

    Write-Host "Applying $($varsToSet.Count) variable changes to Railway ($targetService / $targetRailwayEnv)..." -ForegroundColor Cyan

    # Stdin set for complex variables
    foreach ($k in $complexVars.Keys) {
        Write-Host "Setting $k via stdin..." -ForegroundColor DarkCyan
        $complexVars[$k] | & railway variable set $k --stdin -s $targetService -e $targetRailwayEnv --skip-deploys
        if ($LASTEXITCODE -ne 0) { throw "Failed to set $k via stdin on Railway" }
    }

    # Batch set for standard variables
    if ($standardVars.Count -gt 0) {
        $cliArgs = @("variable", "set", "-s", $targetService, "-e", $targetRailwayEnv)
        if ($SkipDeploys) { $cliArgs += "--skip-deploys" }
        foreach ($k in $standardVars.Keys) { $cliArgs += "$k=$($standardVars[$k])" }
        & railway @cliArgs
        if ($LASTEXITCODE -ne 0) { throw "Failed to set standard variables on Railway (exit code $LASTEXITCODE)" }
    }

    Write-Host ""
    Write-Host "Successfully applied changes on Railway ($targetService / $targetRailwayEnv)!" -ForegroundColor Green
    Write-Host "Added: $($varsToAdd.Count), Updated: $($varsToUpdate.Count), Deleted: $($varsToDelete.Count)" -ForegroundColor Green
}

Write-Host ""
Write-Host "All specified services processed successfully." -ForegroundColor Cyan
