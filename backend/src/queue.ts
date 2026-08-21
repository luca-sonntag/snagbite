import fs from 'fs/promises';
import path from 'path';
import {
  claimNextJob, updateJob, updateJobProgress, completeJob, getRecipe, getClient,
  reclaimExpiredJobs, sweepStaleAwaitingFrames, heartbeatJob, getMaxVideoDurationSeconds, isJobCancelled,
} from './db.js';
import { randomUUID } from 'node:crypto';
import { getScraperForUrl, type ScrapingResult } from './scrapers/index.js';
import { downloadMedia } from './scrapers/download.js';
import { extractRecipe, remixRecipe, type ClientFramesInput } from './gemini.js';
import { generateRecipeCoverImage } from './imageGenerator.js';
import { pruneOldGeminiLogs } from './logger.js';
import { photoUploadIdFromUrl, downloadImportPhotos, deleteImportPhotos, sweepOldPhotoImports } from './photoImport.js';
import type { Job, LlmUsage, ProgressStage } from './types.js';
import { config } from './config.js';
import { AppError, serializeJobError } from './errors.js';
import { notificationTick } from './notifications/worker.js';
import { enrichRecipeWithCanonicalIngredients } from './matching/ingredientMatcher.js';

const workerId = randomUUID();
let activeJobs = 0;
let workerInterval: NodeJS.Timeout | null = null;
let reclaimInterval: NodeJS.Timeout | null = null;
let sweepInterval: NodeJS.Timeout | null = null;
let cleanupInterval: NodeJS.Timeout | null = null;
let notificationInterval: NodeJS.Timeout | null = null;

/**
 * Processes a single job end-to-end.
 */
