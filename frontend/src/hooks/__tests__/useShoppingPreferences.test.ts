import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

const storage = new Map<string, string>();
(globalThis as any).localStorage = {
  getItem: (k: string) => storage.get(k) ?? null,
  setItem: (k: string, v: string) => storage.set(k, String(v)),
  removeItem: (k: string) => storage.delete(k),
  clear: () => storage.clear(),
};

describe('useShoppingPreferences store', async () => {
  const {
    getPackageRecommendationsSnapshot,
    togglePackageRecommendationsPreference,
    setPackageRecommendationsPreference,
  } = await import('../useShoppingPreferences');

  beforeEach(() => {
    storage.clear();
  });

  it('provides a boolean snapshot', () => {
    assert.equal(typeof getPackageRecommendationsSnapshot(), 'boolean');
  });

  it('toggles value deterministically on every single call', () => {
    const initial = getPackageRecommendationsSnapshot();

    const afterFirst = togglePackageRecommendationsPreference();
    assert.equal(afterFirst, !initial);
    assert.equal(getPackageRecommendationsSnapshot(), !initial);

    const afterSecond = togglePackageRecommendationsPreference();
    assert.equal(afterSecond, initial);
    assert.equal(getPackageRecommendationsSnapshot(), initial);

    const afterThird = togglePackageRecommendationsPreference();
    assert.equal(afterThird, !initial);
    assert.equal(getPackageRecommendationsSnapshot(), !initial);
  });

  it('sets value explicitly and ignores redundant sets', () => {
    setPackageRecommendationsPreference(false);
    assert.equal(getPackageRecommendationsSnapshot(), false);

    setPackageRecommendationsPreference(true);
    assert.equal(getPackageRecommendationsSnapshot(), true);
  });
});
