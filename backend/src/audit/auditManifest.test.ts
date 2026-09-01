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

describe('auditManifest', () => {
  const mapPath = getMappingsManifestPath();
  const iconPath = getIconsManifestPath();
  let origMap: string | null = null;
  let origIcon: string | null = null;

  beforeEach(() => {
    resetManifestsCache();
    if (fs.existsSync(mapPath)) origMap = fs.readFileSync(mapPath, 'utf-8');
    if (fs.existsSync(iconPath)) origIcon = fs.readFileSync(iconPath, 'utf-8');
  });

  afterEach(() => {
    resetManifestsCache();
    if (origMap !== null) fs.writeFileSync(mapPath, origMap, 'utf-8');
    else if (fs.existsSync(mapPath)) fs.unlinkSync(mapPath);

    if (origIcon !== null) fs.writeFileSync(iconPath, origIcon, 'utf-8');
    else if (fs.existsSync(iconPath)) fs.unlinkSync(iconPath);
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
