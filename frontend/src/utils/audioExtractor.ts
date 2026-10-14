/**
 * Client-side audio extraction and WAV encoding utility.
 * Decodes the audio track from an in-memory video container (MP4) using the native Web Audio API
 * and converts it to a compact, single-channel 16 kHz 16-bit PCM WAV Blob for Whisper transcription.
 */

const DEFAULT_TARGET_SAMPLE_RATE = 16000;

/**
 * Extracts and resamples the audio track from a video ArrayBuffer into a 16 kHz mono WAV Blob.
 * Returns null if the video has no audio track, is silent, or if decoding fails.
 */
export async function extractAudioWavBlob(
  videoBuffer: ArrayBuffer,
  targetSampleRate = DEFAULT_TARGET_SAMPLE_RATE
): Promise<Blob | null> {
  if (!videoBuffer || videoBuffer.byteLength === 0) {
    return null;
  }

  // Guard for environments without Web Audio API (e.g. server-side/test)
  const AudioContextClass =
    typeof window !== 'undefined'
      ? window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      : undefined;

  if (!AudioContextClass) {
    console.warn('[audioExtractor] Web Audio API is not supported in this environment.');
    return null;
  }

  // Clone buffer: decodeAudioData can detach/neuter the ArrayBuffer in some browsers
  const clonedBuffer = videoBuffer.slice(0);
  const audioCtx = new AudioContextClass();

  try {
    const decodedBuffer = await audioCtx.decodeAudioData(clonedBuffer);

    if (!decodedBuffer || decodedBuffer.length === 0 || decodedBuffer.duration === 0) {
      console.warn('[audioExtractor] Video stream contains an empty or silent audio track.');
      return null;
    }

    // Resample to targetSampleRate (16 kHz) if needed
    const finalBuffer = await resampleAudioBuffer(decodedBuffer, targetSampleRate);
    return audioBufferToWavBlob(finalBuffer);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[audioExtractor] Failed to decode audio track from video: ${msg}`);
    return null;
  } finally {
    // Release native hardware audio resources
    audioCtx.close().catch(() => {});
  }
}

/**
 * Resamples an AudioBuffer to the target sample rate using OfflineAudioContext.
 */
async function resampleAudioBuffer(
  audioBuffer: AudioBuffer,
  targetSampleRate: number
): Promise<AudioBuffer> {
  if (audioBuffer.sampleRate === targetSampleRate && audioBuffer.numberOfChannels === 1) {
    return audioBuffer;
  }

  const OfflineContextClass =
    typeof window !== 'undefined'
      ? window.OfflineAudioContext ||
        (window as unknown as { webkitOfflineAudioContext?: typeof OfflineAudioContext }).webkitOfflineAudioContext
      : undefined;

  if (!OfflineContextClass) {
    return audioBuffer;
  }

  const targetLength = Math.ceil(audioBuffer.duration * targetSampleRate);
  const offlineCtx = new OfflineContextClass(1, targetLength, targetSampleRate);

  const source = offlineCtx.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(offlineCtx.destination);
  source.start(0);

  return offlineCtx.startRendering();
}

/**
 * Converts a single- or multi-channel AudioBuffer to a 16-bit PCM mono WAV Blob.
 */
export function audioBufferToWavBlob(buffer: AudioBuffer): Blob {
  const numChannels = 1;
  const sampleRate = buffer.sampleRate;
  const length = buffer.length;

  // Mix down multi-channel audio to mono
  const monoSamples = new Float32Array(length);
  const channels = buffer.numberOfChannels;

  if (channels === 1) {
    monoSamples.set(buffer.getChannelData(0));
  } else {
    for (let c = 0; c < channels; c++) {
      const channelData = buffer.getChannelData(c);
      for (let i = 0; i < length; i++) {
        monoSamples[i] += channelData[i] / channels;
      }
    }
  }

  const bytesPerSample = 2; // 16-bit PCM
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataByteLength = length * blockAlign;
  const headerByteLength = 44;
  const totalLength = headerByteLength + dataByteLength;

  const arrayBuffer = new ArrayBuffer(totalLength);
  const view = new DataView(arrayBuffer);

  // 1. RIFF Header
  writeAscii(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataByteLength, true);
  writeAscii(view, 8, 'WAVE');

  // 2. Format Chunk
  writeAscii(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
  view.setUint16(20, 1, true); // AudioFormat (1 = PCM)
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true); // BitsPerSample

  // 3. Data Chunk
  writeAscii(view, 36, 'data');
  view.setUint32(40, dataByteLength, true);

  // Write 16-bit signed PCM samples
  let offset = 44;
  for (let i = 0; i < length; i++) {
    const s = Math.max(-1, Math.min(1, monoSamples[i]));
    const pcm = s < 0 ? s * 0x8000 : s * 0x7fff;
    view.setInt16(offset, pcm, true);
    offset += 2;
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' });
}

function writeAscii(view: DataView, offset: number, text: string): void {
  for (let i = 0; i < text.length; i++) {
    view.setUint8(offset + i, text.charCodeAt(i));
  }
}
