import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as cheerio from 'cheerio';
import { isPinterestUrl, pinterestExtractor } from './pinterestExtractor.js';
import { genericWebsiteExtractor } from './genericWebsiteExtractor.js';
import { extractFromWebsiteContext } from './index.js';
import type { WebsiteScrapeContext } from './types.js';

describe('isPinterestUrl', () => {
  it('correctly identifies short and regional Pinterest URLs', () => {
    assert.equal(isPinterestUrl('https://pin.it/4q6r0TW2F'), true);
    assert.equal(isPinterestUrl('http://pin.it/abc123xyz'), true);
    assert.equal(isPinterestUrl('https://de.pinterest.com/pin/757941812334849840/'), true);
    assert.equal(isPinterestUrl('https://www.pinterest.de/pin/757941812334849840'), true);
    assert.equal(isPinterestUrl('https://pinterest.com/pin/757941812334849840'), true);
    assert.equal(isPinterestUrl('https://pinterest.co.uk/pin/757941812334849840'), true);
  });

  it('rejects non-Pinterest URLs and invalid strings', () => {
    assert.equal(isPinterestUrl('https://gaumenfreundin.de/pasta/'), false);
    assert.equal(isPinterestUrl('https://instagram.com/reel/123'), false);
    assert.equal(isPinterestUrl('not-a-url'), false);
    assert.equal(isPinterestUrl(''), false);
  });
});

describe('genericWebsiteExtractor', () => {
  it('extracts og:title, og:image, and clean body text', async () => {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Fallback Title</title>
          <meta property="og:title" content="Leckere Ofen-Pasta" />
          <meta property="og:image" content="https://example.com/pasta.jpg" />
        </head>
        <body>
          <nav>Navigation Link</nav>
          <article>
            <h1>Leckere Ofen-Pasta</h1>
            <p>500g Nudeln kochen und mit Tomatensauce backen.</p>
          </article>
          <footer>Footer info</footer>
        </body>
      </html>
    `;

    const ctx: WebsiteScrapeContext = {
      requestedUrl: 'https://example.com/pasta',
      finalUrl: 'https://example.com/pasta',
      hostname: 'example.com',
      html,
      $: cheerio.load(html),
    };

    const res = await genericWebsiteExtractor.extract(ctx);
    assert.ok(res);
    assert.equal(res.caption, 'Leckere Ofen-Pasta');
    assert.equal(res.imageUrl, 'https://example.com/pasta.jpg');
    assert.equal(res.authorHandle, 'example.com');
    assert.equal(res.media.kind, 'none');
    assert.ok(res.htmlContent?.includes('500g Nudeln kochen'));
    assert.ok(!res.htmlContent?.includes('Navigation Link'));
  });

  it('extracts and prepends JSON-LD Recipe data if present', async () => {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <script type="application/ld+json">
            {
              "@context": "https://schema.org",
              "@type": "Recipe",
              "name": "Schoko-Muffins",
              "recipeIngredient": ["200g Mehl", "100g Zucker"]
            }
          </script>
        </head>
        <body>
          <main>
            <p>Zubereitungsschritte im Blog.</p>
          </main>
        </body>
      </html>
    `;

    const ctx: WebsiteScrapeContext = {
      requestedUrl: 'https://example.com/muffins',
      finalUrl: 'https://example.com/muffins',
      hostname: 'example.com',
      html,
      $: cheerio.load(html),
    };

    const res = await genericWebsiteExtractor.extract(ctx);
    assert.ok(res);
    assert.ok(res.htmlContent?.includes('JSON-LD Recipe Metadata:'));
    assert.ok(res.htmlContent?.includes('Schoko-Muffins'));
    assert.ok(res.htmlContent?.includes('recipeIngredient'));
  });
});

