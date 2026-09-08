import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { findExistingIngredientImage } from './ingredientImageService.js';

describe('findExistingIngredientImage specificity cascade', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ingredient-icons-test-'));
  });

  afterEach(() => {
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test('resolves direct match when icon exists', () => {
    fs.writeFileSync(path.join(tmpDir, 'apple.webp'), 'dummy');
    const result = findExistingIngredientImage('apple', tmpDir);
    assert.equal(result, 'apple.webp');
  });

  test('prioritizes specific synonym over generic umbrella baseName', () => {
    // Both cheese.webp (generic block) and shredded_cheese.webp exist
    fs.writeFileSync(path.join(tmpDir, 'cheese.webp'), 'dummy');
    fs.writeFileSync(path.join(tmpDir, 'shredded_cheese.webp'), 'dummy');

    // With synonym "grated cheese", canonicalizeBaseName maps it to "shredded cheese" -> shredded_cheese.webp
    const result = findExistingIngredientImage('cheese', tmpDir, ['grated cheese']);
    assert.equal(result, 'shredded_cheese.webp');
  });

  test('falls back to generic umbrella icon when no synonym icon matches', () => {
    fs.writeFileSync(path.join(tmpDir, 'cheese.webp'), 'dummy');

    const result = findExistingIngredientImage('cheese', tmpDir, ['unmatched specialty']);
    assert.equal(result, 'cheese.webp');
  });

  test('resolves direct shredded_cheese baseName', () => {
    fs.writeFileSync(path.join(tmpDir, 'shredded_cheese.webp'), 'dummy');

    const result = findExistingIngredientImage('shredded_cheese', tmpDir);
    assert.equal(result, 'shredded_cheese.webp');
  });
});
