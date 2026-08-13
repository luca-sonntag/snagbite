/**
 * Unit tests for push notification banner & icon generator.
 * Hermetic & live fetch tests with fallback validation.
 * Run with:
 *   cd backend && npx tsx --test src/bannerGenerator.test.ts
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {
  extractFirstEmoji,
  getHexVariants,
  fetchEmojiPng,
  generateIconPNG,
  THEME_PALETTES,
  THEME_DEFAULT_EMOJIS,
} from './bannerGenerator.js';

test('extractFirstEmoji isolates first emoji correctly', () => {
  assert.equal(extractFirstEmoji('🍕'), '🍕');
  assert.equal(extractFirstEmoji('🍕🔥'), '🍕');
  assert.equal(extractFirstEmoji('  🥗  '), '🥗');
  assert.equal(extractFirstEmoji('🍝 Delicious meal'), '🍝');
  assert.equal(extractFirstEmoji('🍽️'), '🍽️');
  assert.equal(extractFirstEmoji('☕'), '☕');
  assert.equal(extractFirstEmoji('👩‍🍳 Chef'), '👩‍🍳');
  assert.equal(extractFirstEmoji(''), null);
  assert.equal(extractFirstEmoji(undefined), null);
  assert.equal(extractFirstEmoji(null), null);
  assert.equal(extractFirstEmoji('No emoji here'), null);
});

test('getHexVariants generates appropriate hex permutations', () => {
  const pizzaVariants = getHexVariants('🍕');
  assert.ok(pizzaVariants.includes('1f355'));

  const coffeeVariants = getHexVariants('☕');
  assert.ok(coffeeVariants.includes('2615'));

  const forkPlateVariants = getHexVariants('🍽️');
  assert.ok(forkPlateVariants.length >= 1);
  assert.ok(forkPlateVariants.some((v) => v.startsWith('1f37d')));
});

test('generateIconPNG generates valid 256x256 PNG buffer for all themes', async () => {
  const themes = Object.keys(THEME_PALETTES);
  for (const theme of themes) {
    const buf = await generateIconPNG({ theme, emoji: '🍕' });
    assert.ok(Buffer.isBuffer(buf));
    assert.ok(buf.length > 0);

    const metadata = await sharp(buf).metadata();
    assert.equal(metadata.width, 256);
    assert.equal(metadata.height, 256);
    assert.equal(metadata.format, 'png');
  }
});

test('generateIconPNG falls back gracefully on invalid emoji input', async () => {
  const buf = await generateIconPNG({ theme: 'asian', emoji: 'xyz-not-an-emoji' });
  assert.ok(Buffer.isBuffer(buf));
  assert.ok(buf.length > 0);

  const metadata = await sharp(buf).metadata();
  assert.equal(metadata.width, 256);
  assert.equal(metadata.height, 256);
});

test('generateIconPNG handles multi-emoji strings by extracting the first', async () => {
  const buf = await generateIconPNG({ theme: 'italian', emoji: '🍕✨🔥' });
  assert.ok(Buffer.isBuffer(buf));
  assert.ok(buf.length > 0);

  const metadata = await sharp(buf).metadata();
  assert.equal(metadata.width, 256);
  assert.equal(metadata.height, 256);
});
