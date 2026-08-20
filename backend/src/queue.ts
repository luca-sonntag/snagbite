import fs from 'fs/promises';
import path from 'path';
import { claimNextJob, updateJob, getJob, getClient, reclaimExpiredJobs, heartbeatJob, getMaxVideoDurationSeconds, isJobDeleted } from './db.js';
import { randomUUID } from 'node:crypto';
import { getScraperForUrl } from './scrapers/index.js';
import { downloadMedia } from './scrapers/download.js';
import { extractRecipe, remixRecipe } from './gemini.js';
import { generateRecipeCoverImage } from './imageGenerator.js';
import { pruneOldGeminiLogs } from './logger.js';
import { isPhotoJobUrl, photoUploadIdFromUrl, downloadImportPhotos, deleteImportPhotos, sweepOldPhotoImports } from './photoImport.js';
import type { Job, LlmUsage } from './types.js';
import { config } from './config.js';
import { AppError, serializeJobError } from './errors.js';
import { notificationTick } from './notifications/worker.js';
import { enrichRecipeWithCanonicalIngredients } from './matching/ingredientMatcher.js';

const workerId = randomUUID();
let activeJobs = 0;
let workerInterval: NodeJS.Timeout | null = null;
let reclaimInterval: NodeJS.Timeout | null = null;
let cleanupInterval: NodeJS.Timeout | null = null;
let notificationInterval: NodeJS.Timeout | null = null;

/**
 * Processes a single job end-to-end.
 */
