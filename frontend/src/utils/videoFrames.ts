import { CapacitorHttp } from '@capacitor/core';
import * as MP4Box from 'mp4box';
import type { MP4File, MP4Info, MP4Sample, MP4MediaTrack } from 'mp4box';
import { isNative } from '../native';
import { VIDEO_FRAME_PROFILE } from './imageCompression';
import { apiUrl } from '../api';
import type { ExtractionJob } from '../types';
import { setCachedImage } from './imageStore';

/** Maximum video size we will download on client for frame extraction (25 MB covers >99% of Reels/Shorts). */
export const MAX_VIDEO_DOWNLOAD_BYTES = 25 * 1024 * 1024;

/** Overall deadline for entire keyframe capture workflow. */
export const FRAME_CAPTURE_TIMEOUT_MS = 15000;

/** Timeout per seek operation in fallback mode. */
const SEEK_TIMEOUT_MS = 2000;

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
 * Extracts description (avcC, hvcC, vpcC, av1C) from MP4 track entries for VideoDecoder config.
 */
function getTrackDescription(mp4boxfile: MP4File, track: MP4MediaTrack): Uint8Array | undefined {
  try {
    const trak = mp4boxfile.getTrackById(track.id);
    if (!trak?.mdia?.minf?.stbl?.stsd?.entries) return undefined;
    for (const entry of trak.mdia.minf.stbl.stsd.entries) {
      const box = entry.avcC || entry.hvcC || entry.vpcC || entry.av1C;
      if (box) {
        const stream = new MP4Box.DataStream(undefined, 0, MP4Box.DataStream.BIG_ENDIAN);
        box.write(stream);
        // Slice off the 4-byte box size and 4-byte box type header
        return new Uint8Array(stream.buffer, 8);
      }
    }
  } catch (err: any) {
    console.warn('[videoFrames] Failed to extract track description box:', err.message);
  }
  return undefined;
}

/**
 * Headless in-memory video frame extraction using native WebCodecs VideoDecoder and MP4Box.
 * 100% deterministic, no DOM attachment, no CSS hacks, no GPU throttling.
 */
