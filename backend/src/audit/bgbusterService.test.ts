import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { removeBackgroundWithBgbuster } from './bgbusterService.js';
import { config } from '../config.js';

describe('bgbusterService', () => {
  test('gracefully returns null when BGBUSTER_API_KEY is not configured', async () => {
    const originalKey = config.BGBUSTER_API_KEY;
    config.BGBUSTER_API_KEY = '';

    try {
      const dummyBuffer = Buffer.from('fake-image-bytes');
      const result = await removeBackgroundWithBgbuster(dummyBuffer);
      assert.equal(result, null);
    } finally {
      config.BGBUSTER_API_KEY = originalKey;
    }
  });
});
