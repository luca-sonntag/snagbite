<#
.SYNOPSIS
    Builds and publishes an OTA (over-the-air) web bundle to Supabase Storage.

.DESCRIPTION
    This script:
    1. Guards against unsafe frontend env (loopback VITE_API_BASE_URL, test login)
    2. Reads VERSION_NAME/VERSION_CODE from version.properties (never bumps them -
       OTA only ships web assets, native versioning is untouched)
    3. Builds the frontend (npm run build)
    4. Derives the next bundle version from the DB: {VERSION_NAME}-ota.{n}
    5. Zips dist/ (index.html at zip root), computes its sha256
    6. Uploads the zip to the public app-bundles bucket and inserts an
       app_bundles row (active=false)
    7. Activates the new bundle (deactivates the channel's current one first),
       unless -NoActivate

    Devices pick the new bundle up on their next update check (app resume) and
    apply it on the following background/relaunch.

    Credentials: SUPABASE_URL + SUPABASE_SECRET_KEY from the environment, or
    from backend/.env as fallback.

.PARAMETER Channel
    Target update channel: 'production', 'alpha' or 'internal'. Mandatory.

.PARAMETER MinVersionCode
    Oldest native VERSION_CODE this bundle may be served to. Defaults to the
    current VERSION_CODE in version.properties. Raise it only when the web code
    depends on native plugins that older shells don't have.

.PARAMETER NoActivate
    Upload + insert only; don't activate. Activate later via the admin API,
    the Supabase dashboard, or -Rollback.

.PARAMETER Rollback
    No build/upload: deactivate the channel's active bundle and reactivate the
    previously created one. Devices converge on their next check.

.EXAMPLE
    .\deploy-ota.ps1 -Channel alpha                 # build + upload + activate on alpha
    .\deploy-ota.ps1 -Channel production            # build + upload + activate on production
    .\deploy-ota.ps1 -Channel production -NoActivate
    .\deploy-ota.ps1 -Channel production -Rollback  # swap back to the previous bundle
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

# ── Credentials (env first, backend/.env fallback) ───────────────────

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

$backendProdEnv = "$repoRoot\backend\.env.production"
$backendDevEnv  = "$repoRoot\backend\.env"

if ($Channel -eq 'internal') {
    $supabaseUrl = if ($env:SUPABASE_URL) { $env:SUPABASE_URL } `
                   elseif (Test-Path $backendDevEnv) { Read-DotEnvValue $backendDevEnv 'SUPABASE_URL' } `
                   else { Read-DotEnvValue $backendProdEnv 'SUPABASE_URL' }

    $serviceKey  = if ($env:SUPABASE_SECRET_KEY) { $env:SUPABASE_SECRET_KEY } `
                   elseif (Test-Path $backendDevEnv) { Read-DotEnvValue $backendDevEnv 'SUPABASE_SECRET_KEY' } `
                   else { Read-DotEnvValue $backendProdEnv 'SUPABASE_SECRET_KEY' }
} else {
    $supabaseUrl = if ($env:SUPABASE_URL) { $env:SUPABASE_URL } `
                   elseif (Test-Path $backendProdEnv) { Read-DotEnvValue $backendProdEnv 'SUPABASE_URL' } `
                   else { Read-DotEnvValue $backendDevEnv 'SUPABASE_URL' }

    $serviceKey  = if ($env:SUPABASE_SECRET_KEY) { $env:SUPABASE_SECRET_KEY } `
                   elseif (Test-Path $backendProdEnv) { Read-DotEnvValue $backendProdEnv 'SUPABASE_SECRET_KEY' } `
                   else { Read-DotEnvValue $backendDevEnv 'SUPABASE_SECRET_KEY' }
}

if (-not $supabaseUrl -or -not $serviceKey) {
    Write-Error "SUPABASE_URL / SUPABASE_SECRET_KEY not found (checked env, $backendProdEnv, and $backendDevEnv)."
    exit 1
}
$supabaseUrl = $supabaseUrl.TrimEnd('/')

$restHeaders = @{
    'apikey'        = $serviceKey
    'Authorization' = "Bearer $serviceKey"
    'Content-Type'  = 'application/json'
}

# ── PostgREST helpers ────────────────────────────────────────────────

function Get-ActiveBundle {
    param([string]$Chan)
    $rows = Invoke-RestMethod -Method Get -Headers $restHeaders `
        -Uri "$supabaseUrl/rest/v1/app_bundles?channel=eq.$Chan&active=is.true&select=*"
    if ($rows -is [array]) { return $rows | Select-Object -First 1 }
    return $rows
}

function Set-BundleActive {
    param([string]$Chan, [string]$Id)
    # Deactivate the channel's current active row first - a partial unique
    # index allows at most one active bundle per channel.
    Invoke-RestMethod -Method Patch -Headers $restHeaders `
        -Uri "$supabaseUrl/rest/v1/app_bundles?channel=eq.$Chan&active=is.true" `
        -Body (@{ active = $false } | ConvertTo-Json) | Out-Null
    Invoke-RestMethod -Method Patch -Headers $restHeaders `
        -Uri "$supabaseUrl/rest/v1/app_bundles?id=eq.$Id" `
        -Body (@{ active = $true } | ConvertTo-Json) | Out-Null
}

# ── Rollback mode (no build) ─────────────────────────────────────────

if ($Rollback) {
    Write-Host ""
    Write-Host "  Rolling back OTA channel '$Channel'..." -ForegroundColor Yellow

    $active = Get-ActiveBundle $Channel
    if (-not $active) {
        Write-Error "No active bundle on channel '$Channel' - nothing to roll back. Activate a row manually via the admin API or Supabase dashboard."
        exit 1
    }

    $activeCreatedAt = $active.created_at
    $previous = Invoke-RestMethod -Method Get -Headers $restHeaders `
        -Uri "$supabaseUrl/rest/v1/app_bundles?channel=eq.$Channel&active=is.false&created_at=lt.$activeCreatedAt&order=created_at.desc&limit=1&select=*"
    $previous = $previous | Select-Object -First 1

    if (-not $previous) {
        # No older bundle: just deactivate (devices fall back to their builtin
        # assets only after a native update; until then they keep the bundle
        # they already run - this is the kill switch for NEW downloads).
        Invoke-RestMethod -Method Patch -Headers $restHeaders `
            -Uri "$supabaseUrl/rest/v1/app_bundles?id=eq.$($active.id)" `
            -Body (@{ active = $false } | ConvertTo-Json) | Out-Null
        Write-Host "  No previous bundle found. Deactivated $($active.version) - channel now serves no update." -ForegroundColor Yellow
        exit 0
    }

    Set-BundleActive $Channel $previous.id
    Write-Host ""
    Write-Host "  [OK] Rolled back '$Channel': $($active.version) -> $($previous.version)" -ForegroundColor Green
    Write-Host "  Devices converge on their next update check (app resume)." -ForegroundColor DarkGray
    Write-Host ""
    exit 0
}

. "$PSScriptRoot/git-utils.ps1"

# --- Git Pre-flight checks (only if run standalone) ---
Assert-GitClean

# ── 1. Frontend env guards ───────────────────────────────────────────
# A loopback VITE_API_BASE_URL baked into an OTA bundle would brick networking
# on every device that installs it (same guard as deploy.ps1 for Play builds).

Write-Host ""
Write-Host "  +------------------------------------------+" -ForegroundColor Cyan
Write-Host "  |  Snagbite OTA Bundle Deployer            |" -ForegroundColor Cyan
Write-Host "  +------------------------------------------+" -ForegroundColor Cyan
Write-Host ""

Write-Host "[1/7] Validating frontend env..." -ForegroundColor Yellow

if ($Channel -eq 'internal') {
    $envPath = "$frontendDir\.env.development"
    if (-not (Test-Path $envPath)) { $envPath = "$frontendDir\.env" }

    $apiBaseUrl = Read-DotEnvValue $envPath 'VITE_API_BASE_URL'
    if (-not $apiBaseUrl) {
        Write-Error "VITE_API_BASE_URL is missing/empty in $envPath. OTA bundles run in the native webview and need an absolute backend origin."
        exit 1
    }

    $parsedUri = $null
    if (-not [Uri]::TryCreate($apiBaseUrl, [UriKind]::Absolute, [ref]$parsedUri) -or ($parsedUri.Scheme -ne 'http' -and $parsedUri.Scheme -ne 'https')) {
        Write-Error "VITE_API_BASE_URL in $envPath is not a valid http(s) URL: '$apiBaseUrl'."
        exit 1
    }
    $blockedHosts = @('0.0.0.0', '[0000:0000:0000:0000:0000:0000:0000:0000]')
    if ($parsedUri.IsLoopback -or $blockedHosts -contains $parsedUri.Host.ToLowerInvariant()) {
        Write-Error "VITE_API_BASE_URL in $envPath points to a loopback address ('$($parsedUri.Host)') - shipping this OTA would brick networking on every device. Use the development backend origin."
        exit 1
    }

    $frontendSupabaseUrl = Read-DotEnvValue $envPath 'VITE_SUPABASE_URL'
    if (-not $frontendSupabaseUrl) {
        Write-Error "VITE_SUPABASE_URL is missing/empty in $envPath. Internal builds must pin the development Supabase project."
        exit 1
    }

    Write-Host "  VITE_API_BASE_URL OK (from $envPath): $($parsedUri.Scheme)://$($parsedUri.Host)" -ForegroundColor Green
    Write-Host "  VITE_SUPABASE_URL OK (from $envPath): $frontendSupabaseUrl" -ForegroundColor Green
} else {
    $envPath = "$frontendDir\.env"
    $prodEnvPath = "$frontendDir\.env.production"
    if ((Test-Path $prodEnvPath) -and (Read-DotEnvValue $prodEnvPath 'VITE_API_BASE_URL')) {
        $envPath = $prodEnvPath
    }

    $apiBaseUrl = Read-DotEnvValue $envPath 'VITE_API_BASE_URL'
    if (-not $apiBaseUrl) {
        Write-Error "VITE_API_BASE_URL is missing/empty in $envPath. OTA bundles run in the native webview and need an absolute backend origin."
        exit 1
    }

    $parsedUri = $null
    if (-not [Uri]::TryCreate($apiBaseUrl, [UriKind]::Absolute, [ref]$parsedUri) -or ($parsedUri.Scheme -ne 'http' -and $parsedUri.Scheme -ne 'https')) {
        Write-Error "VITE_API_BASE_URL in $envPath is not a valid http(s) URL: '$apiBaseUrl'."
        exit 1
    }
    $blockedHosts = @('0.0.0.0', '[0000:0000:0000:0000:0000:0000:0000:0000]')
    if ($parsedUri.IsLoopback -or $blockedHosts -contains $parsedUri.Host.ToLowerInvariant()) {
        Write-Error "VITE_API_BASE_URL in $envPath points to a loopback address ('$($parsedUri.Host)') - shipping this OTA would brick networking on every device. Use the production backend origin."
        exit 1
    }

    foreach ($envFile in @($envPath, "$frontendDir\.env")) {
        if ((Read-DotEnvValue $envFile 'VITE_TEST_LOGIN') -eq 'true') {
            Write-Error "VITE_TEST_LOGIN=true is set in $envFile - refusing to ship a test-login build over OTA."
            exit 1
        }
    }

    # The backend verifies JWTs against snagbite-prod; a bundle built against any
    # other Supabase project gets 401 on every authenticated endpoint (v1.1.6 bug).
    $supabaseEnvPath = "$frontendDir\.env"
    if ((Test-Path $prodEnvPath) -and (Read-DotEnvValue $prodEnvPath 'VITE_SUPABASE_URL')) {
        $supabaseEnvPath = $prodEnvPath
    }
    $frontendSupabaseUrl = Read-DotEnvValue $supabaseEnvPath 'VITE_SUPABASE_URL'
    if (-not $frontendSupabaseUrl) {
        Write-Error "VITE_SUPABASE_URL is missing/empty in $supabaseEnvPath. Production builds must pin the snagbite-prod Supabase project in .env.production."
        exit 1
    }
    if ($frontendSupabaseUrl -match 'nmphuwywxirervquvgoa') {
        Write-Error "VITE_SUPABASE_URL in $supabaseEnvPath points to the DEV Supabase project (snagbite-dev) - its tokens are rejected by the production backend. Pin the snagbite-prod URL in .env.production."
        exit 1
    }
    Write-Host "  VITE_API_BASE_URL OK (from $envPath): $($parsedUri.Scheme)://$($parsedUri.Host)" -ForegroundColor Green
    Write-Host "  VITE_SUPABASE_URL OK (from $supabaseEnvPath): $frontendSupabaseUrl" -ForegroundColor Green
}

# ── 2. Read native version (no bump - OTA never touches it) ──────────

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
$existing = Invoke-RestMethod -Method Get -Headers $restHeaders `
    -Uri "$supabaseUrl/rest/v1/app_bundles?channel=eq.$Channel&version=like.$versionName-ota.*&select=version"

$maxCounter = 0
foreach ($row in @($existing)) {
    $m = [regex]::Match($row.version, '-ota\.(\d+)$')
    if ($m.Success) {
        $n = [int]$m.Groups[1].Value
        if ($n -gt $maxCounter) { $maxCounter = $n }
    }
}
$bundleVersion = "$versionName-ota.$($maxCounter + 1)"
$storagePath = "$Channel/$bundleVersion.zip"
Write-Host "  Bundle version: $bundleVersion" -ForegroundColor White

# ── 5. Zip dist + sha256 ─────────────────────────────────────────────
# tar.exe (bsdtar) writes forward-slash entry paths; Compress-Archive on
# PS 5.1 emits backslashes that break unzipping on Android.

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

# ── 6. Upload to Supabase Storage ────────────────────────────────────

Write-Host "[5/7] Uploading to app-bundles/$storagePath..." -ForegroundColor Yellow
$uploadHeaders = @{
    'apikey'        = $serviceKey
    'Authorization' = "Bearer $serviceKey"
    'x-upsert'      = 'true'
}
Invoke-RestMethod -Method Post -Headers $uploadHeaders `
    -Uri "$supabaseUrl/storage/v1/object/app-bundles/$storagePath" `
    -ContentType 'application/zip' `
    -InFile $zipPath | Out-Null
Write-Host "  Upload complete." -ForegroundColor Green

# ── 7. Insert row + activate ─────────────────────────────────────────

Write-Host "[6/7] Registering bundle..." -ForegroundColor Yellow
$insertBody = @{
    channel          = $Channel
    version          = $bundleVersion
    storage_path     = $storagePath
    checksum         = $checksum
    min_version_code = $MinVersionCode
    active           = $false
    notes            = "deploy-ota.ps1 from native $versionName ($versionCode)"
} | ConvertTo-Json

$insertHeaders = $restHeaders.Clone()
$insertHeaders['Prefer'] = 'return=representation'
$inserted = Invoke-RestMethod -Method Post -Headers $insertHeaders `
    -Uri "$supabaseUrl/rest/v1/app_bundles" -Body $insertBody
$inserted = $inserted | Select-Object -First 1

if ($NoActivate) {
    Write-Host "  Row inserted (id $($inserted.id)) - NOT activated (-NoActivate)." -ForegroundColor Yellow
} else {
    Set-BundleActive $Channel $inserted.id
    Write-Host "  Bundle activated on channel '$Channel'." -ForegroundColor Green
}

Remove-Item $zipPath -Force -ErrorAction SilentlyContinue

# ── 8. Merge to Master and Tag ─────────────────────────────────────────

if ($env:SNAGBITE_DEPLOY_ORCHESTRATOR -ne "true") {
    if ($Channel -ne 'internal') {
        Write-Host "[7/7] Merging develop to master and pushing Git tag..." -ForegroundColor Yellow
        Invoke-GitMasterMergeAndTag `
            -TagName "v$bundleVersion" `
            -TagMessage "OTA release $bundleVersion ($Channel channel)"
    } else {
        Write-Host "[7/7] Pushing Git tag on current branch (skipping master merge for internal)..." -ForegroundColor Yellow
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
Write-Host "  URL:      $supabaseUrl/storage/v1/object/public/app-bundles/$storagePath" -ForegroundColor White
Write-Host ""
Write-Host "  Devices apply it on next resume+relaunch. Rollback:" -ForegroundColor DarkGray
Write-Host "  .\deploy-ota.ps1 -Channel $Channel -Rollback" -ForegroundColor DarkGray
Write-Host ""
Write-Host "  Reminder: after each native Play release, cap stale open-ended bundles:" -ForegroundColor DarkGray
Write-Host "  set max_version_code = newCode - 1 where min_version_code < newCode and max_version_code is null" -ForegroundColor DarkGray
Write-Host ""
