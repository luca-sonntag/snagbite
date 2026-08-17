import { Router, Request, Response } from 'express';
import {
  createJob,
  createRemixJob,
  saveCompletedRemix,
  getJob,
  findCompletedJobByUrl,
  findActiveJobByUrl,
  getAllJobs,
  deleteJob,
  countActiveJobsForUser,
  getClient,
  getExtractionsForUserInTimeframe,
  countCompletedRecipesForUser,
  updateJob,
  isAlphaActive,
  getAlphaMaxExtractions,
  getAlphaMaxSavedRecipes,
  getFreeMaxExtractions,
  getFreeMaxSavedRecipes,
  getPremiumMaxExtractions,
  setFavorite,
  setFlags,
  listCollections,
  createCollection,
  updateCollection,
  deleteCollection,
  setRecipeCollections,
  createFeedback,
  getAllGlobalSettings,
  updateGlobalSettings,
  getAllFeedback,
  getJobMetrics,
  listAppBundles,
  setAppBundleActive,
  getExtractionsPerUser,
  getFailedJobs,
  upsertPushToken,
  deletePushToken,
  deletePushTokensForUser,
  getPremiumMaxConcurrentExtractions,
  getFreeMaxConcurrentExtractions,
  restoreJob, 
  getRecentCookPhotos, 
  getDistinctCookedRecipeCount, 
  getCookHistoryForJob,
  uploadCookPhoto,
  getUserStats,
  getUserBadgesDetailed,
  getGamificationConfig,
  ensureProfile,
  updateDisplayName,
  findProfileByFriendCode,
  getProfilesByIds,
  getAcceptedFriends,
  getIncomingRequests,
  findFriendshipBetween,
  getFriendshipById,
  createFriendship,
  acceptFriendship,
  deleteFriendship,
  getUserStatsForIds,
  getWeeklyXp,
  getAllFriendshipsForUser,
  getGlobalAllTimeStats,
  getGlobalWeeklyXp
} from './db.js';
import { config } from './config.js';
import { requireAuth, requireAdmin } from './auth.js';
import { chatAboutRecipe, generateChatChips, remixRecipe, verifyCookedDishPhoto } from './gemini.js';
import { enrichRecipeWithCanonicalIngredients } from './matching/ingredientMatcher.js';
import { getLlmMetrics } from './adminMetrics.js';
import { AppError, sendAppError } from './errors.js';
import { randomUUID } from 'node:crypto';
import { MAX_IMPORT_PHOTOS, deleteImportPhotos, photoJobUrl, uploadImportPhoto } from './photoImport.js';

import { notificationTick } from './notifications/worker.js';
import { recordCook } from './gamification.js';
import { monthStartUtc } from './socialTime.js';
import type { Profile, FriendSummary, FriendRequest, LeaderboardEntry, LeaderboardScope } from './types.js';

export const apiRouter = Router();

apiRouter.use(requireAuth);

