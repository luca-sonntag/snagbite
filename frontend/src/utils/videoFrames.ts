import { CapacitorHttp } from '@capacitor/core';
import { isNative } from '../native';
import { VIDEO_FRAME_PROFILE } from './imageCompression';
import { apiUrl } from '../api';
import type { ExtractionJob } from '../types';
import { setCachedImage } from './imageStore';

/** Maximum video size we will download on client for frame extraction (25 MB covers >99% of Reels/Shorts). */
export const MAX_VIDEO_DOWNLOAD_BYTES = 25 * 1024 * 1024;

/** Overall deadline for entire keyframe capture workflow. */
export const FRAME_CAPTURE_TIMEOUT_MS = 15000;

/** Timeout per seek operation. */
const SEEK_TIMEOUT_MS = 3000;

/** Keyframe time fractions along the video timeline (25%, 50%, 75%). */
export const FRAME_PERCENTAGES = [0.25, 0.50, 0.75];

/**
 * Calculates target timestamps in seconds for given duration.
 */
export function calculateKeyframeTimestamps(durationSeconds: number): number[] {
  const duration = Math.max(1, durationSeconds);
  return FRAME_PERCENTAGES.map((p) => Math.round(duration * p * 100) / 100);
}

/**
 * Converts a base64 string or ArrayBuffer into a Blob.
 */
function base64ToBlob(base64Data: string, mimeType = 'video/mp4'): Blob {
  const cleanBase64 = base64Data.replace(/^data:video\/\w+;base64,/, '');
  const byteCharacters = atob(cleanBase64);
  const byteNumbers = new Uint8Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  return new Blob([byteNumbers], { type: mimeType });
}

/**
 * Seeks a video element to a specific timestamp and resolves only when the decoded frame
 * is guaranteed to be rendered and available for canvas capture.
 */
function seekToTimestamp(video: HTMLVideoElement, timestamp: number): Promise<void> {
  return new Promise((resolve) => {
    let done = false;
    const cleanup = () => {
      done = true;
      video.removeEventListener('seeked', onSeeked);
      clearTimeout(timer);
    };

    const onSeeked = () => {
      if (done) return;
      cleanup();
      // On Chromium / Android WebView, requestVideoFrameCallback guarantees that the hardware decoder
      // has presented the frame to the compositor surface and is ready for canvas drawImage.
      if ('requestVideoFrameCallback' in video && typeof (video as any).requestVideoFrameCallback === 'function') {
        (video as any).requestVideoFrameCallback(() => {
          resolve();
        });
      } else {
        requestAnimationFrame(() => {
          setTimeout(resolve, 80);
        });
      }
    };

    const timer = setTimeout(() => {
      if (done) return;
      console.warn(`[videoFrames] Seek to ${timestamp}s timed out after ${SEEK_TIMEOUT_MS}ms, proceeding.`);
      cleanup();
      resolve();
    }, SEEK_TIMEOUT_MS);

    video.addEventListener('seeked', onSeeked);
    try {
      video.currentTime = Math.min(timestamp, Math.max(0, (video.duration || 10) - 0.1));
    } catch (err: any) {
      console.warn(`[videoFrames] Error setting video.currentTime: ${err.message}`);
      cleanup();
      resolve();
    }
  });
}

/**
 * Captures 3 distributed keyframes from a video CDN URL using an offscreen HTML5 video element.
 * Runs only on native platforms (Android) via CapacitorHttp to bypass CORS.
 * Always returns a list of base64 JPEG strings (never throws).
 */
