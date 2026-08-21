import { useState, useCallback, useEffect, useRef } from 'react';
import type { Recipe, ExtractionJob, ProgressData } from '../types';
import { type ErrorParams, parseSerializedError } from '../errorCodes';
import { useI18n } from '../context/I18nContext';
import { apiUrl } from '../api';
import { useAuth } from '../context/AuthContext';
import { compressRecipePhotos } from '../utils/imageCompression';

import { useExtractionJobs, type ExtractionMode } from '../context/ExtractionJobsContext';
import {
  sendNativeNotification,
  sendRecipeReadyNotification,
  requestNativeNotificationPermission,
  isNative,
  registerAppStateListener,
  EXTRACTION_INTERRUPTED_NOTIFICATION_ID,
} from '../native';
import { handleClientFrameRequest } from '../utils/videoFrames';

// Tracks the currently in-flight extraction job across reloads/restarts, so a
// still-running job can be resumed instead of the user re-submitting the same
// URL (which previously produced a duplicate saved recipe).
const PENDING_JOB_STORAGE_KEY = 'kb_pending_job_id';

/** Maximum photos per import — mirrors MAX_IMPORT_PHOTOS in the backend. */
export const MAX_IMPORT_PHOTOS = 5;

/**
 * Client-side budget for the combined base64 payload, kept below the route's
 * server-side cap so an oversized set is downscaled instead of rejected.
 */
const MAX_PHOTOS_TOTAL_CHARS = 8_000_000;

