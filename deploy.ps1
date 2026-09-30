<#
.SYNOPSIS
    Orchestrator for merging develop to master, tagging, pushing (deploying backend on Railway),
    and building/releasing the mobile app to Google Play Store.

.DESCRIPTION
    This script can deploy the backend (by merging develop to master and pushing with version tags),
    deploy the mobile app to Google Play Console, or both.
    Supports both non-interactive CLI flags and interactive selection menu.
    All operations are structured as a single transaction. If any step fails, all local branch
    modifications, commits, merges, and tags are rolled back automatically.

.PARAMETER Backend
    Switch to run the backend deploy flow (merge develop -> master, tag, push).

.PARAMETER App
    Switch to run the app release flow (build AAB and upload to Google Play).

.PARAMETER All
    Switch to run both backend and app release flows.

.PARAMETER Track
    Google Play release track: production (default), internal, beta, alpha.

.PARAMETER Bump
    versionName bump type: none (default), patch, minor, major.

.PARAMETER SkipBuild
    Skip building the AAB and just upload the newest existing AAB.

.PARAMETER KeyFile
    Path to the Google Play service account JSON key.

.PARAMETER Status
    Play release status: completed (default), draft, halted.

.EXAMPLE
    .\deploy.ps1                         # Launches interactive menu
    .\deploy.ps1 -Backend                # Deploy backend only
    .\deploy.ps1 -App -Track internal    # Deploy app to internal track
    .\deploy.ps1 -All -Bump patch        # Bump app version, deploy backend & app
#>

param(
    [switch]$Backend,
    [switch]$App,
    [switch]$All,
    [ValidateSet('internal', 'alpha', 'beta', 'production')]
    [string]$Track = 'production',
    [ValidateSet('none', 'patch', 'minor', 'major')]
    [string]$Bump = 'none',
    [switch]$SkipBuild,
    [string]$KeyFile,
    [ValidateSet('completed', 'draft', 'halted')]
    [string]$Status = 'completed'
)

$ErrorActionPreference = 'Stop'

. "$PSScriptRoot/frontend/scripts/git-utils.ps1"

# --- Frontend .env Safety Guard ---

# Validates VITE_API_BASE_URL in frontend/.env before any native (Capacitor / APK / AAB)
# build runs. A missing, empty, or loopback value would silently ship a Play Store release
# whose production webview cannot reach the backend (everything stays on
# http(s)://localhost and dies). This guard is a hard pre-flight check.
function Test-FrontendApiBaseUrl {
    $envFile = "frontend/.env"
    $prodEnvFile = "frontend/.env.production"
    $envPath = $envFile
    
    if (Test-Path $prodEnvFile) {
        $content = Get-Content $prodEnvFile -Raw
        $match = [regex]::Match($content, '(?im)^\s*(?:export\s+)?VITE_API_BASE_URL\s*=\s*(.*?)\s*$')
        if ($match.Success) {
            $val = ($match.Groups[1].Value -replace '\s*#.*$', '').Trim().Trim('"').Trim("'")
            if (-not [string]::IsNullOrWhiteSpace($val)) {
                $envPath = $prodEnvFile
            }
        }
    }

    if (-not (Test-Path $envPath)) {
        throw "$envPath not found. Create it before building a native release."
    }

    $content = Get-Content $envPath -Raw
    # Match `VITE_API_BASE_URL=...`, tolerant to leading whitespace and an optional `export `.
    $match = [regex]::Match($content, '(?im)^\s*(?:export\s+)?VITE_API_BASE_URL\s*=\s*(.*?)\s*$')
    if (-not $match.Success) {
        throw "VITE_API_BASE_URL is not defined in $envPath. Add it (e.g. `VITE_API_BASE_URL=https://api.example.com`) before building a native release."
    }

    # Strip inline comments and surrounding quotes, then trim.
    $raw = ($match.Groups[1].Value -replace '\s*#.*$', '').Trim()
    $raw = $raw.Trim('"').Trim("'")

    if ([string]::IsNullOrWhiteSpace($raw)) {
        throw "VITE_API_BASE_URL in $envPath is empty. Native (Capacitor) builds cannot use a same-origin / empty value. Set it to your production backend origin, e.g. `VITE_API_BASE_URL=https://api.example.com`."
    }

    $parsedUri = $null
    if (-not [Uri]::TryCreate($raw, [UriKind]::Absolute, [ref]$parsedUri) -or ($parsedUri.Scheme -ne 'http' -and $parsedUri.Scheme -ne 'https')) {
        throw "VITE_API_BASE_URL in $envPath is not a valid http(s) URL: '$raw'. Use the form `VITE_API_BASE_URL=https://api.example.com`."
    }

    # Reject loopback / device-only addresses. System.Uri.IsLoopback already covers 'localhost'
    # (case-insensitive), 127.0.0.0/8, and every IPv6 loopback rendering ([::1], [0:0:...:1], ...).
    # We also explicitly block 0.0.0.0 and the IPv6 unspecified address [::] which .NET does not
    # classify as loopback but are equally unsafe in a production client URL.
    $hostName = $parsedUri.Host.ToLowerInvariant()
    $extraBlocked = @('0.0.0.0', '[0000:0000:0000:0000:0000:0000:0000:0000]')
    if ($parsedUri.IsLoopback -or $extraBlocked -contains $hostName) {
        throw "VITE_API_BASE_URL in $envPath points to a loopback or unspecified address ('$($parsedUri.Host)'). This is unsafe for a native release because the device has no access to your dev machine. Use a publicly reachable backend origin, e.g. `VITE_API_BASE_URL=https://api.example.com`."
    }

    Write-Host "  VITE_API_BASE_URL OK (from $envPath): $($parsedUri.Scheme)://$($parsedUri.Host)" -ForegroundColor Green
}

