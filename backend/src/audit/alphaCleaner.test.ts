import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { cleanAlphaDebrisAndIslands } from './alphaCleaner.js';

describe('alphaCleaner', () => {
  test('zeros out faint alpha haze (< 35)', () => {
    // 2x2 image with one faint pixel
    const width = 2;
    const height = 2;
    const data = new Uint8Array([
      255, 255, 255, 20, // faint haze
      255, 0, 0, 200,   // solid
      255, 0, 0, 200,   // solid
      0, 0, 0, 0,       // transparent
    ]);

    cleanAlphaDebrisAndIslands(data, width, height);

    // Pixel 0 should now have alpha 0
    assert.equal(data[3], 0);
    // Pixel 1 and 2 should remain intact
    assert.equal(data[7], 200);
    assert.equal(data[11], 200);
  });

  test('zeros out tiny floating disconnected islands (< 5% of main subject)', () => {
    // 10x10 grid with:
    // Main object: 5x5 block = 25 pixels (idx ~ 0..24)
    // Disconnected speck: 1 pixel at position (9,9)
    const width = 10;
    const height = 10;
    const data = new Uint8Array(width * height * 4);

    // Fill 5x5 block at top-left
    for (let y = 0; y < 5; y++) {
      for (let x = 0; x < 5; x++) {
        const idx = (y * width + x) * 4;
        data[idx] = 255;
        data[idx + 3] = 255; // alpha 255
      }
    }

    // 1 floating speck at (9,9)
    const speckIdx = (9 * width + 9) * 4;
    data[speckIdx] = 255;
    data[speckIdx + 3] = 200;

    cleanAlphaDebrisAndIslands(data, width, height, 35, 0.05);

    // Speck should be zeroed out
    assert.equal(data[speckIdx + 3], 0);
    // Main block should still be alpha 255
    assert.equal(data[3], 255);
  });
});