async function processJob(job: Job): Promise<void> {
  const jobId = job.id;
  const url = job.sourceUrl;
  const safeTimestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const userSegment = job.userId ? job.userId : 'unassigned';
  const runDir = path.resolve('logs', userSegment, `run-${safeTimestamp}_${jobId}`);
  const framesDir = path.join(runDir, 'frames');
  let audioFilePath = '';
  let videoFilePath = '';
  let framePaths: string[] = [];
  let photoUploadId: string | null = null;
  let clientFramesInput: ClientFramesInput | undefined;

  const heartbeat = setInterval(() => heartbeatJob(jobId), 30_000);

  try {
    // Fetch user preferences from Supabase Auth admin API if userId is present
    let userPrefs: {
      recipeLanguage?: string;
      preferredTemperatureUnit?: string;
      preferredUnitSystem?: string;
    } | undefined;

    if (job.userId) {
      try {
        console.log(`[Job ${jobId}] Fetching user metadata for user ${job.userId}...`);
        const { data: { user }, error: authError } = await getClient().auth.admin.getUserById(job.userId);
        if (authError) {
          console.warn(`[Job ${jobId}] Failed to fetch user metadata: ${authError.message}`);
        } else if (user?.user_metadata) {
          const meta = user.user_metadata;
          const languageMap: Record<string, string> = {
            'de': 'German',
            'en': 'English',
            'german': 'German',
            'english': 'English'
          };

          let recipeLanguage: string | undefined;
          if (meta.language) {
            recipeLanguage = languageMap[meta.language.toLowerCase()];
          }
          if (!recipeLanguage && meta.recipe_language) {
            recipeLanguage = languageMap[meta.recipe_language.toLowerCase()] || meta.recipe_language;
          }

          userPrefs = {
            recipeLanguage,
            preferredTemperatureUnit: meta.preferred_temperature_unit,
            preferredUnitSystem: meta.preferred_unit_system,
          };
          console.log(`[Job ${jobId}] Loaded user preferences:`, userPrefs);
        }
      } catch (err: any) {
        console.warn(`[Job ${jobId}] Error retrieving user metadata: ${err.message}`);
      }
    }

    if (job.kind === 'remix') {
      console.log(`[Job ${jobId}] Starting remix processing...`);
      await updateJobProgress(jobId, 'processing', { percent: 30, stage: 'extracting_recipe' });
      await fs.mkdir(runDir, { recursive: true });

      const parentRecipe = job.parentRecipeId ? await getRecipe(job.parentRecipeId) : null;
      if (!parentRecipe) {
        throw new AppError('PARENT_JOB_NOT_FOUND', { message: 'Parent recipe not found for remix.' });
      }

      console.log(`[Job ${jobId}] Requesting remix from Gemini...`);
      const { recipe, usage: geminiUsage } = await remixRecipe(parentRecipe, job.remixPrompt || '', runDir, userPrefs);

      if (recipe.isRecipe === false) {
        throw new AppError('UNRELATED_REMIX_REQUEST', { message: 'The prompt was not recognized as a valid recipe modification.' });
      }

      recipe.sourceHandle = parentRecipe.sourceHandle;
      recipe.sourceUrl = parentRecipe.sourceUrl;
      recipe.parentRecipeId = parentRecipe.id;
      recipe.remixPrompt = job.remixPrompt || null;

      let fluxUsage: any = null;

      // Generate AI cover image for the remixed recipe if prompt is present
      if (recipe.imagePrompt) {
        await updateJobProgress(jobId, 'processing', { percent: 85, stage: 'generating_cover' });
        const { imageUrl: aiCoverUrl, usage } = await generateRecipeCoverImage({
          prompt: recipe.imagePrompt,
          jobId,
          userId: job.userId,
        });
        fluxUsage = usage;
        if (aiCoverUrl) {
          recipe.imageUrl = aiCoverUrl;
          recipe.imageUrls = [aiCoverUrl, ...(parentRecipe.imageUrls || [])];
          recipe.isAiCover = true;
        } else {
          recipe.imageUrl = parentRecipe.imageUrl;
          recipe.imageUrls = parentRecipe.imageUrls;
        }
      } else {
        recipe.imageUrl = parentRecipe.imageUrl;
        recipe.imageUrls = parentRecipe.imageUrls;
      }

      await updateJobProgress(jobId, 'processing', { percent: 90, stage: 'finalizing' });

      // Canonical ingredient normalization & nutritional calculation
      await enrichRecipeWithCanonicalIngredients(recipe);

      const llmUsage: LlmUsage = {};
      if (geminiUsage) llmUsage.gemini = geminiUsage;
      if (fluxUsage) llmUsage.flux = fluxUsage;

      await completeJob(jobId, recipe, Object.keys(llmUsage).length > 0 ? llmUsage : null);
      return;
    }

    // Photo import: the user supplied their own photos of a cookbook page or a
    // handwritten recipe card, so there is nothing to scrape or download from a
    // third party. The photos take the role of the carousel slides and go into
    // extractRecipe at full resolution; no grid is built and no cover frame is
    // selected — a photographed page makes a poor cover, so the recipe emoji is
    // the placeholder instead.
    if (job.kind === 'photo') {
      photoUploadId = photoUploadIdFromUrl(url);
      // Both are guaranteed by the route that created the job; a job missing
      // either can never find its photos again.
      if (!photoUploadId) {
        throw new AppError('PHOTO_IMPORT_EXPIRED', { message: 'Photo job is missing its upload id.' });
      }
      const photoUserId = job.userId;

      console.log(`[Job ${jobId}] Starting photo import ${photoUploadId}...`);
      await updateJobProgress(jobId, 'processing', { percent: 20, stage: 'reading_photos' });
      await fs.mkdir(runDir, { recursive: true });

      const { paths: photoPaths, bytes } = await downloadImportPhotos(photoUserId, photoUploadId, runDir);
      if (photoPaths.length === 0) {
        throw new AppError('PHOTO_IMPORT_EXPIRED', { message: 'No import photos found in storage for this job.' });
      }
      // Hand the photos to the shared temp-file cleanup in `finally`.
      framePaths = photoPaths;
      console.log(`[Job ${jobId}] Downloaded ${photoPaths.length} import photo(s) (${(bytes / (1024 * 1024)).toFixed(2)} MB).`);

      await updateJob(jobId, { mediaBytes: bytes }).catch((err) =>
        console.warn(`[Job ${jobId}] Failed to persist media_bytes: ${err.message}`),
      );

      await updateJobProgress(jobId, 'processing', { percent: 60, stage: 'extracting_recipe' });
      const { recipe, usage: geminiUsage } = await extractRecipe(undefined, undefined, '', undefined, runDir, userPrefs, undefined, photoPaths, 'photo');

      console.log(`[Job ${jobId}] Recipe extracted from photos: "${recipe.title}"`);
      // A photographed page has no third-party source to attribute.
      recipe.sourceUrl = null;
      recipe.sourceHandle = null;

      let fluxUsage: any = null;

      // Generate photorealistic AI cover image of the finished dish for photo imports
      if (recipe.imagePrompt) {
        await updateJobProgress(jobId, 'processing', { percent: 85, stage: 'generating_cover' });
        const { imageUrl: aiCoverUrl, usage } = await generateRecipeCoverImage({
          prompt: recipe.imagePrompt,
          jobId,
          userId: photoUserId,
        });
        fluxUsage = usage;
        if (aiCoverUrl) {
          recipe.imageUrl = aiCoverUrl;
          recipe.imageUrls = [aiCoverUrl];
          recipe.isAiCover = true;
        } else {
          recipe.imageUrl = null;
          recipe.imageUrls = [];
          recipe.isAiCover = false;
        }
      } else {
        recipe.imageUrl = null;
        recipe.imageUrls = [];
        recipe.isAiCover = false;
      }

      await updateJobProgress(jobId, 'processing', { percent: 90, stage: 'finalizing' });

      // Canonical ingredient normalization & nutritional calculation
      await enrichRecipeWithCanonicalIngredients(recipe);

      const llmUsage: LlmUsage = {};
      if (geminiUsage) llmUsage.gemini = geminiUsage;
      if (fluxUsage) llmUsage.flux = fluxUsage;

      await completeJob(jobId, recipe, Object.keys(llmUsage).length > 0 ? llmUsage : null);
      return;
    }

    if (await isJobCancelled(jobId)) {
      console.log(`[Job ${jobId}] Job was cancelled by user, aborting.`);
      return;
    }

    // 1. Mark job as scraping or rehydrate from scrapeMeta
    let scrapeResult: ScrapingResult;
    if (job.scrapeMeta) {
      console.log(`[Job ${jobId}] Resuming job with cached scrapeMeta...`);
      scrapeResult = job.scrapeMeta as ScrapingResult;
    } else {
      console.log(`[Job ${jobId}] Starting scraping for ${url}...`);
      await updateJobProgress(jobId, 'scraping', { percent: 15, stage: 'scraping' });

      // 2. Perform scraping via the appropriate scraper
      const scraper = getScraperForUrl(url);
      scrapeResult = await scraper.scrape(url, jobId);
      console.log(`[Job ${jobId}] Scraped successfully. Caption/Title length: ${scrapeResult.caption.length}`);
    }

    // 2b. Enforce the video-length cap *before* downloading — the duration is known from
    // scrape metadata (RapidAPI / yt-dlp), so we reject over-limit videos without spending
    // any download bandwidth. 0 disables the check; results without a reported duration pass.
    // Prioritise the DB-backed `max_video_duration_seconds` global setting over the env default.
    const maxDuration = await getMaxVideoDurationSeconds();
    if (maxDuration > 0 && scrapeResult.durationSeconds && scrapeResult.durationSeconds > maxDuration) {
      const actualSec = Math.round(scrapeResult.durationSeconds);
      throw new AppError('VIDEO_TOO_LONG', {
        params: { maxSeconds: maxDuration },
        message: `Video too long: ${actualSec}s exceeds the ${maxDuration}s limit.`,
      });
    }

    // 2c. Client-media streaming: if media is client-delegated and we don't have client_frames yet,
    // park the job in 'awaiting_frames' so the client can capture and POST keyframes.
    if (scrapeResult.media.kind === 'client' && !job.clientFrames) {
      console.log(`[Job ${jobId}] Media kind is 'client' — parking job in 'awaiting_frames' for client keyframe capture.`);
      await updateJob(jobId, {
        scrapeMeta: scrapeResult,
        status: 'awaiting_frames',
        progress: { percent: 30, stage: 'awaiting_frames' },
      });
      // Release worker lease so heartbeat stops and status is awaiting_frames
      await getClient()
        .from('jobs')
        .update({ locked_at: null, locked_by: null })
        .eq('id', jobId);
      return;
    }

    // Decode ephemeral client frames if present and composite into a single in-memory grid
    if (job.clientFrames) {
      const thumbBuf = job.clientFrames.thumbnailBase64
        ? Buffer.from(job.clientFrames.thumbnailBase64.replace(/^data:image\/\w+;base64,/, ''), 'base64')
        : undefined;
      const frameBufs = (job.clientFrames.framesBase64 || [])
        .map((f) => Buffer.from(f.replace(/^data:image\/\w+;base64,/, ''), 'base64'))
        .filter((b) => b.length > 0);

      let clientGridBuffer: Buffer | undefined;
      if (frameBufs.length > 1) {
        try {
          const { createGridBufferFromFrames } = await import('./frameExtractor.js');
          console.log(`[Job ${jobId}] Creating in-memory 4x4 grid from ${frameBufs.length} client frames...`);
          clientGridBuffer = await createGridBufferFromFrames(frameBufs);
        } catch (gridErr: any) {
          console.warn(`[Job ${jobId}] Failed to create in-memory grid from client frames:`, gridErr.message);
        }
      }

      clientFramesInput = { thumbnail: thumbBuf, frames: frameBufs, gridBuffer: clientGridBuffer };
    }

    // 3. Mark job as processing
    await updateJobProgress(jobId, 'processing', { percent: 50, stage: 'downloading_media' });

    // 4. Ensure run directory exists
    await fs.mkdir(runDir, { recursive: true });

    // 5. Download audio + video to local files (download strategy encapsulated per provider).
    console.log(`[Job ${jobId}] Downloading media...`);
    const downloaded = await downloadMedia(scrapeResult.media, runDir);
    audioFilePath = downloaded.audioFilePath;
    videoFilePath = downloaded.videoFilePath;
    const mimeType = downloaded.mimeType;
    console.log(`[Job ${jobId}] Downloads complete (media: ${(downloaded.mediaBytes / (1024 * 1024)).toFixed(2)} MB).`);

    // Persist the total downloaded media size (audio + video) so admin metrics
    // can aggregate total downloaded MB over a time window. A failure here must
    // not abort recipe extraction, so we swallow errors.
    if (downloaded.mediaBytes > 0) {
      await updateJob(jobId, { mediaBytes: downloaded.mediaBytes }).catch((err) =>
        console.warn(`[Job ${jobId}] Failed to persist media_bytes: ${err.message}`),
      );
    }

    // 6. If video is available (legacy server-download), extract frames and create grid first
    let gridImagePath: string | undefined;
    framePaths = [];
    const isCarousel = downloaded.imageFilePaths.length > 0;

    if (videoFilePath) {
      await updateJobProgress(jobId, 'processing', { percent: 55, stage: 'extracting_frames' });
      try {
        const { extractFrames, createImageGrid } = await import('./frameExtractor.js');
        console.log(`[Job ${jobId}] Extracting frames from video...`);
        framePaths = await extractFrames(videoFilePath, framesDir);

        const localGridPath = path.join(framesDir, 'grid.jpg');
        console.log(`[Job ${jobId}] Creating tiled frame grid at ${localGridPath}...`);
        await createImageGrid(framePaths, localGridPath);
        gridImagePath = localGridPath;
      } catch (err: any) {
        console.warn(`[Job ${jobId}] Frame extraction / grid generation failed: ${err.message}`);
      }
    } else if (isCarousel) {
      await updateJobProgress(jobId, 'processing', { percent: 55, stage: 'extracting_frames' });
      framePaths = downloaded.imageFilePaths;
      if (framePaths.length > 1) {
        try {
          const { createImageGrid } = await import('./frameExtractor.js');
          await fs.mkdir(framesDir, { recursive: true });
          const localGridPath = path.join(framesDir, 'grid.jpg');
          console.log(`[Job ${jobId}] Creating tiled grid from ${framePaths.length} carousel images at ${localGridPath}...`);
          await createImageGrid(framePaths, localGridPath);
          gridImagePath = localGridPath;
        } catch (err: any) {
          console.warn(`[Job ${jobId}] Carousel grid generation failed: ${err.message}`);
        }
      }
    }

    console.log(`[Job ${jobId}] Extracting recipe via Gemini...`);
    await updateJobProgress(jobId, 'processing', { percent: 75, stage: 'extracting_recipe' });

    const { recipe, usage: geminiUsage } = await extractRecipe(
      audioFilePath || undefined,
      mimeType,
      scrapeResult.caption,
      // Carousels send every slide at full resolution instead of the downscaled grid —
      // the recipe is usually written as text on the images and must stay readable.
      isCarousel ? undefined : gridImagePath,
      runDir,
      userPrefs,
      scrapeResult.htmlContent,
      isCarousel ? downloaded.imageFilePaths : undefined,
      clientFramesInput ? 'client_frames' : 'carousel',
      clientFramesInput
    );

    console.log(`[Job ${jobId}] Recipe extracted: "${recipe.title}"`);

    // Collect base scraped cover image (RapidAPI/TikTok metadata cover)
    const baseImageUrls = scrapeResult.imageUrl
      ? [scrapeResult.imageUrl]
      : (scrapeResult.media.kind === 'images' && scrapeResult.media.imageUrls.length > 0 ? [scrapeResult.media.imageUrls[0]] : []);

    let fluxUsage: any = null;

    // Generate AI food photography cover image with FLUX.1 [schnell]
    if (recipe.imagePrompt) {
      await updateJobProgress(jobId, 'processing', { percent: 85, stage: 'generating_cover' });
      const { imageUrl: aiCoverUrl, usage } = await generateRecipeCoverImage({
        prompt: recipe.imagePrompt,
        jobId,
        userId: job.userId,
      });
      fluxUsage = usage;
      if (aiCoverUrl) {
        recipe.imageUrl = aiCoverUrl;
        recipe.imageUrls = [aiCoverUrl, ...baseImageUrls];
        recipe.isAiCover = true;
      } else {
        recipe.imageUrl = baseImageUrls[0] || null;
        recipe.imageUrls = baseImageUrls;
        recipe.isAiCover = false;
      }
    } else {
      recipe.imageUrl = baseImageUrls[0] || null;
      recipe.imageUrls = baseImageUrls;
      recipe.isAiCover = false;
    }

    await updateJobProgress(jobId, 'processing', { percent: 90, stage: 'finalizing' });

    recipe.sourceHandle = scrapeResult.authorHandle || null;
    recipe.sourceUrl = url;

    // Canonical ingredient normalization & nutritional calculation
    await enrichRecipeWithCanonicalIngredients(recipe);

    const llmUsage: LlmUsage = {};
    if (geminiUsage) llmUsage.gemini = geminiUsage;
    if (fluxUsage) llmUsage.flux = fluxUsage;

    // 7. Persist the recipe, link the job to it and add it to the cookbook —
    // atomically, so a crash can never leave a completed job without a recipe
    // or a recipe in nobody's cookbook.
    await completeJob(jobId, recipe, Object.keys(llmUsage).length > 0 ? llmUsage : null);
  } catch (error: any) {
    console.error(`[Job ${jobId}] Failed during execution:`, error.message);
    // Persist a machine-readable error envelope (code + params) instead of a raw
    // message. Non-AppError throws collapse to EXTRACTION_FAILED so users never
    // see internal/library text; the client localizes the code (see errorCodes.ts).
    // progress is cleared so a failed job never keeps a stale stage.
    await updateJob(jobId, {
      status: 'failed',
      error: serializeJobError(error),
      progress: null,
    });
  } finally {
    clearInterval(heartbeat);
    const cleanupPaths = [audioFilePath, videoFilePath, ...framePaths].filter(Boolean);
    await Promise.allSettled(cleanupPaths.map((p) => fs.unlink(p).catch(() => { })));
    clientFramesInput = undefined;
    (job as any).clientFrames = null;
    (job as any).scrapeMeta = null;
    // Import photos are transient in Storage as well — drop them on success and
    // on failure alike, so nothing waits for the 24h sweep. A failure to clean up
    // must never turn a completed job into a failed one.
    if (photoUploadId && job.userId) {
      await deleteImportPhotos(job.userId, photoUploadId).catch((err) =>
        console.warn(`[Job ${jobId}] Failed to delete import photos: ${err.message}`),
      );
    }
    console.log(`[Job ${jobId}] Temp files (including ${framePaths.length} individual frames) cleaned up. Run folder: ${runDir}`);
  }
}

