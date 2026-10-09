<#
.SYNOPSIS
    Builds and publishes an OTA (over-the-air) web bundle to S3 (Tigris) and Postgres.

.DESCRIPTION
    This script:
    1. Guards against unsafe frontend env (loopback VITE_API_BASE_URL, test login)
    2. Reads VERSION_NAME/VERSION_CODE from version.properties (never bumps them -
       OTA only ships web assets, native versioning is untouched)
    3. Builds the frontend (npm run build)
    4. Derives the next bundle version from DB: {VERSION_NAME}-ota.{n}
    5. Zips dist/ (index.html at zip root), computes its sha256
    6. Uploads the zip to Tigris S3 (app-bundles) and registers it in PostgreSQL
    7. Activates the new bundle, unless -NoActivate

    Devices pick the new bundle up on their next update check (app resume) and
    apply it on the following background/relaunch.

.PARAMETER Channel
    Target update channel: 'production', 'alpha' or 'internal'. Mandatory.

.PARAMETER MinVersionCode
    Oldest native VERSION_CODE this bundle may be served to. Defaults to the
    current VERSION_CODE in version.properties.

.PARAMETER NoActivate
    Upload + insert only; don't activate.

.PARAMETER Rollback
    No build/upload: deactivate the channel's active bundle and reactivate the
    previously created one.

.EXAMPLE
    .\deploy-ota.ps1 -Channel alpha
    .\deploy-ota.ps1 -Channel production
    .\deploy-ota.ps1 -Channel production -NoActivate
    .\deploy-ota.ps1 -Channel production -Rollback
#>

param(
    [Parameter(Mandatory = $true)]
    [ValidateSet('production', 'alpha', 'internal')]
    [string]$Channel,
    [int]$MinVersionCode = 0,
    [switch]$NoActivate,
    [switch]$Rollback
)

$ErrorActionPreference = 'Stop'

$frontendDir = Split-Path -Parent $PSScriptRoot
$repoRoot = Split-Path -Parent $frontendDir
$versionFile = "$frontendDir\android\version.properties"
$managerScript = "$repoRoot\backend\src\scripts\deploy\otaBundleManager.ts"
$targetEnv = if ($Channel -eq 'internal') { '--dev' } else { '--prod' }

. "$PSScriptRoot\git-utils.ps1"

# ── Rollback mode (no build) ─────────────────────────────────────────

if ($Rollback) {
    Write-Host ""
    Write-Host "  Rolling back OTA channel '$Channel'..." -ForegroundColor Yellow

    $rollbackRaw = & npx tsx $managerScript $targetEnv rollback "--channel=$Channel"
    $rollbackRes = $rollbackRaw | ConvertFrom-Json

    if ($rollbackRes.deactivatedOnly) {
        Write-Host "  Deactivated active bundle - channel now serves no update." -ForegroundColor Yellow
    } else {
        Write-Host "  [OK] Rolled back '$Channel': $($rollbackRes.deactivated) -> $($rollbackRes.activated)" -ForegroundColor Green
        Write-Host "  Devices converge on their next update check (app resume)." -ForegroundColor DarkGray
    }
    Write-Host ""
    exit 0
}

# ── 1. Env guard ─────────────────────────────────────────────────────

Write-Host ""
Write-Host "[1/7] Checking frontend environment..." -ForegroundColor Yellow

function Read-DotEnvValue {
    param([string]$Path, [string]$Key)
    if (-not (Test-Path $Path)) { return $null }
    $content = Get-Content $Path -Raw
    $match = [regex]::Match($content, "(?im)^\s*(?:export\s+)?$Key\s*=\s*(.*?)\s*$")
    if (-not $match.Success) { return $null }
    $val = ($match.Groups[1].Value -replace '\s*#.*$', '').Trim().Trim('"').Trim("'")
    if ([string]::IsNullOrWhiteSpace($val)) { return $null }
    return $val
}

