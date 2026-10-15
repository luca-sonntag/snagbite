<#
.SYNOPSIS
    Builds a signed .apk and distributes it to testers via Firebase App Distribution.

.DESCRIPTION
    This script:
    1. Verifies git status (Assert-GitClean).
    2. Builds the signed APK via release.ps1 -Artifact apk (unless -SkipBuild is passed).
    3. Locates the newest .apk in frontend/releases/.
    4. Resolves Firebase credentials:
       - -KeyFile parameter, OR
       - frontend/android/fastlane/firebase-key.json, OR
       - frontend/android/firebase-key.json, OR
       - $env:FIREBASE_APP_DISTRIBUTION_CREDENTIALS, OR
       - $env:GOOGLE_APPLICATION_CREDENTIALS, OR
       - $env:FIREBASE_TOKEN (from `npx firebase login:ci`), OR
       - Active Firebase CLI login.
    5. Runs `npx --yes firebase-tools appdistribution:distribute` to upload the APK.

.PARAMETER Bump
    versionName bump type: none (default), patch, minor, major.
    Passed to release.ps1. Ignored when -SkipBuild is set.

.PARAMETER Group
    Firebase tester group alias (default: 'all-testers').

.PARAMETER Notes
    Release notes / changelog visible to testers in the invitation / tester app.
    Defaults to 'Release v<versionName> (<versionCode>) - <timestamp>'.

.PARAMETER KeyFile
    Optional path to the Google/Firebase service account JSON key.

.PARAMETER AppId
    Firebase mobile SDK app ID (defaults to Snagbite's App ID).

.PARAMETER SkipBuild
    Skip building a new APK and distribute the newest existing .apk in releases/.

.EXAMPLE
    .\deploy-firebase.ps1
    .\deploy-firebase.ps1 -Bump patch -Notes "Fix for timer and recipe copilot"
    .\deploy-firebase.ps1 -SkipBuild -Notes "Retrying upload"
#>

param(
    [ValidateSet('none', 'patch', 'minor', 'major')]
    [string]$Bump = 'none',
    [string]$Group = 'all-testers',
    [string]$Notes,
    [string]$KeyFile,
    [string]$AppId = '1:453029629442:android:442396361a782e1196a11b',
    [switch]$SkipBuild
)

$ErrorActionPreference = 'Stop'

. "$PSScriptRoot/git-utils.ps1"

# --- Git Pre-flight checks ---
Assert-GitClean

$frontendDir = Split-Path -Parent $PSScriptRoot
$androidDir  = Join-Path $frontendDir 'android'
$fastlaneDir = Join-Path $androidDir 'fastlane'
$releasesDir = Join-Path $frontendDir 'releases'
$versionFile = Join-Path $androidDir 'version.properties'

# --- 1. Build signed APK (unless skipped) -----------------------------
if (-not $SkipBuild) {
    Write-Host "[1/3] Building signed APK (release.ps1 -Artifact apk)..." -ForegroundColor Yellow
    & (Join-Path $PSScriptRoot 'release.ps1') -Bump $Bump -Artifact apk
    if ($LASTEXITCODE -ne 0) { throw "release.ps1 failed" }
} else {
    Write-Host "[1/3] Skipping build (-SkipBuild)." -ForegroundColor DarkGray
}

# --- 2. Locate newest APK --------------------------------------------
Write-Host "[2/3] Locating newest .apk..." -ForegroundColor Yellow
if (-not (Test-Path $releasesDir)) { throw "Releases folder not found: $releasesDir" }
$apk = Get-ChildItem -Path (Join-Path $releasesDir '*.apk') |
    Sort-Object LastWriteTime -Descending | Select-Object -First 1
if (-not $apk) {
    throw "No .apk found in $releasesDir. Build one first (omit -SkipBuild or run release.ps1 -Artifact apk)."
}
Write-Host "  -> $($apk.Name)" -ForegroundColor Green

# --- 3. Resolve Release Notes ----------------------------------------
if (-not $Notes) {
    if (Test-Path $versionFile) {
        $versionContent = Get-Content $versionFile -Raw
        $versionName = [regex]::Match($versionContent, 'VERSION_NAME=(.+)').Groups[1].Value.Trim()
        $versionCode = [regex]::Match($versionContent, 'VERSION_CODE=(\d+)').Groups[1].Value.Trim()
        $Notes = "Release v$versionName ($versionCode) - $(Get-Date -Format 'dd.MM.yyyy HH:mm')"
    } else {
        $Notes = "Release build $(Get-Date -Format 'dd.MM.yyyy HH:mm')"
    }
}
Write-Host "  Release Notes: $Notes" -ForegroundColor DarkGray

# --- 4. Resolve Firebase Credentials ---------------------------------
$candidateKeys = @(
    $KeyFile,
    (Join-Path $fastlaneDir 'firebase-key.json'),
    (Join-Path $fastlaneDir 'firebase-app-distribution-key.json'),
    (Join-Path $androidDir 'firebase-key.json')
) | Where-Object { $_ -and (Test-Path $_) }

$oldGoogleCreds = $env:GOOGLE_APPLICATION_CREDENTIALS
if ($candidateKeys.Count -gt 0) {
    $resolvedKey = (Resolve-Path $candidateKeys[0]).Path
    Write-Host "  Using service account key: $resolvedKey" -ForegroundColor Green
    $env:GOOGLE_APPLICATION_CREDENTIALS = $resolvedKey
} elseif ($env:GOOGLE_APPLICATION_CREDENTIALS -and (Test-Path $env:GOOGLE_APPLICATION_CREDENTIALS)) {
    Write-Host "  Using GOOGLE_APPLICATION_CREDENTIALS: $env:GOOGLE_APPLICATION_CREDENTIALS" -ForegroundColor Green
} elseif ($env:FIREBASE_TOKEN) {
    Write-Host "  Using FIREBASE_TOKEN environment variable." -ForegroundColor Green
} else {
    Write-Host "  Notice: No service account key or FIREBASE_TOKEN found." -ForegroundColor DarkYellow
    Write-Host "  Firebase CLI will attempt to use your existing interactive login session." -ForegroundColor DarkYellow
    Write-Host "  (To set up headless auth, see docs/architecture/deployment-and-ota.md)" -ForegroundColor DarkGray
}

# --- 5. Distribute via Firebase CLI ----------------------------------
Write-Host "[3/3] Uploading to Firebase App Distribution ($Group)..." -ForegroundColor Yellow

$cliArgs = @(
    "firebase-tools",
    "appdistribution:distribute",
    $apk.FullName,
    "--app", $AppId,
    "--groups", $Group,
    "--release-notes", $Notes
)

try {
    & npx --yes @cliArgs
    if ($LASTEXITCODE -ne 0) {
        throw "firebase-tools appdistribution:distribute exited with code $LASTEXITCODE"
    }
} finally {
    if ($candidateKeys.Count -gt 0) {
        $env:GOOGLE_APPLICATION_CREDENTIALS = $oldGoogleCreds
    }
}

Write-Host ""
Write-Host "  [OK] Successfully distributed $($apk.Name) to group '$Group'!" -ForegroundColor Green
Write-Host "  Firebase Console: https://console.firebase.google.com/project/snagbite-c6c33/appdistribution" -ForegroundColor DarkGray
Write-Host ""
