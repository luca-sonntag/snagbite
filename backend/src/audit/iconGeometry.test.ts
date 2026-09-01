import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {
  analyzeIconGeometry,
  autoZoomAndPadIcon,
} from './iconGeometry.js';

describe('iconGeometry', () => {
  test('detects too small centered object', async () => {
    // 512x512 white canvas with a tiny 80x80 dark square in the center
    const tinySquare = await sharp({
      create: {
        width: 80,
        height: 80,
        channels: 4,
        background: { r: 50, g: 50, b: 50, alpha: 1 },
      },
    })
      .png()
      .toBuffer();

    const canvas = await sharp({
      create: {
        width: 512,
        height: 512,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 1 },
      },
    })
      .composite([{ input: tinySquare, gravity: 'center' }])
      .png()
      .toBuffer();

    const result = await analyzeIconGeometry(canvas);
    assert.equal(result.isTooSmall, true);
    assert.equal(result.isClipped, false);
    assert.equal(result.isAcceptable, false);
    assert.ok(result.margins.minMarginPct > 0.35);
  });

  test('detects acceptable properly framed object (~20% margin)', async () => {
    // 300x300 square in 512x512 gives ~106px margin on each side (approx 20.7%)
    const normalSquare = await sharp({
      create: {
        width: 300,
        height: 300,
        channels: 4,
        background: { r: 50, g: 50, b: 50, alpha: 1 },
      },
    })
      .png()
      .toBuffer();

    const canvas = await sharp({
      create: {
        width: 512,
        height: 512,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 1 },
      },
    })
      .composite([{ input: normalSquare, gravity: 'center' }])
      .png()
      .toBuffer();

    const result = await analyzeIconGeometry(canvas);
    assert.equal(result.isAcceptable, true);
    assert.equal(result.isTooSmall, false);
    assert.equal(result.isClipped, false);
    assert.ok(result.margins.minMarginPct >= 0.15 && result.margins.minMarginPct <= 0.25);
  });

  test('detects edge clipped object', async () => {
    // 510x510 square touching the edges
    const bigSquare = await sharp({
      create: {
        width: 510,
        height: 510,
        channels: 4,
        background: { r: 50, g: 50, b: 50, alpha: 1 },
      },
    })
      .png()
      .toBuffer();

    const canvas = await sharp({
      create: {
        width: 512,
        height: 512,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 1 },
      },
    })
      .composite([{ input: bigSquare, gravity: 'center' }])
      .png()
      .toBuffer();

    const result = await analyzeIconGeometry(canvas);
    assert.equal(result.isClipped, true);
    assert.equal(result.isAcceptable, false);
  });

  test('autoZoomAndPadIcon resizes tiny object to ~20% margin', async () => {
    const tinySquare = await sharp({
      create: {
        width: 80,
        height: 80,
        channels: 4,
        background: { r: 50, g: 50, b: 50, alpha: 1 },
      },
    })
      .png()
      .toBuffer();

    const initialCanvas = await sharp({
      create: {
        width: 512,
        height: 512,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 1 },
      },
    })
      .composite([{ input: tinySquare, gravity: 'center' }])
      .webp()
      .toBuffer();

    const zoomed = await autoZoomAndPadIcon(initialCanvas, 0.2);
    const postGeometry = await analyzeIconGeometry(zoomed);

    assert.equal(postGeometry.isAcceptable, true);
    assert.equal(postGeometry.isTooSmall, false);
    assert.equal(postGeometry.isClipped, false);
    assert.ok(postGeometry.margins.minMarginPct >= 0.18 && postGeometry.margins.minMarginPct <= 0.22);
  });
});