describe('pinterestExtractor', () => {
  it('extracts infographic Pin with original image from Relay script and JSON-LD', async () => {
    const relayPayload = JSON.stringify({
      data: {
        v3GetPinQueryv2: {
          data: {
            title: 'Lotus Rezepte',
            description: 'Lotus-Röllchen schnell und einfach backen',
            images_orig: {
              url: 'https://i.pinimg.com/originals/54/b1/e6/54b1e649647c9e1d0ed4b84043274b43.jpg',
            },
            pinner: {
              username: 'alnat77',
              fullName: 'Alnat',
            },
          },
        },
      },
    });

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <script type="application/ld+json">
            {
              "@type": "SocialMediaPosting",
              "author": { "name": "Alnat", "alternateName": "alnat77" },
              "headline": "Lotus Rezepte",
              "image": "https://i.pinimg.com/originals/54/b1/e6/54b1e649647c9e1d0ed4b84043274b43.jpg"
            }
          </script>
          <script>
            window.__PWS_RELAY_REGISTER_COMPLETED_REQUEST__("%7Bquery%7D", ${relayPayload});
          </script>
        </head>
        <body>
          <h1>Lotus Rezepte</h1>
        </body>
      </html>
    `;

    const ctx: WebsiteScrapeContext = {
      requestedUrl: 'https://pin.it/4q6r0TW2F',
      finalUrl: 'https://de.pinterest.com/pin/757941812334849840/',
      hostname: 'de.pinterest.com',
      html,
      $: cheerio.load(html),
    };

    assert.equal(pinterestExtractor.canHandle(ctx), true);
    const res = await pinterestExtractor.extract(ctx);
    assert.ok(res);
    assert.equal(res.caption, 'Lotus Rezepte');
    assert.equal(res.authorHandle, '@alnat77');
    assert.equal(res.imageUrl, 'https://i.pinimg.com/originals/54/b1/e6/54b1e649647c9e1d0ed4b84043274b43.jpg');
    assert.equal(res.media.kind, 'images');
    if (res.media.kind === 'images') {
      assert.deepEqual(res.media.imageUrls, [
        'https://i.pinimg.com/originals/54/b1/e6/54b1e649647c9e1d0ed4b84043274b43.jpg',
      ]);
    }
  });

  it('detects video pins and configures client streaming media', async () => {
    const relayPayload = JSON.stringify({
      data: {
        v3GetPinQueryv2: {
          data: {
            title: 'Käsekuchen Video',
            videos: {
              videoList: [
                { url: 'https://v.pinimg.com/videos/mc/720p/cake.mp4', height: 720 },
              ],
            },
            pinner: { username: 'baker_jane' },
          },
        },
      },
    });

    const html = `
      <html>
        <head>
          <script>
            window.__PWS_RELAY_REGISTER_COMPLETED_REQUEST__("%7Bquery%7D", ${relayPayload});
          </script>
        </head>
        <body></body>
      </html>
    `;

    const ctx: WebsiteScrapeContext = {
      requestedUrl: 'https://pinterest.com/pin/999888/',
      finalUrl: 'https://pinterest.com/pin/999888/',
      hostname: 'pinterest.com',
      html,
      $: cheerio.load(html),
    };

    const res = await pinterestExtractor.extract(ctx);
    assert.ok(res);
    assert.equal(res.caption, 'Käsekuchen Video');
    assert.equal(res.media.kind, 'client');
    if (res.media.kind === 'client') {
      assert.equal(res.media.videoUrl, 'https://v.pinimg.com/videos/mc/720p/cake.mp4');
    }
  });
});

describe('extractFromWebsiteContext orchestrator', () => {
  it('routes Pinterest link to pinterest extractor', async () => {
    const html = `
      <html>
        <head>
          <meta property="og:title" content="Pinterest Quick Pin" />
          <meta property="og:image" content="https://i.pinimg.com/736x/test.jpg" />
        </head>
        <body></body>
      </html>
    `;

    const ctx: WebsiteScrapeContext = {
      requestedUrl: 'https://pin.it/test123',
      finalUrl: 'https://de.pinterest.com/pin/123/',
      hostname: 'de.pinterest.com',
      html,
      $: cheerio.load(html),
    };

    const res = await extractFromWebsiteContext(ctx);
    assert.ok(res);
    assert.equal(res.caption, 'Pinterest Quick Pin');
    assert.equal(res.media.kind, 'images');
  });

  it('routes standard food blog to generic website extractor', async () => {
    const html = `
      <html>
        <head><title>Food Blog Recipe</title></head>
        <body><main><p>Super schnelles Curry</p></main></body>
      </html>
    `;

    const ctx: WebsiteScrapeContext = {
      requestedUrl: 'https://gaumenfreundin.de/curry',
      finalUrl: 'https://gaumenfreundin.de/curry',
      hostname: 'gaumenfreundin.de',
      html,
      $: cheerio.load(html),
    };

    const res = await extractFromWebsiteContext(ctx);
    assert.ok(res);
    assert.equal(res.caption, 'Food Blog Recipe');
    assert.equal(res.media.kind, 'none');
    assert.ok(res.htmlContent?.includes('Super schnelles Curry'));
  });
});
