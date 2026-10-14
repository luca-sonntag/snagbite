import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('userMetadata router payload handling', () => {
  it('validates that incoming metadata patch must be a non-null object', () => {
    const isValidPatch = (patch: unknown): patch is Record<string, unknown> => {
      return Boolean(patch && typeof patch === 'object' && !Array.isArray(patch));
    };

    assert.equal(isValidPatch({ tours_completed: { extract: true } }), true);
    assert.equal(isValidPatch({ language: 'de' }), true);
    assert.equal(isValidPatch(null), false);
    assert.equal(isValidPatch(undefined), false);
    assert.equal(isValidPatch([1, 2, 3]), false);
    assert.equal(isValidPatch('invalid'), false);
  });

  it('correctly simulates shallow JSONB merge behavior', () => {
    const existingMetadata: Record<string, unknown> = {
      onboarding_completed: true,
      language: 'en',
      tours_completed: { extract: true },
    };

    const incomingPatch: Record<string, unknown> = {
      language: 'de',
      tours_completed: { extract: true, catalog: true },
    };

    const merged = { ...existingMetadata, ...incomingPatch };

    assert.deepEqual(merged, {
      onboarding_completed: true,
      language: 'de',
      tours_completed: { extract: true, catalog: true },
    });
  });
});
