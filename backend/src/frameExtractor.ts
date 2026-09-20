import ffmpegStatic from 'ffmpeg-static';
import ffmpeg from 'fluent-ffmpeg';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs/promises';
import { spawn } from 'child_process';

const isProduction = process.env.NODE_ENV === 'production';
const ffmpegPath = ffmpegStatic as unknown as string;

// On production (e.g. Alpine), use system ffmpeg/ffprobe installed via apk
if (!isProduction && ffmpegPath) {
  ffmpeg.setFfmpegPath(ffmpegPath);
}

// Resolved path for direct spawns (e.g. creating tiled grid)
const activeFfmpegBinary = (isProduction || !ffmpegPath) ? 'ffmpeg' : ffmpegPath;

/**
 * Returns the duration of a video file in seconds.
 */
function getVideoDuration(videoPath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoPath, (err, metadata) => {
      if (err) return reject(err);
      resolve(metadata.format.duration ?? 0);
    });
  });
}

/**
 * Extracts `count` evenly-distributed frames from a video file.
 * Returns an array of absolute paths to the saved JPEG frames.
 */
export async function extractFrames(
  videoPath: string,
  outputDir: string,
  requestedCount?: number
): Promise<string[]> {
  await fs.mkdir(outputDir, { recursive: true });

  const duration = await getVideoDuration(videoPath);
  if (duration === 0) throw new Error('Could not determine video duration.');

  let count = requestedCount;
  if (!count) {
    // Target: 1 frame every 2 seconds
    const targetCount = Math.floor(duration / 2);
    const MIN_FRAMES = 12;
    const MAX_FRAMES = 36;
    count = Math.max(MIN_FRAMES, Math.min(targetCount, MAX_FRAMES));
  }

  // Distribute timestamps evenly, skipping first and last 5% to avoid intros/outros
  const start = duration * 0.05;
  const end = duration * 0.95;
  const range = end - start;
  const timestamps: number[] = Array.from({ length: count }, (_, i) =>
    start + (range / Math.max(1, count! - 1)) * i
  );

  const framePaths: string[] = [];

  for (let i = 0; i < timestamps.length; i++) {
    const ts = timestamps[i];
    const outputPath = path.join(outputDir, `frame_${i}.jpg`);
    framePaths.push(outputPath);

    await new Promise<void>((resolve, reject) => {
      ffmpeg(videoPath)
        .seekInput(ts)
        .outputOptions('-vframes', '1', '-q:v', '3', '-vf', "scale='min(400,iw)':-1")
        .output(outputPath)
        .on('end', () => resolve())
        .on('error', (err) => reject(err))
        .run();
    });
  }

  return framePaths;
}

/**
 * Creates a single tiled grid JPEG buffer from an array of image Buffers in memory.
 * Pure RAM processing with sharp, no disk IO, no subprocesses, and no text/number overlays.
 */
export async function createGridBufferFromFrames(
  frameBuffers: Buffer[],
  tileSize = 300
): Promise<Buffer> {
  if (frameBuffers.length === 0) {
    throw new Error('No frames provided for grid creation.');
  }

  const count = frameBuffers.length;
  const colCount = Math.ceil(Math.sqrt(count));
  const rowCount = Math.ceil(count / colCount);

  const gridWidth = colCount * tileSize;
  const gridHeight = rowCount * tileSize;

  // Resize all input buffers to square tiles in parallel
  const resizedTiles = await Promise.all(
    frameBuffers.map((buf) =>
      sharp(buf)
        .resize(tileSize, tileSize, { fit: 'cover', position: 'center' })
        .toBuffer()
    )
  );

  // Build sharp composite layout without numbers/overlays
  const composites: sharp.OverlayOptions[] = [];
  for (let i = 0; i < resizedTiles.length; i++) {
    const col = i % colCount;
    const row = Math.floor(i / colCount);
    composites.push({
      input: resizedTiles[i],
      left: col * tileSize,
      top: row * tileSize,
    });
  }

  // Composite tiles onto a solid black background
  return sharp({
    create: {
      width: gridWidth,
      height: gridHeight,
      channels: 3,
      background: { r: 0, g: 0, b: 0 },
    },
  })
    .composite(composites)
    .jpeg({ quality: 80 })
    .toBuffer();
}

/**
 * Creates a tiled grid image from an array of frame image paths.
 * Each frame is cropped to a centered square, scaled to 300x300.
 * The final grid is combined using the ffmpeg xstack filter without number overlays.
 */
export async function createImageGrid(
  framePaths: string[],
  outputPath: string
): Promise<string> {
  if (framePaths.length === 0) {
    throw new Error('No frames provided for grid creation.');
  }

  const count = framePaths.length;
  const colCount = Math.ceil(Math.sqrt(count));
  const rowCount = Math.ceil(count / colCount);
  const scaleSize = 300;

  return new Promise((resolve, reject) => {
    const args: string[] = [];

    // Add inputs
    for (const framePath of framePaths) {
      args.push('-i', framePath);
    }

    // Build filter complex without drawtext/numbers
    let filterComplex = '';
    for (let i = 0; i < count; i++) {
      filterComplex += `[${i}:v]crop=w=in_w:h=in_w,scale=${scaleSize}:${scaleSize}[v${i}];`;
    }

    // Build xstack layout
    let xstackLayout = '';
    for (let r = 0; r < rowCount; r++) {
      for (let c = 0; c < colCount; c++) {
        const x = c * scaleSize;
        const y = r * scaleSize;
        xstackLayout += `${x}_${y}|`;
      }
    }
    xstackLayout = xstackLayout.slice(0, -1);

    const xstackInputs = Array.from({ length: count }, (_, i) => `[v${i}]`).join('');
    filterComplex += `${xstackInputs}xstack=inputs=${count}:layout=${xstackLayout}[outv]`;

    args.push('-filter_complex', filterComplex);
    args.push('-map', '[outv]');
    args.push('-y', outputPath);

    const cp = spawn(activeFfmpegBinary, args);

    let stderr = '';
    cp.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    cp.on('close', (code) => {
      if (code === 0) {
        resolve(outputPath);
      } else {
        reject(new Error(`ffmpeg grid creation exited with code ${code}. Stderr: ${stderr}`));
      }
    });

    cp.on('error', (err) => {
      reject(err);
    });
  });
}

