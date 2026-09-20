import type { Request, Response } from 'express';
import { Readable } from 'node:stream';
import { AppError, sendAppError } from '../errors.js';

export const MAX_PROXY_VIDEO_BYTES = 25 * 1024 * 1024; // 25 MB

const TIKTOK_MOBILE_UA =
  'com.zhiliaoapp.musically/2022405040 (Linux; U; Android 12; en_US; Pixel 6; Build/SD1A.210817.036; Cronet/58.0.2991.0)';
const DESKTOP_BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36';
const OKHTTP_UA = 'okhttp/4.9.3';

/**
 * Validates whether a target URL is safe for external media fetching (SSRF guard).
 */
export function isSafeMediaUrl(targetUrl: URL): boolean {
  const protocol = targetUrl.protocol.toLowerCase();
  if (protocol !== 'http:' && protocol !== 'https:') {
    return false;
  }

  const hostname = targetUrl.hostname.toLowerCase().replace(/^\[|\]$/g, '');

  if (
    hostname === 'localhost' ||
    hostname.endsWith('.localhost') ||
    hostname === '127.0.0.1' ||
    hostname === '::1' ||
    hostname === '0.0.0.0' ||
    hostname === 'metadata.google.internal' ||
    hostname === '169.254.169.254'
  ) {
    return false;
  }

  // IPv4 private & link-local ranges
  if (
    /^10\./.test(hostname) ||
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname) ||
    /^192\.168\./.test(hostname) ||
    /^127\./.test(hostname) ||
    /^169\.254\./.test(hostname) ||
    /^0\./.test(hostname)
  ) {
    return false;
  }

  // IPv6 unique local and link-local ranges
  if (/^[fF][cCdD]/.test(hostname) || /^[fF][eE][89aAbB]/.test(hostname)) {
    return false;
  }

  return true;
}

/**
 * Resolves platform-specific headers to ensure media CDNs accept the request.
 */
function getPlatformHeaders(parsedUrl: URL, isFallback = false): Record<string, string> {
  const host = parsedUrl.hostname.toLowerCase();

  if (host.includes('tiktok') || host.includes('byteoversea') || host.includes('ibytedtos')) {
    return {
      'User-Agent': isFallback ? OKHTTP_UA : TIKTOK_MOBILE_UA,
      Referer: 'https://www.tiktok.com/',
      Accept: '*/*',
    };
  }

  if (host.includes('instagram') || host.includes('cdninstagram') || host.includes('fbcdn')) {
    return {
      'User-Agent': isFallback ? TIKTOK_MOBILE_UA : DESKTOP_BROWSER_UA,
      Referer: 'https://www.instagram.com/',
      Accept: '*/*',
    };
  }

  return {
    'User-Agent': isFallback ? OKHTTP_UA : DESKTOP_BROWSER_UA,
    Accept: '*/*',
  };
}

/**
 * Streaming proxy handler to allow web clients to fetch external CDN video/media streams
 * while bypassing browser CORS limitations, without persisting files to disk.
 */
export async function handleVideoProxy(req: Request, res: Response): Promise<void> {
  try {
    const rawUrl = req.query.url;

    if (!rawUrl || typeof rawUrl !== 'string') {
      throw new AppError('MISSING_FIELD', { params: { field: 'url' } });
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(rawUrl);
    } catch {
      throw new AppError('INVALID_URL', { message: 'Failed to parse target proxy URL.' });
    }

    if (!isSafeMediaUrl(parsedUrl)) {
      throw new AppError('INVALID_URL', { message: 'Target proxy URL is not allowed.' });
    }

    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), 35000);

    req.on('close', () => {
      abortController.abort();
    });

    let upstreamResponse: globalThis.Response;
    const initialHeaders = getPlatformHeaders(parsedUrl, false);

    console.log(`[videoProxy] Fetching media stream for host: ${parsedUrl.hostname}...`);

    try {
      upstreamResponse = await fetch(rawUrl, {
        signal: abortController.signal,
        headers: initialHeaders,
      });

      // If upstream failed with 403 or 404, retry once with fallback headers (e.g. okhttp / alternative UA)
      if (
        (!upstreamResponse.ok &&
          (upstreamResponse.status === 403 || upstreamResponse.status === 404)) &&
        !abortController.signal.aborted
      ) {
        console.warn(
          `[videoProxy] Initial fetch returned ${upstreamResponse.status}, retrying with fallback headers...`,
        );
        const fallbackHeaders = getPlatformHeaders(parsedUrl, true);
        const retryResponse = await fetch(rawUrl, {
          signal: abortController.signal,
          headers: fallbackHeaders,
        });
        if (retryResponse.ok) {
          upstreamResponse = retryResponse;
        }
      }
    } catch (fetchErr: unknown) {
      clearTimeout(timeoutId);
      if (abortController.signal.aborted) {
        return;
      }
      const msg = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
      throw new AppError('SCRAPE_FAILED', {
        message: `Upstream media proxy request failed: ${msg}`,
      });
    }

    clearTimeout(timeoutId);

    if (!upstreamResponse.ok) {
      console.warn(
        `[videoProxy] Upstream returned status ${upstreamResponse.status} for ${parsedUrl.hostname}`,
      );
      res.status(upstreamResponse.status).json({
        success: false,
        error: `Upstream CDN returned status ${upstreamResponse.status}`,
      });
      return;
    }

    const contentLengthHeader = upstreamResponse.headers.get('content-length');
    if (contentLengthHeader) {
      const contentLength = parseInt(contentLengthHeader, 10);
      if (!Number.isNaN(contentLength) && contentLength > MAX_PROXY_VIDEO_BYTES) {
        throw new AppError('MEDIA_DOWNLOAD_FAILED', {
          message: `Video size (${(contentLength / (1024 * 1024)).toFixed(1)} MB) exceeds maximum proxy limit.`,
        });
      }
    }

    const upstreamContentType = upstreamResponse.headers.get('content-type') || 'video/mp4';

    res.status(200);
    res.setHeader('Content-Type', upstreamContentType);
    res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');
    if (contentLengthHeader) {
      res.setHeader('Content-Length', contentLengthHeader);
    }

    if (!upstreamResponse.body) {
      res.end();
      return;
    }

    let bytesStreamed = 0;
    const nodeStream = Readable.fromWeb(upstreamResponse.body as any);

    nodeStream.on('data', (chunk: Buffer) => {
      bytesStreamed += chunk.length;
      if (bytesStreamed > MAX_PROXY_VIDEO_BYTES) {
        nodeStream.destroy(new Error('Exceeded MAX_PROXY_VIDEO_BYTES limit during streaming'));
      }
    });

    nodeStream.on('error', (streamErr: unknown) => {
      const errorMsg = streamErr instanceof Error ? streamErr.message : String(streamErr);
      if (!res.headersSent) {
        res.status(500).json({ success: false, error: errorMsg });
      } else {
        res.destroy(streamErr instanceof Error ? streamErr : new Error(errorMsg));
      }
    });

    nodeStream.pipe(res);
  } catch (error: unknown) {
    if (!(error instanceof AppError)) {
      console.error('Error handling video proxy:', error);
    }
    sendAppError(res, error);
  }
}
