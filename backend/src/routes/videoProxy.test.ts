import assert from 'node:assert/strict';
import { isSafeMediaUrl } from './videoProxy.js';

console.log('Testing isSafeMediaUrl()...');

// Safe external URLs
assert.equal(isSafeMediaUrl(new URL('https://scontent.cdninstagram.com/v/t51.2885-15/123.mp4')), true);
assert.equal(isSafeMediaUrl(new URL('https://v16-webapp-prime.tiktok.com/video.mp4')), true);
assert.equal(isSafeMediaUrl(new URL('https://example.com/media/test.jpg')), true);
assert.equal(isSafeMediaUrl(new URL('http://example.org/video.mp4')), true);

// SSRF - Loopback / Localhost
assert.equal(isSafeMediaUrl(new URL('http://localhost:3000/admin')), false);
assert.equal(isSafeMediaUrl(new URL('http://sub.localhost/api')), false);
assert.equal(isSafeMediaUrl(new URL('http://127.0.0.1/')), false);
assert.equal(isSafeMediaUrl(new URL('http://127.0.0.5:8080/')), false);
assert.equal(isSafeMediaUrl(new URL('http://0.0.0.0/')), false);

// SSRF - Cloud metadata
assert.equal(isSafeMediaUrl(new URL('http://169.254.169.254/latest/meta-data/')), false);
assert.equal(isSafeMediaUrl(new URL('http://metadata.google.internal/computeMetadata/v1/')), false);

// SSRF - Private IPv4 ranges
assert.equal(isSafeMediaUrl(new URL('http://10.0.0.1/secret')), false);
assert.equal(isSafeMediaUrl(new URL('http://10.255.255.255/')), false);
assert.equal(isSafeMediaUrl(new URL('http://192.168.1.1/router')), false);
assert.equal(isSafeMediaUrl(new URL('http://172.16.0.1/')), false);
assert.equal(isSafeMediaUrl(new URL('http://172.31.255.255/')), false);

// Invalid protocols
assert.equal(isSafeMediaUrl(new URL('ftp://example.com/video.mp4')), false);
assert.equal(isSafeMediaUrl(new URL('file:///etc/passwd')), false);

console.log('✅ All isSafeMediaUrl() tests passed successfully!');