export function useRecipeExtraction(getAccessToken: () => Promise<string | null>, onExtractionSuccess: (recipeId: string) => void) {
  const { t } = useI18n();
  const { user, refreshSession, isPremium } = useAuth();
  const { addJob } = useExtractionJobs();
  const [isPending, setIsPending] = useState(false);
  const [jobStatus, setJobStatus] = useState<ExtractionJob['status'] | null>(null);
  const [jobError, setJobError] = useState<string | null>(null);
  const [jobErrorCode, setJobErrorCode] = useState<string | null>(null);
  const [jobErrorParams, setJobErrorParams] = useState<ErrorParams | null>(null);
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [url, setUrl] = useState('');
  const [urlError, setUrlError] = useState('');
  // Photo import selection. Held here (like `url`) so the retry path can
  // re-submit the same photos without the form having to hand them around.
  const [photos, setPhotos] = useState<File[]>([]);
  const [isUploadingPhotos, setIsUploadingPhotos] = useState(false);
  const [limitStatus, setLimitStatus] = useState<{ limit: number; used: number; remaining: number; windowDays: number; tier: 'free' | 'alpha' | 'premium'; savedRecipes: number; maxSavedRecipes: number; cookbookFull: boolean; maxConcurrent: number; activeCount: number } | null>(null);

  const fetchLimitStatus = useCallback(async () => {
    try {
      const token = await getAccessToken();
      if (!token) return;

      const headers: Record<string, string> = {
        'Authorization': `Bearer ${token}`
      };

      const response = await fetch(apiUrl('/api/extractions/limit'), {
        headers
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setLimitStatus({
          limit: data.limit,
          used: data.used,
          remaining: data.remaining,
          windowDays: data.windowDays,
          tier: data.tier,
          savedRecipes: data.savedRecipes ?? 0,
          maxSavedRecipes: data.maxSavedRecipes ?? -1,
          cookbookFull: data.cookbookFull ?? false,
          maxConcurrent: data.maxConcurrent ?? 1,
          activeCount: data.activeCount ?? 0
        });

        // Auto-refresh auth session on tier mismatch (e.g. after alpha auto-assignment)
        if (user && data.tier && user.app_metadata?.tier !== data.tier) {
          console.log(`Tier mismatch detected: local is '${user.app_metadata?.tier}', server is '${data.tier}'. Refreshing session...`);
          refreshSession().catch(err => console.warn('Failed to refresh session on tier change:', err));
        }
      }
    } catch (err) {
      console.warn('Failed to fetch rate limit status:', err);
    }
  }, [getAccessToken, user, refreshSession]);

  const validateUrl = useCallback((testUrl: string): boolean => {
    const trimmed = testUrl.trim();
    if (!trimmed) {
      setUrlError(t('form.validation.required'));
      return false;
    }
    const regex = /^(https?:\/\/)?([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(:\d+)?(\/.*)?$/i;
    if (!regex.test(trimmed)) {
      setUrlError(t('form.validation.invalid'));
      return false;
    }

    try {
      const urlWithProtocol = trimmed.match(/^https?:\/\//i) ? trimmed : `https://${trimmed}`;
      const urlObj = new URL(urlWithProtocol);
      const hostname = urlObj.hostname.toLowerCase();
      const isYouTube = hostname === 'youtube.com' || hostname.endsWith('.youtube.com') || hostname === 'youtu.be';

      if (isYouTube) {
        const isShort = urlObj.pathname.startsWith('/shorts/');
        if (!isShort) {
          setUrlError(t('form.validation.youtubeShortsOnly'));
          return false;
        }
      }
    } catch (e) {
      setUrlError(t('form.validation.invalid'));
      return false;
    }

    setUrlError('');
    return true;
  }, [t]);

  const activePollingJobIdRef = useRef<string | null>(null);
  const activePollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const frameProcessingJobIdRef = useRef<string | null>(null);

  const stopActivePolling = useCallback(() => {
    if (activePollingIntervalRef.current) {
      clearInterval(activePollingIntervalRef.current);
      activePollingIntervalRef.current = null;
    }
    activePollingJobIdRef.current = null;
    frameProcessingJobIdRef.current = null;
  }, []);

  const pollingStartTimeRef = useRef<number>(0);

  const cancelActiveFreeJob = useCallback(async () => {
    const jobId = activePollingJobIdRef.current || localStorage.getItem(PENDING_JOB_STORAGE_KEY);
    if (!jobId) return;

    stopActivePolling();
    localStorage.removeItem(PENDING_JOB_STORAGE_KEY);
    setIsPending(false);
    setJobStatus('failed');
    setJobError('form.validation.backgroundCancelled');
    setProgress(null);

    // Fire local notification to inform the user that extraction was interrupted due to backgrounding
    if (document.visibilityState !== 'visible') {
      const notifTitle = t('notification.extractionInterrupted.title');
      const notifBody = t('notification.extractionInterrupted.body');
      sendNativeNotification(
        notifTitle,
        notifBody,
        undefined,
        undefined,
        EXTRACTION_INTERRUPTED_NOTIFICATION_ID,
        { route: 'extract', action: 'interrupted' }
      );
    }

    try {
      const token = await getAccessToken();
      if (token) {
        fetch(apiUrl(`/api/jobs/${jobId}/cancel`), {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          keepalive: true
        }).catch(err => console.warn('Failed to cancel backgrounded job:', err));
      }
    } catch (err) {
      console.warn('Error executing cancelActiveFreeJob:', err);
    }
  }, [getAccessToken, stopActivePolling, t]);

  const runSimulatedProgress = useCallback(async (jobId: string, recipeId: string, targetDurationMs: number = 10000) => {
    setIsPending(true);
    setJobStatus('processing');

    const steps: Array<{ stage: ProgressData['stage']; percent: number; delayMs: number }> = [
      { stage: 'scraping', percent: 20, delayMs: Math.round(targetDurationMs * 0.25) },
      { stage: 'downloading_media', percent: 45, delayMs: Math.round(targetDurationMs * 0.25) },
      { stage: 'extracting_recipe', percent: 75, delayMs: Math.round(targetDurationMs * 0.25) },
      { stage: 'finalizing', percent: 95, delayMs: Math.round(targetDurationMs * 0.25) },
    ];

    for (const step of steps) {
      if (activePollingJobIdRef.current !== jobId) return;
      setProgress({ percent: step.percent, stage: step.stage });
      await new Promise(res => setTimeout(res, step.delayMs));
    }

    if (activePollingJobIdRef.current !== jobId) return;


    setProgress(null);
    setIsPending(false);
    setUrl('');
    setPhotos([]);
    localStorage.removeItem(PENDING_JOB_STORAGE_KEY);
    activePollingJobIdRef.current = null;
    onExtractionSuccess(recipeId);
  }, [onExtractionSuccess]);

  const startPolling = useCallback((id: string) => {
    stopActivePolling();
    activePollingJobIdRef.current = id;
    pollingStartTimeRef.current = Date.now();

    const interval = setInterval(async () => {
      try {
        const token = await getAccessToken();
        if (!token) {
          stopActivePolling();
          setJobStatus('failed');
          setJobError('form.validation.unauthorized');
          setIsPending(false);
          localStorage.removeItem(PENDING_JOB_STORAGE_KEY);
          return;
        }
        const response = await fetch(apiUrl(`/api/jobs/${id}`), {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        let data: any;
        try {
          data = await response.json();
        } catch {
          stopActivePolling();
          setJobStatus('failed');
          setJobError(response.status === 429 ? 'too many requests' : 'form.validation.serverError');
          setIsPending(false);
          localStorage.removeItem(PENDING_JOB_STORAGE_KEY);
          return;
        }

        if (!response.ok || !data.success) {
          stopActivePolling();
          setJobStatus('failed');
          setJobError(data.error || 'form.validation.failedCheck');
          setIsPending(false);
          localStorage.removeItem(PENDING_JOB_STORAGE_KEY);
          return;
        }

        const job = data.job;
        setJobStatus(job.status);

        if (job.status === 'completed') {
          const elapsed = Date.now() - pollingStartTimeRef.current;
          const remainingMs = 10000 - elapsed;

          if (!isPremium && remainingMs > 2000) {
            stopActivePolling();
            activePollingJobIdRef.current = job.id;
            await runSimulatedProgress(job.id, job.recipeId, remainingMs);
            return;
          }

          stopActivePolling();

          setProgress(null);
          setIsPending(false);
          setUrl('');
          setPhotos([]);
          localStorage.removeItem(PENDING_JOB_STORAGE_KEY);

          const recipeTitle = job.title?.trim();
          const notifTitle = t('notification.recipeReady.title');
          const notifBody = recipeTitle
            ? t('notification.recipeReady.body', { title: recipeTitle })
            : t('notification.recipeReady.bodyFallback');
          void sendRecipeReadyNotification(notifTitle, notifBody, job.recipeId);

          onExtractionSuccess(job.recipeId);
        } else if (job.status === 'failed') {
          stopActivePolling();
          const envelope = job.error ? parseSerializedError(job.error) : null;
          setJobError(job.error || 'form.validation.failedExtraction');
          setJobErrorCode(envelope?.code ?? null);
          setJobErrorParams(envelope?.params ?? null);
          setProgress(null);
          setIsPending(false);
          localStorage.removeItem(PENDING_JOB_STORAGE_KEY);
        } else if (job.status === 'awaiting_frames') {
          setProgress(job.progress || { percent: 30, stage: 'awaiting_frames' });
          if (frameProcessingJobIdRef.current !== job.id) {
            frameProcessingJobIdRef.current = job.id;
            handleClientFrameRequest(job, getAccessToken).catch((err) =>
              console.warn('[useRecipeExtraction] Keyframe capture failed:', err),
            );
          }
        } else {
          setProgress(job.progress || null);
        }
      } catch (err: unknown) {
        stopActivePolling();
        setJobStatus('failed');
        setJobError(err instanceof Error ? err.message : 'form.validation.lostConnection');
        setProgress(null);
        setIsPending(false);
        localStorage.removeItem(PENDING_JOB_STORAGE_KEY);
      }
    }, 2000);

    activePollingIntervalRef.current = interval;
  }, [getAccessToken, isPremium, onExtractionSuccess, runSimulatedProgress, stopActivePolling, t]);

  /**
   * Shared submit path for both input channels: posts a job-creating request and
   * unwraps the `{success, jobId}` envelope. `buildBody` runs after the busy
   * state is set, so slow client-side work (compressing photos) already shows a
   * busy UI.
   *
   * Two flows depending on tier:
   *  - **Free**: foreground/blocking — sets `isPending`, persists the single job
   *    id and polls it here; the recipe auto-opens on completion. Free users may
   *    only run one at a time (enforced server-side too).
   *  - **Premium**: background — hands the job to `ExtractionJobsContext`, clears
   *    the inputs and returns immediately so more can be queued. Progress is
   *    shown by `ActiveExtractions`; nothing auto-opens.
   */
  const submitExtraction = useCallback(async (
    path: string,
    buildBody: () => Promise<unknown>,
    meta: { mode: ExtractionMode; sourceLabel: string },
  ) => {
    // Proactively request local notification permissions on native startup of extraction
    if (isNative()) {
      requestNativeNotificationPermission().catch(err => console.warn('Failed to request notifications permission:', err));
    }

    // Only the free/foreground flow blocks the form with the full-screen animation.
    if (!isPremium) {
      setIsPending(true);
      setJobStatus('pending');
    }
    setJobError(null);
    setJobErrorCode(null);
    setJobErrorParams(null);
    setRecipe(null);
    setProgress(null);

    try {
      const token = await getAccessToken();
      if (!token) {
        throw new Error('form.validation.unauthorized');
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      };

      const body = await buildBody();

      const response = await fetch(apiUrl(path), {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
      });

      let data: any;
      try {
        data = await response.json();
      } catch {
        throw new Error(response.status === 429 ? 'too many requests' : 'form.validation.serverError');
      }

      if (response.status === 401) {
        throw new Error('form.validation.unauthorized');
      }

      if (!response.ok || !data.success) {
        throw Object.assign(new Error(data.error || 'form.validation.submitFailed'), {
          code: data.code,
          params: data.params,
        });
      }

      if (isPremium) {
        if (data.status === 'completed' && data.recipeId) {
          // Already extracted / cached: directly open recipe without creating a dummy background job
          setUrl('');
          setPhotos([]);
          setJobStatus(null);
          fetchLimitStatus();
          onExtractionSuccess(data.recipeId);
          return;
        }
        // Background flow: track the job in the shared store and free the form.
        if (data.jobId) {
          addJob(data.jobId, { sourceLabel: meta.sourceLabel, mode: meta.mode });
        }
        setUrl('');
        setPhotos([]);
        setJobStatus(null);
        fetchLimitStatus();
      } else {
        fetchLimitStatus();
        if (data.status === 'completed') {
          stopActivePolling();
          activePollingJobIdRef.current = data.jobId ?? null;
          if (data.recipeId) {
            onExtractionSuccess(data.recipeId);
          } else {
            runSimulatedProgress(data.jobId ?? '', data.recipeId, 10000);
          }
        } else {
          setJobStatus(data.status);
          localStorage.setItem(PENDING_JOB_STORAGE_KEY, data.jobId);
          startPolling(data.jobId);
        }
      }
    } catch (err: unknown) {
      const typed = err as (Error & { code?: string; params?: ErrorParams }) | undefined;
      setJobStatus('failed');
      setJobError(err instanceof Error ? err.message : 'form.validation.submissionError');
      setJobErrorCode(typed?.code ?? null);
      setJobErrorParams(typed?.params ?? null);
      setIsPending(false);
    }
  }, [getAccessToken, startPolling, fetchLimitStatus, isPremium, addJob, runSimulatedProgress, stopActivePolling, onExtractionSuccess]);

  const triggerExtraction = useCallback(async (targetUrl: string) => {
    const cleanUrl = targetUrl.trim();
    if (!validateUrl(cleanUrl)) return;

    await submitExtraction('/api/extract-recipe', async () => ({ url: cleanUrl }), {
      mode: 'link',
      sourceLabel: cleanUrl,
    });
  }, [submitExtraction, validateUrl]);

  /**
   * Submits the currently selected photos of a physical recipe source. They are
   * downscaled in the browser first — full camera resolution would blow the
   * request budget without helping the OCR.
   */
  const triggerPhotoExtraction = useCallback(async (files?: File[]) => {
    const selected = files ?? photos;
    if (selected.length === 0 || selected.length > MAX_IMPORT_PHOTOS) return;

    setIsUploadingPhotos(true);
    try {
      await submitExtraction('/api/extract-recipe/photos', async () => ({
        photos: await compressRecipePhotos(selected, MAX_PHOTOS_TOTAL_CHARS),
      }), {
        mode: 'photo',
        sourceLabel: t('activeExtractions.photoSource'),
      });
    } finally {
      setIsUploadingPhotos(false);
    }
  }, [photos, submitExtraction, t]);

  // Resume a still-running extraction after a reload/restart wiped in-memory
  // state. Restricted to free users since premium extractions run in ExtractionJobsContext.
  const hasResumedPendingJobRef = useRef(false);
  useEffect(() => {
    if (hasResumedPendingJobRef.current) return;
    hasResumedPendingJobRef.current = true;

    const pendingJobId = localStorage.getItem(PENDING_JOB_STORAGE_KEY);
    if (!pendingJobId) return;

    if (!isPremium) {
      setIsPending(true);
      setJobStatus('pending');
      startPolling(pendingJobId);
    }
  }, [startPolling, isPremium]);

  // Cancel in-flight extraction for Free users whenever the app enters background / tab is hidden
  useEffect(() => {
    if (isPremium) return;

    const handleBackground = () => {
      const pendingId = activePollingJobIdRef.current || localStorage.getItem(PENDING_JOB_STORAGE_KEY);
      if (pendingId) {
        console.log('[useRecipeExtraction] Free user backgrounded during extraction — cancelling job:', pendingId);
        cancelActiveFreeJob();
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        handleBackground();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    const cleanupAppState = registerAppStateListener((isActive) => {
      if (!isActive) {
        handleBackground();
      }
    });

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      cleanupAppState();
    };
  }, [isPremium, cancelActiveFreeJob]);


  const claimRewardedCredit = useCallback(async (): Promise<boolean> => {
    try {
      const token = await getAccessToken();
      if (!token) return false;

      const res = await fetch(apiUrl('/api/me/rewarded-ad-claimed'), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!res.ok) return false;
      await fetchLimitStatus();
      return true;
    } catch (err) {
      console.error('Failed to claim rewarded ad credit:', err);
      return false;
    }
  }, [getAccessToken, fetchLimitStatus]);

  return {
    isPending: isPending || false,
    jobStatus,
    jobError,
    jobErrorCode,
    jobErrorParams,
    recipe,
    setRecipe,
    progress,
    url,
    setUrl,
    urlError,
    setUrlError,
    validateUrl,
    triggerExtraction,
    photos,
    setPhotos,
    isUploadingPhotos,
    triggerPhotoExtraction,
    limitStatus,
    fetchLimitStatus,
    claimRewardedCredit
  };
}
