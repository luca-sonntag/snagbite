import { extractAudioWavBlob } from './audioExtractor';

/**
 * Client module for requesting audio transcription from Cloudflare Edge Whisper proxy
 * using ephemeral HMAC tickets.
 */

export const WHISPER_CLIENT_TIMEOUT_MS = 30000;

export interface TranscribeAudioParams {
  videoBuffer: ArrayBuffer;
  whisperEndpoint?: string;
  whisperTicket?: string;
  signal?: AbortSignal;
}

/**
 * Transcribes audio from an in-memory video buffer using the Cloudflare Edge Worker.
 * Attempts client-side audio extraction to a lightweight 16 kHz mono WAV (saving ~90-95% bandwidth).
 * Falls back safely to sending the raw video container if audio extraction fails.
 * Safe and fail-soft: Never throws, logs warnings, and returns undefined if the request fails or times out.
 */
export async function transcribeVideoAudio(params: TranscribeAudioParams): Promise<string | undefined> {
  const { videoBuffer, whisperEndpoint, whisperTicket, signal } = params;

  if (!whisperEndpoint || !whisperTicket || videoBuffer.byteLength === 0) {
    return undefined;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(new Error(`Whisper request timed out after ${WHISPER_CLIENT_TIMEOUT_MS / 1000}s`)),
    WHISPER_CLIENT_TIMEOUT_MS
  );

  if (signal) {
    signal.addEventListener('abort', () => controller.abort(signal.reason), { once: true });
  }

  try {
    const formData = new FormData();

    // Extract lightweight 16 kHz mono audio WAV (~90-95% smaller payload)
    let uploadBlob: Blob;
    let uploadFilename: string;

    const wavBlob = await extractAudioWavBlob(videoBuffer);
    if (wavBlob) {
      console.log(
        `[whisperClient] Extracted 16kHz mono audio (${(wavBlob.size / 1024).toFixed(1)} KB) from video stream.`
      );
      uploadBlob = wavBlob;
      uploadFilename = 'audio.wav';
    } else {
      console.log('[whisperClient] Audio extraction unavailable, falling back to raw video container.');
      uploadBlob = new Blob([videoBuffer], { type: 'video/mp4' });
      uploadFilename = 'video.mp4';
    }

    formData.append('file', uploadBlob, uploadFilename);
    formData.append('model', 'whisper-large-v3-turbo');

    console.log(`[whisperClient] Requesting transcription from ${whisperEndpoint} (${uploadFilename})...`);

    const response = await fetch(whisperEndpoint, {
      method: 'POST',
      headers: {
        'x-snagbite-ticket': whisperTicket,
      },
      body: formData,
      signal: controller.signal,
    });

    if (!response.ok) {
      console.warn(`[whisperClient] Edge transcription returned HTTP ${response.status}`);
      return undefined;
    }

    const data = (await response.json()) as { text?: string; transcript?: string };
    const text = (data.text || data.transcript || '').trim();

    if (text) {
      console.log(`[whisperClient] Transcription received (${text.length} chars).`);
      return text;
    }

    return undefined;
  } catch (err: unknown) {
    if (controller.signal.aborted) {
      const reason = controller.signal.reason;
      const abortMsg = reason instanceof Error ? reason.message : String(reason);
      console.warn(`[whisperClient] Whisper transcription aborted/timed out: ${abortMsg}`);
    } else {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[whisperClient] Whisper transcription non-fatal failure: ${msg}`);
    }
    return undefined;
  } finally {
    clearTimeout(timeoutId);
  }
}
