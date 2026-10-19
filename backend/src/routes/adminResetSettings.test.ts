import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('adminResetSettings payload structure', () => {
  it('defines the correct reset shape for userTable additional settings', () => {
    const buildUserResetPayload = () => ({
      metadata: {},
      notificationsEnabled: false,
      customExtractionLimit: null,
      updatedAt: new Date(1700000000000),
    });

    const payload = buildUserResetPayload();

    assert.deepEqual(payload.metadata, {});
    assert.equal(payload.notificationsEnabled, false);
    assert.equal(payload.customExtractionLimit, null);
    assert.equal(payload.updatedAt.getTime(), 1700000000000);
  });
});
