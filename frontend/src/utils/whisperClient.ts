/**
 * Client module for requesting audio transcription from Cloudflare Edge Whisper proxy
 * using ephemeral HMAC tickets.
 */

export const WHISPER_CLIENT_TIMEOUT_MS = 10000;

export interface TranscribeAudioParams {
  videoBuffer: ArrayBuffer;
  whisperEndpoint?: string;
  whisperTicket?: string;
  signal?: AbortSignal;
}

/**
 * Transcribes audio from an in-memory video or audio buffer using the Cloudflare Edge Worker.
 * Safe and fail-soft: Never throws, logs warnings, and returns undefined if the request fails or times out.
 */
export async function transcribeVideoAudio(params: TranscribeAudioParams): Promise<string | undefined> {
  const { videoBuffer, whisperEndpoint, whisperTicket, signal } = params;

  if (!whisperEndpoint || !whisperTicket || videoBuffer.byteLength === 0) {
    return undefined;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), WHISPER_CLIENT_TIMEOUT_MS);

  if (signal) {
    signal.addEventListener('abort', () => controller.abort(), { once: true });
  }

  try {
    const formData = new FormData();
    const blob = new Blob([videoBuffer], { type: 'video/mp4' });
    formData.append('file', blob, 'video.mp4');
    formData.append('model', 'whisper-large-v3-turbo');

    console.log(`[whisperClient] Requesting transcription from ${whisperEndpoint}...`);

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
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[whisperClient] Whisper transcription non-fatal failure: ${msg}`);
    return undefined;
  } finally {
    clearTimeout(timeoutId);
  }
}