// Regular expression to validate standard URLs
// Supports Instagram, TikTok, YouTube Shorts, and generic websites
const SUPPORTED_URL_REGEX = /^(https?:\/\/)?([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(:\d+)?(\/.*)?$/i;

/**
 * Combined base64 budget for one photo import. The client compresses to roughly
 * 400-800 KB per photo, so five photos stay well below this; the cap only exists
 * to reject payloads that would exhaust memory before the JSON parser does.
 */
const MAX_PHOTOS_TOTAL_CHARS = 9_000_000;

/**
 * Helper to fetch a user by ID and automatically assign the alpha tier if alpha is active
 * and the user is currently on the free/unassigned tier.
 */
async function fetchAndSyncUser(userId: string): Promise<any> {
  const { data, error } = await getClient().auth.admin.getUserById(userId);
  if (error || !data?.user) {
    throw error || new Error('User not found');
  }

  let user = data.user;
  const currentTier = user.app_metadata?.tier;
  const alphaActive = await isAlphaActive();

  if (alphaActive && currentTier !== 'premium' && currentTier !== 'alpha') {
    try {
      console.log(`Auto-assigning alpha tier to user ${userId} (current: ${currentTier})`);
      const { data: updatedData, error: updateError } = await getClient().auth.admin.updateUserById(userId, {
        app_metadata: { ...user.app_metadata, tier: 'alpha' }
      });
      if (updateError) {
        console.error(`Failed to auto-assign alpha tier to user ${userId}:`, updateError.message);
      } else if (updatedData?.user) {
        user = updatedData.user;
      }
    } catch (err) {
      console.error(`Error auto-assigning alpha tier to user ${userId}:`, err);
    }
  } else if (!alphaActive && currentTier === 'alpha') {
    try {
      console.log(`Auto-reverting user ${userId} from alpha to free tier because alpha is inactive`);
      const { data: updatedData, error: updateError } = await getClient().auth.admin.updateUserById(userId, {
        app_metadata: { ...user.app_metadata, tier: 'free' }
      });
      if (updateError) {
        console.error(`Failed to auto-revert alpha tier for user ${userId}:`, updateError.message);
      } else if (updatedData?.user) {
        user = updatedData.user;
      }
    } catch (err) {
      console.error(`Error auto-reverting alpha tier for user ${userId}:`, err);
    }
  }

  return user;
}

/**
 * Helper to determine a user's rate limit based on their tier and overrides in app_metadata.
 */
async function resolveUserRateLimit(user: any): Promise<number> {
  const meta = user?.app_metadata || {};

  // 1. Custom override check
  if (typeof meta.custom_extraction_limit === 'number') {
    return meta.custom_extraction_limit;
  }
  if (typeof meta.max_extractions_per_window === 'number') {
    return meta.max_extractions_per_window;
  }
  if (typeof meta.custom_extraction_limit === 'string') {
    return parseInt(meta.custom_extraction_limit, 10);
  }
  if (typeof meta.max_extractions_per_window === 'string') {
    return parseInt(meta.max_extractions_per_window, 10);
  }

  // 2. Base limit according to subscription tier
  if (meta.tier === 'premium') {
    return await getPremiumMaxExtractions();
  }
  if (meta.tier === 'alpha') {
    return await getAlphaMaxExtractions();
  }

  return await getFreeMaxExtractions();
}

/**
 * Determines whether a user has unlimited access — either the premium tier or
 * an explicit unlimited (-1) override in app_metadata.
 */
function isPremiumUser(user: any): boolean {
  const meta = user?.app_metadata || {};
  return meta.tier === 'premium' ||
    meta.custom_extraction_limit === -1 ||
    meta.max_extractions_per_window === -1;
}

/**
 * Resolves how many extractions a user may run *at the same time* (in-flight jobs).
 * Premium/alpha (and unlimited overrides) get the premium concurrency setting so
 * they can queue several background extractions; everyone else gets the free
 * setting (1 by default — free users cannot extract in the background).
 */
async function resolveConcurrencyLimit(user: any): Promise<number> {
  const meta = user?.app_metadata || {};
  const premiumLike =
    meta.tier === 'premium' ||
    meta.tier === 'alpha' ||
    meta.custom_extraction_limit === -1 ||
    meta.max_extractions_per_window === -1;
  return premiumLike
    ? await getPremiumMaxConcurrentExtractions()
    : await getFreeMaxConcurrentExtractions();
}

/**
 * Shared quota gate for everything that creates an extraction job: the active-job
 * quota, the cookbook cap and the rolling per-user extraction limit. Photo
 * imports go through exactly the same gate as link imports — they cost the same
 * Gemini budget and count against the same allowance.
 *
 * Throws the matching {@link AppError} when a limit is hit; returns quietly when
 * the user may start another extraction.
 */
async function enforceExtractionQuota(req: Request): Promise<void> {
  const userId = req.userId!;

  // Fetch the user once for tier-based gating (concurrency + cookbook cap + rolling rate limit).
  let user: any = null;
  try {
    user = await fetchAndSyncUser(userId);
  } catch (err) {
    console.warn(`Failed to fetch user metadata for gating checks:`, err);
  }

  const premium = isPremiumUser(user);

  // Enforce per-user concurrency to protect Apify/Gemini budget. This is now
  // tier-aware: free users may run only one extraction at a time (no background
  // extraction), while premium/alpha users may run several in parallel.
  const concurrencyLimit = await resolveConcurrencyLimit(user);
  const activeCount = await countActiveJobsForUser(userId);
  if (concurrencyLimit >= 0 && activeCount >= concurrencyLimit) {
    throw new AppError('ACTIVE_JOB_EXISTS', { params: { count: activeCount } });
  }

  // Enforce the cookbook cap: free accounts may only keep a limited number of
  // saved recipes. Existing recipes stay accessible — the user must delete one
  // or upgrade to Premium before extracting more.
  if (!premium) {
    const savedCount = await countCompletedRecipesForUser(userId);
    const isAlpha = user?.app_metadata?.tier === 'alpha';
    const limit = isAlpha ? await getAlphaMaxSavedRecipes() : await getFreeMaxSavedRecipes();
    if (limit >= 0 && savedCount >= limit) {
      throw new AppError('COOKBOOK_FULL', { params: { count: savedCount, limit } });
    }
  }

  // Enforce rolling rate limit per user (with custom override in app_metadata)
  const limit = user ? await resolveUserRateLimit(user) : await getFreeMaxExtractions();

  // If limit is non-negative (not -1 for unlimited)
  if (limit >= 0) {
    const windowDays = config.EXTRACTION_LIMIT_WINDOW_DAYS;
    const extractions = await getExtractionsForUserInTimeframe(userId, windowDays);
    if (extractions.length >= limit) {
      const bonusCredits = typeof user?.app_metadata?.bonus_credits === 'number' ? user.app_metadata.bonus_credits : 0;
      if (bonusCredits > 0) {
        // Consume 1 bonus credit granted from watching a Rewarded Video Ad
        const newCredits = bonusCredits - 1;
        const { error } = await getClient().auth.admin.updateUserById(userId, {
          app_metadata: {
            ...(user.app_metadata || {}),
            bonus_credits: newCredits,
          },
        });
        if (error) {
          console.error(`Failed to consume bonus credit for user ${userId}:`, error.message);
        } else {
          console.log(`[RewardedAd] Consumed 1 bonus credit for user ${userId}. Remaining bonus_credits=${newCredits}`);
        }
      } else {
        const oldestJob = extractions[0];
        let minutesRemaining = 0;
        if (oldestJob) {
          const resetTime = new Date(new Date(oldestJob.createdAt).getTime() + windowDays * 24 * 60 * 60 * 1000);
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

/**
 * Endpoint to submit an Instagram Reel URL for recipe extraction.
 * POST /api/extract-recipe
 * Body: { url: string }
 */
apiRouter.post('/extract-recipe', async (req: Request, res: Response): Promise<void> => {
  try {
    const { url } = req.body;

    if (!url || typeof url !== 'string') {
      throw new AppError('MISSING_FIELD', { params: { field: 'url' } });
    }

    // Clean up the URL by stripping leading/trailing curly braces, parentheses, quotes, or spaces
    const cleanUrl = url.trim().replace(/^[{("'\s]+|[})"'\s]+$/g, '');

    if (!SUPPORTED_URL_REGEX.test(cleanUrl)) {
      throw new AppError('INVALID_URL', { message: 'URL failed SUPPORTED_URL_REGEX.' });
    }

    try {
      const urlObj = new URL(cleanUrl);
      const hostname = urlObj.hostname.toLowerCase();
      const isYouTube = hostname === 'youtube.com' || hostname.endsWith('.youtube.com') || hostname === 'youtu.be';

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

    // Check if job for this URL has already successfully completed (scoped to user, including soft-deleted ones)
    const existingJob = await findCompletedJobByUrl(cleanUrl, req.userId!, true);
    if (existingJob) {
      if (existingJob.deletedAt !== null) {
        await restoreJob(existingJob.id, req.userId!);
      }
      res.status(200).json({
        success: true,
        jobId: existingJob.id,
        status: existingJob.status,
        isCached: true,
        message: 'Recipe already extracted successfully.',
      });
      return;
    }

    // Check if a job for this URL is already running (scoped to user, including soft-deleted ones).
    const activeJob = await findActiveJobByUrl(cleanUrl, req.userId!, true);
    if (activeJob) {
      if (activeJob.deletedAt !== null) {
        await restoreJob(activeJob.id, req.userId!);
      }
      res.status(202).json({
        success: true,
        jobId: activeJob.id,
        status: activeJob.status,
        message: 'Recipe extraction already in progress.',
      });
      return;
    }

    await enforceExtractionQuota(req);

    // Create a new pending job in the database
    const job = await createJob(cleanUrl, req.userId!);


    res.status(202).json({
      success: true,
      jobId: job.id,
      status: job.status,
      message: 'Recipe extraction job successfully queued.',
    });
  } catch (error: any) {
    if (!(error instanceof AppError)) console.error('Error creating recipe extraction job:', error);
    sendAppError(res, error);
  }
});

/**
 * Endpoint to submit user-taken photos of a physical recipe source (cookbook
 * page, magazine clipping, handwritten recipe card) for extraction.
 * POST /api/extract-recipe/photos
 * Body: { photos: string[] }  — data-URL or raw base64 JPEGs, in page order
 *
 * Unlike the link endpoint there is nothing to deduplicate against: every import
 * gets a fresh upload id, so the job's synthetic `photo://{uploadId}` URL is
 * unique by construction and never collides with the active-job unique index.
 *
 * The photos are uploaded to Storage *before* the job row is created — a job is
 * claimable by a worker the moment it exists, so the media has to be in place
 * first. The request body limit for this path is raised in index.ts.
 */
apiRouter.post('/extract-recipe/photos', async (req: Request, res: Response): Promise<void> => {
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
    } catch (uploadError: any) {
      // A partially uploaded import would silently extract a recipe from half the
      // pages, so discard everything and let the user retry the whole set.
      await deleteImportPhotos(req.userId!, uploadId).catch(() => { });
      uploadId = null;
      throw new AppError('PHOTO_UPLOAD_FAILED', { message: uploadError?.message });
    }

    const job = await createJob(photoJobUrl(uploadId), req.userId!);

    res.status(202).json({
      success: true,
      jobId: job.id,
      status: job.status,
      message: 'Photo recipe extraction job successfully queued.',
    });
  } catch (error: any) {
    // Any failure after the upload (e.g. the job insert) would orphan the photos
    // until the sweep runs — clean them up right away.
    if (uploadId) await deleteImportPhotos(req.userId!, uploadId).catch(() => { });
    if (!(error instanceof AppError)) console.error('Error creating photo extraction job:', error);
    sendAppError(res, error);
  }
});

/**
 * Endpoint to submit a recipe remix request.
 * POST /api/jobs/:id/remix
 * Body: { prompt: string }
 */
apiRouter.post('/jobs/:id/remix', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { prompt } = req.body;

    if (!prompt || typeof prompt !== 'string') {
      throw new AppError('MISSING_FIELD', { params: { field: 'prompt' } });
    }

    if (prompt.length > 250) {
      throw new AppError('REMIX_PROMPT_TOO_LONG', { params: { max: 250 } });
    }

    // Get the parent job
    const parentJob = await getJob(id, req.userId!);
    if (!parentJob) {
      throw new AppError('PARENT_JOB_NOT_FOUND');
    }

    if (parentJob.status !== 'completed' || !parentJob.recipe) {
      throw new AppError('PARENT_JOB_NOT_COMPLETED');
    }

    // Enforce premium access for remixing
    let isPremium = false;
    try {
      let user: any = null;
      user = await fetchAndSyncUser(req.userId!);

      if (user) {
        const meta = user.app_metadata || {};
        isPremium = meta.tier === 'premium' ||
          meta.tier === 'alpha' ||
          meta.custom_extraction_limit === -1 ||
          meta.max_extractions_per_window === -1;
      }
    } catch (err) {
      console.warn(`Failed to fetch user metadata for remix premium check:`, err);
    }

    if (!isPremium) {
      throw new AppError('PREMIUM_REQUIRED', { params: { feature: 'remix' } });
    }

    // Create a new remix job
    const job = await createRemixJob(parentJob.id, parentJob.url, prompt, req.userId!);

    res.status(202).json({
      success: true,
      jobId: job.id,
      status: job.status,
      message: 'Recipe remix job successfully queued.',
    });
  } catch (error: any) {
    if (!(error instanceof AppError)) console.error('Error creating remix job:', error);
    sendAppError(res, error);
  }
});

/**
 * Endpoint to poll status and get results of an extraction job.
 * GET /api/jobs/:id
 */
apiRouter.get('/jobs/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Prevent browser caching of dynamic job status
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');

    if (!id) {
      throw new AppError('MISSING_FIELD', { params: { field: 'id' } });
    }

    const job = await getJob(id, req.userId!);

    if (!job) {
      throw new AppError('JOB_NOT_FOUND');
    }

    res.status(200).json({
      success: true,
      job: {
        id: job.id,
        url: job.url,
        status: job.status,
        error: job.error,
        recipe: job.recipe,
        progress: job.progress,
        parentJobId: job.parentJobId,
        prompt: job.prompt,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt,
      },
    });
  } catch (error: any) {
    if (!(error instanceof AppError)) console.error('Error fetching job details:', error);
    sendAppError(res, error);
  }
});

/**
 * Per-job cook history for the recipe detail view (chip + timeline).
 * GET /api/jobs/:id/cook-history
 */
apiRouter.get('/jobs/:id/cook-history', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    if (!id) {
      throw new AppError('MISSING_FIELD', { params: { field: 'id' } });
    }

    const job = await getJob(id, req.userId!);
    if (!job) {
      throw new AppError('JOB_NOT_FOUND');
    }

    const history = await getCookHistoryForJob(req.userId!, id);
    res.status(200).json({ success: true, ...history });
  } catch (error: any) {
    if (!(error instanceof AppError)) console.error('Error fetching cook history:', error);
    sendAppError(res, error);
  }
});



/**
 * Endpoint to retrieve all recipe extraction jobs.
 * GET /api/jobs
 */
apiRouter.get('/jobs', async (req: Request, res: Response): Promise<void> => {
  try {
    // Prevent browser caching of dynamic job list
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');

    const jobs = await getAllJobs(req.userId!);
    res.status(200).json({
      success: true,
      jobs,
    });
  } catch (error: any) {
    if (!(error instanceof AppError)) console.error('Error fetching recipe history:', error);
    sendAppError(res, error);
  }
});

/**
 * Endpoint to delete a specific recipe extraction job.
 * DELETE /api/jobs/:id
 */
apiRouter.delete('/jobs/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const deleted = await deleteJob(id, req.userId!);
    if (deleted) {
      // transient frames are no longer uploaded
    }
    if (!deleted) {
      throw new AppError('JOB_NOT_FOUND');
    }
    res.status(200).json({
      success: true,
      message: 'Job deleted successfully.',
    });
  } catch (error: any) {
    if (!(error instanceof AppError)) console.error('Error deleting job:', error);
    sendAppError(res, error);
  }
});

/**
 * Endpoint to update a specific recipe in an existing job (e.g. adjust base servings and nutrition).
 * PATCH /api/jobs/:id
 * Body: { recipe: Recipe }
 */
apiRouter.patch('/jobs/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { recipe } = req.body;

    if (!id) {
      throw new AppError('MISSING_FIELD', { params: { field: 'id' } });
    }
    if (!recipe || typeof recipe !== 'object') {
      throw new AppError('MISSING_FIELD', { params: { field: 'recipe' } });
    }

    const job = await getJob(id, req.userId!);
    if (!job) {
      throw new AppError('JOB_NOT_FOUND');
    }

    await updateJob(id, { recipe });

    res.status(200).json({
      success: true,
      message: 'Recipe updated successfully.',
      recipe,
    });
  } catch (error: any) {
    if (!(error instanceof AppError)) console.error('Error updating recipe in job:', error);
    sendAppError(res, error);
  }
});

