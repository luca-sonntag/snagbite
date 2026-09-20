import fs from 'fs/promises';
import { createWriteStream } from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';
import type { MediaDownload } from './index.js';

/** Downloads a URL to a local file, following HTTP/HTTPS redirects. Resolves the content-type. */
function downloadFile(url: string, destPath: string, headers?: Record<string, string>): Promise<string> {
  return new Promise((resolve, reject) => {
    function attemptGet(currentUrl: string) {
      const protocol = currentUrl.startsWith('https') ? https : http;
      const request = protocol.get(currentUrl, { headers }, (response) => {
        if (
          response.statusCode === 301 ||
          response.statusCode === 302 ||
          response.statusCode === 307 ||
          response.statusCode === 308
        ) {
          const redirectUrl = response.headers.location;
          if (redirectUrl) {
            attemptGet(redirectUrl);
            return;
          }
        }

        if (response.statusCode !== 200) {
          reject(new Error(`Failed to download from ${currentUrl}: HTTP ${response.statusCode} ${response.statusMessage}`));
          return;
        }

        const mimeType = response.headers['content-type'] || 'audio/mp4';
        const fileStream = createWriteStream(destPath);
        response.pipe(fileStream);

        fileStream.on('finish', () => fileStream.close(() => resolve(mimeType)));
        fileStream.on('error', (err) => {
          fs.unlink(destPath).catch(() => {});
          reject(err);
        });
      });

      request.on('error', (err) => reject(err));
    }

    attemptGet(url);
  });
}

export interface DownloadedMedia {
  /** Local path to the audio file, or '' when absent/failed. */
  audioFilePath: string;
  /** Local path to the video file (for frame extraction), or '' when absent/failed. */
  videoFilePath: string;
  /** Local paths to carousel images in post order (empty unless the source is an image carousel). */
  imageFilePaths: string[];
  /** Best-effort mime type for the audio file (from its extension). */
  mimeType?: string;
  /** Combined size of all downloaded media (audio + video + images) in bytes (0 when nothing was downloaded). */
  mediaBytes: number;
}

/** File extension for a carousel image URL (defaults to .jpg). */
function imageExtension(url: string): string {
  try {
    const pathname = new URL(url).pathname.toLowerCase();
    const match = pathname.match(/\.(jpe?g|png|webp|heic)$/);
    if (match) return `.${match[1]}`;
  } catch {
    // fall through to default
  }
  return '.jpg';
}

/** Best-effort file size in bytes; returns 0 if the path is empty or unreadable. */
async function fileSizeBytes(filePath: string): Promise<number> {
  if (!filePath) return 0;
  try {
    const stat = await fs.stat(filePath);
    return stat.size;
  } catch {
    return 0;
  }
}

/**
 * Fetches a scrape result's media to local files under `runDir`, per its download
 * strategy. Individual downloads fail soft (the corresponding path comes back '') so a
 * missing video still lets audio + caption drive extraction.
 */
export async function downloadMedia(media: MediaDownload, runDir: string): Promise<DownloadedMedia> {
  if (media.kind === 'none' || media.kind === 'client') return { audioFilePath: '', videoFilePath: '', imageFilePaths: [], mediaBytes: 0 };

  if (media.kind === 'images') {
    // Image carousel: fetch every slide in post order. Individual failures fail soft so
    // a partially downloaded carousel still drives extraction.
    const results = await Promise.all(
      media.imageUrls.map(async (url, i) => {
        const destPath = path.join(runDir, `image_${i}${imageExtension(url)}`);
        try {
          await downloadFile(url, destPath, media.headers);
          return destPath;
        } catch (err: any) {
          console.warn(`[download] carousel image ${i} download failed: ${err.message}`);
          return '';
        }
      }),
    );
    const imageFilePaths = results.filter(Boolean);
    const sizes = await Promise.all(imageFilePaths.map(fileSizeBytes));
    const mediaBytes = sizes.reduce((sum, n) => sum + n, 0);
    return { audioFilePath: '', videoFilePath: '', imageFilePaths, mediaBytes };
  }

  const audioExt = media.audioUrl?.includes('.mp3') ? '.mp3' : '.mp4';
  let audioFilePath = path.join(runDir, `audio${audioExt}`);
  let videoFilePath = path.join(runDir, 'video.mp4');
  const downloads: Promise<unknown>[] = [];

  // direct
  if (media.audioUrl) {
    downloads.push(
      downloadFile(media.audioUrl, audioFilePath, media.headers).catch((err) => {
        console.warn(`[download] audio download failed: ${err.message}`);
        audioFilePath = '';
      }),
    );
  } else {
    audioFilePath = '';
  }
  if (media.videoUrl) {
    downloads.push(
      downloadFile(media.videoUrl, videoFilePath, media.headers).catch((err) => {
        console.warn(`[download] video download failed (will skip frame extraction): ${err.message}`);
        videoFilePath = '';
      }),
    );
  } else {
    videoFilePath = '';
  }

  await Promise.allSettled(downloads);
  const [audioBytes, videoBytes] = await Promise.all([
    fileSizeBytes(audioFilePath),
    fileSizeBytes(videoFilePath),
  ]);
  const mediaBytes = audioBytes + videoBytes;
  return { audioFilePath, videoFilePath, imageFilePaths: [], mimeType: audioExt === '.mp3' ? 'audio/mp3' : 'audio/mp4', mediaBytes };
}
