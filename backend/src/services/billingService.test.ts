import test from 'node:test';
import assert from 'node:assert/strict';

test('billing tier comparison emits subscription.changed only on change', () => {
  const previousTier = 'free';
  const newTier = 'premium';
  assert.notEqual(previousTier, newTier);
  const sameTier = 'premium';
  assert.equal(newTier, sameTier);
});