export async function captureKeyframes(
  videoUrl: string,
  durationSeconds?: number,
  signal?: AbortSignal,
): Promise<string[]> {
  if (!videoUrl || typeof videoUrl !== 'string') {
    return [];
  }

  // Desktop web browser: third-party video CDNs enforce CORS without Access-Control headers,
  // so client streaming is skipped on web and falls back to caption-only extraction.
  if (!isNative()) {
    console.log('[videoFrames] Non-native environment, skipping client media download.');
    return [];
  }

  const abortController = new AbortController();
  const timeoutId = setTimeout(() => abortController.abort(), FRAME_CAPTURE_TIMEOUT_MS);

  if (signal) {
    signal.addEventListener('abort', () => abortController.abort(), { once: true });
  }

  let videoElement: HTMLVideoElement | null = null;
  let objectUrl: string | null = null;

  try {
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

    let videoBlob: Blob;
    if (typeof response.data === 'string') {
      videoBlob = base64ToBlob(response.data, 'video/mp4');
    } else if (response.data instanceof Blob) {
      videoBlob = response.data;
    } else {
      console.warn('[videoFrames] Unexpected response format from CapacitorHttp.');
      return [];
    }

    if (videoBlob.size > MAX_VIDEO_DOWNLOAD_BYTES) {
      console.warn(`[videoFrames] Video size (${(videoBlob.size / (1024 * 1024)).toFixed(1)} MB) exceeds limit, skipping.`);
      return [];
    }

    objectUrl = URL.createObjectURL(videoBlob);

    // Create offscreen video element attached to DOM with non-zero dimensions to avoid GPU decoder throttling
    videoElement = document.createElement('video');
    videoElement.preload = 'auto';
    videoElement.muted = true;
    videoElement.playsInline = true;
    videoElement.crossOrigin = 'anonymous';
    videoElement.style.position = 'fixed';
    videoElement.style.left = '-9999px';
    videoElement.style.top = '-9999px';
    videoElement.style.width = '320px';
    videoElement.style.height = '240px';
    videoElement.style.opacity = '0.01';
    videoElement.style.pointerEvents = 'none';
    document.body.appendChild(videoElement);

    videoElement.src = objectUrl;
    videoElement.load();

    // Wait for metadata / loadeddata if not already ready
    if (videoElement.readyState < 2 || !videoElement.videoWidth) {
      await new Promise<void>((resolve, reject) => {
        const onLoaded = () => {
          cleanup();
          resolve();
        };
        const onError = () => {
          cleanup();
          reject(new Error(`Video load error: ${videoElement?.error?.message || 'unknown'}`));
        };
        const cleanup = () => {
          videoElement?.removeEventListener('loadeddata', onLoaded);
          videoElement?.removeEventListener('loadedmetadata', onLoaded);
          videoElement?.removeEventListener('error', onError);
        };

        videoElement?.addEventListener('loadeddata', onLoaded);
        videoElement?.addEventListener('loadedmetadata', onLoaded);
        videoElement?.addEventListener('error', onError);

        // Fallback timer for metadata load
        setTimeout(() => {
          cleanup();
          resolve();
        }, 5000);
      });
    }

    const realDuration = (videoElement.duration && Number.isFinite(videoElement.duration) && videoElement.duration > 0)
      ? videoElement.duration
      : (durationSeconds || 15);

    const timestamps = calculateKeyframeTimestamps(realDuration);
    console.log(`[videoFrames] Capturing frames at timestamps: [${timestamps.join('s, ')}s] (duration: ${realDuration.toFixed(1)}s)`);

    const capturedFrames: string[] = [];
    const { maxEdge, quality } = VIDEO_FRAME_PROFILE;

    for (const ts of timestamps) {
      if (abortController.signal.aborted) break;

      await seekToTimestamp(videoElement, ts);

      const origWidth = videoElement.videoWidth || 720;
      const origHeight = videoElement.videoHeight || 1280;

      let targetWidth = origWidth;
      let targetHeight = origHeight;

      if (targetWidth > maxEdge || targetHeight > maxEdge) {
        if (targetWidth > targetHeight) {
          targetHeight = Math.round((targetHeight * maxEdge) / targetWidth);
          targetWidth = maxEdge;
        } else {
          targetWidth = Math.round((targetWidth * maxEdge) / targetHeight);
          targetHeight = maxEdge;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        console.warn('[videoFrames] Canvas 2d context unavailable');
        continue;
      }

      ctx.drawImage(videoElement, 0, 0, targetWidth, targetHeight);

      const base64 = canvas.toDataURL('image/jpeg', quality);
      if (base64 && base64.length > 200) {
        capturedFrames.push(base64);
      }
    }

    console.log(`[videoFrames] Successfully captured ${capturedFrames.length} keyframes.`);
    return capturedFrames;
  } catch (err: any) {
    console.warn(`[videoFrames] Keyframe capture failed: ${err.message}`);
    return [];
  } finally {
    clearTimeout(timeoutId);
    if (videoElement) {
      try {
        videoElement.pause();
        videoElement.removeAttribute('src');
        videoElement.load();
        videoElement.remove();
      } catch { /* ignore */ }
    }
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
    }
  }
}

/**
 * Handles an awaiting_frames request: pre-caches the thumbnail, captures 3 video keyframes,
 * and POSTs them to /api/extract-recipe/frames to resume worker extraction.
 */
export async function handleClientFrameRequest(
  job: ExtractionJob,
  getAccessToken: () => Promise<string | null>,
): Promise<void> {
  const token = await getAccessToken();
  if (!token) return;

  const mediaRequest = job.mediaRequest;
  if (!mediaRequest?.videoUrl) {
    // If no media request, unblock the job immediately with empty frames
    await fetch(apiUrl('/api/extract-recipe/frames'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ jobId: job.id, framesBase64: [] }),
    }).catch(console.error);
    return;
  }

  // Pre-cache thumbnail into IndexedDB recipe-image-cache if provided
  let thumbnailBase64: string | undefined;
  if (mediaRequest.thumbnailUrl) {
    try {
      if (isNative()) {
        const thumbRes = await CapacitorHttp.get({
          url: mediaRequest.thumbnailUrl,
          responseType: 'blob',
        });
        if (thumbRes.status >= 200 && thumbRes.status < 300 && typeof thumbRes.data === 'string') {
          thumbnailBase64 = thumbRes.data;
          // Store thumbnail in local image cache
          await setCachedImage(mediaRequest.thumbnailUrl, `data:image/jpeg;base64,${thumbRes.data}`).catch(() => {});
        }
      }
    } catch (err: any) {
      console.warn('[handleClientFrameRequest] Thumbnail pre-cache failed:', err.message);
    }
  }

  // Capture video keyframes
  const frames = await captureKeyframes(mediaRequest.videoUrl, mediaRequest.durationSeconds);

  // Submit frames to backend
  await fetch(apiUrl('/api/extract-recipe/frames'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      jobId: job.id,
      thumbnailBase64,
      framesBase64: frames,
    }),
  }).catch((err) => {
    console.warn('[handleClientFrameRequest] Failed to submit keyframes:', err);
  });
}
