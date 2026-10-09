<#
.SYNOPSIS
    Builds a signed .aab release bundle for Google Play Console.

.DESCRIPTION
    This script:
    1. Auto-increments the versionCode in version.properties
    2. Optionally bumps the versionName (major/minor/patch)
    3. Builds the frontend (npm run build)
    4. Syncs Capacitor (npx cap sync android)
    5. Runs Gradle bundleRelease
    6. Copies the .aab to a timestamped file in frontend/releases/

.PARAMETER Bump
    Version bump type: 'none' (default), 'patch', 'minor', 'major'
    Only affects versionName. versionCode always increments by 1.

.EXAMPLE
    .\release.ps1                # Just increment versionCode
    .\release.ps1 -Bump patch    # 1.0.0 -> 1.0.1 + versionCode++
    .\release.ps1 -Bump minor    # 1.0.1 -> 1.1.0 + versionCode++
    .\release.ps1 -Bump major    # 1.1.0 -> 2.0.0 + versionCode++
#>

param(
    [ValidateSet('none', 'patch', 'minor', 'major')]
    [string]$Bump = 'none'
)

$ErrorActionPreference = 'Stop'

$frontendDir = Split-Path -Parent $PSScriptRoot
$androidDir = "$frontendDir\android"
$versionFile = "$androidDir\version.properties"

. "$PSScriptRoot\git-utils.ps1"

function Read-DotEnvValue {
    param([string]$Path, [string]$Key)
    if (-not (Test-Path $Path)) { return $null }
    foreach ($line in Get-Content $Path) {
        if ($line -match "^\s*$([regex]::Escape($Key))\s*=\s*(.*)$") {
            return $Matches[1].Trim().Trim('"').Trim("'")
        }
    }
    return $null
}

# -- 0. Frontend env guards -------------------------------------------
# `npm run build` (production mode) reads .env.production, then .env for any
# variable .env.production doesn't define. Production builds must pin the production backend API.
$prodEnvPath = "$frontendDir\.env.production"
$frontendApiUrl = Read-DotEnvValue $prodEnvPath 'VITE_API_BASE_URL'
if (-not $frontendApiUrl) {
    Write-Error "VITE_API_BASE_URL is missing/empty in $prodEnvPath. Production builds must pin the production backend URL."
    exit 1
}
foreach ($envFile in @($prodEnvPath, "$frontendDir\.env")) {
    if ((Read-DotEnvValue $envFile 'VITE_TEST_LOGIN') -eq 'true') {
        Write-Error "VITE_TEST_LOGIN=true is set in $envFile - refusing to build a test-login release."
        exit 1
    }
}

# -- 1. Read current version ------------------------------------------
if (-not (Test-Path $versionFile)) {
    Write-Error "version.properties not found at $versionFile"
    exit 1
}

$versionContent = Get-Content $versionFile -Raw
$currentCode = [int]([regex]::Match($versionContent, 'VERSION_CODE=(\d+)').Groups[1].Value)
$currentName = [regex]::Match($versionContent, 'VERSION_NAME=(.+)').Groups[1].Value.Trim()

# -- 2. Increment versionCode -----------------------------------------
$newCode = $currentCode + 1

# -- 3. Bump versionName if requested ---------------------------------
$parts = $currentName.Split('.')
$major = [int]$parts[0]
$minor = [int]$parts[1]
$patch = [int]$parts[2]

switch ($Bump) {
    'major' { $major++; $minor = 0; $patch = 0 }
    'minor' { $minor++; $patch = 0 }
    'patch' { $patch++ }
}
$newName = "$major.$minor.$patch"

# -- 4. Write updated version.properties ------------------------------
$newContent = "VERSION_CODE=$newCode`nVERSION_NAME=$newName`n"
[System.IO.File]::WriteAllText($versionFile, $newContent)