async function processJob(job: Job): Promise<void> {
  const jobId = job.id;
  const url = job.url;
  const safeTimestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const userSegment = job.userId ? job.userId : 'unassigned';
  const runDir = path.resolve('logs', userSegment, `run-${safeTimestamp}_${jobId}`);
  const framesDir = path.join(runDir, 'frames');
  let audioFilePath = '';
  let videoFilePath = '';
  let framePaths: string[] = [];
  let photoUploadId: string | null = null;

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

    if (job.parentJobId) {
      console.log(`[Job ${jobId}] Starting remix processing...`);
      await updateJob(jobId, { status: 'processing', recipe: { isProgress: true, percent: 30, stage: 'extracting_recipe' } as any });
      await fs.mkdir(runDir, { recursive: true });

      const parentJob = await getJob(job.parentJobId);
      if (!parentJob || !parentJob.recipe) {
        throw new AppError('PARENT_JOB_NOT_FOUND', { message: 'Parent job or recipe not found for remix.' });
      }

      console.log(`[Job ${jobId}] Requesting remix from Gemini...`);
      const { recipe, usage: geminiUsage } = await remixRecipe(parentJob.recipe, job.prompt || '', runDir, userPrefs);

      if (recipe.isRecipe === false) {
        throw new AppError('UNRELATED_REMIX_REQUEST', { message: 'The prompt was not recognized as a valid recipe modification.' });
      }

      recipe.id = jobId;
      recipe.instagramHandle = parentJob.recipe.instagramHandle;
      recipe.parentJobId = parentJob.id;
      recipe.parentRecipeTitle = parentJob.recipe.title;
      recipe.remixPrompt = job.prompt || null;

      let fluxUsage: any = null;

      // Generate AI cover image for the remixed recipe if prompt is present
      if (recipe.imagePrompt) {
        await updateJob(jobId, { status: 'processing', recipe: { isProgress: true, percent: 85, stage: 'generating_cover' } as any });
        const { imageUrl: aiCoverUrl, usage } = await generateRecipeCoverImage({
          prompt: recipe.imagePrompt,
          jobId,
          userId: job.userId,
        });
        fluxUsage = usage;
        if (aiCoverUrl) {
          recipe.imageUrl = aiCoverUrl;
          recipe.imageUrls = [aiCoverUrl, ...(parentJob.recipe.imageUrls || [])];
          recipe.isAiCover = true;
        } else {
          recipe.imageUrl = parentJob.recipe.imageUrl;
          recipe.imageUrls = parentJob.recipe.imageUrls;
        }
      } else {
        recipe.imageUrl = parentJob.recipe.imageUrl;
        recipe.imageUrls = parentJob.recipe.imageUrls;
      }

      await updateJob(jobId, { status: 'processing', recipe: { isProgress: true, percent: 90, stage: 'finalizing' } as any });

      // Canonical ingredient normalization & nutritional calculation
      await enrichRecipeWithCanonicalIngredients(recipe);

      const llmUsage: LlmUsage = {};
      if (geminiUsage) llmUsage.gemini = geminiUsage;
      if (fluxUsage) llmUsage.flux = fluxUsage;

      await updateJob(jobId, {
        status: 'completed',
        recipe,
        llmUsage: Object.keys(llmUsage).length > 0 ? llmUsage : null,
        error: null,
      });
      return;
    }

    // Photo import: the user supplied their own photos of a cookbook page or a
    // handwritten recipe card, so there is nothing to scrape or download from a
    // third party. The photos take the role of the carousel slides and go into
    // extractRecipe at full resolution; no grid is built and no cover frame is
    // selected — a photographed page makes a poor cover, so the recipe emoji is
    // the placeholder instead.
    if (isPhotoJobUrl(url)) {
      photoUploadId = photoUploadIdFromUrl(url);
      // Both are guaranteed by the route that created the job; a job missing
      // either can never find its photos again.
      if (!photoUploadId || !job.userId) {
        throw new AppError('PHOTO_IMPORT_EXPIRED', { message: 'Photo job is missing its upload id or owner.' });
      }
      const photoUserId = job.userId;

      console.log(`[Job ${jobId}] Starting photo import ${photoUploadId}...`);
      await updateJob(jobId, { status: 'processing', recipe: { isProgress: true, percent: 20, stage: 'reading_photos' } as any });
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

      await updateJob(jobId, { status: 'processing', recipe: { isProgress: true, percent: 60, stage: 'extracting_recipe' } as any });
      const { recipe, usage: geminiUsage } = await extractRecipe(undefined, undefined, '', undefined, runDir, userPrefs, undefined, photoPaths, 'photo');

      console.log(`[Job ${jobId}] Recipe extracted from photos: "${recipe.title}"`);
      recipe.id = jobId;
      recipe.instagramHandle = null;

      let fluxUsage: any = null;

      // Generate photorealistic AI cover image of the finished dish for photo imports
      if (recipe.imagePrompt) {
        await updateJob(jobId, { status: 'processing', recipe: { isProgress: true, percent: 85, stage: 'generating_cover' } as any });
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

      await updateJob(jobId, { status: 'processing', recipe: { isProgress: true, percent: 90, stage: 'finalizing' } as any });

      // Canonical ingredient normalization & nutritional calculation
      await enrichRecipeWithCanonicalIngredients(recipe);

      const llmUsage: LlmUsage = {};
      if (geminiUsage) llmUsage.gemini = geminiUsage;
      if (fluxUsage) llmUsage.flux = fluxUsage;

      await updateJob(jobId, {
        status: 'completed',
        recipe,
        llmUsage: Object.keys(llmUsage).length > 0 ? llmUsage : null,
        error: null,
      });
      return;
    }

    if (await isJobDeleted(jobId)) {
      console.log(`[Job ${jobId}] Job was cancelled/deleted by user, aborting.`);
      return;
    }

    // 1. Mark job as scraping
    console.log(`[Job ${jobId}] Starting scraping for ${url}...`);
    await updateJob(jobId, { status: 'scraping', recipe: { isProgress: true, percent: 15, stage: 'scraping' } as any });

    // 2. Perform scraping via the appropriate scraper
    const scraper = getScraperForUrl(url);
    const scrapeResult = await scraper.scrape(url, jobId);
    console.log(`[Job ${jobId}] Scraped successfully. Caption/Title length: ${scrapeResult.caption.length}`);

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

    // 3. Mark job as processing
    await updateJob(jobId, { status: 'processing', recipe: { isProgress: true, percent: 50, stage: 'downloading_media' } as any });

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

    // 6. If video is available, extract frames and create grid first
    let gridImagePath: string | undefined;
    framePaths = [];
    const isCarousel = downloaded.imageFilePaths.length > 0;

    if (videoFilePath) {
      await updateJob(jobId, { status: 'processing', recipe: { isProgress: true, percent: 55, stage: 'extracting_frames' } as any });
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
      // Image carousel: the slides take the role of video frames — build the tiled grid
      // from them so the existing best-shot selection works unchanged. A single-slide
      // post skips the grid (xstack needs >= 2 inputs); its cover is uploaded directly.
      await updateJob(jobId, { status: 'processing', recipe: { isProgress: true, percent: 55, stage: 'extracting_frames' } as any });
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

    console.log(`[Job ${jobId}] Running recipe extraction and frame selection in parallel...`);

    const frameSelectionPromise: Promise<string[] | null> = (gridImagePath && framePaths.length > 0)
      ? (async () => {
        try {
          const { selectBestFoodFrame } = await import('./gemini.js');
          console.log(`[Job ${jobId}] Asking Gemini to pick best food shots from grid...`);
          const bestIndices = await selectBestFoodFrame(framePaths, gridImagePath, runDir);
          console.log(`[Job ${jobId}] Best frames selected: indices ${bestIndices.join(', ')}`);

          if (isCarousel && scrapeResult.media.kind === 'images') {
             const originalUrls = scrapeResult.media.imageUrls;
             return bestIndices.map(idx => originalUrls[idx]).filter(Boolean);
          }
          return null;
        } catch (err: any) {
          console.warn(`[Job ${jobId}] Frame selection failed: ${err.message}`);
          return (isCarousel && scrapeResult.media.kind === 'images' && scrapeResult.media.imageUrls.length > 0)
            ? [scrapeResult.media.imageUrls[0]]
            : null;
        }
      })()
      : (isCarousel && scrapeResult.media.kind === 'images' && scrapeResult.media.imageUrls.length > 0)
        ? Promise.resolve([scrapeResult.media.imageUrls[0]])
        : Promise.resolve(null);

    await updateJob(jobId, { status: 'processing', recipe: { isProgress: true, percent: 75, stage: 'extracting_recipe' } as any });

    const [{ recipe, usage: geminiUsage }, selectedImageUrls] = await Promise.all([
      extractRecipe(
        audioFilePath || undefined,
        mimeType,
        scrapeResult.caption,
        // Carousels send every slide at full resolution instead of the downscaled grid —
        // the recipe is usually written as text on the images and must stay readable.
        isCarousel ? undefined : gridImagePath,
        runDir,
        userPrefs,
        scrapeResult.htmlContent,
        isCarousel ? downloaded.imageFilePaths : undefined
      ),
      frameSelectionPromise,
    ]);

    console.log(`[Job ${jobId}] Recipe extracted: "${recipe.title}"`);

    // Collect base scraped frames / thumbnail
    const baseImageUrls = (selectedImageUrls && selectedImageUrls.length > 0)
      ? selectedImageUrls
      : (scrapeResult.imageUrl ? [scrapeResult.imageUrl] : []);

    let fluxUsage: any = null;

    // Generate AI food photography cover image with FLUX.1 [schnell]
    if (recipe.imagePrompt) {
      await updateJob(jobId, { status: 'processing', recipe: { isProgress: true, percent: 85, stage: 'generating_cover' } as any });
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

    await updateJob(jobId, { status: 'processing', recipe: { isProgress: true, percent: 90, stage: 'finalizing' } as any });

    recipe.instagramHandle = scrapeResult.authorHandle || null;

    // Assign unique recipe ID equal to jobId
    recipe.id = jobId;

    // Canonical ingredient normalization & nutritional calculation
    await enrichRecipeWithCanonicalIngredients(recipe);

    const llmUsage: LlmUsage = {};
    if (geminiUsage) llmUsage.gemini = geminiUsage;
    if (fluxUsage) llmUsage.flux = fluxUsage;

    // 7. Update job as completed
    await updateJob(jobId, {
      status: 'completed',
      recipe,
      llmUsage: Object.keys(llmUsage).length > 0 ? llmUsage : null,
      error: null,
    });
  } catch (error: any) {
    console.error(`[Job ${jobId}] Failed during execution:`, error.message);
    // Persist a machine-readable error envelope (code + params) instead of a raw
    // message. Non-AppError throws collapse to EXTRACTION_FAILED so users never
    // see internal/library text; the client localizes the code (see errorCodes.ts).
    await updateJob(jobId, {
      status: 'failed',
      error: serializeJobError(error),
    });
  } finally {
    clearInterval(heartbeat);
    const cleanupPaths = [audioFilePath, videoFilePath, ...framePaths].filter(Boolean);
    await Promise.allSettled(cleanupPaths.map((p) => fs.unlink(p).catch(() => { })));
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
  if (cleanupInterval) { clearInterval(cleanupInterval); cleanupInterval = null; }
  if (notificationInterval) { clearInterval(notificationInterval); notificationInterval = null; }
  console.log('Background job queue worker stopped.');
}