# --- Transaction Helper ---

$global:originalBranch = $null
$global:originalMasterCommit = $null
$global:originalDevelopCommit = $null
$global:rollbackNeeded = $false
$global:rollbackTag = $null

function Initialize-GitState {
    # Check if working directory is clean, prompting the user if it isn't
    Assert-GitClean

    $global:originalBranch = (Get-GitOutput -Arguments @("branch", "--show-current")).ToString().Trim()
    $global:originalMasterCommit = (Get-GitOutput -Arguments @("rev-parse", "master")).ToString().Trim()
    $global:originalDevelopCommit = (Get-GitOutput -Arguments @("rev-parse", "develop")).ToString().Trim()
    $global:rollbackNeeded = $true
}

function Undo-Transaction {
    if (-not $global:rollbackNeeded) { return }

    Write-Host ""
    Write-Host "==============================================" -ForegroundColor Red
    Write-Host "       DEPLOYMENT FAILED: ROLLING BACK        " -ForegroundColor Red
    Write-Host "==============================================" -ForegroundColor Red
    Write-Host ""

    # Abort any in-progress rebase or merge and clean lock files
    Run-Git -Arguments @("rebase", "--abort") -IgnoreError
    Run-Git -Arguments @("merge", "--abort") -IgnoreError
    if (Test-Path ".git/HEAD.lock") {
        Remove-Item -Path ".git/HEAD.lock" -Force -ErrorAction SilentlyContinue
    }
    if (Test-Path ".git/index.lock") {
        Remove-Item -Path ".git/index.lock" -Force -ErrorAction SilentlyContinue
    }

    # Restore version.properties if modified on disk
    if (Test-Path "frontend/android/version.properties") {
        Write-Host "Restoring version.properties..." -ForegroundColor Yellow
        Run-Git -Arguments @("checkout", "--", "frontend/android/version.properties") -IgnoreError
    }

    # Delete local tag if created
    if ($global:rollbackTag) {
        Write-Host "Deleting local tag v$global:rollbackTag..." -ForegroundColor Yellow
        Run-Git -Arguments @("tag", "-d", "v$global:rollbackTag") -IgnoreError
    }

    # Reset branches to their original states
    Write-Host "Resetting develop to $global:originalDevelopCommit..." -ForegroundColor Yellow
    Run-Git -Arguments @("checkout", "develop") -IgnoreError
    Run-Git -Arguments @("reset", "--hard", $global:originalDevelopCommit) -IgnoreError

    Write-Host "Resetting master to $global:originalMasterCommit..." -ForegroundColor Yellow
    Run-Git -Arguments @("checkout", "master") -IgnoreError
    Run-Git -Arguments @("reset", "--hard", $global:originalMasterCommit) -IgnoreError

    # Checkout original branch
    Write-Host "Returning to original branch: $global:originalBranch..." -ForegroundColor Yellow
    Run-Git -Arguments @("checkout", $global:originalBranch) -IgnoreError

    Write-Host ""
    Write-Host "Rollback completed. Repository is back to its clean starting state." -ForegroundColor Green
    Write-Host ""
}

# --- Deployment Tasks ---

function Build-AndUploadApp {
    Write-Host ""
    Write-Host "+----------------------------------------------+" -ForegroundColor Cyan
    Write-Host "|  Releasing App to Google Play Store          |" -ForegroundColor Cyan
    Write-Host "+----------------------------------------------+" -ForegroundColor Cyan
    Write-Host ""

    # Pre-flight: ensure the production backend URL is configured for the native bundle.
    Write-Host "Validating frontend/.env VITE_API_BASE_URL for native build..." -ForegroundColor Yellow
    Test-FrontendApiBaseUrl

    $params = @{}
    $params["Track"] = $Track
    if ($Bump -ne 'none') { $params["Bump"] = $Bump }
    if ($SkipBuild) { $params["SkipBuild"] = $true }
    if ($KeyFile) { $params["KeyFile"] = $KeyFile }
    if ($Status -ne 'completed') { $params["Status"] = $Status }

    Write-Host "Calling frontend/scripts/deploy-playstore.ps1 with parameters:" -ForegroundColor Yellow
    $params.Keys | ForEach-Object { Write-Host "  $_ : $($params[$_])" -ForegroundColor DarkGray }

    # Run script and ensure it fails scripting-wise if exit code is non-zero
    $oldOrchestrator = $env:SNAGBITE_DEPLOY_ORCHESTRATOR
    $env:SNAGBITE_DEPLOY_ORCHESTRATOR = "true"
    try {
        & "frontend/scripts/deploy-playstore.ps1" @params
        if ($LASTEXITCODE -ne 0) { throw "App release script returned non-zero exit code $LASTEXITCODE" }
    } finally {
        $env:SNAGBITE_DEPLOY_ORCHESTRATOR = $oldOrchestrator
    }
}

