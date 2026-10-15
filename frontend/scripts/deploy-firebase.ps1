<#
.SYNOPSIS
    Builds a signed .apk and distributes it to testers via Firebase App Distribution.

.DESCRIPTION
    This script:
    1. Verifies git status (Assert-GitClean).
    2. Validates Firebase authentication BEFORE building (fail fast).
    3. Builds the signed APK via release.ps1 -Artifact apk (unless -SkipBuild is passed).
    4. Locates the newest .apk in frontend/releases/.
    5. Runs `npx --yes firebase-tools appdistribution:distribute` to upload the APK.
    6. Commits the version bump locally on success.

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

# --- 0. Pre-flight Checks ---
Assert-GitClean

$frontendDir = Split-Path -Parent $PSScriptRoot
$androidDir  = Join-Path $frontendDir 'android'
$fastlaneDir = Join-Path $androidDir 'fastlane'
$releasesDir = Join-Path $frontendDir 'releases'
$versionFile = Join-Path $androidDir 'version.properties'

# Resolve Firebase Credentials
$candidateKeys = @(
    $KeyFile,
    (Join-Path $fastlaneDir 'firebase-key.json'),
    (Join-Path $fastlaneDir 'firebase-app-distribution-key.json'),
    (Join-Path $androidDir 'firebase-key.json')
) | Where-Object { $_ -and (Test-Path $_) }

$oldGoogleCreds = $env:GOOGLE_APPLICATION_CREDENTIALS
$hasAuth = $false

if ($candidateKeys.Count -gt 0) {
    $resolvedKey = (Resolve-Path $candidateKeys[0]).Path
    Write-Host "  Using service account key: $resolvedKey" -ForegroundColor Green
    $env:GOOGLE_APPLICATION_CREDENTIALS = $resolvedKey
    $hasAuth = $true
} elseif ($env:GOOGLE_APPLICATION_CREDENTIALS -and (Test-Path $env:GOOGLE_APPLICATION_CREDENTIALS)) {
    Write-Host "  Using GOOGLE_APPLICATION_CREDENTIALS: $env:GOOGLE_APPLICATION_CREDENTIALS" -ForegroundColor Green
    $hasAuth = $true
} elseif ($env:FIREBASE_TOKEN) {
    Write-Host "  Using FIREBASE_TOKEN environment variable." -ForegroundColor Green
    $hasAuth = $true
} else {
    # Check if active CLI session exists
    $cliCheck = (& npx --yes firebase-tools projects:list 2>&1) | Out-String
    if ($LASTEXITCODE -eq 0) {
        $hasAuth = $true
        Write-Host "  Using active Firebase CLI login." -ForegroundColor Green
    }
}

if (-not $hasAuth) {
    Write-Host ""
    Write-Host "==========================================================" -ForegroundColor Red
    Write-Host "  FEHLER: Keine Firebase-Authentifizierung gefunden!      " -ForegroundColor Red
    Write-Host "==========================================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "Bitte wähle eine der folgenden Optionen:" -ForegroundColor Yellow
    Write-Host "  1. Einmaliger Login via Browser (am einfachsten):" -ForegroundColor White
    Write-Host "     Führe in deinem Terminal aus:  npx firebase login" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  2. Service Account Key (Headless / CI):" -ForegroundColor White
    Write-Host "     Platziere deine JSON-Schlüsseldatei unter:" -ForegroundColor White
    Write-Host "     frontend/android/fastlane/firebase-key.json" -ForegroundColor Cyan
    Write-Host ""
    throw "Firebase authentication check failed. Run 'npx firebase login' first."
}

# --- 1. Build signed APK (unless skipped) -----------------------------
$buildRan = $false
try {
    if (-not $SkipBuild) {
        Write-Host "[1/3] Building signed APK (release.ps1 -Artifact apk)..." -ForegroundColor Yellow
        & (Join-Path $PSScriptRoot 'release.ps1') -Bump $Bump -Artifact apk
        if ($LASTEXITCODE -ne 0) { throw "release.ps1 failed" }
        $buildRan = $true
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
    $versionContent = Get-Content $versionFile -Raw
    $versionName = [regex]::Match($versionContent, 'VERSION_NAME=(.+)').Groups[1].Value.Trim()
    $versionCode = [regex]::Match($versionContent, 'VERSION_CODE=(\d+)').Groups[1].Value.Trim()

    if (-not $Notes) {
        $Notes = "Release v$versionName ($versionCode) - $(Get-Date -Format 'dd.MM.yyyy HH:mm')"
    }
    Write-Host "  Release Notes: $Notes" -ForegroundColor DarkGray

    # --- 4. Distribute via Firebase CLI ----------------------------------
    Write-Host "[3/3] Uploading to Firebase App Distribution ($Group)..." -ForegroundColor Yellow

    $cliArgs = @(
        "firebase-tools",
        "appdistribution:distribute",
        $apk.FullName,
        "--app", $AppId,
        "--groups", $Group,
        "--release-notes", $Notes
    )

    & npx --yes @cliArgs
    if ($LASTEXITCODE -ne 0) {
        throw "firebase-tools appdistribution:distribute exited with code $LASTEXITCODE"
    }

    # --- 5. Commit version bump locally on success -----------------------
    if ($buildRan) {
        $versionFileRel = "frontend/android/version.properties"
        $diff = Get-GitOutput -Arguments @("diff", "--name-only", $versionFileRel)
        if ($diff) {
            Write-Host "Committing version bump locally on current branch..." -ForegroundColor Yellow
            Run-Git -Arguments @("add", $versionFileRel)
            Run-Git -Arguments @("commit", "-m", "chore(version): bump app version to $versionName ($versionCode) for firebase distribution")
        }
    }

    Write-Host ""
    Write-Host "  [OK] Successfully distributed $($apk.Name) to group '$Group'!" -ForegroundColor Green
    Write-Host "  Firebase Console: https://console.firebase.google.com/project/snagbite-c6c33/appdistribution" -ForegroundColor DarkGray
    Write-Host ""
}
catch {
    # If the upload failed and we bumped the version during this run, restore version.properties
    if ($buildRan) {
        Write-Host "Reverting uncommitted version bump after failed upload..." -ForegroundColor Yellow
        Run-Git -Arguments @("checkout", "frontend/android/version.properties") -IgnoreError
    }
    throw $_
}
finally {
    if ($candidateKeys.Count -gt 0) {
        $env:GOOGLE_APPLICATION_CREDENTIALS = $oldGoogleCreds
    }
}
