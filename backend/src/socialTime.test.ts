/**
 * Unit tests for the weekly-window helper. Hermetic (no DB/env). Run with:
 *   cd backend && node --import tsx --test src/socialTime.test.ts
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { weekStartUtc } from './socialTime.js';

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

test('always resolves to a Monday at midnight, in range', () => {
  for (let i = 0; i < 30; i++) {
    const now = new Date(Date.UTC(2026, 7, 1 + i, 13, 37, 5));
    const start = new Date(weekStartUtc(now));
    assert.equal(start.getUTCDay(), 1, 'must be Monday');
    assert.equal(start.getUTCHours(), 0);
    assert.ok(start.getTime() <= now.getTime());
    assert.ok(now.getTime() - start.getTime() < 7 * 24 * 3600 * 1000);
  }
});
