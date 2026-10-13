import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeUrl } from './jobsDb.js';

describe('normalizeUrl for recipe reuse', () => {
  it('strips protocols, www, trailing slashes and query parameters', () => {
    assert.equal(
      normalizeUrl('https://www.instagram.com/reel/C8xyz123/?igsh=MWQ1...'),
      'instagram.com/reel/c8xyz123'
    );
    assert.equal(
      normalizeUrl('http://instagram.com/reel/C8xyz123'),
      'instagram.com/reel/c8xyz123'
    );
  });

  it('strips URL hashes and surrounding whitespace or brackets', () => {
    assert.equal(
      normalizeUrl('  "https://instagram.com/reel/C8xyz123#recipe"  '),
      'instagram.com/reel/c8xyz123'
    );
  });

  it('harmonizes Instagram /p/ and /reels/ to /reel/', () => {
    assert.equal(
      normalizeUrl('https://instagram.com/p/C8xyz123/'),
      'instagram.com/reel/c8xyz123'
    );
    assert.equal(
      normalizeUrl('https://www.instagram.com/reels/C8xyz123/'),
      'instagram.com/reel/c8xyz123'
    );
    assert.equal(
      normalizeUrl('https://instagram.com/reel/C8xyz123/'),
      'instagram.com/reel/c8xyz123'
    );
  });

  it('harmonizes YouTube Shorts from youtu.be to youtube.com/shorts/', () => {
    assert.equal(
      normalizeUrl('https://youtu.be/dQw4w9WgXcQ?feature=share'),
      'youtube.com/shorts/dqw4w9wgxcq'
    );
    assert.equal(
      normalizeUrl('https://www.youtube.com/shorts/dQw4w9WgXcQ'),
      'youtube.com/shorts/dqw4w9wgxcq'
    );
  });

  it('preserves and normalizes TikTok video links', () => {
    assert.equal(
      normalizeUrl('https://www.tiktok.com/@chef/video/1234567890?is_from_webapp=1'),
      'tiktok.com/@chef/video/1234567890'
    );
  });

  it('handles empty or malformed input safely without throwing', () => {
    assert.equal(normalizeUrl(''), '');
    assert.equal(normalizeUrl('   '), '');
    assert.equal(normalizeUrl(null as unknown as string), '');
    assert.equal(normalizeUrl(undefined as unknown as string), '');
  });
});
