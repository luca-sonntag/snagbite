import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { canonicalizeBaseName, buildMappingKeys, toEnglishSingular } from './baseNameCanonical.js';

describe('canonicalizeBaseName', () => {
  test('collapses casing, plurals and whitespace', () => {
    assert.equal(canonicalizeBaseName('Eggs'), 'egg');
    assert.equal(canonicalizeBaseName('  ONIONS  '), 'onion');
    assert.equal(canonicalizeBaseName('Chicken   Breasts'), 'chicken breast');
  });

  test('strips cut, size, preparation and handling words', () => {
    assert.equal(canonicalizeBaseName('bacon cubes'), 'bacon');
    assert.equal(canonicalizeBaseName('large chopped onion'), 'onion');
    assert.equal(canonicalizeBaseName('fresh parsley'), 'parsley');
    assert.equal(canonicalizeBaseName('diced carrots'), 'carrot');
    assert.equal(canonicalizeBaseName('shredded gouda'), 'gouda');
    assert.equal(canonicalizeBaseName('steamed apple'), 'apple');
    assert.equal(canonicalizeBaseName('peeled apples'), 'apple');
    assert.equal(canonicalizeBaseName('boiled potatoes'), 'potato');
    assert.equal(canonicalizeBaseName('roasted cauliflower'), 'cauliflower');
  });

  test('collapses top kitchen staple synonyms deterministically', () => {
    assert.equal(canonicalizeBaseName('oats'), 'rolled oat');
    assert.equal(canonicalizeBaseName('oat flakes'), 'rolled oat');
    assert.equal(canonicalizeBaseName('scallions'), 'spring onion');
    assert.equal(canonicalizeBaseName('green onions'), 'spring onion');
    assert.equal(canonicalizeBaseName('garbanzo beans'), 'chickpea');
    assert.equal(canonicalizeBaseName('curd cheese'), 'quark');
    assert.equal(canonicalizeBaseName('ground meat'), 'ground beef');
    assert.equal(canonicalizeBaseName('sweet pepper'), 'bell pepper');
  });

  test('never strips words that change the food identity', () => {
    // The single most damaging over-collapse: a dry spice is not fresh produce.
    assert.equal(canonicalizeBaseName('paprika powder'), 'paprika powder');
    assert.notEqual(canonicalizeBaseName('paprika powder'), canonicalizeBaseName('paprika'));

    assert.equal(canonicalizeBaseName('almond flour'), 'almond flour');
    assert.equal(canonicalizeBaseName('olive oil'), 'olive oil');
    assert.equal(canonicalizeBaseName('ground beef'), 'ground beef');
    assert.equal(canonicalizeBaseName('smoked salmon'), 'smoked salmon');
    assert.equal(canonicalizeBaseName('dried tomatoes'), 'dried tomato');
    assert.equal(canonicalizeBaseName('egg yolk'), 'egg yolk');
  });

  test('different spellings of the same food produce one key', () => {
    const variants = ['Bacon', 'bacon', ' bacon cubes ', 'chopped bacon', 'fresh bacon'];
    const keys = new Set(variants.map(canonicalizeBaseName));
    assert.equal(keys.size, 1, `expected one key, got ${[...keys].join(' | ')}`);
    assert.equal([...keys][0], 'bacon');
  });

  test('removes quantities, brackets and punctuation', () => {
    assert.equal(canonicalizeBaseName('Tomato (canned, 400 g)'), 'tomato');
    assert.equal(canonicalizeBaseName('cold-pressed olive oil'), 'cold pressed olive oil');
  });

  test('is stable under repeated application', () => {
    for (const input of ['bacon cubes', 'Paprika Powder', 'large chopped onions', 'egg yolks']) {
      const once = canonicalizeBaseName(input);
      assert.equal(canonicalizeBaseName(once), once, `not idempotent for "${input}"`);
    }
  });

  test('never returns an empty key for a describable input', () => {
    // Every word is noise here - keeping the original beats emitting nothing.
    assert.equal(canonicalizeBaseName('fresh large'), 'fresh large');
    assert.equal(canonicalizeBaseName(''), '');
    assert.equal(canonicalizeBaseName(undefined), '');
  });
});

describe('buildMappingKeys', () => {
  test('yields the single canonical base name when present', () => {
    assert.deepEqual(buildMappingKeys('bacon cubes', 'bacon'), ['bacon']);
    assert.deepEqual(buildMappingKeys('cottage cheese', 'cottage cheese'), ['cottage cheese']);
  });

  test('canonicalizes and appends synonyms deduplicated after primary baseName', () => {
    assert.deepEqual(
      buildMappingKeys('strained tomato', 'Passierte Tomaten', ['passata', 'tomato puree', 'sieved tomatoes']),
      ['strained tomato', 'passierte tomate', 'passata', 'tomato puree', 'sieved tomato']
    );
    assert.deepEqual(
      buildMappingKeys('spring onion', 'Lauchzwiebeln', ['scallions', 'green onions', 'spring onion']),
      ['spring onion', 'lauchzwiebel']
    );
  });

  test('deduplicates and drops unusably short keys', () => {
    assert.deepEqual(buildMappingKeys('Butter', 'butter'), ['butter']);
    assert.deepEqual(buildMappingKeys('a', 'egg'), ['egg']);
  });

  test('tolerates a missing base name by falling back to raw name', () => {
    assert.deepEqual(buildMappingKeys(undefined, 'olive oil'), ['olive oil']);
  });
});

describe('toEnglishSingular', () => {
  test('keeps singular nouns that end in s intact', () => {
    assert.equal(toEnglishSingular('cheese'), 'cheese');
    assert.equal(toEnglishSingular('hummus'), 'hummus');
    assert.equal(toEnglishSingular('couscous'), 'couscous');
  });

  test('handles irregular plural endings', () => {
    assert.equal(toEnglishSingular('strawberries'), 'strawberry');
    assert.equal(toEnglishSingular('tomatoes'), 'tomato');
    assert.equal(toEnglishSingular('potatoes'), 'potato');
    assert.equal(toEnglishSingular('leaves'), 'leaf');
    assert.equal(toEnglishSingular('Röstzwiebeln'), 'röstzwiebel');
    assert.equal(toEnglishSingular('Gurken'), 'gurke');
  });
});
