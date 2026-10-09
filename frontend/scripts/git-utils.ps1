<#
.SYNOPSIS
    Shared Git helper utilities for Snagbite deployment and release scripts.
#>

$ErrorActionPreference = 'Stop'

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

function Cap-StaleAppBundles {
    param(
        [Parameter(Mandatory = $true)]
        [int]$NewVersionCode
    )

    $repoRoot = Get-GitRepoRoot
    try {
        Write-Host "  [OTA-Guard] Checking for stale open-ended OTA bundles (min_version_code < $NewVersionCode)..." -ForegroundColor Yellow
        $resultRaw = & npx tsx "$repoRoot\backend\src\scripts\deploy\otaBundleManager.ts" --prod cap "--version-code=$NewVersionCode"
        $res = $resultRaw | ConvertFrom-Json
        if ($res.capped -gt 0) {
            $cappedMaxCode = $NewVersionCode - 1
            Write-Host "  [OTA-Guard] Capped $($res.capped) stale open-ended OTA bundle(s) with max_version_code = $cappedMaxCode." -ForegroundColor Green
        } else {
            Write-Host "  [OTA-Guard] No open-ended stale OTA bundles found for native versionCode $NewVersionCode." -ForegroundColor Green
        }
    } catch {
        Write-Host "  [OTA-Guard] Warning: Failed to cap stale OTA bundles in DB: $_" -ForegroundColor Yellow
    }
}

function Get-GitRepoRoot {
    $oldEap = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
        $root = (& git rev-parse --show-toplevel 2>$null)
        if ($LASTEXITCODE -eq 0 -and $root) {
            return $root.Trim()
        }
    } finally {
        $ErrorActionPreference = $oldEap
    }
    return (Split-Path -Parent (Split-Path -Parent $PSScriptRoot))
}

function Get-GitOutput {
    param(
        [string[]]$Arguments
    )
    $oldEap = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
        $output = & git $Arguments
        $exitCode = $LASTEXITCODE
        if ($exitCode -ne 0) {
            throw "Git command failed with exit code ${exitCode}: git $Arguments"
        }
        return $output
    } finally {
        $ErrorActionPreference = $oldEap
    }
}

function Run-Git {
    param(
        [string[]]$Arguments,
        [switch]$IgnoreError
    )
    $oldEap = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
        & git $Arguments
        $exitCode = $LASTEXITCODE
        if ($exitCode -ne 0 -and -not $IgnoreError) {
            throw "Git command failed with exit code ${exitCode}: git $Arguments"
        }
        return $exitCode
    } finally {
        $ErrorActionPreference = $oldEap
    }
}

function Assert-GitClean {
    if ($env:SNAGBITE_DEPLOY_ORCHESTRATOR -eq "true") {
        return
    }

    $repoRoot = Get-GitRepoRoot
    Push-Location $repoRoot
    try {
        while ($true) {
            $status = Get-GitOutput -Arguments @("status", "--porcelain")
            if (-not $status) {
                break
            }

            Write-Host ""
            Write-Host "WARNING: You have uncommitted changes in the repository:" -ForegroundColor Yellow
            & git status -s
            Write-Host ""
            Write-Host "Please commit or stash your changes in another terminal before continuing." -ForegroundColor Yellow
            Write-Host "Press Enter to check again, or type 'abort' to exit." -ForegroundColor Cyan
            
            $input = Read-Host "Choice"
            if ($input.Trim().ToLower() -eq "abort") {
                throw "Deployment aborted due to uncommitted changes."
            }
        }
    } finally {
        Pop-Location
    }
}

function Invoke-GitMasterMergeAndTag {
    param(
        [Parameter(Mandatory = $true)]
        [string]$TagName,
        [Parameter(Mandatory = $true)]
        [string]$TagMessage,
        [string]$FileToCommit,
        [string]$CommitMessage
    )

    $repoRoot = Get-GitRepoRoot
    Push-Location $repoRoot
    $oldGraphifySkip = $env:GRAPHIFY_SKIP_HOOK
    try {
        # Temporarily suppress background graphify rebuild hooks during rapid branch switches
        # to prevent Windows file lock contention on .git/HEAD and .git/HEAD.lock
        $env:GRAPHIFY_SKIP_HOOK = "1"

        $originalBranch = (Get-GitOutput -Arguments @("branch", "--show-current")).ToString().Trim()
        if ([string]::IsNullOrWhiteSpace($originalBranch)) { $originalBranch = "develop" }

        # 1. Commit specific file (e.g. version.properties) on source branch if requested & modified
        if ($FileToCommit -and $CommitMessage) {
            $diff = Get-GitOutput -Arguments @("diff", "--name-only", $FileToCommit)
            if ($diff) {
                Write-Host "Committing $FileToCommit on branch '$originalBranch'..." -ForegroundColor Yellow
                Run-Git -Arguments @("add", $FileToCommit)
                Run-Git -Arguments @("commit", "-m", $CommitMessage)
                
                Write-Host "Pushing version bump to origin $originalBranch..." -ForegroundColor Yellow
                Run-Git -Arguments @("push", "origin", $originalBranch)
            }
        }

        # 2. Switch to master
        Write-Host "Switching to master branch..." -ForegroundColor Yellow
        Run-Git -Arguments @("checkout", "master")

        # 3. Pull latest master (explicit --no-rebase prevents rebasing when pull.rebase is configured)
        Write-Host "Pulling latest master from remote..." -ForegroundColor Yellow
        Run-Git -Arguments @("pull", "--no-rebase", "origin", "master")

        # 4. Merge current branch into master if not already on master
        if ($originalBranch -ne "master") {
            Write-Host "Merging $originalBranch into master (--no-ff)..." -ForegroundColor Yellow
            Run-Git -Arguments @("merge", $originalBranch, "--no-ff", "--no-edit")
        } else {
            Write-Host "Already on master branch; no branch merge needed." -ForegroundColor Green
        }

        # 5. Handle Tag (re-tag if exists)
        $tagExists = (Get-GitOutput -Arguments @("tag", "-l", $TagName))
        if ($tagExists) {
            Write-Host "Tag $TagName already exists. Re-tagging..." -ForegroundColor Yellow
            Run-Git -Arguments @("tag", "-d", $TagName) -IgnoreError
            Run-Git -Arguments @("push", "origin", "--delete", $TagName) -IgnoreError
        }

        # 6. Create Tag
        Write-Host "Creating release tag $TagName..." -ForegroundColor Yellow
        Run-Git -Arguments @("tag", "-a", $TagName, "-m", $TagMessage)

        # 7. Push master branch and tag to origin
        Write-Host "Pushing master branch and tag $TagName to origin..." -ForegroundColor Yellow
        Run-Git -Arguments @("push", "origin", "master")
        Run-Git -Arguments @("push", "origin", $TagName)

        # 8. Switch back to original branch
        if ($originalBranch -ne "master") {
            Write-Host "Switching back to original branch '$originalBranch'..." -ForegroundColor Yellow
            Run-Git -Arguments @("checkout", $originalBranch)
        }

        Write-Host "  [OK] Successfully merged $sourceBranch -> master and pushed tag $TagName." -ForegroundColor Green
    } finally {
        $env:GRAPHIFY_SKIP_HOOK = $oldGraphifySkip
        Pop-Location
    }
}