Write-Host ""
Write-Host "  +------------------------------------------+" -ForegroundColor Cyan
Write-Host "  |  Snagbite Release Builder                |" -ForegroundColor Cyan
Write-Host "  +------------------------------------------+" -ForegroundColor Cyan
Write-Host "  |  versionCode: $currentCode -> $newCode" -ForegroundColor White -NoNewline
Write-Host "$(' ' * (28 - "$currentCode -> $newCode".Length))|" -ForegroundColor Cyan
Write-Host "  |  versionName: $currentName -> $newName" -ForegroundColor White -NoNewline
Write-Host "$(' ' * (28 - "$currentName -> $newName".Length))|" -ForegroundColor Cyan
Write-Host "  +------------------------------------------+" -ForegroundColor Cyan
Write-Host ""

# -- 5. Build frontend ------------------------------------------------
Write-Host "[1/4] Building frontend..." -ForegroundColor Yellow
Push-Location $frontendDir
try {
    npm run build
    if ($LASTEXITCODE -ne 0) { throw "Frontend build failed" }
} finally {
    Pop-Location
}
Write-Host "  Frontend build complete." -ForegroundColor Green

# -- 6. Sync Capacitor ------------------------------------------------
Write-Host "[2/4] Syncing Capacitor..." -ForegroundColor Yellow
Push-Location $frontendDir
try {
    npx cap sync android
    if ($LASTEXITCODE -ne 0) { throw "Capacitor sync failed" }
} finally {
    Pop-Location
}
Write-Host "  Capacitor sync complete." -ForegroundColor Green

# -- 7. Build AAB -----------------------------------------------------
Write-Host "[3/4] Building release AAB..." -ForegroundColor Yellow
Push-Location $androidDir
try {
    # Check for active live-reload server configuration
    $configFile = "$androidDir\app\src\main\assets\capacitor.config.json"
    if (Test-Path $configFile) {
        $configJson = Get-Content $configFile -Raw | ConvertFrom-Json -ErrorAction SilentlyContinue
        if ($configJson -and $configJson.server -and $configJson.server.url) {
            throw "Error: A live-reload server URL ($($configJson.server.url)) is configured in capacitor.config.json. Please stop the 'npm run cap:live' process and run 'npx cap sync android' to restore standard configuration before building a release."
        }
    }

    # Clean intermediate build cache to ensure stale configurations are not packaged
    Write-Host "  Cleaning Gradle build cache..."
    & .\gradlew.bat clean
    if ($LASTEXITCODE -ne 0) { throw "Gradle clean failed" }

    & .\gradlew.bat bundleRelease
    if ($LASTEXITCODE -ne 0) { throw "Gradle bundleRelease failed" }
} finally {
    Pop-Location
}
Write-Host "  AAB build complete." -ForegroundColor Green

# -- 8. Copy AAB to releases/ folder ----------------------------------
Write-Host "[4/4] Copying AAB to releases/..." -ForegroundColor Yellow
$aabSource = "$androidDir\app\build\outputs\bundle\release\app-release.aab"
$releasesDir = "$frontendDir\releases"
if (-not (Test-Path $releasesDir)) {
    New-Item -ItemType Directory -Path $releasesDir | Out-Null
}

$timestamp = Get-Date -Format "yyyy-MM-dd_HHmmss"
$aabDest = "$releasesDir\snagbite-v${newName}-vc${newCode}-${timestamp}.aab"
Copy-Item $aabSource $aabDest

# -- 9. Cap open-ended stale OTA bundles in DB ----------------------
Write-Host "[5/5] Capping stale OTA bundles in DB..." -ForegroundColor Yellow
Cap-StaleAppBundles -NewVersionCode $newCode

Write-Host ""
Write-Host "  [OK] Release AAB ready!" -ForegroundColor Green
Write-Host "  AAB: $aabDest" -ForegroundColor White
Write-Host "  versionName: $newName | versionCode: $newCode" -ForegroundColor White
Write-Host ""
Write-Host "  Next: Upload to Google Play Console" -ForegroundColor DarkGray
Write-Host "  https://play.google.com/console" -ForegroundColor DarkGray
Write-Host ""