/**
 * Worker loop that claims and dispatches jobs up to WORKER_CONCURRENCY in parallel.
 */
async function workerTick(): Promise<void> {
  while (activeJobs < config.WORKER_CONCURRENCY) {
    let job;
    try {
      job = await claimNextJob(workerId);
    } catch (error: any) {
      console.error('Error claiming job:', error.message);
      break;
    }
    if (!job) break;

    activeJobs++;
    processJob(job).finally(() => {
      activeJobs--;
    });
  }
}

async function cleanupOldRunDirs(days: number): Promise<void> {
  try {
    const logsDir = path.resolve('logs');
    const userDirs = await fs.readdir(logsDir);
    const now = Date.now();
    const maxAgeMs = days * 24 * 60 * 60 * 1000;
    let deletedCount = 0;

    for (const userDir of userDirs) {
      const userDirPath = path.join(logsDir, userDir);
      const userStat = await fs.stat(userDirPath);
      if (!userStat.isDirectory()) continue;

      const files = await fs.readdir(userDirPath);
      for (const file of files) {
        if (!file.startsWith('run-')) continue;
        const filePath = path.join(userDirPath, file);
        const stats = await fs.stat(filePath);
        if (stats.isDirectory() && (now - stats.mtimeMs) > maxAgeMs) {
          await fs.rm(filePath, { recursive: true, force: true });
          deletedCount++;
        }
      }

      // Cleanup empty user directories
      const remainingFiles = await fs.readdir(userDirPath);
      if (remainingFiles.length === 0) {
        await fs.rm(userDirPath, { recursive: true, force: true });
      }
    }
    if (deletedCount > 0) {
      console.log(`[Cleanup] Deleted ${deletedCount} old run directories (older than ${days} days).`);
    }
  } catch (err: any) {
    if (err.code !== 'ENOENT') {
      console.error('[Cleanup] Error cleaning up old logs:', err.message);
    }
  }
}

