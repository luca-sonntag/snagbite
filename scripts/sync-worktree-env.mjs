#!/usr/bin/env node

/**
 * scripts/sync-worktree-env.mjs
 *
 * Automatische Synchronisation von .env*-Dateien aus dem Haupt-Repository in neue Git-Worktrees.
 * Wird automatisch als npm "predev" Hook ausgeführt oder manuell via "npm run sync:env".
 */

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const args = process.argv.slice(2);
const isForce = args.includes('--force') || args.includes('-f');
const isVerbose =
  args.includes('--verbose') ||
  args.includes('-v') ||
  process.env.npm_lifecycle_event === 'sync:env' ||
  process.env.npm_lifecycle_event === 'sync:env:force';

function getGitPaths() {
  try {
    const topLevelRaw = execSync('git rev-parse --show-toplevel', {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();

    const gitCommonDirRaw = execSync('git rev-parse --path-format=absolute --git-common-dir', {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();

    if (!gitCommonDirRaw || !topLevelRaw) return null;

    const currentRoot = path.resolve(topLevelRaw);
    const gitCommonDir = path.isAbsolute(gitCommonDirRaw)
      ? gitCommonDirRaw
      : path.resolve(currentRoot, gitCommonDirRaw);
    const mainRoot = path.resolve(gitCommonDir, '..');

    return { mainRoot, currentRoot };
  } catch {
    return null;
  }
}

function getWorkspaces(mainRoot) {
  try {
    const pkgPath = path.join(mainRoot, 'package.json');
    if (fs.existsSync(pkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      if (Array.isArray(pkg.workspaces)) {
        return ['.', ...pkg.workspaces];
      }
    }
  } catch {
    // Fallback falls package.json nicht gelesen werden kann
  }
  return ['.', 'backend', 'frontend', 'healthcheck', 'website', 'shared'];
}

function syncEnvFiles() {
  const gitPaths = getGitPaths();
  if (!gitPaths) {
    if (isVerbose) console.log('[sync-env] Kein Git-Repository erkannt.');
    return;
  }

  const { mainRoot, currentRoot } = gitPaths;
  const isWorktree =
    path.normalize(mainRoot).toLowerCase() !== path.normalize(currentRoot).toLowerCase();

  if (!isWorktree) {
    if (isVerbose) {
      console.log('[sync-env] Haupt-Repository aktiv (kein Worktree). Keine Synchronisation erforderlich.');
    }
    return;
  }

  const workspaces = getWorkspaces(mainRoot);
  const copiedFiles = [];
  const skippedFiles = [];

  for (const workspace of workspaces) {
    const sourceDir = path.join(mainRoot, workspace);
    const targetDir = path.join(currentRoot, workspace);

    if (!fs.existsSync(sourceDir)) continue;

    let entries;
    try {
      entries = fs.readdirSync(sourceDir, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      if (!entry.isFile()) continue;

      const name = entry.name;
      // Nur .env* erfassen, versionierte .example Dateien ignorieren
      if (!name.startsWith('.env') || name.includes('.example')) continue;

      const sourceFile = path.join(sourceDir, name);
      const targetFile = path.join(targetDir, name);
      const relPath = path.join(workspace === '.' ? '' : workspace, name).replace(/\\/g, '/');

      const targetExists = fs.existsSync(targetFile);

      if (targetExists && !isForce) {
        skippedFiles.push(relPath);
        continue;
      }

      try {
        fs.mkdirSync(path.dirname(targetFile), { recursive: true });
        fs.copyFileSync(sourceFile, targetFile);
        copiedFiles.push(relPath);
      } catch (err) {
        console.error(`[sync-env] Fehler beim Kopieren von ${relPath}:`, err.message);
      }
    }
  }

  if (copiedFiles.length > 0) {
    console.log(`[sync-env] Worktree erkannt. ${copiedFiles.length} .env-Datei(en) aus Haupt-Repo synchronisiert:`);
    for (const file of copiedFiles) {
      console.log(`  ✓ ${file}`);
    }
  } else if (isVerbose) {
    console.log(`[sync-env] Alle .env-Dateien im Worktree sind bereits vorhanden (${skippedFiles.length} geprüft).`);
  }
}

syncEnvFiles();