if ($Channel -ne 'internal') {
    $prodEnvPath = "$frontendDir\.env.production"
    $envPath = if (Test-Path $prodEnvPath) { $prodEnvPath } else { "$frontendDir\.env" }

    $apiUrl = Read-DotEnvValue $envPath 'VITE_API_BASE_URL'
    if (-not $apiUrl) {
        Write-Error "VITE_API_BASE_URL is missing/empty in $envPath. Non-internal builds must specify a hosted backend."
        exit 1
    }

    $parsedUri = [System.Uri]$apiUrl
    if ($parsedUri.Host -in @('localhost', '127.0.0.1', '0.0.0.0', '10.0.2.2')) {
        Write-Error "VITE_API_BASE_URL points to a loopback host ($($parsedUri.Host)). Devices will fail to connect."
        exit 1
    }

    foreach ($checkEnv in @($prodEnvPath, "$frontendDir\.env")) {
        if ((Read-DotEnvValue $checkEnv 'VITE_TEST_LOGIN') -eq 'true') {
            Write-Error "VITE_TEST_LOGIN=true is set in $checkEnv - refusing to build a test-login release."
            exit 1
        }
    }
    Write-Host "  VITE_API_BASE_URL OK: $($parsedUri.Scheme)://$($parsedUri.Host)" -ForegroundColor Green
}

# ── 2. Read native version ───────────────────────────────────────────

if (-not (Test-Path $versionFile)) {
    Write-Error "version.properties not found at $versionFile"
    exit 1
}
$versionContent = Get-Content $versionFile -Raw
$versionCode = [int]([regex]::Match($versionContent, 'VERSION_CODE=(\d+)').Groups[1].Value)
$versionName = [regex]::Match($versionContent, 'VERSION_NAME=(.+)').Groups[1].Value.Trim()
if ($MinVersionCode -le 0) { $MinVersionCode = $versionCode }

Write-Host "  Native version: $versionName ($versionCode) | minVersionCode: $MinVersionCode | channel: $Channel" -ForegroundColor White

# ── 3. Build frontend ────────────────────────────────────────────────

Write-Host "[2/7] Building frontend..." -ForegroundColor Yellow
Push-Location $frontendDir
try {
    if ($Channel -eq 'internal') {
        npm run build:dev
    } else {
        npm run build
    }
    if ($LASTEXITCODE -ne 0) { throw "Frontend build failed" }
} finally {
    Pop-Location
}
Write-Host "  Frontend build complete." -ForegroundColor Green

# ── 4. Next bundle version from DB: {VERSION_NAME}-ota.{n} ───────────

Write-Host "[3/7] Deriving next bundle version..." -ForegroundColor Yellow
$bundlesRaw = & npx tsx $managerScript $targetEnv list "--channel=$Channel"
$existing = $bundlesRaw | ConvertFrom-Json

$maxCounter = 0
foreach ($row in @($existing)) {
    if ($row.version -like "$versionName-ota.*") {
        $m = [regex]::Match($row.version, '-ota\.(\d+)$')
        if ($m.Success) {
            $n = [int]$m.Groups[1].Value
            if ($n -gt $maxCounter) { $maxCounter = $n }
        }
    }
}
$bundleVersion = "$versionName-ota.$($maxCounter + 1)"
Write-Host "  Bundle version: $bundleVersion" -ForegroundColor White

# ── 5. Zip dist + sha256 ─────────────────────────────────────────────

Write-Host "[4/7] Zipping dist/..." -ForegroundColor Yellow
$distDir = "$frontendDir\dist"
if (-not (Test-Path "$distDir\index.html")) {
    Write-Error "dist/index.html not found - build output looks wrong."
    exit 1
}
$zipPath = Join-Path ([System.IO.Path]::GetTempPath()) "snagbite-$($bundleVersion -replace '[^\w\.-]', '_').zip"
if (Test-Path $zipPath) { Remove-Item $zipPath -Force }
& tar.exe -a -cf $zipPath -C $distDir *
if ($LASTEXITCODE -ne 0) { throw "tar.exe failed to create $zipPath" }

