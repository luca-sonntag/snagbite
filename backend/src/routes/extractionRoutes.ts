import { Router, Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import {
  createJob,
  getJob,
  getRecipeTitles,
  cancelJob,
  findExtractedRecipeIdByUrl,
  findActiveJobByUrl,
  countActiveJobsForUser,
  cleanStaleJobsForUser,
  getActiveJobsForUser,
  cancelAllActiveJobsForUser,
  countLibraryEntries,
  getExtractionsForUserInTimeframe,
  updateJob,
  getAlphaMaxSavedRecipes,
  getFreeMaxExtractions,
  getFreeMaxSavedRecipes,
  getRewardedAdBonusCredits,
  addToLibrary,
  isInLibrary,
  findReusableRecipe,
  normalizeUrl,
} from '../db.js';
import { db } from '../db/drizzle.js';
import { user as userTable } from '../db/schema/auth.js';
import { eq } from 'drizzle-orm';
import { config } from '../config.js';
import { AppError, sendAppError } from '../errors.js';
import { MAX_IMPORT_PHOTOS, deleteImportPhotos, photoJobUrl, uploadImportPhoto } from '../photoImport.js';
import {
  SUPPORTED_URL_REGEX,
  MAX_PHOTOS_TOTAL_CHARS,
  fetchAndSyncUser,
  resolveUserRateLimit,
  isPremiumUser,
  resolveConcurrencyLimit,
} from './authUtils.js';
import { handleVideoProxy } from './videoProxy.js';
import { triggerWorkerTick } from '../queue.js';
import { subscribeJobEvents } from '../jobEvents.js';

export const extractionRoutes = Router();

extractionRoutes.get('/extract-recipe/proxy-video', handleVideoProxy);

const MAX_CLIENT_FRAMES = 24;
const MAX_FRAMES_TOTAL_CHARS = 12 * 1024 * 1024;

export function resolveTargetLanguage(bodyLang?: unknown, headerLang?: string): string {
  if (typeof bodyLang === 'string' && bodyLang.trim()) {
    return bodyLang.trim().toLowerCase().startsWith('en') ? 'en' : 'de';
  }
  if (typeof headerLang === 'string' && headerLang.trim().toLowerCase().startsWith('en')) {
    return 'en';
  }
  return 'de';
}

export async function assertCookbookCapacity(userId: string): Promise<void> {
  let user = null;
  try {
    user = await fetchAndSyncUser(userId);
  } catch (err) {
    console.warn(`Failed to fetch user metadata for cookbook capacity check:`, err);
  }

  const premium = isPremiumUser(user);
  if (!premium) {
    const savedCount = await countLibraryEntries(userId);
    const isAlpha = user?.app_metadata?.tier === 'alpha';
    const limit = isAlpha ? await getAlphaMaxSavedRecipes() : await getFreeMaxSavedRecipes();
    if (limit >= 0 && savedCount >= limit) {
      throw new AppError('COOKBOOK_FULL', { params: { count: savedCount, limit } });
    }
  }
}

async function enforceExtractionQuota(req: Request): Promise<void> {
  const userId = req.userId!;
  let user = null;
  try {
    user = await fetchAndSyncUser(userId);
  } catch (err) {
    console.warn(`Failed to fetch user metadata for gating checks:`, err);
  }

  await cleanStaleJobsForUser(userId).catch((err) =>
    console.warn(`[extraction] Failed to clean stale jobs for user ${userId}:`, err)
  );

  const concurrencyLimit = await resolveConcurrencyLimit(user);
  const activeCount = await countActiveJobsForUser(userId);
  if (concurrencyLimit >= 0 && activeCount >= concurrencyLimit) {
    throw new AppError('ACTIVE_JOB_EXISTS', { params: { count: activeCount } });
  }

  await assertCookbookCapacity(userId);

  const limit = user ? await resolveUserRateLimit(user) : await getFreeMaxExtractions();

  if (limit >= 0) {
    const windowDays = config.EXTRACTION_LIMIT_WINDOW_DAYS;
    const extractions = await getExtractionsForUserInTimeframe(userId, windowDays);
    if (extractions.length >= limit) {
      const bonusCredits =
        typeof user?.app_metadata?.bonus_credits === 'number'
          ? (user.app_metadata.bonus_credits as number)
          : 0;
      if (bonusCredits > 0 && user) {
        const newCredits = bonusCredits - 1;
        try {
          await db
            .update(userTable)
            .set({ bonusCredits: newCredits, updatedAt: new Date() })
            .where(eq(userTable.id, userId));
          console.log(
            `[RewardedAd] Consumed 1 bonus credit for user ${userId}. Remaining bonus_credits=${newCredits}`
          );
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          console.error(`Failed to consume bonus credit for user ${userId}:`, msg);
        }
      } else {
        const oldestJob = extractions[0];
        let minutesRemaining = 0;
        if (oldestJob) {
          const resetTime = new Date(
            new Date(oldestJob.createdAt).getTime() + windowDays * 24 * 60 * 60 * 1000
          );
          const msRemaining = resetTime.getTime() - Date.now();
          minutesRemaining = Math.max(1, Math.ceil(msRemaining / (60 * 1000)));
        }

        throw new AppError('RATE_LIMIT_EXCEEDED', {
          params: { limit, days: windowDays, minutes: minutesRemaining },
        });
      }
    }
  }
}

extractionRoutes.post('/extract-recipe', async (req: Request, res: Response): Promise<void> => {
  try {
    const { url, language: bodyLanguage, force } = req.body;

    if (!url || typeof url !== 'string') {
      throw new AppError('MISSING_FIELD', { params: { field: 'url' } });
    }

    const cleanUrl = url.trim().replace(/^[{("'\s]+|[})"'\s]+$/g, '');

    if (!SUPPORTED_URL_REGEX.test(cleanUrl)) {
      throw new AppError('INVALID_URL', { message: 'URL failed SUPPORTED_URL_REGEX.' });
    }

    try {
      const urlObj = new URL(cleanUrl);
      const hostname = urlObj.hostname.toLowerCase();
      const isYouTube =
        hostname === 'youtube.com' || hostname.endsWith('.youtube.com') || hostname === 'youtu.be';

      if (isYouTube) {
        const isShort = urlObj.pathname.startsWith('/shorts/');
        if (!isShort) {
          throw new AppError('YOUTUBE_SHORTS_ONLY');
        }
      }
    } catch (e) {
      if (e instanceof AppError) throw e;
      throw new AppError('INVALID_URL', { message: 'URL failed to parse.' });
    }

    const normalizedUrl = normalizeUrl(cleanUrl);
    const targetLanguage = resolveTargetLanguage(bodyLanguage, req.header('accept-language'));

    // Cross-user instant recipe reuse: check if recipe already exists in target language (unless force re-extraction)
    if (!force) {
      const reusableRecipe = await findReusableRecipe(normalizedUrl, targetLanguage);
      if (reusableRecipe) {
        const alreadyInCookbook = await isInLibrary(req.userId!, reusableRecipe.id!);
        if (!alreadyInCookbook) {
          await assertCookbookCapacity(req.userId!);
          await addToLibrary(req.userId!, reusableRecipe.id!, 'extraction');
        }

        res.status(200).json({
          success: true,
          recipeId: reusableRecipe.id,
          recipe: reusableRecipe,
          status: 'completed',
          isCached: true,
          message: 'Recipe reused from existing extraction.',
        });
        return;
      }
    }

    const activeJob = await findActiveJobByUrl(cleanUrl, req.userId!);
    if (activeJob) {
      res.status(202).json({
        success: true,
        jobId: activeJob.id,
        status: activeJob.status,
        message: 'Recipe extraction already in progress.',
      });
      return;
    }

    await enforceExtractionQuota(req);

    const job = await createJob(cleanUrl, req.userId!, 'url', targetLanguage);
    triggerWorkerTick();

    res.status(202).json({
      success: true,
      jobId: job.id,
      status: job.status,
      message: 'Recipe extraction job successfully queued.',
    });
  } catch (error: unknown) {
    if (!(error instanceof AppError)) console.error('Error creating recipe extraction job:', error);
    sendAppError(res, error);
  }
});

extractionRoutes.post('/extract-recipe/photos', async (req: Request, res: Response): Promise<void> => {
  let uploadId: string | null = null;

  try {
    const { photos } = req.body;

    if (!Array.isArray(photos) || photos.length === 0) {
      throw new AppError('MISSING_FIELD', { params: { field: 'photos' } });
    }
    if (photos.some((photo: unknown) => typeof photo !== 'string' || photo.trim().length === 0)) {
      throw new AppError('INVALID_FIELD', { params: { field: 'photos' } });
    }
    if (photos.length > MAX_IMPORT_PHOTOS) {
      throw new AppError('TOO_MANY_PHOTOS', { params: { max: MAX_IMPORT_PHOTOS } });
    }

    const totalLength = photos.reduce((sum: number, photo: string) => sum + photo.length, 0);
    if (totalLength > MAX_PHOTOS_TOTAL_CHARS) {
      throw new AppError('PHOTOS_TOO_LARGE', {
        message: `Combined photo payload of ${totalLength} chars exceeds ${MAX_PHOTOS_TOTAL_CHARS}.`,
      });
    }

    await enforceExtractionQuota(req);

    uploadId = randomUUID();
    try {
      for (let index = 0; index < photos.length; index++) {
        const base64 = (photos[index] as string).replace(/^data:image\/\w+;base64,/, '');
        await uploadImportPhoto(req.userId!, uploadId, index, Buffer.from(base64, 'base64'));
      }
    } catch (uploadError: unknown) {
      await deleteImportPhotos(req.userId!, uploadId).catch(() => {});
      uploadId = null;
      const uploadMessage = uploadError instanceof Error ? uploadError.message : undefined;
      throw new AppError('PHOTO_UPLOAD_FAILED', { message: uploadMessage });
    }

    const job = await createJob(photoJobUrl(uploadId), req.userId!, 'photo');
    triggerWorkerTick();

    res.status(202).json({
      success: true,
      jobId: job.id,
      status: job.status,
      message: 'Photo recipe extraction job successfully queued.',
    });
  } catch (error: unknown) {
    if (uploadId) await deleteImportPhotos(req.userId!, uploadId).catch(() => {});
    if (!(error instanceof AppError)) console.error('Error creating photo extraction job:', error);
    sendAppError(res, error);
  }
});

extractionRoutes.post('/extract-recipe/frames', async (req: Request, res: Response): Promise<void> => {
  try {
    const { jobId, thumbnailBase64, gridBase64, framesBase64 } = req.body;

    if (!jobId || typeof jobId !== 'string') {
      throw new AppError('MISSING_FIELD', { params: { field: 'jobId' } });
    }

    const job = await getJob(jobId, req.userId!);
    if (!job) {
      throw new AppError('JOB_NOT_FOUND');
    }

    if (job.status !== 'awaiting_frames') {
      throw new AppError('FRAMES_NOT_EXPECTED', {
        message: `Job ${jobId} is in status '${job.status}', not 'awaiting_frames'.`,
      });
    }

    const frames = Array.isArray(framesBase64) ? framesBase64 : [];
    if (frames.length > MAX_CLIENT_FRAMES) {
      throw new AppError('TOO_MANY_FRAMES', { params: { max: MAX_CLIENT_FRAMES } });
    }

    const thumbStr = typeof thumbnailBase64 === 'string' ? thumbnailBase64 : '';
    const gridStr = typeof gridBase64 === 'string' ? gridBase64 : '';
    const totalChars =
      thumbStr.length +
      gridStr.length +
      frames.reduce((acc: number, f: unknown) => acc + (typeof f === 'string' ? f.length : 0), 0);

    if (totalChars > MAX_FRAMES_TOTAL_CHARS) {
      throw new AppError('FRAMES_TOO_LARGE', {
        message: `Combined frame payload of ${totalChars} chars exceeds limit.`,
      });
    }

    await updateJob(job.id, {
      clientFrames: {
        thumbnailBase64: thumbStr || undefined,
        gridBase64: gridStr || undefined,
        framesBase64: frames.filter(
          (f: unknown): f is string => typeof f === 'string' && f.trim().length > 0
        ),
      },
      status: 'pending',
      progress: { percent: 35, stage: 'queued' },
    });
    triggerWorkerTick();

    res.status(202).json({
      success: true,
      jobId: job.id,
      status: 'pending',
      message: 'Video keyframes received and job queued for extraction.',
    });
  } catch (error: unknown) {
    if (!(error instanceof AppError)) console.error('Error receiving client frames:', error);
    sendAppError(res, error);
  }
});

extractionRoutes.get('/jobs/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');

    if (!id) {
      throw new AppError('MISSING_FIELD', { params: { field: 'id' } });
    }

    const job = await getJob(id, req.userId!);
    if (!job) {
      throw new AppError('JOB_NOT_FOUND');
    }

    let mediaRequest: { videoUrl: string; thumbnailUrl?: string; durationSeconds?: number } | undefined;
    if (job.status === 'awaiting_frames' && job.scrapeMeta) {
      const meta = job.scrapeMeta as Record<string, unknown>;
      const media = meta.media as { kind?: string; videoUrl?: string } | undefined;
      if (media?.kind === 'client' && media?.videoUrl) {
        mediaRequest = {
          videoUrl: media.videoUrl,
          thumbnailUrl: typeof meta.imageUrl === 'string' ? meta.imageUrl : undefined,
          durationSeconds: typeof meta.durationSeconds === 'number' ? meta.durationSeconds : undefined,
        };
      }
    }

    let recipeTitle: string | null = null;
    if (job.recipeId) {
      const titles = await getRecipeTitles([job.recipeId]);
      recipeTitle = titles.get(job.recipeId) ?? null;
    }

    res.status(200).json({
      success: true,
      job: {
        id: job.id,
        kind: job.kind,
        sourceUrl: job.sourceUrl,
        status: job.status,
        error: job.error,
        progress: job.progress,
        mediaRequest,
        recipeId: job.recipeId,
        title: recipeTitle,
        parentRecipeId: job.parentRecipeId,
        remixPrompt: job.remixPrompt,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt,
      },
    });
  } catch (error: unknown) {
    if (!(error instanceof AppError)) console.error('Error fetching job details:', error);
    sendAppError(res, error);
  }
});

extractionRoutes.get('/jobs/:id/events', async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  if (!id) {
    res.status(400).json({ success: false, error: 'Missing job id' });
    return;
  }

  const job = await getJob(id, req.userId!);
  if (!job) {
    res.status(404).json({ success: false, error: 'Job not found' });
    return;
  }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  const sendEvent = (event: string, data: unknown) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  const buildMediaRequest = (scrapeMeta: unknown) => {
    if (!scrapeMeta) return undefined;
    const meta = scrapeMeta as Record<string, unknown>;
    const media = meta.media as { kind?: string; videoUrl?: string } | undefined;
    if (media?.kind === 'client' && media?.videoUrl) {
      return {
        videoUrl: media.videoUrl,
        thumbnailUrl: typeof meta.imageUrl === 'string' ? meta.imageUrl : undefined,
        durationSeconds: typeof meta.durationSeconds === 'number' ? meta.durationSeconds : undefined,
      };
    }
    return undefined;
  };

  let recipeTitle: string | null = null;
  if (job.recipeId) {
    const titles = await getRecipeTitles([job.recipeId]);
    recipeTitle = titles.get(job.recipeId) ?? null;
  }

  sendEvent('job', {
    id: job.id,
    kind: job.kind,
    sourceUrl: job.sourceUrl,
    status: job.status,
    error: job.error,
    progress: job.progress,
    mediaRequest: job.status === 'awaiting_frames' ? buildMediaRequest(job.scrapeMeta) : undefined,
    recipeId: job.recipeId,
    title: recipeTitle,
    parentRecipeId: job.parentRecipeId,
    remixPrompt: job.remixPrompt,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
  });

  if (job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled') {
    res.end();
    return;
  }

  let isClosed = false;
  const pingInterval = setInterval(() => {
    if (!isClosed) {
      res.write(': ping\n\n');
    }
  }, 15000);

  const unsubscribe = subscribeJobEvents(id, async (payload) => {
    if (isClosed) return;

    let title = payload.title;
    if (!title && payload.recipeId) {
      const titles = await getRecipeTitles([payload.recipeId]);
      title = titles.get(payload.recipeId) ?? null;
    }

    sendEvent('job', {
      id: payload.jobId,
      status: payload.status,
      progress: payload.progress,
      recipeId: payload.recipeId,
      title,
      error: payload.error,
      mediaRequest: payload.mediaRequest,
    });

    if (payload.status === 'completed' || payload.status === 'failed' || payload.status === 'cancelled') {
      cleanup();
      res.end();
    }
  });

  const cleanup = () => {
    if (isClosed) return;
    isClosed = true;
    clearInterval(pingInterval);
    unsubscribe();
  };

  req.on('close', cleanup);
});

extractionRoutes.post('/jobs/:id/cancel', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const cancelled = await cancelJob(id, req.userId!);
    if (!cancelled) {
      throw new AppError('JOB_NOT_FOUND');
    }
    res.status(200).json({
      success: true,
      message: 'Job cancelled.',
    });
  } catch (error: unknown) {
    if (!(error instanceof AppError)) console.error('Error cancelling job:', error);
    sendAppError(res, error);
  }
});

