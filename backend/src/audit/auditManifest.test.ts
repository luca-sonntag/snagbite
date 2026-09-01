import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  loadMappingsManifest,
  saveMappingsManifest,
  isMappingConfirmed,
  recordMappingAudit,
  loadIconsManifest,
  saveIconsManifest,
  isIconConfirmed,
  recordIconAudit,
  resetManifestsCache,
  getMappingsManifestPath,
  getIconsManifestPath,
} from './auditManifest.js';

import os from 'node:os';
import path from 'node:path';

describe('auditManifest', () => {
  const testMapPath = path.join(os.tmpdir(), `test_mappings_manifest_manifest_${process.pid}.json`);
  const testIconPath = path.join(os.tmpdir(), `test_icons_manifest_manifest_${process.pid}.json`);
  process.env.TEST_MAPPINGS_MANIFEST_PATH = testMapPath;
  process.env.TEST_ICONS_MANIFEST_PATH = testIconPath;

  const mapPath = getMappingsManifestPath();
  const iconPath = getIconsManifestPath();

  beforeEach(() => {
    resetManifestsCache();
    if (fs.existsSync(mapPath)) fs.unlinkSync(mapPath);
    if (fs.existsSync(iconPath)) fs.unlinkSync(iconPath);
  });

  afterEach(() => {
    resetManifestsCache();
    if (fs.existsSync(mapPath)) fs.unlinkSync(mapPath);
    if (fs.existsSync(iconPath)) fs.unlinkSync(iconPath);
  });

  test('records and queries mapping confirmation status correctly', () => {
    saveMappingsManifest({ version: 1, lastUpdated: new Date().toISOString(), entries: {} });

    assert.equal(isMappingConfirmed('zwiebel', 'FRUITS_VEGETABLES'), false);

    recordMappingAudit({
      mappingKey: 'zwiebel',
      category: 'FRUITS_VEGETABLES',
      status: 'ai_confirmed',
      auditedAt: new Date().toISOString(),
      productCode: 'off_123',
      resolution: 'matched',
      confidence: 0.95,
    });

    assert.equal(isMappingConfirmed('zwiebel', 'FRUITS_VEGETABLES'), true);
    assert.equal(isMappingConfirmed('zwiebel', 'DAIRY'), false);
  });

  test('records and queries icon confirmation status correctly', () => {
    saveIconsManifest({ version: 1, lastUpdated: new Date().toISOString(), entries: {} });

    assert.equal(isIconConfirmed('onion.webp'), false);

    recordIconAudit({
      filename: 'onion.webp',
      status: 'ai_confirmed',
      auditedAt: new Date().toISOString(),
      marginPct: 0.2,
      zoomApplied: true,
      regenerated: false,
      visualPass: true,
    });

    assert.equal(isIconConfirmed('onion.webp'), true);
    assert.equal(isIconConfirmed('garlic.webp'), false);
  });
});