$checksum = (Get-FileHash -Path $zipPath -Algorithm SHA256).Hash.ToLowerInvariant()
$zipSizeKb = [math]::Round((Get-Item $zipPath).Length / 1kb)
Write-Host "  Zip: $zipPath ($zipSizeKb KB)" -ForegroundColor White
Write-Host "  SHA256: $checksum" -ForegroundColor White

# ── 6. Upload & Register bundle via otaBundleManager ─────────────────

Write-Host "[5/7] Uploading and registering bundle..." -ForegroundColor Yellow
$noActivateArg = if ($NoActivate) { "--no-activate" } else { "" }
$notes = "deploy-ota.ps1 from native $versionName ($versionCode)"

$cmdArgs = @(
    $targetEnv,
    "publish",
    "--channel=$Channel",
    "--version=$bundleVersion",
    "--zip=$zipPath",
    "--min-code=$MinVersionCode",
    "--notes=$notes"
)
if ($noActivateArg) { $cmdArgs += $noActivateArg }

$publishRaw = & npx tsx $managerScript @cmdArgs
$publishRes = $publishRaw | ConvertFrom-Json

if (-not $publishRes.success) {
    throw "Failed to publish bundle: $publishRaw"
}

$bundleUrl = $publishRes.url
Write-Host "  Bundle successfully uploaded and registered." -ForegroundColor Green
if ($NoActivate) {
    Write-Host "  Row inserted (id $($publishRes.bundle.id)) - NOT activated (-NoActivate)." -ForegroundColor Yellow
} else {
    Write-Host "  Bundle activated on channel '$Channel'." -ForegroundColor Green
}

Remove-Item $zipPath -Force -ErrorAction SilentlyContinue

# ── 7. Merge to Master and Tag ───────────────────────────────────────

if ($env:SNAGBITE_DEPLOY_ORCHESTRATOR -ne "true") {
    if ($Channel -ne 'internal') {
        Write-Host "[6/7] Merging develop to master and pushing Git tag..." -ForegroundColor Yellow
        Invoke-GitMasterMergeAndTag `
            -TagName "v$bundleVersion" `
            -TagMessage "OTA release $bundleVersion ($Channel channel)"
    } else {
        Write-Host "[6/7] Pushing Git tag on current branch (skipping master merge for internal)..." -ForegroundColor Yellow
        $tagExists = (Get-GitOutput -Arguments @("tag", "-l", "v$bundleVersion"))
        if ($tagExists) {
            Write-Host "Tag v$bundleVersion already exists. Re-tagging..." -ForegroundColor Yellow
            Run-Git -Arguments @("tag", "-d", "v$bundleVersion") -IgnoreError
            Run-Git -Arguments @("push", "origin", "--delete", "v$bundleVersion") -IgnoreError
        }
        Run-Git -Arguments @("tag", "-a", "v$bundleVersion", "-m", "OTA internal release $bundleVersion")
        Run-Git -Arguments @("push", "origin", "v$bundleVersion")
        Write-Host "  [OK] Successfully pushed tag v$bundleVersion on current branch." -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "  [OK] OTA bundle published!" -ForegroundColor Green
Write-Host "  Channel:  $Channel" -ForegroundColor White
Write-Host "  Version:  $bundleVersion" -ForegroundColor White
Write-Host "  Git Tag:  v$bundleVersion" -ForegroundColor White
Write-Host "  Checksum: $checksum" -ForegroundColor White
Write-Host "  URL:      $bundleUrl" -ForegroundColor White
Write-Host ""
Write-Host "  Devices apply it on next resume+relaunch. Rollback:" -ForegroundColor DarkGray
Write-Host "  .\deploy-ota.ps1 -Channel $Channel -Rollback" -ForegroundColor DarkGray
Write-Host ""