/**
 * Starts the background job queue loop.
 */
export function startQueue(pollIntervalMs = 2000): void {
  if (workerInterval) return;
  console.log('Background job queue worker started.');

  workerInterval = setInterval(workerTick, pollIntervalMs);
  reclaimInterval = setInterval(
    () => reclaimExpiredJobs(config.WORKER_LEASE_TIMEOUT_MINUTES).catch(console.error),
    60_000
  );
  sweepInterval = setInterval(
    () => sweepStaleAwaitingFrames(config.CLIENT_FRAMES_TIMEOUT_MINUTES).catch(console.error),
    60_000
  );

  // Run cleanup once at startup, then every 12 hours.
  // Local debug run-dirs are pruned after 30 days; the persistent gemini_logs
  // table is pruned after 90 days (wider than the 30-day metrics window).
  const runCleanup = () => {
    cleanupOldRunDirs(30);
    void pruneOldGeminiLogs(90);

    // Backstop for photo imports whose job never ran (see photoImport.ts).
    sweepOldPhotoImports(24)
      .then(n => { if (n > 0) console.log(`[cleanup] Swept ${n} orphaned import photo(s).`); })
      .catch(err => console.error('[cleanup] Photo import sweep failed:', err));
  };
  runCleanup();
  cleanupInterval = setInterval(runCleanup, 12 * 60 * 60 * 1000);

  // Smart AI push notifications: periodically check who is due for a personalized
  // push. Fully gated by NOTIFICATIONS_ENABLED (no-ops otherwise). Runs in-process
  // with the worker so it reuses db/gemini/logger directly.
  if (config.NOTIFICATIONS_ENABLED) {
    const runNotifTick = () => {
      void notificationTick().catch((err) => console.error('[notifications] tick error:', err));
    };
    // Delay initial tick by 3 seconds so attached debuggers have time to register breakpoints
    setTimeout(runNotifTick, 3000);
    const notifMs = Math.max(1, config.NOTIFICATION_TICK_MINUTES) * 60 * 1000;
    notificationInterval = setInterval(runNotifTick, notifMs);
    console.log(`Smart notification worker started (every ${config.NOTIFICATION_TICK_MINUTES} min).`);
  }
}

/**
 * Stops the background job queue loop.
 */
export function stopQueue(): void {
  if (workerInterval) { clearInterval(workerInterval); workerInterval = null; }
  if (reclaimInterval) { clearInterval(reclaimInterval); reclaimInterval = null; }
  if (sweepInterval) { clearInterval(sweepInterval); sweepInterval = null; }
  if (cleanupInterval) { clearInterval(cleanupInterval); cleanupInterval = null; }
  if (notificationInterval) { clearInterval(notificationInterval); notificationInterval = null; }
  console.log('Background job queue worker stopped.');
}