function Merge-AndDeployBackend {
    Write-Host ""
    Write-Host "+----------------------------------------------+" -ForegroundColor Cyan
    Write-Host "|  Deploying Backend (Develop -> Master)       |" -ForegroundColor Cyan
    Write-Host "+----------------------------------------------+" -ForegroundColor Cyan
    Write-Host ""

    # Read version details
    $versionFile = "frontend/android/version.properties"
    if (-not (Test-Path $versionFile)) {
        throw "version.properties not found at $versionFile"
    }
    $versionContent = Get-Content $versionFile -Raw
    $versionName = [regex]::Match($versionContent, 'VERSION_NAME=(.+)').Groups[1].Value.Trim()
    $versionCode = [regex]::Match($versionContent, 'VERSION_CODE=(\d+)').Groups[1].Value.Trim()

    # Store version name for potential tag deletion in rollback
    $global:rollbackTag = $versionName

    # Discard any build-generated modifications to tracked files to ensure clean checkout
    Write-Host "Discarding build-generated file modifications to ensure clean checkout..." -ForegroundColor Yellow
    Run-Git -Arguments @("checkout", "--", ".")

    Invoke-GitMasterMergeAndTag -TagName "v$versionName" -TagMessage "Release v$versionName (Code $versionCode)"
}

# --- Main Entry Point ---

# Determine flow based on parameters
$runBackend = $Backend -or $All
$runApp = $App -or $All

if (-not $runBackend -and -not $runApp) {
    # Interactive Menu
    Clear-Host
    Write-Host "=========================================================" -ForegroundColor Cyan
    Write-Host "       Snagbite Global Deploy & Release Orchestrator     " -ForegroundColor Cyan
    Write-Host "=========================================================" -ForegroundColor Cyan
    Write-Host "1) Deploy Backend (Merge develop to master, tag, and push)"
    Write-Host "2) Release App (Build & upload to Google Play Console)"
    Write-Host "3) Deploy Both (Backend & App)"
    Write-Host "4) Exit"
    Write-Host ""
    
    $choice = Read-Host "Select an option [1-4]"
    switch ($choice) {
        "1" { $runBackend = $true }
        "2" { $runApp = $true }
        "3" { $runBackend = $true; $runApp = $true }
        "4" { Write-Host "Exiting."; exit 0 }
        default { Write-Warning "Invalid choice. Exiting."; exit 1 }
    }
}

$oldGraphifySkip = $env:GRAPHIFY_SKIP_HOOK
try {
    # Suppress background graphify hooks to avoid Windows file locks on .git/HEAD
    $env:GRAPHIFY_SKIP_HOOK = "1"

    # Setup initial git tracking state
    Initialize-GitState

    # Reorder operations if All is specified: App first (more failure prone), then Backend
    if ($runApp) {
        Build-AndUploadApp
        
        # Commit version bump immediately so it is not lost if the backend step fails
        if (-not $SkipBuild) {
            $versionFile = "frontend/android/version.properties"
            $diff = Get-GitOutput -Arguments @("diff", "--name-only", $versionFile)
            if ($diff) {
                # Read version details
                $versionContent = Get-Content $versionFile -Raw
                $versionName = [regex]::Match($versionContent, 'VERSION_NAME=(.+)').Groups[1].Value.Trim()
                $versionCode = [regex]::Match($versionContent, 'VERSION_CODE=(\d+)').Groups[1].Value.Trim()

                Write-Host "Committing version bump to current branch ($global:originalBranch)..." -ForegroundColor Yellow
                Run-Git -Arguments @("add", $versionFile)
                Run-Git -Arguments @("commit", "-m", "chore(version): bump app version to $versionName ($versionCode)")
                
                Write-Host "Pushing version bump to origin $global:originalBranch..." -ForegroundColor Yellow
                Run-Git -Arguments @("push", "origin", $global:originalBranch)
                
                # Update rollback target to this commit so we don't roll past it
                $global:originalDevelopCommit = (Get-GitOutput -Arguments @("rev-parse", "develop")).ToString().Trim()
            }
        }
    }

    if ($runBackend) {
        Merge-AndDeployBackend
    }

    # If we reached here, deploy was completely successful, no rollback needed
    $global:rollbackNeeded = $false
    Write-Host ""
    Write-Host "[OK] Deploy and release completed successfully!" -ForegroundColor Green
    Write-Host ""
}
catch {
    Undo-Transaction
    Write-Error "Deployment failed: $_"
    exit 1
}
finally {
    $env:GRAPHIFY_SKIP_HOOK = $oldGraphifySkip
}
