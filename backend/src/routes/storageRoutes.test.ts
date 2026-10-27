import assert from 'node:assert/strict';
import { clearCacheHeadersOnFailure } from './storageRoutes.js';
import type { Response } from 'express';

console.log('Testing clearCacheHeadersOnFailure()...');

// Mock response object
function createMockResponse(headersSent = false) {
  const headers: Record<string, string> = {
    'cache-control': 'public, max-age=31536000, immutable',
    'content-type': 'image/jpeg',
    'content-length': '720046',
    etag: '"ca93b59b2dfd681fd6cc2896ac0e3025"',
    'last-modified': 'Sun, 11 Oct 2026 13:34:40 GMT',
  };

  return {
    headersSent,
    headers,
    removeHeader(name: string) {
      delete headers[name.toLowerCase()];
    },
    setHeader(name: string, value: string) {
      headers[name.toLowerCase()] = value;
    },
  } as unknown as Response & { headers: Record<string, string> };
}

// Case 1: Clears immutable cache and sets no-store when headers have not been sent yet
const mockRes = createMockResponse(false);
clearCacheHeadersOnFailure(mockRes);

assert.equal(mockRes.headers['cache-control'], 'no-store, no-cache, must-revalidate');
assert.equal(mockRes.headers['content-type'], undefined);
assert.equal(mockRes.headers['content-length'], undefined);
assert.equal(mockRes.headers['etag'], undefined);
assert.equal(mockRes.headers['last-modified'], undefined);

// Case 2: Does nothing if headers were already sent to client
const alreadySentRes = createMockResponse(true);
clearCacheHeadersOnFailure(alreadySentRes);
assert.equal(alreadySentRes.headers['cache-control'], 'public, max-age=31536000, immutable');
assert.equal(alreadySentRes.headers['etag'], '"ca93b59b2dfd681fd6cc2896ac0e3025"');

console.log('✅ clearCacheHeadersOnFailure() tests passed successfully!');
