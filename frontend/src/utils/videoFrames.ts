import { CapacitorHttp } from '@capacitor/core';
import { isNative } from '../native';
import { apiUrl } from '../api';
import type { ExtractionJob } from '../types';
import { setCachedImage } from './imageStore';
import { extractKeyframesWebCodecs, calculateKeyframeTimestamps, FRAME_COUNT } from './videoDecoder';
import { compositeKeyframesToGridCanvas } from './gridCanvas';

export { calculateKeyframeTimestamps, FRAME_COUNT };

/** Maximum video size we will download on client for frame extraction (25 MB covers >99% of Reels/Shorts). */
export const MAX_VIDEO_DOWNLOAD_BYTES = 25 * 1024 * 1024;

/** Overall deadline for entire keyframe capture workflow (covers slow CDN download + decoding). */
export const FRAME_CAPTURE_TIMEOUT_MS = 45000;

/**
 * Captures distributed keyframes from a video CDN URL using native WebCodecs API.
 * - On native platforms (Android/iOS): uses CapacitorHttp to bypass CORS directly.
 * - On web browsers: uses the backend streaming proxy endpoint to bypass CORS.
 * Always returns a list of base64 JPEG strings (never throws).
 */
export async function captureKeyframes(
  videoUrl: string,
  durationSeconds?: number,
  signal?: AbortSignal,
  token?: string | null,
): Promise<string[]> {
  if (!videoUrl || typeof videoUrl !== 'string') {
    return [];
  }

  const abortController = new AbortController();
  const timeoutId = setTimeout(() => abortController.abort(), FRAME_CAPTURE_TIMEOUT_MS);

  if (signal) {
    signal.addEventListener('abort', () => abortController.abort(), { once: true });
  }

  try {
    let arrayBuffer: ArrayBuffer;

    if (isNative()) {
      console.log(`[videoFrames] Fetching video stream via CapacitorHttp (${videoUrl.slice(0, 60)}...)...`);

      const response = await CapacitorHttp.get({
        url: videoUrl,
        responseType: 'blob',
      });

      if (abortController.signal.aborted) {
        console.warn('[videoFrames] Frame capture aborted or timed out.');
        return [];
      }

      if (response.status < 200 || response.status >= 300) {
        console.warn(`[videoFrames] CapacitorHttp fetch failed with status ${response.status}`);
        return [];
      }

      if (typeof response.data === 'string') {
        const cleanBase64 = response.data.replace(/^data:video\/\w+;base64,/, '');
        const byteCharacters = atob(cleanBase64);
        const bytes = new Uint8Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          bytes[i] = byteCharacters.charCodeAt(i);
        }
        arrayBuffer = bytes.buffer;
      } else if (response.data instanceof Blob) {
        arrayBuffer = await response.data.arrayBuffer();
      } else if (response.data instanceof ArrayBuffer) {
        arrayBuffer = response.data;
      } else {
        console.warn('[videoFrames] Unexpected response format from CapacitorHttp.');
        return [];
      }
    } else {
      console.log(`[videoFrames-Web] Fetching video stream via backend proxy (${videoUrl.slice(0, 60)}...)...`);
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const proxyUrl = apiUrl(`/api/extract-recipe/proxy-video?url=${encodeURIComponent(videoUrl)}`);
      const response = await fetch(proxyUrl, {
        headers,
        signal: abortController.signal,
      });

      if (abortController.signal.aborted) {
        console.warn('[videoFrames-Web] Frame capture aborted or timed out.');
        return [];
      }

      if (!response.ok) {
        console.warn(`[videoFrames-Web] Proxy fetch failed with status ${response.status}`);
        return [];
      }

      arrayBuffer = await response.arrayBuffer();
    }

    if (arrayBuffer.byteLength > MAX_VIDEO_DOWNLOAD_BYTES) {
      console.warn(`[videoFrames] Video size (${(arrayBuffer.byteLength / (1024 * 1024)).toFixed(1)} MB) exceeds limit, skipping.`);
      return [];
    }

    const frames = await extractKeyframesWebCodecs(arrayBuffer, durationSeconds, abortController.signal);
    console.log(`[videoFrames] Successfully captured ${frames.length} keyframes via WebCodecs.`);
    return frames;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[videoFrames] Keyframe capture failed: ${msg}`);
    return [];
  } finally {
    clearTimeout(timeoutId);
  }
}

const inFlightCaptureJobs = new Set<string>();

/**
 * Handles an awaiting_frames request: pre-caches the thumbnail, captures 16 video keyframes,
 * and POSTs them to /api/extract-recipe/frames to resume worker extraction.
 */
export async function handleClientFrameRequest(
  job: ExtractionJob,
  getAccessToken: () => Promise<string | null>,
): Promise<void> {
  if (inFlightCaptureJobs.has(job.id)) {
    return;
  }
  inFlightCaptureJobs.add(job.id);

  try {
    const token = await getAccessToken();
    if (!token) return;

    const mediaRequest = job.mediaRequest;
    if (!mediaRequest?.videoUrl) {
      console.warn('[videoFrames] Received awaiting_frames but job has no videoUrl in mediaRequest.');
      return;
    }

    // Pre-cache the cover thumbnail if provided by the scraper
    if (mediaRequest.thumbnailUrl) {
      try {
        if (isNative()) {
          const thumbResponse = await CapacitorHttp.get({
            url: mediaRequest.thumbnailUrl,
            responseType: 'blob',
          });
          if (thumbResponse.status >= 200 && thumbResponse.status < 300) {
            const thumbBase64 = typeof thumbResponse.data === 'string'
              ? (thumbResponse.data.startsWith('data:') ? thumbResponse.data : `data:image/jpeg;base64,${thumbResponse.data}`)
              : null;
            if (thumbBase64) {
              await setCachedImage(mediaRequest.thumbnailUrl, thumbBase64);
            }
          }
        } else {
          const thumbProxyUrl = apiUrl(`/api/extract-recipe/proxy-video?url=${encodeURIComponent(mediaRequest.thumbnailUrl)}`);
          const thumbRes = await fetch(thumbProxyUrl, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (thumbRes.ok) {
            const blob = await thumbRes.blob();
            const reader = new FileReader();
            const thumbBase64 = await new Promise<string>((resolve) => {
              reader.onloadend = () => resolve(reader.result as string);
              reader.readAsDataURL(blob);
            });
            if (thumbBase64) {
              await setCachedImage(mediaRequest.thumbnailUrl, thumbBase64);
            }
          }
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn(`[videoFrames] Failed to pre-cache thumbnail: ${msg}`);
      }
    }

    // Capture 16 distributed keyframes from video stream
    const framesBase64 = await captureKeyframes(
      mediaRequest.videoUrl,
      mediaRequest.durationSeconds,
      undefined,
      token,
    );

    // Composite keyframes directly in browser to a single lightweight 4x4 grid JPEG (~200 KB)
    const gridBase64 = framesBase64.length > 0 ? await compositeKeyframesToGridCanvas(framesBase64) : null;

    console.log(
      `[videoFrames] Submitting ${gridBase64 ? '4x4 composite grid' : `${framesBase64.length} frames`} for job ${job.id}...`
    );

    // Submit frames/grid to backend to resume worker extraction
    try {
      const postResponse = await fetch(apiUrl('/api/extract-recipe/frames'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          jobId: job.id,
          gridBase64: gridBase64 ?? undefined,
          framesBase64: gridBase64 ? undefined : framesBase64,
        }),
      });

      if (!postResponse.ok) {
        console.warn(`[videoFrames] Failed to submit frames, status: ${postResponse.status}`);
      } else {
        console.log(`[videoFrames] Frames/grid submitted successfully for job ${job.id}.`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[videoFrames] POST /api/extract-recipe/frames network error: ${msg}`);
    }
  } finally {
    inFlightCaptureJobs.delete(job.id);
  }
}