async function extractKeyframesWebCodecs(
  arrayBuffer: ArrayBuffer,
  durationHint?: number,
  signal?: AbortSignal,
): Promise<string[]> {
  if (typeof VideoDecoder === 'undefined') {
    throw new Error('WebCodecs VideoDecoder not supported on this platform');
  }

  return new Promise((resolve, reject) => {
    let decoder: VideoDecoder | null = null;
    let isFinished = false;

    const cleanup = () => {
      isFinished = true;
      if (decoder && decoder.state !== 'closed') {
        try { decoder.close(); } catch { /* ignore */ }
      }
    };

    if (signal) {
      signal.addEventListener('abort', () => {
        cleanup();
        reject(new Error('Aborted'));
      }, { once: true });
    }

    const mp4boxfile = MP4Box.createFile();
    const capturedMap = new Map<number, string>();
    let targetTimestampsSec: number[] = [];

    mp4boxfile.onError = (err: string) => {
      cleanup();
      reject(new Error(`MP4Box error: ${err}`));
    };

    mp4boxfile.onReady = async (info: MP4Info) => {
      try {
        const videoTrack = info.videoTracks[0];
        if (!videoTrack) {
          cleanup();
          return resolve([]);
        }

        const realDuration = (info.duration && info.timescale)
          ? info.duration / info.timescale
          : (durationHint || 15);

        targetTimestampsSec = calculateKeyframeTimestamps(realDuration);
        console.log(`[videoFrames-WebCodecs] Extracting frames at timestamps: [${targetTimestampsSec.join('s, ')}s]`);

        const description = getTrackDescription(mp4boxfile, videoTrack);

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          cleanup();
          return resolve([]);
        }

        decoder = new VideoDecoder({
          output: (videoFrame: VideoFrame) => {
            if (isFinished) {
              videoFrame.close();
              return;
            }

            const frameSec = videoFrame.timestamp / 1_000_000;

            // Check which target timestamp this frame is suitable for
            for (let i = 0; i < targetTimestampsSec.length; i++) {
              const target = targetTimestampsSec[i];
              if (!capturedMap.has(i) && frameSec >= target - 0.25) {
                const { maxEdge, quality } = VIDEO_FRAME_PROFILE;
                let targetWidth = videoFrame.displayWidth || 720;
                let targetHeight = videoFrame.displayHeight || 1280;

                if (targetWidth > maxEdge || targetHeight > maxEdge) {
                  if (targetWidth > targetHeight) {
                    targetHeight = Math.round((targetHeight * maxEdge) / targetWidth);
                    targetWidth = maxEdge;
                  } else {
                    targetWidth = Math.round((targetWidth * maxEdge) / targetHeight);
                    targetHeight = maxEdge;
                  }
                }

                canvas.width = targetWidth;
                canvas.height = targetHeight;
                ctx.drawImage(videoFrame, 0, 0, targetWidth, targetHeight);
                const base64 = canvas.toDataURL('image/jpeg', quality);
                if (base64 && base64.length > 200) {
                  capturedMap.set(i, base64);
                }
              }
            }

            videoFrame.close();
          },
          error: (err: any) => {
            console.warn('[videoFrames-WebCodecs] Decoder error:', err);
          },
        });

        decoder.configure({
          codec: videoTrack.codec,
          codedWidth: videoTrack.video?.width,
          codedHeight: videoTrack.video?.height,
          description,
        });

        mp4boxfile.onSamples = async (trackId: number, _user: any, samples: MP4Sample[]) => {
          if (trackId !== videoTrack.id || !decoder || decoder.state === 'closed') return;

          for (const sample of samples) {
            if (isFinished || decoder.state !== 'configured') break;

            const chunk = new EncodedVideoChunk({
              type: sample.is_sync ? 'key' : 'delta',
              timestamp: (sample.cts * 1_000_000) / sample.timescale,
              duration: (sample.duration * 1_000_000) / sample.timescale,
              data: sample.data,
            });

            decoder.decode(chunk);
          }

          try {
            if (decoder && decoder.state === 'configured') {
              await decoder.flush();
            }
          } catch (flushErr) {
            console.warn('[videoFrames-WebCodecs] Flush error:', flushErr);
          }

          const results: string[] = [];
          for (let i = 0; i < targetTimestampsSec.length; i++) {
            const frame = capturedMap.get(i);
            if (frame) results.push(frame);
          }

          cleanup();
          resolve(results);
        };

        mp4boxfile.setExtractionOptions(videoTrack.id, null, { nbSamples: 1000 });
        mp4boxfile.start();
      } catch (err: any) {
        cleanup();
        reject(err);
      }
    };

    // MP4Box expects a copy or direct ArrayBuffer with fileStart offset
    const bufferWithStart = arrayBuffer.slice(0) as ArrayBuffer & { fileStart?: number };
    bufferWithStart.fileStart = 0;
    mp4boxfile.appendBuffer(bufferWithStart);
    mp4boxfile.flush();
  });
}

/**
 * Seeks a video element in fallback mode with a safe 50ms buffer and guaranteed resolution.
 */
function seekToTimestamp(video: HTMLVideoElement, timestamp: number): Promise<void> {
  return new Promise((resolve) => {
    let resolved = false;
    const finish = () => {
      if (resolved) return;
      resolved = true;
      video.removeEventListener('seeked', onSeeked);
      clearTimeout(timer);
      resolve();
    };

    const onSeeked = () => {
      setTimeout(finish, 50);
    };

    const timer = setTimeout(() => {
      console.warn(`[videoFrames-Fallback] Seek to ${timestamp}s timed out after ${SEEK_TIMEOUT_MS}ms, proceeding.`);
      finish();
    }, SEEK_TIMEOUT_MS);

    video.addEventListener('seeked', onSeeked, { once: true });
    try {
      video.currentTime = Math.min(timestamp, Math.max(0, (video.duration || 10) - 0.1));
    } catch (err: any) {
      console.warn(`[videoFrames-Fallback] Error setting video.currentTime: ${err.message}`);
      finish();
    }
  });
}

/**
 * Fallback keyframe capture using offscreen HTML5 video element.
 */
