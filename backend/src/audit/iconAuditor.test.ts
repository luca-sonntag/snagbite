import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  auditSingleIcon,
  MAX_REVIEW_ATTEMPTS,
} from './iconAuditor.js';
import { reviewIconWithGeminiVision } from './visionReviewer.js';
import {
  saveIconsManifest,
  getIconsManifestPath,
  resetManifestsCache,
} from './auditManifest.js';

describe('iconAuditor & visionReviewer', () => {
  const iconPath = getIconsManifestPath();
  let origIcon: string | null = null;

  beforeEach(() => {
    resetManifestsCache();
    if (fs.existsSync(iconPath)) origIcon = fs.readFileSync(iconPath, 'utf-8');
  });

  afterEach(() => {
    resetManifestsCache();
    if (origIcon !== null) fs.writeFileSync(iconPath, origIcon, 'utf-8');
    else if (fs.existsSync(iconPath)) fs.unlinkSync(iconPath);
  });

  test('MAX_REVIEW_ATTEMPTS is 3', () => {
    assert.equal(MAX_REVIEW_ATTEMPTS, 3);
  });

  test('returns confirmed cache hit if already audited in manifest', async () => {
    fs.writeFileSync(iconPath, 'dummy-icon-content');
    saveIconsManifest({
      version: 1,
      lastUpdated: new Date().toISOString(),
      entries: {
        'apple.webp': {
          filename: 'apple.webp',
          status: 'ai_confirmed',
          auditedAt: new Date().toISOString(),
          marginPct: 0.2,
          zoomApplied: false,
          regenerated: false,
          visualPass: true,
        },
      },
    });

    const res = await auditSingleIcon({
      mappingKey: 'apple',
      category: 'FRUITS_VEGETABLES',
      force: false,
    });

    assert.equal(res.status, 'ai_confirmed');
    assert.equal(res.costUsd, 0);
    assert.ok(res.reasoning.includes('manifest cache'));
  });

  test('dry-run mode simulates check without throwing or creating files', async () => {
    const res = await auditSingleIcon({
      mappingKey: 'fantasy_dragonfruit_soup_99',
      category: 'OTHER',
      dryRun: true,
      force: true,
    });

    assert.equal(res.existed, false);
    assert.equal(res.generated, true);
    assert.equal(res.status, 'pending');
    assert.ok(res.reasoning.includes('[DRY RUN]'));
  });

  test('reviewIconWithGeminiVision handles non-existent file gracefully', async () => {
    const res = await reviewIconWithGeminiVision('/non/existent/path.webp', 'apple', 'FRUITS_VEGETABLES');
    assert.equal(res.visualPass, true);
    assert.equal(res.costUsd, 0);
  });
});
