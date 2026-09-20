import * as MP4Box from 'mp4box';
import type { MP4File, MP4Info, MP4Sample, MP4MediaTrack } from 'mp4box';
import { VIDEO_FRAME_PROFILE } from './imageCompression';

/** Number of keyframes extracted across the video timeline to form the 4x4 visual progression grid. */
export const FRAME_COUNT = 16;

/**
 * Calculates 16 target timestamps in seconds evenly distributed across the video duration.
 */
export function calculateKeyframeTimestamps(durationSeconds: number): number[] {
  const duration = Math.max(1, durationSeconds);
  const timestamps: number[] = [];
  for (let i = 1; i <= FRAME_COUNT; i++) {
    timestamps.push(Math.round((duration * (i / (FRAME_COUNT + 1))) * 100) / 100);
  }
  return timestamps;
}

interface MP4BoxEntry {
  avcC?: unknown;
  hvcC?: unknown;
  vpcC?: unknown;
  av1C?: unknown;
  boxes?: Array<{ type?: string; write?: (stream: unknown) => void }>;
  write?: (stream: unknown) => void;
}

/**
 * Extracts description (avcC, hvcC, vpcC, av1C) from MP4 track entries for VideoDecoder config.
 */
function getTrackDescription(mp4boxfile: MP4File, track: MP4MediaTrack): Uint8Array | undefined {
  try {
    const trak = mp4boxfile.getTrackById(track.id);
    const entries = trak?.mdia?.minf?.stbl?.stsd?.entries as MP4BoxEntry[] | undefined;
    if (!entries) return undefined;
    for (const entry of entries) {
      const box =
        entry.avcC ||
        entry.hvcC ||
        entry.vpcC ||
        entry.av1C ||
        entry.boxes?.find(
          (b) =>
            b.type === 'avcC' || b.type === 'hvcC' || b.type === 'vpcC' || b.type === 'av1C',
        );
      if (box && typeof (box as { write?: (s: unknown) => void }).write === 'function') {
        const stream = new MP4Box.DataStream(undefined, 0, MP4Box.DataStream.BIG_ENDIAN);
        (box as { write: (s: unknown) => void }).write(stream);
        // Slice off the 4-byte box size and 4-byte box type header
        return new Uint8Array(stream.buffer, 8);
      }
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn('[videoDecoder] Failed to extract track description box:', message);
  }
  return undefined;
}

/**
 * Headless in-memory video frame extraction using native WebCodecs VideoDecoder and MP4Box.
 * 100% deterministic, no DOM attachment, no CSS hacks, no GPU throttling.
 */
export async function extractKeyframesWebCodecs(
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
        try {
          decoder.close();
        } catch {
          /* ignore */
        }
      }
    };

    if (signal) {
      signal.addEventListener(
        'abort',
        () => {
          if (!isFinished) {
            cleanup();
            reject(new Error('Aborted'));
          }
        },
        { once: true },
      );
    }

    const mp4boxfile = MP4Box.createFile();
    const capturedMap = new Map<number, string>();
    let targetTimestampsSec: number[] = [];

    mp4boxfile.onError = (err: string) => {
      if (!isFinished) {
        cleanup();
        reject(new Error(`MP4Box error: ${err}`));
      }
    };

    const finishWithResults = () => {
      if (isFinished) return;
      isFinished = true;

      const capturedList = Array.from(capturedMap.entries())
        .sort(([a], [b]) => a - b)
        .map(([, frame]) => frame);

      const results: string[] = [];
      if (capturedList.length === 0) {
        // No frames decoded
      } else if (capturedList.length >= FRAME_COUNT) {
        results.push(...capturedList.slice(0, FRAME_COUNT));
      } else {
        // Resample/interpolate to guarantee exactly FRAME_COUNT tiles for a complete 4x4 grid
        for (let i = 0; i < FRAME_COUNT; i++) {
          const idx = Math.min(
            capturedList.length - 1,
            Math.floor((i * capturedList.length) / FRAME_COUNT),
          );
          results.push(capturedList[idx]);
        }
      }

      cleanup();
      resolve(results);
    };

    mp4boxfile.onReady = (info: MP4Info) => {
      try {
        const videoTrack = info.videoTracks[0];
        if (!videoTrack) {
          finishWithResults();
          return;
        }

        // Prioritize actual video track duration over container/movie level metadata
        const trackDuration =
          videoTrack.duration && videoTrack.timescale
            ? videoTrack.duration / videoTrack.timescale
            : 0;
        const movieDuration =
          info.duration && info.timescale ? info.duration / info.timescale : 0;
        const realDuration =
          trackDuration > 0
            ? trackDuration
            : movieDuration > 0
              ? movieDuration
              : durationHint || 15;

        targetTimestampsSec = calculateKeyframeTimestamps(realDuration);
        console.log(
          `[videoDecoder-WebCodecs] Extracting 16 frames across ${realDuration.toFixed(1)}s (track: ${trackDuration.toFixed(1)}s, movie: ${movieDuration.toFixed(1)}s): [${targetTimestampsSec.map((t) => t.toFixed(1) + 's').join(', ')}]`,
        );

        const description = getTrackDescription(mp4boxfile, videoTrack);

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          finishWithResults();
          return;
        }

        let samplesProcessed = 0;
        const totalSamples = videoTrack.nb_samples || 0;

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
                break; // Only assign earliest unfilled target slot to this frame
              }
            }

            videoFrame.close();

            // If captured all 16 target frames, finish immediately
            if (capturedMap.size === targetTimestampsSec.length) {
              finishWithResults();
            }
          },
          error: (err: DOMException | Error) => {
            console.warn('[videoDecoder-WebCodecs] Decoder error:', err.message || String(err));
          },
        });

        decoder.configure({
          codec: videoTrack.codec,
          codedWidth: videoTrack.video?.width,
          codedHeight: videoTrack.video?.height,
          description,
        });

        let hasSeenFirstKeyFrame = false;

        mp4boxfile.onSamples = async (trackId: number, _user: unknown, samples: MP4Sample[]) => {
          if (trackId !== videoTrack.id || !decoder || decoder.state === 'closed' || isFinished)
            return;

          samplesProcessed += samples.length;

          for (const sample of samples) {
            if (isFinished || decoder.state !== 'configured') break;

            const isSync = Boolean(sample.is_sync);

            // VideoDecoder strictly requires a key frame as the very first chunk after configure()
            if (!hasSeenFirstKeyFrame) {
              if (!isSync) {
                continue;
              }
              hasSeenFirstKeyFrame = true;
            }

            try {
              const chunk = new EncodedVideoChunk({
                type: isSync ? 'key' : 'delta',
                timestamp: (sample.cts * 1_000_000) / sample.timescale,
                duration: (sample.duration * 1_000_000) / sample.timescale,
                data: sample.data,
              });

              decoder.decode(chunk);
            } catch (decodeErr: unknown) {
              const msg = decodeErr instanceof Error ? decodeErr.message : String(decodeErr);
              console.warn('[videoDecoder-WebCodecs] Chunk decode skipped:', msg);
            }
          }

          if (totalSamples > 0 && samplesProcessed >= totalSamples && !isFinished) {
            try {
              if (decoder && decoder.state === 'configured') {
                await decoder.flush();
              }
            } catch (flushErr: unknown) {
              if (!isFinished) {
                const msg = flushErr instanceof Error ? flushErr.message : String(flushErr);
                console.warn('[videoDecoder-WebCodecs] Flush error:', msg);
              }
            }
            finishWithResults();
          }
        };

        const batchSize = Math.max(1000, totalSamples || 5000);
        mp4boxfile.setExtractionOptions(videoTrack.id, null, { nbSamples: batchSize });
        mp4boxfile.start();

        // Safety fallback timeout
        setTimeout(() => {
          if (!isFinished) {
            finishWithResults();
          }
        }, 10000);
      } catch (err: unknown) {
        if (!isFinished) {
          cleanup();
          reject(err instanceof Error ? err : new Error(String(err)));
        }
      }
    };

    const bufferWithStart = arrayBuffer.slice(0) as ArrayBuffer & { fileStart?: number };
    bufferWithStart.fileStart = 0;
    mp4boxfile.appendBuffer(bufferWithStart);
    mp4boxfile.flush();
  });
}
