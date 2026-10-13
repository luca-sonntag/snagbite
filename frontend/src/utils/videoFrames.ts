import { CapacitorHttp } from '@capacitor/core';
import { isNative } from '../native';
import { apiUrl } from '../api';
import type { ExtractionJob } from '../types';
import { setCachedImage } from './imageStore';
import { extractKeyframesWebCodecs, calculateKeyframeTimestamps, FRAME_COUNT } from './videoDecoder';
import { compositeKeyframesToGridCanvas } from './gridCanvas';
import { transcribeVideoAudio } from './whisperClient';

export { calculateKeyframeTimestamps, FRAME_COUNT };

/** Maximum video size we will download on client for processing (25 MB covers >99% of Reels/Shorts). */
export const MAX_VIDEO_DOWNLOAD_BYTES = 25 * 1024 * 1024;

/** Overall deadline for entire media download + processing workflow. */
export const FRAME_CAPTURE_TIMEOUT_MS = 45000;

/**
 * Downloads a video stream into an in-memory ArrayBuffer.
 * - On native platforms (Android/iOS): uses CapacitorHttp to bypass CORS directly.
 * - On web browsers: uses the backend streaming proxy endpoint to bypass CORS.
 */
export async function fetchVideoArrayBuffer(
  videoUrl: string,
  token?: string | null,
  signal?: AbortSignal,
): Promise<ArrayBuffer | null> {
  if (!videoUrl || typeof videoUrl !== 'string') {
    return null;
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
        console.warn('[videoFrames] Video download aborted or timed out.');
        return null;
      }

      if (response.status < 200 || response.status >= 300) {
        console.warn(`[videoFrames] CapacitorHttp fetch failed with status ${response.status}`);
        return null;
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
        return null;
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
        console.warn('[videoFrames-Web] Video download aborted or timed out.');
        return null;
      }

      if (!response.ok) {
        console.warn(`[videoFrames-Web] Proxy fetch failed with status ${response.status}`);
        return null;
      }

      arrayBuffer = await response.arrayBuffer();
    }

    if (arrayBuffer.byteLength > MAX_VIDEO_DOWNLOAD_BYTES) {
      console.warn(
        `[videoFrames] Video size (${(arrayBuffer.byteLength / (1024 * 1024)).toFixed(1)} MB) exceeds limit, skipping.`
      );
      return null;
    }

    return arrayBuffer;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[videoFrames] Video stream download failed: ${msg}`);
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Captures distributed keyframes from a video CDN URL using native WebCodecs API.
 */
export async function captureKeyframes(
  videoUrl: string,
  durationSeconds?: number,
  signal?: AbortSignal,
  token?: string | null,
): Promise<string[]> {
  const buffer = await fetchVideoArrayBuffer(videoUrl, token, signal);
  if (!buffer) return [];

  try {
    const frames = await extractKeyframesWebCodecs(buffer, durationSeconds, signal);
    console.log(`[videoFrames] Successfully captured ${frames.length} keyframes via WebCodecs.`);
    return frames;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[videoFrames] Keyframe decoding failed: ${msg}`);
    return [];
  }
}

const inFlightCaptureJobs = new Set<string>();

/**
 * Handles an awaiting_frames request: pre-caches the thumbnail, captures 16 video keyframes,
 * requests Whisper transcription in parallel if a ticket is provided, and POSTs the payload
 * to /api/extract-recipe/client-payload to resume worker extraction.
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

    // Download video stream once into RAM buffer
    const videoBuffer = await fetchVideoArrayBuffer(mediaRequest.videoUrl, token);
    if (!videoBuffer) {
      console.warn(`[videoFrames] Failed to fetch video stream for job ${job.id}`);
      return;
    }

    // Execute keyframe decoding and Whisper transcription in parallel
    const [framesBase64, transcript] = await Promise.all([
      extractKeyframesWebCodecs(videoBuffer, mediaRequest.durationSeconds),
      transcribeVideoAudio({
        videoBuffer,
        whisperEndpoint: mediaRequest.whisperEndpoint,
        whisperTicket: mediaRequest.whisperTicket,
      }),
    ]);

    // Composite keyframes directly in browser to a single lightweight 4x4 grid JPEG (~200 KB)
    const gridBase64 = framesBase64.length > 0 ? await compositeKeyframesToGridCanvas(framesBase64) : null;

    console.log(
      `[videoFrames] Submitting client payload for job ${job.id}: ${gridBase64 ? '4x4 grid' : `${framesBase64.length} frames`}${transcript ? ', with transcript' : ''}...`
    );

    const payloadBody = JSON.stringify({
      jobId: job.id,
      gridBase64: gridBase64 ?? undefined,
      framesBase64: gridBase64 ? undefined : framesBase64,
      transcript: transcript ?? undefined,
    });

    // Submit payload to canonical /client-payload endpoint with fallback to legacy /frames
    try {
      let postResponse = await fetch(apiUrl('/api/extract-recipe/client-payload'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: payloadBody,
      });

      if (postResponse.status === 404) {
        // Fallback for older backend versions
        postResponse = await fetch(apiUrl('/api/extract-recipe/frames'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: payloadBody,
        });
      }

      if (!postResponse.ok) {
        console.warn(`[videoFrames] Failed to submit client payload, status: ${postResponse.status}`);
      } else {
        console.log(`[videoFrames] Client payload submitted successfully for job ${job.id}.`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[videoFrames] Submit client payload network error: ${msg}`);
    }
  } finally {
    inFlightCaptureJobs.delete(job.id);
  }
}