async function extractKeyframesVideoElement(
  arrayBuffer: ArrayBuffer,
  durationSeconds?: number,
  signal?: AbortSignal,
): Promise<string[]> {
  let videoElement: HTMLVideoElement | null = null;
  let objectUrl: string | null = null;

  try {
    const videoBlob = new Blob([arrayBuffer], { type: 'video/mp4' });
    objectUrl = URL.createObjectURL(videoBlob);

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

    if (videoElement.readyState < 2 || !videoElement.videoWidth) {
      await new Promise<void>((resolve, reject) => {
        const onLoaded = () => { cleanup(); resolve(); };
        const onError = () => { cleanup(); reject(new Error('Video load error')); };
        const cleanup = () => {
          videoElement?.removeEventListener('loadeddata', onLoaded);
          videoElement?.removeEventListener('loadedmetadata', onLoaded);
          videoElement?.removeEventListener('error', onError);
        };

        videoElement?.addEventListener('loadeddata', onLoaded);
        videoElement?.addEventListener('loadedmetadata', onLoaded);
        videoElement?.addEventListener('error', onError);

        setTimeout(() => { cleanup(); resolve(); }, 4000);
      });
    }

    const realDuration = (videoElement.duration && Number.isFinite(videoElement.duration) && videoElement.duration > 0)
      ? videoElement.duration
      : (durationSeconds || 15);

    const timestamps = calculateKeyframeTimestamps(realDuration);
    const capturedFrames: string[] = [];
    const { maxEdge, quality } = VIDEO_FRAME_PROFILE;

    for (const ts of timestamps) {
      if (signal?.aborted) break;

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
      if (!ctx) continue;

      ctx.drawImage(videoElement, 0, 0, targetWidth, targetHeight);
      const base64 = canvas.toDataURL('image/jpeg', quality);
      if (base64 && base64.length > 200) {
        capturedFrames.push(base64);
      }
    }

    return capturedFrames;
  } finally {
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
 * Captures 3 distributed keyframes from a video CDN URL.
 * Prefers native WebCodecs API (in-memory, headless) and falls back to offscreen video element.
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

    let arrayBuffer: ArrayBuffer;
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

    if (arrayBuffer.byteLength > MAX_VIDEO_DOWNLOAD_BYTES) {
      console.warn(`[videoFrames] Video size (${(arrayBuffer.byteLength / (1024 * 1024)).toFixed(1)} MB) exceeds limit, skipping.`);
      return [];
    }

    // 1. Try headless in-memory extraction via WebCodecs + MP4Box
    try {
      const frames = await extractKeyframesWebCodecs(arrayBuffer, durationSeconds, abortController.signal);
      if (frames.length > 0) {
        console.log(`[videoFrames] Successfully captured ${frames.length} keyframes via WebCodecs.`);
        return frames;
      }
    } catch (webCodecsErr: any) {
      console.warn(`[videoFrames] WebCodecs extraction failed, trying fallback: ${webCodecsErr.message}`);
    }

    // 2. Fallback to offscreen <video> element if WebCodecs is unavailable or fails
    const fallbackFrames = await extractKeyframesVideoElement(arrayBuffer, durationSeconds, abortController.signal);
    console.log(`[videoFrames] Successfully captured ${fallbackFrames.length} keyframes via VideoElement fallback.`);
    return fallbackFrames;
  } catch (err: any) {
    console.warn(`[videoFrames] Keyframe capture failed: ${err.message}`);
    return [];
  } finally {
    clearTimeout(timeoutId);
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
    console.warn('[videoFrames] Received awaiting_frames but job has no videoUrl in mediaRequest.');
    return;
  }

  // Pre-cache the cover thumbnail if provided by the scraper
  if (mediaRequest.thumbnailUrl) {
    try {
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
    } catch (err: any) {
      console.warn(`[videoFrames] Failed to pre-cache thumbnail: ${err.message}`);
    }
  }

  // Capture 3 distributed keyframes from video stream
  const framesBase64 = await captureKeyframes(
    mediaRequest.videoUrl,
    mediaRequest.durationSeconds,
  );

  console.log(`[videoFrames] Submitting ${framesBase64.length} frames for job ${job.id}...`);

  // Submit frames to backend to resume worker extraction
  try {
    const postResponse = await fetch(apiUrl('/api/extract-recipe/frames'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        jobId: job.id,
        framesBase64,
      }),
    });

    if (!postResponse.ok) {
      console.warn(`[videoFrames] Failed to submit frames, status: ${postResponse.status}`);
    } else {
      console.log(`[videoFrames] Frames submitted successfully for job ${job.id}.`);
    }
  } catch (err: any) {
    console.warn(`[videoFrames] POST /api/extract-recipe/frames network error: ${err.message}`);
  }
}
