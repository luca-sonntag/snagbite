/**
 * Unit tests for the leaderboard window helpers. Hermetic (no DB/env). Run with:
 *   cd backend && node --import tsx --test src/socialTime.test.ts
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { weekStartUtc, monthStartUtc } from './socialTime.js';

test('Monday returns itself at 00:00 UTC', () => {
  // 2024-01-01 was a Monday.
  assert.equal(weekStartUtc(new Date('2024-01-01T09:30:00Z')), '2024-01-01T00:00:00.000Z');
});

test('Sunday maps back to the preceding Monday', () => {
  // 2024-01-07 was a Sunday.
  assert.equal(weekStartUtc(new Date('2024-01-07T23:59:59Z')), '2024-01-01T00:00:00.000Z');
});

test('the next Monday starts a new week', () => {
  // 2024-01-08 was a Monday.
  assert.equal(weekStartUtc(new Date('2024-01-08T00:00:00Z')), '2024-01-08T00:00:00.000Z');
});

test('monthStartUtc returns the 1st of the month at 00:00 UTC', () => {
  assert.equal(monthStartUtc(new Date('2026-08-13T22:20:00Z')), '2026-08-01T00:00:00.000Z');
  assert.equal(monthStartUtc(new Date('2026-01-31T23:59:59Z')), '2026-01-01T00:00:00.000Z');
  assert.equal(monthStartUtc(new Date('2026-02-01T00:00:00Z')), '2026-02-01T00:00:00.000Z');
});
