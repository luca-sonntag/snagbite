import test from 'node:test';
import assert from 'node:assert/strict';
import { rapidApiMetadataProvider } from './rapidApiMetadata.js';
import { config } from '../../config.js';

test('rapidApiMetadataProvider succeeds on first attempt', async () => {
  const originalFetch = globalThis.fetch;
  const originalKey = config.RAPIDAPI_KEY;
  config.RAPIDAPI_KEY = 'test-key';

  let callCount = 0;
  globalThis.fetch = async () => {
    callCount++;
    return new Response(
      JSON.stringify({
        title: 'Leckere Pasta',
        author: 'chef_mario',
        thumbnail: 'https://example.com/thumb.jpg',
        medias: [{ url: 'https://example.com/video.mp4', type: 'video', quality: '720p' }],
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  };

  try {
    const result = await rapidApiMetadataProvider.scrape('https://www.instagram.com/reel/12345/', {
      platform: 'instagram',
    });
    assert.equal(callCount, 1);
    assert.equal(result.caption, 'Leckere Pasta');
    assert.equal(result.authorHandle, '@chef_mario');
    assert.equal(result.media.kind, 'client');
  } finally {
    globalThis.fetch = originalFetch;
    config.RAPIDAPI_KEY = originalKey;
  }
});

test('rapidApiMetadataProvider retries on transient error and succeeds on second attempt', async () => {
  const originalFetch = globalThis.fetch;
  const originalKey = config.RAPIDAPI_KEY;
  config.RAPIDAPI_KEY = 'test-key';

  let callCount = 0;
  globalThis.fetch = async () => {
    callCount++;
    if (callCount === 1) {
      return new Response(
        JSON.stringify({ error: 'unknown' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }
    return new Response(
      JSON.stringify({
        title: 'Brot Rezept',
        author: 'baker_john',
        medias: [{ url: 'https://example.com/video.mp4', type: 'video' }],
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  };

  try {
    const result = await rapidApiMetadataProvider.scrape('https://www.instagram.com/reel/12345/', {
      platform: 'instagram',
    });
    assert.equal(callCount, 2);
    assert.equal(result.caption, 'Brot Rezept');
    assert.equal(result.authorHandle, '@baker_john');
  } finally {
    globalThis.fetch = originalFetch;
    config.RAPIDAPI_KEY = originalKey;
  }
});

test('rapidApiMetadataProvider retries on HTTP 502 Bad Gateway and succeeds', async () => {
  const originalFetch = globalThis.fetch;
  const originalKey = config.RAPIDAPI_KEY;
  config.RAPIDAPI_KEY = 'test-key';

  let callCount = 0;
  globalThis.fetch = async () => {
    callCount++;
    if (callCount === 1) {
      return new Response('Bad Gateway', { status: 502, statusText: 'Bad Gateway' });
    }
    return new Response(
      JSON.stringify({
        title: 'Kuchen',
        author: 'anna',
        medias: [{ url: 'https://example.com/video.mp4', type: 'video' }],
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  };

  try {
    const result = await rapidApiMetadataProvider.scrape('https://www.instagram.com/reel/12345/', {
      platform: 'instagram',
    });
    assert.equal(callCount, 2);
    assert.equal(result.caption, 'Kuchen');
  } finally {
    globalThis.fetch = originalFetch;
    config.RAPIDAPI_KEY = originalKey;
  }
});

test('rapidApiMetadataProvider does not retry on fatal 401 Unauthorized', async () => {
  const originalFetch = globalThis.fetch;
  const originalKey = config.RAPIDAPI_KEY;
  config.RAPIDAPI_KEY = 'invalid-key';

  let callCount = 0;
  globalThis.fetch = async () => {
    callCount++;
    return new Response('Invalid API key', { status: 401 });
  };

  try {
    await assert.rejects(
      () =>
        rapidApiMetadataProvider.scrape('https://www.instagram.com/reel/12345/', {
          platform: 'instagram',
        }),
      /RapidAPI authentication failed \(HTTP 401\)/
    );
    assert.equal(callCount, 1);
  } finally {
    globalThis.fetch = originalFetch;
    config.RAPIDAPI_KEY = originalKey;
  }
});

test('rapidApiMetadataProvider throws after exhausting all 3 attempts', async () => {
  const originalFetch = globalThis.fetch;
  const originalKey = config.RAPIDAPI_KEY;
  config.RAPIDAPI_KEY = 'test-key';

  let callCount = 0;
  globalThis.fetch = async () => {
    callCount++;
    return new Response(
      JSON.stringify({ error: true, message: 'Proxy timeout' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  };

  try {
    await assert.rejects(
      () =>
        rapidApiMetadataProvider.scrape('https://www.instagram.com/reel/12345/', {
          platform: 'instagram',
        }),
      /RapidAPI error: Proxy timeout/
    );
    assert.equal(callCount, 3);
  } finally {
    globalThis.fetch = originalFetch;
    config.RAPIDAPI_KEY = originalKey;
  }
});