/**
 * Endpoint to retrieve the current user's recipe extraction rate limit status.
 * GET /api/extractions/limit
 */
apiRouter.get('/extractions/limit', async (req: Request, res: Response): Promise<void> => {
  try {
    let limit = await getFreeMaxExtractions();
    let tier: 'free' | 'alpha' | 'premium' = 'free';
    let user: any = null;
    try {
      user = await fetchAndSyncUser(req.userId!);
    } catch (err) {
      console.warn(`Failed to fetch user metadata for rate limit status:`, err);
    }

    if (user) {
      limit = await resolveUserRateLimit(user);
      tier = user.app_metadata?.tier === 'premium'
        ? 'premium'
        : (user.app_metadata?.tier === 'alpha' ? 'alpha' : 'free');
    }

    const windowDays = config.EXTRACTION_LIMIT_WINDOW_DAYS;

    // Cookbook cap status (mirrors the POST /extract-recipe enforcement) so the
    // extract screen can proactively show a "cookbook full" state.
    const premium = isPremiumUser(user);
    const savedRecipes = await countCompletedRecipesForUser(req.userId!);
    const maxSavedRecipes = premium
      ? -1
      : (user?.app_metadata?.tier === 'alpha' ? await getAlphaMaxSavedRecipes() : await getFreeMaxSavedRecipes());
    const cookbookFull = maxSavedRecipes >= 0 && savedRecipes >= maxSavedRecipes;

    // Concurrency budget: how many extractions may run in parallel and how many
    // are currently in flight. Powers the extract screen's "X/Y running" counter
    // and the submit-disable when the parallel limit is reached.
    const maxConcurrent = await resolveConcurrencyLimit(user);
    const activeCount = await countActiveJobsForUser(req.userId!);

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
        activeCount
      });
      return;
    }

    const extractions = await getExtractionsForUserInTimeframe(req.userId!, windowDays);
    const used = extractions.length;
    const bonusCredits = typeof user?.app_metadata?.bonus_credits === 'number' ? user.app_metadata.bonus_credits : 0;
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
      activeCount
    });
  } catch (error) {
    if (!(error instanceof AppError)) console.error('Error fetching rate limit status:', error);
    sendAppError(res, error);
  }
});

/**
 * Endpoint triggered after a user completes watching a Rewarded Video Ad.
 * Increments `app_metadata.bonus_credits` by +1 in Supabase Auth.
 * POST /api/me/rewarded-ad-claimed
 */
apiRouter.post('/me/rewarded-ad-claimed', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const user = await fetchAndSyncUser(userId);
    const currentMeta = user?.app_metadata || {};

    const currentCredits = typeof currentMeta.bonus_credits === 'number' ? currentMeta.bonus_credits : 0;
    const newCredits = currentCredits + 1;

    const { error } = await getClient().auth.admin.updateUserById(userId, {
      app_metadata: {
        ...currentMeta,
        bonus_credits: newCredits,
      },
    });

    if (error) {
      console.error(`Failed to grant bonus credit for user ${userId}:`, error.message);
      throw new AppError('INTERNAL_ERROR', { message: 'Failed to update bonus credits' });
    }

    const limit = await resolveUserRateLimit(user);
    const windowDays = config.EXTRACTION_LIMIT_WINDOW_DAYS;
    const extractions = await getExtractionsForUserInTimeframe(userId, windowDays);
    const used = extractions.length;
    const baseRemaining = Math.max(0, limit - used);
    const remaining = limit < 0 ? -1 : baseRemaining + newCredits;

    console.log(`[RewardedAd] Granted +1 extraction credit to user ${userId}. Total bonus_credits=${newCredits}, remaining=${remaining}`);

    res.status(200).json({
      success: true,
      bonusCredits: newCredits,
      limit,
      used,
      remaining,
    });
  } catch (error) {
    if (!(error instanceof AppError)) console.error('Error handling rewarded ad claim:', error);
    sendAppError(res, error);
  }
});

/**
 * Endpoint to sync a user's subscription status from RevenueCat.
 * POST /api/billing/sync
 */