extractionRoutes.get('/me/active-jobs', async (req: Request, res: Response): Promise<void> => {
  try {
    await cleanStaleJobsForUser(req.userId!).catch((err) =>
      console.warn(`[active-jobs] Failed to clean stale jobs:`, err)
    );
    const jobs = await getActiveJobsForUser(req.userId!);
    res.status(200).json({
      success: true,
      jobs: jobs.map((j) => ({
        id: j.id,
        status: j.status,
        kind: j.kind,
        sourceUrl: j.sourceUrl,
        progress: j.progress,
        createdAt: j.createdAt,
        updatedAt: j.updatedAt,
      })),
    });
  } catch (error: unknown) {
    if (!(error instanceof AppError)) console.error('Error fetching active jobs:', error);
    sendAppError(res, error);
  }
});

extractionRoutes.post('/me/active-jobs/cancel', async (req: Request, res: Response): Promise<void> => {
  try {
    const count = await cancelAllActiveJobsForUser(req.userId!);
    res.status(200).json({
      success: true,
      cancelledCount: count,
      message: `${count} active job(s) cancelled.`,
    });
  } catch (error: unknown) {
    if (!(error instanceof AppError)) console.error('Error cancelling active jobs:', error);
    sendAppError(res, error);
  }
});

extractionRoutes.get('/extractions/limit', async (req: Request, res: Response): Promise<void> => {
  try {
    await cleanStaleJobsForUser(req.userId!).catch((err) =>
      console.warn(`[limit] Failed to clean stale jobs:`, err)
    );

    let limit = await getFreeMaxExtractions();
    let tier: 'free' | 'alpha' | 'premium' = 'free';
    let user = null;
    try {
      user = await fetchAndSyncUser(req.userId!);
    } catch (err) {
      console.warn(`Failed to fetch user metadata for rate limit status:`, err);
    }

    if (user) {
      limit = await resolveUserRateLimit(user);
      tier =
        user.app_metadata?.tier === 'premium'
          ? 'premium'
          : user.app_metadata?.tier === 'alpha'
            ? 'alpha'
            : 'free';
    }

    const windowDays = config.EXTRACTION_LIMIT_WINDOW_DAYS;
    const premium = isPremiumUser(user);
    const savedRecipes = await countLibraryEntries(req.userId!);
    const maxSavedRecipes = premium
      ? -1
      : user?.app_metadata?.tier === 'alpha'
        ? await getAlphaMaxSavedRecipes()
        : await getFreeMaxSavedRecipes();
    const cookbookFull = maxSavedRecipes >= 0 && savedRecipes >= maxSavedRecipes;

    const maxConcurrent = await resolveConcurrencyLimit(user);
    const activeCount = await countActiveJobsForUser(req.userId!);
    const rewardedAdBonusCredits = await getRewardedAdBonusCredits();

    if (limit < 0) {
      res.status(200).json({
        success: true,
        tier,
        limit: -1,
        used: 0,
        remaining: -1,
        windowDays,
        savedRecipes,
        maxSavedRecipes,
        cookbookFull,
        maxConcurrent,
        activeCount,
        rewardedAdBonusCredits,
      });
      return;
    }

    const extractions = await getExtractionsForUserInTimeframe(req.userId!, windowDays);
    const used = extractions.length;
    const bonusCredits =
      typeof user?.app_metadata?.bonus_credits === 'number' ? user.app_metadata.bonus_credits : 0;
    const baseRemaining = Math.max(0, limit - used);
    const remaining = limit < 0 ? -1 : baseRemaining + bonusCredits;

    res.status(200).json({
      success: true,
      tier,
      limit,
      used,
      remaining,
      windowDays,
      savedRecipes,
      maxSavedRecipes,
      cookbookFull,
      maxConcurrent,
      activeCount,
      rewardedAdBonusCredits,
    });
  } catch (error: unknown) {
    if (!(error instanceof AppError)) console.error('Error fetching rate limit status:', error);
    sendAppError(res, error);
  }
});