apiRouter.post('/billing/sync', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    if (!userId) {
      throw new AppError('UNAUTHORIZED');
    }

    const secretKey = config.REVENUECAT_SECRET_KEY;
    if (!secretKey) {
      console.warn('REVENUECAT_SECRET_KEY is not configured in backend. Trusting client tier update (fallback mode).');
      // For local testing without a secret API key, we let the client tell us their status.
      // This preserves our local fallback but makes it highly secure in production.
      const clientTier = req.body.tier;
      if (clientTier === 'premium' || clientTier === 'free') {
        const alphaActive = await isAlphaActive();
        const finalTier = clientTier === 'free' && alphaActive ? 'alpha' : clientTier;
        const { error } = await getClient().auth.admin.updateUserById(userId, {
          app_metadata: { tier: finalTier },
        });
        if (error) throw error;
        res.status(200).json({ success: true, tier: finalTier, fallback: true });
        return;
      }
      const alphaActive = await isAlphaActive();
      res.status(200).json({ success: true, tier: alphaActive ? 'alpha' : 'free', fallback: true });
      return;
    }

    // Call RevenueCat API to securely fetch subscriber entitlements
    const response = await fetch(`https://api.revenuecat.com/v1/subscribers/${userId}`, {
      headers: {
        'Authorization': `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('RevenueCat API error:', errorText);
      throw new AppError('REVENUECAT_FAILED', { message: 'Failed to fetch status from RevenueCat.' });
    }

    const rcData = (await response.json()) as any;
    const entitlements = rcData.subscriber?.entitlements || {};
    const premiumEntitlement = entitlements.premium;

    let isPremium = false;
    if (premiumEntitlement) {
      const expiresDate = premiumEntitlement.expires_date;
      if (!expiresDate) {
        // Lifetime subscription
        isPremium = true;
      } else {
        // Subscription check
        isPremium = new Date(expiresDate).getTime() > Date.now();
      }
    }

    const alphaActive = await isAlphaActive();
    const newTier = isPremium ? 'premium' : (alphaActive ? 'alpha' : 'free');

    // Update Supabase app_metadata
    const { error } = await getClient().auth.admin.updateUserById(userId, {
      app_metadata: { tier: newTier },
    });

    if (error) {
      console.error('Failed to update Supabase user tier:', error.message);
      throw new AppError('PROFILE_UPDATE_FAILED', { message: 'Failed to update user profile.' });
    }

    res.status(200).json({ success: true, tier: newTier });
  } catch (error: any) {
    if (!(error instanceof AppError)) console.error('Error syncing billing status:', error);
    sendAppError(res, error);
  }
});

/**
 * Endpoint to delete the current user's account.
 * DELETE /api/users/me
 */
apiRouter.delete('/users/me', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    if (!userId) {
      throw new AppError('UNAUTHORIZED', { message: 'Unauthorized. Missing user ID.' });
    }

    // Drop any registered push tokens first (no FK cascade on that table).
    await deletePushTokensForUser(userId).catch((err) =>
      console.warn('Failed to delete push tokens on account deletion:', err?.message ?? err),
    );

    // Call Supabase Admin API to delete the user
    const { error } = await getClient().auth.admin.deleteUser(userId);
    if (error) {
      console.error('Supabase admin deleteUser error:', error);
      throw new AppError('ACCOUNT_DELETE_FAILED', { message: `Failed to delete user account: ${error.message}` });
    }

    res.status(200).json({
      success: true,
      message: 'Account deleted successfully.',
    });
  } catch (error: any) {
    if (!(error instanceof AppError)) console.error('Error deleting user account:', error);
    sendAppError(res, error);
  }
});

/**
 * Endpoint to get LLM-generated quick-action chips for the chat.
 * GET /api/jobs/:id/chat/chips?lang=de|en
 */
apiRouter.get('/jobs/:id/chat/chips', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const lang = (req.query.lang as string) || 'de';

    const job = await getJob(id, req.userId!);
    if (!job || !job.recipe) {
      throw new AppError('RECIPE_NOT_FOUND');
    }

    const chips = await generateChatChips(job.recipe, lang);

    res.status(200).json({ success: true, chips });
  } catch (error: any) {
    if (!(error instanceof AppError)) console.error('Error generating chat chips:', error);
    sendAppError(res, error);
  }
});

/**
 * Endpoint to confirm a pending remix and execute it.
 * POST /api/jobs/:id/chat/confirm
 * Body: { modificationRequest: string }
 */
apiRouter.post('/jobs/:id/chat/confirm', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { modificationRequest, replaceCurrent } = req.body;

    if (!modificationRequest || typeof modificationRequest !== 'string') {
      throw new AppError('MISSING_FIELD', { params: { field: 'modificationRequest' } });
    }

    const job = await getJob(id, req.userId!);
    if (!job || !job.recipe) {
      throw new AppError('RECIPE_NOT_FOUND');
    }

    // Resolve user preferences
    let userPrefs: any;
    try {
      const { data, error: authError } = await getClient().auth.admin.getUserById(req.userId!);
      if (!authError && data?.user?.user_metadata) {
        const meta = data.user.user_metadata;
        const languageMap: Record<string, string> = {
          'de': 'German', 'en': 'English', 'german': 'German', 'english': 'English'
        };
        userPrefs = {
          recipeLanguage: meta.language ? languageMap[meta.language.toLowerCase()] : undefined,
          preferredTemperatureUnit: meta.preferred_temperature_unit,
          preferredUnitSystem: meta.preferred_unit_system,
        };
      }
    } catch { }

    const remixedRecipe = await remixRecipe(job.recipe, modificationRequest, undefined, userPrefs);

    // The remix prompt hands Gemini the parent recipe JSON, so it echoes back the
    // parent's canonicalId/matchedName/isVerified while re-estimating the macros
    // itself. Re-run the canonical matcher so persisted macros come from BLS and
    // not from the model's guess.
    await enrichRecipeWithCanonicalIngredients(remixedRecipe);

    if (replaceCurrent) {
      // Preserve images from the original recipe (Gemini doesn't know about them)
      const mergedRecipe = {
        ...remixedRecipe,
        imageUrl: job.recipe?.imageUrl ?? null,
        imageUrls: job.recipe?.imageUrls ?? (job.recipe?.imageUrl ? [job.recipe.imageUrl] : []),
        id,
        parentJobId: job.parentJobId,
        remixPrompt: modificationRequest,
      };

      await updateJob(id, {
        recipe: mergedRecipe as any,
        status: 'completed',
      });

      const updatedJob = await getJob(id, req.userId!);
      res.status(200).json({
        success: true,
        replaced: true,
        updatedRecipeJson: updatedJob?.recipe,
      });
    } else {
      // Save as a new remix job
      const savedJob = await saveCompletedRemix(id, job.url, remixedRecipe, modificationRequest, req.userId!);
      res.status(200).json({
        success: true,
        newJobId: savedJob.id,
        updatedRecipeJson: savedJob.recipe,
      });
    }
  } catch (error: any) {
    if (!(error instanceof AppError)) console.error('Error confirming remix:', error);
    sendAppError(res, error);
  }
});

/**
 * Endpoint to chat about a recipe.
 * POST /api/jobs/:id/chat
 * Body: { message: string, history: Array<{role: 'user'|'model', text: string}> }
 */
apiRouter.post('/jobs/:id/chat', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { message, history, stagedChanges } = req.body;

    // Optional: modifications the user has already collected in the chat "transaction"
    // (not yet applied). Passed to the model so it can build on them consistently.
    const normalizedStagedChanges: string[] | undefined = Array.isArray(stagedChanges)
      ? stagedChanges.filter((c: unknown): c is string => typeof c === 'string' && c.trim().length > 0)
      : undefined;

    if (!message || typeof message !== 'string') {
      throw new AppError('MISSING_FIELD', { params: { field: 'message' } });
    }

    if (!Array.isArray(history)) {
      throw new AppError('INVALID_FIELD', { params: { field: 'history' } });
    }

    // Get the recipe job
    const job = await getJob(id, req.userId!);
    if (!job || !job.recipe) {
      throw new AppError('RECIPE_NOT_FOUND');
    }

    // Enforce premium access for chat
    let isPremium = false;
    let user: any = null;
    try {
      user = await fetchAndSyncUser(req.userId!);

      if (user) {
        const meta = user.app_metadata || {};
        isPremium = meta.tier === 'premium' ||
          meta.tier === 'alpha' ||
          meta.custom_extraction_limit === -1 ||
          meta.max_extractions_per_window === -1;
      }
    } catch (err) {
      console.warn(`Failed to fetch user metadata for chat premium check:`, err);
    }

    if (!isPremium) {
      throw new AppError('PREMIUM_REQUIRED', { params: { feature: 'chat' } });
    }

    // Resolve user preferences for recipe language and unit system formatting
    let userPrefs: {
      recipeLanguage?: string;
      preferredTemperatureUnit?: string;
      preferredUnitSystem?: string;
    } | undefined;

    if (user?.user_metadata) {
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
    }

    // Process chat request with Gemini
    const result = await chatAboutRecipe(
      job.recipe,
      message,
      history,
      req.userId!,
      userPrefs,
      normalizedStagedChanges
    );

    let responsePayload: any = {
      success: true,
      chatMessage: result.chatMessage,
      toolCalled: result.toolCalled,
      toolArgs: result.toolArgs,
      recipeWasModified: result.recipeWasModified,
      pendingRemix: result.pendingRemix,
      modificationRequest: result.modificationRequest,
    };

    // If recipe was modified AND not pending confirmation, save immediately
    // (pending remixes are saved later via /confirm endpoint)
    if (result.recipeWasModified && result.newRecipe) {
      const remixPrompt = result.toolArgs?.modification_request || 'AI Copilot modification';
      console.log(`[chat route] Saving completed recipe remix for parent job ${id}`);
      const savedJob = await saveCompletedRemix(
        id,
        job.url,
        result.newRecipe,
        remixPrompt,
        req.userId!
      );
      responsePayload.newJobId = savedJob.id;
      responsePayload.updatedRecipeJson = savedJob.recipe;
    }

    res.status(200).json(responsePayload);
  } catch (error: any) {
    if (!(error instanceof AppError)) console.error('Error in recipe chat handler:', error);
    sendAppError(res, error);
  }
});

// Helper to check user premium status
async function checkPremium(req: Request): Promise<boolean> {
  let isPremium = false;
  try {
    let user = await fetchAndSyncUser(req.userId!);

    if (user) {
      const meta = user.app_metadata || {};
      isPremium = meta.tier === 'premium' ||
        meta.tier === 'alpha' ||
        meta.custom_extraction_limit === -1 ||
        meta.max_extractions_per_window === -1;
    }
  } catch (err) {
    console.warn(`Failed to fetch user metadata for premium check:`, err);
  }
  return isPremium;
}

/**
 * Endpoint to update a recipe's favorite status.
 * PATCH /api/jobs/:id/favorite
 */
apiRouter.patch('/jobs/:id/favorite', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { isFavorite } = req.body;

    if (typeof isFavorite !== 'boolean') {
      throw new AppError('INVALID_FIELD', { params: { field: 'isFavorite' } });
    }

    const job = await getJob(id, req.userId!);
    if (!job) {
      throw new AppError('JOB_NOT_FOUND');
    }

    await setFavorite(id, req.userId!, isFavorite);
    res.status(200).json({ success: true, message: 'Favorite status updated.' });
  } catch (error: any) {
    if (!(error instanceof AppError)) console.error('Error updating favorite status:', error);
    sendAppError(res, error);
  }
});

/**
 * Records that the user cooked a recipe (gamification). Available to ALL users —
 * the "I cooked this" action is deliberately NOT premium-gated (unlike the
 * cooking mode). A finished-dish photo is optional; when present it awards a
 * bonus and makes the cook leaderboard-eligible.
 * POST /api/jobs/:id/cooked
 */
apiRouter.post('/jobs/:id/cooked', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { photoBase64, viaCookingMode, timerElapsed } = req.body ?? {};

    if (!photoBase64 || typeof photoBase64 !== 'string' || photoBase64.trim().length === 0) {
      throw new AppError('PHOTO_REQUIRED');
    }
    if (photoBase64.length > MAX_PHOTOS_TOTAL_CHARS) {
      throw new AppError('PHOTOS_TOO_LARGE');
    }

    // Ownership + existence check, scoped to the user.
    const job = await getJob(id, req.userId!);
    if (!job || !job.recipe) {
      throw new AppError('JOB_NOT_FOUND');
    }

    // Verify photo with Gemini Vision before accepting the cook.
    const verification = await verifyCookedDishPhoto(job.recipe, photoBase64);
    if (!verification.isMatchingDish) {
      throw new AppError('PHOTO_NOT_MATCHING', {
        params: { reason: verification.reasoning },
      });
    }

    // Upload verified finished-dish photo to storage.
    let photoPath: string | null = null;
    try {
      photoPath = await uploadCookPhoto(req.userId!, randomUUID(), photoBase64);
    } catch (err: any) {
      console.error('Cook photo upload failed:', err?.message || err);
      throw new AppError('PHOTO_UPLOAD_FAILED');
    }

    const result = await recordCook(req.userId!, id, {
      hasPhoto: true,
      photoPath,
      viaCookingMode: !!viaCookingMode,
      timerElapsed: !!timerElapsed,
    });

    res.status(200).json({ success: true, ...result });
  } catch (error: any) {
    if (!(error instanceof AppError)) console.error('Error recording cook:', error);
    sendAppError(res, error);
  }
});

/**
 * Returns the authenticated user's gamification state for the progress tab:
 * aggregate stats, earned badges, and the level thresholds the XP bar needs.
 * GET /api/me/gamification
 */
apiRouter.get('/me/gamification', async (req: Request, res: Response): Promise<void> => {
  try {
    const [stats, badges, gamConfig, recentPhotos, distinctRecipes] = await Promise.all([
      getUserStats(req.userId!),
      getUserBadgesDetailed(req.userId!),
      getGamificationConfig(),
      getRecentCookPhotos(req.userId!),
      getDistinctCookedRecipeCount(req.userId!),
    ]);
    res.status(200).json({
      success: true,
      stats: {
        ...stats,
        distinctRecipes,
      },
      badges,
      levelThresholds: gamConfig.levelThresholds,
      recentPhotos,
    });
  } catch (error: any) {
    if (!(error instanceof AppError)) console.error('Error fetching gamification state:', error);
    sendAppError(res, error);
  }
});

// ── Social: profiles & friends ───────────────────────────────────────────────

const MAX_DISPLAY_NAME_LEN = 40;

/** Build the profile seed (display name + avatar) from a Supabase auth user. */
function profileSeedFromUser(user: any): { displayName: string | null; avatarUrl: string | null } {
  const meta = user?.user_metadata ?? {};
  const displayName = meta.full_name || meta.name || null;
  const avatarUrl = meta.avatar_url || meta.picture || null;
  return { displayName: displayName ?? null, avatarUrl };
}

/** Ensure the authenticated user has a profile row, seeding it from auth metadata. */
async function ensureMyProfile(userId: string) {
  let seed: { displayName: string | null; avatarUrl: string | null } = { displayName: null, avatarUrl: null };
  try {
    const { data } = await getClient().auth.admin.getUserById(userId);
    if (data?.user) seed = profileSeedFromUser(data.user);
  } catch {
    // Fall back to empty seed if admin lookup fails (ensureProfile uses Chef #CODE).
  }
  return ensureProfile(userId, seed);
}

/**
 * Returns the authenticated user's social profile, creating it on first access.
 * GET /api/me/profile
 */
apiRouter.get('/me/profile', async (req: Request, res: Response): Promise<void> => {
  try {
    const profile = await ensureMyProfile(req.userId!);
    res.status(200).json({ success: true, profile });
  } catch (error: any) {
    if (!(error instanceof AppError)) console.error('Error fetching profile:', error);
    sendAppError(res, error);
  }
});

/**
 * Updates the authenticated user's display name. PATCH /api/me/profile
 */
apiRouter.patch('/me/profile', async (req: Request, res: Response): Promise<void> => {
  try {
    const raw = typeof req.body?.displayName === 'string' ? req.body.displayName.trim() : '';
    if (raw.length < 1 || raw.length > MAX_DISPLAY_NAME_LEN) {
      throw new AppError('PROFILE_NAME_INVALID', { params: { max: MAX_DISPLAY_NAME_LEN } });
    }
    await ensureMyProfile(req.userId!);
    const profile = await updateDisplayName(req.userId!, raw);
    res.status(200).json({ success: true, profile });
  } catch (error: any) {
    if (!(error instanceof AppError)) console.error('Error updating profile:', error);
    sendAppError(res, error);
  }
});

/**
 * Accepted friends with light stats for display. GET /api/friends
 */
apiRouter.get('/friends', async (req: Request, res: Response): Promise<void> => {
  try {
    const friends = await getAcceptedFriends(req.userId!);
    const ids = friends.map((f) => f.friendId);
    const [profiles, stats] = await Promise.all([getProfilesByIds(ids), getUserStatsForIds(ids)]);

    const list: FriendSummary[] = friends
      .map((f): FriendSummary | null => {
        const profile = profiles.get(f.friendId);
        if (!profile) return null;
        const s = stats.get(f.friendId);
        return {
          friendshipId: f.friendshipId,
          userId: f.friendId,
          displayName: profile.displayName,
          avatarUrl: profile.avatarUrl,
          level: s?.level ?? 1,
          xp: s?.xp ?? 0,
          currentStreak: s?.currentStreak ?? 0,
          totalCooks: s?.totalCooks ?? 0,
        };
      })
      .filter((x): x is FriendSummary => x !== null)
      .sort((a, b) => a.displayName.localeCompare(b.displayName));

    res.status(200).json({ success: true, friends: list });
  } catch (error: any) {
    if (!(error instanceof AppError)) console.error('Error fetching friends:', error);
    sendAppError(res, error);
  }
});

/**
 * Incoming pending friend requests. GET /api/friends/requests
 */
apiRouter.get('/friends/requests', async (req: Request, res: Response): Promise<void> => {
  try {
    const incoming = await getIncomingRequests(req.userId!);
    const ids = incoming.map((r) => r.requesterId);
    const profiles = await getProfilesByIds(ids);

    const list: FriendRequest[] = incoming
      .map((r) => {
        const profile = profiles.get(r.requesterId);
        if (!profile) return null;
        return {
          friendshipId: r.friendshipId,
          userId: r.requesterId,
          displayName: profile.displayName,
          avatarUrl: profile.avatarUrl,
        } satisfies FriendRequest;
      })
      .filter((x): x is FriendRequest => x !== null);

    res.status(200).json({ success: true, requests: list });
  } catch (error: any) {
    if (!(error instanceof AppError)) console.error('Error fetching friend requests:', error);
    sendAppError(res, error);
  }
});

/**
 * Send a friend request by friend code or directly by target user id.
 * Auto-accepts if the other user already requested us.
 * POST /api/friends/request  { code?: string, targetUserId?: string }
 */
apiRouter.post('/friends/request', async (req: Request, res: Response): Promise<void> => {
  try {
    const code = typeof req.body?.code === 'string' ? req.body.code.trim().toUpperCase() : '';
    const targetUserId = typeof req.body?.targetUserId === 'string' ? req.body.targetUserId.trim() : '';
    if (!code && !targetUserId) throw new AppError('FRIEND_CODE_INVALID');

    // Make sure I have a profile (and thus a code) before befriending anyone.
    await ensureMyProfile(req.userId!);

    let target: Profile | null = null;
    if (targetUserId) {
      const profiles = await getProfilesByIds([targetUserId]);
      target = profiles.get(targetUserId) ?? null;
    } else {
      target = await findProfileByFriendCode(code);
    }

    if (!target) throw new AppError('FRIEND_CODE_INVALID');
    if (target.userId === req.userId!) throw new AppError('FRIEND_SELF');

    const existing = await findFriendshipBetween(req.userId!, target.userId);
    if (existing?.status === 'accepted') throw new AppError('ALREADY_FRIENDS');
    if (existing?.status === 'pending') {
      if (existing.addressee_id === req.userId!) {
        // They already requested me → accept it.
        await acceptFriendship(existing.id);
        res.status(200).json({ success: true, status: 'accepted' });
        return;
      }
      throw new AppError('REQUEST_EXISTS');
    }

    await createFriendship(req.userId!, target.userId, 'pending');
    res.status(200).json({ success: true, status: 'pending' });
  } catch (error: any) {
    if (!(error instanceof AppError)) console.error('Error sending friend request:', error);
    sendAppError(res, error);
  }
});

/**
 * Accept or decline an incoming friend request. POST /api/friends/:id/respond
 * { accept: boolean }
 */
apiRouter.post('/friends/:id/respond', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const accept = req.body?.accept === true;

    const friendship = await getFriendshipById(id);
    // Only the addressee of a still-pending request may respond.
    if (!friendship || friendship.addressee_id !== req.userId! || friendship.status !== 'pending') {
      throw new AppError('FRIENDSHIP_NOT_FOUND');
    }

    if (accept) await acceptFriendship(id);
    else await deleteFriendship(id);

    res.status(200).json({ success: true, status: accept ? 'accepted' : 'declined' });
  } catch (error: any) {
    if (!(error instanceof AppError)) console.error('Error responding to friend request:', error);
    sendAppError(res, error);
  }
});

/**
 * Remove a friend (or cancel an outgoing request). DELETE /api/friends/:id
 */
apiRouter.delete('/friends/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const friendship = await getFriendshipById(id);
    if (!friendship || (friendship.requester_id !== req.userId! && friendship.addressee_id !== req.userId!)) {
      throw new AppError('FRIENDSHIP_NOT_FOUND');
    }
    await deleteFriendship(id);
    res.status(200).json({ success: true });
  } catch (error: any) {
    if (!(error instanceof AppError)) console.error('Error removing friend:', error);
    sendAppError(res, error);
  }
});

/**
 * Friends or Global leaderboard. GET /api/leaderboard?window=monthly|all&scope=friends|global
 * `value` is monthly XP (from point_ledger) or all-time XP (from user_stats).
 */
apiRouter.get('/leaderboard', async (req: Request, res: Response): Promise<void> => {
  try {
    const window = req.query.window === 'all' ? 'all' : 'monthly';
    const scope = req.query.scope === 'global' ? 'global' : 'friends';
    await ensureMyProfile(req.userId!);

    // Fetch friendships for current user to decorate each row with friendship status
    const allFriendships = await getAllFriendshipsForUser(req.userId!);
    const friendshipByPartnerId = new Map<string, { status: 'pending' | 'accepted'; id: string; isSender: boolean }>();
    for (const f of allFriendships) {
      const isSender = f.requester_id === req.userId!;
      const partnerId = isSender ? f.addressee_id : f.requester_id;
      friendshipByPartnerId.set(partnerId, { status: f.status, id: f.id, isSender });
    }

    const getFriendshipStatus = (uid: string): { status: 'none' | 'pending_sent' | 'pending_received' | 'friends' | 'self'; id?: string } => {
      if (uid === req.userId!) return { status: 'self' };
      const rel = friendshipByPartnerId.get(uid);
      if (!rel) return { status: 'none' };
      if (rel.status === 'accepted') return { status: 'friends', id: rel.id };
      return { status: rel.isSender ? 'pending_sent' : 'pending_received', id: rel.id };
    };

    let rawEntries: { userId: string; value: number; level?: number }[] = [];

    if (scope === 'global') {
      if (window === 'monthly') {
        const topMonthly = await getGlobalWeeklyXp(monthStartUtc(new Date()), 50);
        const uids = topMonthly.map((x) => x.userId);
        const [stats] = await Promise.all([
          getUserStatsForIds(uids),
        ]);
        rawEntries = topMonthly.map((item) => ({
          userId: item.userId,
          value: item.xp,
          level: stats.get(item.userId)?.level ?? 1,
        }));
      } else {
        const topAllTime = await getGlobalAllTimeStats(50);
        rawEntries = topAllTime.map((s) => ({
          userId: s.userId,
          value: s.xp,
          level: s.level,
        }));
      }
    } else {
      // Friends scope
      const friends = await getAcceptedFriends(req.userId!);
      const ids = [req.userId!, ...friends.map((f) => f.friendId)];

      const [stats, monthly] = await Promise.all([
        getUserStatsForIds(ids),
        window === 'monthly' ? getWeeklyXp(ids, monthStartUtc(new Date())) : Promise.resolve(null),
      ]);

      rawEntries = ids.map((uid) => ({
        userId: uid,
        value: window === 'monthly' ? (monthly?.get(uid) ?? 0) : (stats.get(uid)?.xp ?? 0),
        level: stats.get(uid)?.level ?? 1,
      }));
    }

    // Ensure profiles are fetched for all entry IDs
    const allEntryIds = rawEntries.map((e) => e.userId);
    const profilesMap = await getProfilesByIds(allEntryIds);

    const entries: LeaderboardEntry[] = rawEntries
      .map((r): LeaderboardEntry | null => {
        const profile = profilesMap.get(r.userId);
        if (!profile) return null;
        const rel = getFriendshipStatus(r.userId);
        return {
          rank: 0,
          userId: r.userId,
          displayName: profile.displayName,
          avatarUrl: profile.avatarUrl,
          level: r.level ?? 1,
          value: r.value,
          isMe: r.userId === req.userId!,
          friendshipStatus: rel.status,
          friendshipId: rel.id,
        };
      })
      .filter((x): x is LeaderboardEntry => x !== null)
      .sort((a, b) => b.value - a.value || a.displayName.localeCompare(b.displayName));

    entries.forEach((e, i) => { e.rank = i + 1; });

    res.status(200).json({ success: true, window, scope, entries });
  } catch (error: any) {
    if (!(error instanceof AppError)) console.error('Error building leaderboard:', error);
    sendAppError(res, error);
  }
});

/**
 * Endpoint to update custom tags/flags.
 * PATCH /api/jobs/:id/flags
 */
apiRouter.patch('/jobs/:id/flags', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { flags } = req.body;

    if (!Array.isArray(flags)) {
      throw new AppError('INVALID_FIELD', { params: { field: 'flags' } });
    }

    const isPremium = await checkPremium(req);
    if (!isPremium) {
      throw new AppError('PREMIUM_REQUIRED', { params: { feature: 'tags' } });
    }

    const job = await getJob(id, req.userId!);
    if (!job) {
      throw new AppError('JOB_NOT_FOUND');
    }

    await setFlags(id, req.userId!, flags);
    res.status(200).json({ success: true, message: 'Custom flags updated.' });
  } catch (error: any) {
    if (!(error instanceof AppError)) console.error('Error updating custom flags:', error);
    sendAppError(res, error);
  }
});

/**
 * Register (or refresh) an FCM device token for smart push notifications.
 * POST /api/push/tokens  Body: { token: string, platform?: 'android' }
 */
apiRouter.post('/push/tokens', async (req: Request, res: Response): Promise<void> => {
  try {
    const { token, platform } = req.body;
    if (typeof token !== 'string' || token.trim().length < 10) {
      throw new AppError('INVALID_FIELD', { params: { field: 'token' } });
    }
    const plat = typeof platform === 'string' && platform ? platform : 'android';
    await upsertPushToken(req.userId!, token.trim(), plat);
    res.status(200).json({ success: true, message: 'Push token registered.' });
  } catch (error: any) {
    if (!(error instanceof AppError)) console.error('Error registering push token:', error);
    sendAppError(res, error);
  }
});

/**
 * Unregister an FCM device token (opt-out / logout on that device).
 * DELETE /api/push/tokens  Body: { token: string }
 */
apiRouter.delete('/push/tokens', async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.body;
    if (typeof token !== 'string' || !token.trim()) {
      throw new AppError('INVALID_FIELD', { params: { field: 'token' } });
    }
    await deletePushToken(req.userId!, token.trim());
    res.status(200).json({ success: true, message: 'Push token removed.' });
  } catch (error: any) {
    if (!(error instanceof AppError)) console.error('Error removing push token:', error);
    sendAppError(res, error);
  }
});

/**
 * Endpoint to retrieve all collections.
 * GET /api/collections
 */
apiRouter.get('/collections', async (req: Request, res: Response): Promise<void> => {
  try {
    const collections = await listCollections(req.userId!);
    res.status(200).json({ success: true, collections });
  } catch (error: any) {
    if (!(error instanceof AppError)) console.error('Error listing collections:', error);
    sendAppError(res, error);
  }
});

/**
 * Endpoint to create a new collection.
 * POST /api/collections
 */
apiRouter.post('/collections', async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, emoji, position } = req.body;

    if (!name || typeof name !== 'string') {
      throw new AppError('INVALID_FIELD', { params: { field: 'name' } });
    }

    const isPremium = await checkPremium(req);
    if (!isPremium) {
      throw new AppError('PREMIUM_REQUIRED', { params: { feature: 'collections' } });
    }

    const collection = await createCollection(req.userId!, { name, emoji, position });
    res.status(201).json({ success: true, collection });
  } catch (error: any) {
    if (!(error instanceof AppError)) console.error('Error creating collection:', error);
    sendAppError(res, error);
  }
});

/**
 * Endpoint to submit an in-app bug report / feedback.
 * POST /api/feedback
 * Available to all authenticated users. Optional screenshot (compressed
 * client-side) and diagnostic context are stored alongside the message.
 */
apiRouter.post('/feedback', async (req: Request, res: Response): Promise<void> => {
  try {
    const { message, type, context, screenshots } = req.body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      throw new AppError('MISSING_FIELD', { params: { field: 'message' } });
    }
    if (message.length > 4000) {
      throw new AppError('MESSAGE_TOO_LONG', { params: { max: 4000 } });
    }

    const feedbackType: 'bug' | 'idea' = type === 'idea' ? 'idea' : 'bug';

    if (context !== undefined && (typeof context !== 'object' || context === null)) {
      throw new AppError('INVALID_FIELD', { params: { field: 'context' } });
    }

    let screenshotsBase64: string[] | undefined;
    if (screenshots !== undefined) {
      if (!Array.isArray(screenshots) || !screenshots.every((s) => typeof s === 'string')) {
        throw new AppError('INVALID_FIELD', { params: { field: 'screenshots' } });
      }
      if (screenshots.length > 6) {
        throw new AppError('TOO_MANY_SCREENSHOTS', { params: { max: 6 } });
      }
      // Keep the whole payload under the global 1mb JSON body cap (base64 inflates ~33%).
      const totalLength = screenshots.reduce((sum: number, s: string) => sum + s.length, 0);
      if (totalLength > 1_500_000) {
        throw new AppError('SCREENSHOTS_TOO_LARGE');
      }
      screenshotsBase64 = screenshots.length > 0 ? screenshots : undefined;
    }

    const { id } = await createFeedback(req.userId!, {
      type: feedbackType,
      message: message.trim(),
      context,
      screenshotsBase64,
    });

    res.status(201).json({ success: true, id });
  } catch (error: any) {
    if (!(error instanceof AppError)) console.error('Error creating feedback:', error);
    sendAppError(res, error);
  }
});

/**
 * Endpoint to update a collection.
 * PATCH /api/collections/:id
 */
apiRouter.patch('/collections/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, emoji, position } = req.body;

    const isPremium = await checkPremium(req);
    if (!isPremium) {
      throw new AppError('PREMIUM_REQUIRED', { params: { feature: 'collections' } });
    }

    const collection = await updateCollection(id, req.userId!, { name, emoji, position });
    res.status(200).json({ success: true, collection });
  } catch (error: any) {
    if (!(error instanceof AppError)) console.error('Error updating collection:', error);
    sendAppError(res, error);
  }
});

/**
 * Endpoint to delete a collection.
 * DELETE /api/collections/:id
 */
apiRouter.delete('/collections/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const isPremium = await checkPremium(req);
    if (!isPremium) {
      throw new AppError('PREMIUM_REQUIRED', { params: { feature: 'collections' } });
    }

    const deleted = await deleteCollection(id, req.userId!);
    if (!deleted) {
      throw new AppError('COLLECTION_NOT_FOUND');
    }

    res.status(200).json({ success: true, message: 'Collection deleted.' });
  } catch (error: any) {
    if (!(error instanceof AppError)) console.error('Error deleting collection:', error);
    sendAppError(res, error);
  }
});

/**
 * Endpoint to associate a job/recipe with collections.
 * PATCH /api/jobs/:id/collections
 */
apiRouter.patch('/jobs/:id/collections', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { collectionIds } = req.body;

    if (!Array.isArray(collectionIds)) {
      throw new AppError('INVALID_FIELD', { params: { field: 'collectionIds' } });
    }

    const isPremium = await checkPremium(req);
    if (!isPremium) {
      throw new AppError('PREMIUM_REQUIRED', { params: { feature: 'collections' } });
    }

    const job = await getJob(id, req.userId!);
    if (!job) {
      throw new AppError('JOB_NOT_FOUND');
    }

    await setRecipeCollections(id, req.userId!, collectionIds);
    res.status(200).json({ success: true, message: 'Recipe collections updated.' });
  } catch (error: any) {
    if (!(error instanceof AppError)) console.error('Error updating recipe collections:', error);
    sendAppError(res, error);
  }
});

/**
 * Check if the user is an admin.
 * GET /api/admin/check
 * Available to all authenticated users.
 */
apiRouter.get('/admin/check', (req: Request, res: Response): void => {
  const email = req.userEmail;
  if (!email) {
    res.json({ success: true, isAdmin: false });
    return;
  }
  const adminEmails = config.ADMIN_EMAILS.split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean);
  const isAdmin = adminEmails.includes(email.toLowerCase());
  res.json({ success: true, isAdmin });
});

/**
 * Manually trigger the push notification worker tick for testing.
 * POST /api/admin/notifications/trigger
 * Requires admin privileges.
 */
apiRouter.post('/admin/notifications/trigger', requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const force = req.body?.force !== false;
    const result = await notificationTick({ force });
    res.json({ success: true, message: `Push notification worker tick executed.`, result });
  } catch (error) {
    if (!(error instanceof AppError)) console.error('Error triggering push notifications:', error);
    sendAppError(res, error);
  }
});

/**
 * Fetch all global settings.
 * GET /api/admin/settings
 * Requires admin privileges.
 */
apiRouter.get('/admin/settings', requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const settings = await getAllGlobalSettings();
    res.json({ success: true, settings });
  } catch (error) {
    if (!(error instanceof AppError)) console.error('Error fetching global settings:', error);
    sendAppError(res, error);
  }
});

/**
 * Update global settings.
 * PATCH /api/admin/settings
 * Requires admin privileges.
 */
apiRouter.patch('/admin/settings', requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { settings } = req.body;
    if (!settings || typeof settings !== 'object') {
      throw new AppError('MISSING_FIELD', { params: { field: 'settings' } });
    }

    await updateGlobalSettings(settings);
    res.json({ success: true, message: 'Global settings updated.' });
  } catch (error) {
    if (!(error instanceof AppError)) console.error('Error updating global settings:', error);
    sendAppError(res, error);
  }
});

/**
 * Retrieve all feedback.
 * GET /api/admin/feedback
 * Requires admin privileges.
 */
apiRouter.get('/admin/feedback', requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const feedback = await getAllFeedback();
    res.json({ success: true, feedback });
  } catch (error) {
    if (!(error instanceof AppError)) console.error('Error fetching feedback:', error);
    sendAppError(res, error);
  }
});

/**
 * List all OTA web bundles (optionally filtered by ?channel=production|alpha).
 * GET /api/admin/app-bundles
 * Requires admin privileges.
 */
apiRouter.get('/admin/app-bundles', requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const channel = req.query.channel as string | undefined;
    if (channel !== undefined && channel !== 'production' && channel !== 'alpha') {
      res.status(400).json({ success: false, error: 'Query parameter channel must be "production" or "alpha".' });
      return;
    }

    const bundles = await listAppBundles(channel);
    res.json({ success: true, bundles });
  } catch (error) {
    console.error('Error listing app bundles:', error);
    res.status(500).json({ success: false, error: 'Internal server error.' });
  }
});

/**
 * Activate or deactivate an OTA web bundle. Activating an older bundle is the
 * rollback lever (devices converge on their next check); deactivating all
 * bundles of a channel is the kill switch.
 * PATCH /api/admin/app-bundles/:id
 * Body: { active: true|false }
 * Requires admin privileges.
 */
apiRouter.patch('/admin/app-bundles/:id', requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { active } = req.body;

    if (typeof active !== 'boolean') {
      res.status(400).json({ success: false, error: 'Field active must be a boolean.' });
      return;
    }

    const bundle = await setAppBundleActive(id, active);
    res.json({ success: true, bundle });
  } catch (error: any) {
    if (typeof error?.message === 'string' && error.message.includes('not found')) {
      res.status(404).json({ success: false, error: 'App bundle not found.' });
      return;
    }
    console.error('Error updating app bundle:', error);
    res.status(500).json({ success: false, error: 'Internal server error.' });
  }
});

/**
 * Translate an admin-metrics range key into a query cutoff (`since`) and the
 * daily-chart window size (`windowDays`). `today`/`7d`/`30d` are calendar-day
 * windows anchored to the start of the day; `all` (default) is unbounded.
 */
function resolveMetricsRange(range: string): { since: Date | null; windowDays: number | null } {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  switch (range) {
    case 'today':
      return { since: startOfToday, windowDays: 1 };
    case '3d': {
      const since = new Date(startOfToday);
      since.setDate(since.getDate() - 2);
      return { since, windowDays: 3 };
    }
    case '7d': {
      const since = new Date(startOfToday);
      since.setDate(since.getDate() - 6);
      return { since, windowDays: 7 };
    }
    case '30d': {
      const since = new Date(startOfToday);
      since.setDate(since.getDate() - 29);
      return { since, windowDays: 30 };
    }
    case 'all':
    default:
      return { since: null, windowDays: null };
  }
}

/**
 * Retrieve system metrics and LLM cost analytics.
 * GET /api/admin/metrics
 * Requires admin privileges.
 */
apiRouter.get('/admin/metrics', requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    // Resolve the requested time range into a cutoff timestamp + daily-window
    // size. `all` (or an unknown value) aggregates over all time.
    const range = String(req.query.range ?? 'all');
    const { since, windowDays } = resolveMetricsRange(range);

    // 1. Fetch users from Supabase Auth Admin API. `total` is the all-time
    // user base; `newInRange` counts users who registered within the selected
    // window (equal to `total` for the unbounded "all" range).
    let userCount = 0;
    let newUsers = 0;
    // Map of user_id → email, used to label the per-user extraction breakdown.
    const emailById = new Map<string, string | null>();
    try {
      const { data, error } = await getClient().auth.admin.listUsers({ perPage: 1000 });
      if (!error && data?.users) {
        userCount = data.users.length;
        newUsers = since
          ? data.users.filter((u) => u.created_at && new Date(u.created_at) >= since).length
          : userCount;
        for (const u of data.users) {
          emailById.set(u.id, u.email ?? null);
        }
      }
    } catch (err: any) {
      console.error('Error fetching users from Supabase Admin:', err.message);
    }

    // 2. Fetch db jobs metrics (scoped to the selected range)
    const jobsMetrics = await getJobMetrics(since, windowDays);

    // 2b. Fetch failed jobs details
    const failedJobsRaw = await getFailedJobs(since);
    const failedJobs = failedJobsRaw.map((job) => ({
      ...job,
      email: emailById.get(job.userId) ?? null,
    }));

    // 3. Fetch logs LLM metrics (scoped to the selected range)
    const llmMetrics = await getLlmMetrics(since, windowDays);

    // 4. Count extracted recipes per user (only users with >0 in the range),
    // resolving each user_id to an email for display.
    const perUserRaw = await getExtractionsPerUser(since);
    const extractionsPerUser = perUserRaw.map((entry) => ({
      userId: entry.userId,
      email: emailById.get(entry.userId) ?? null,
      count: entry.count,
    }));

    res.json({
      success: true,
      range,
      users: {
        total: userCount,
        newInRange: newUsers,
      },
      jobs: {
        ...jobsMetrics,
        failedJobs,
      },
      llm: llmMetrics,
      extractionsPerUser,
    });
  } catch (error) {
    if (!(error instanceof AppError)) console.error('Error fetching admin metrics:', error);
    sendAppError(res, error);
  }
});

/**
 * Retrieve a list of registered users.
 * GET /api/admin/users
 * Requires admin privileges.
 */
apiRouter.get('/admin/users', requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { data, error } = await getClient().auth.admin.listUsers({ perPage: 1000 });
    if (error) {
      throw error;
    }

    // Fetch extraction counts per user from jobs table
    const { data: jobs } = await getClient()
      .from('jobs')
      .select('user_id');

    const countsByUser: Record<string, number> = {};
    if (jobs) {
      jobs.forEach((j: { user_id: string }) => {
        if (j.user_id) {
          countsByUser[j.user_id] = (countsByUser[j.user_id] || 0) + 1;
        }
      });
    }

    const users = (data?.users || []).map(user => ({
      id: user.id,
      email: user.email,
      created_at: user.created_at,
      last_sign_in_at: user.last_sign_in_at,
      tier: user.app_metadata?.tier || 'free',
      custom_limit: user.app_metadata?.custom_extraction_limit ?? user.app_metadata?.max_extractions_per_window ?? null,
      extractions_count: countsByUser[user.id] || 0,
    }));

    res.json({ success: true, users });
  } catch (error: any) {
    if (!(error instanceof AppError)) console.error('Error listing users for admin:', error);
    sendAppError(res, error);
  }
});




