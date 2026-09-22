import { useEffect, useRef, useCallback } from 'react';
import type { ExtractionJob } from '../types';
import { parseSerializedError } from '../errorCodes';
import { apiUrl } from '../api';
import { sendRecipeReadyNotification } from '../native';
import { handleClientFrameRequest } from '../utils/videoFrames';
import {
  type ExtractionJobEntry,
  isTerminal,
  POLL_INTERVAL_MS,
  COMPLETED_AUTO_DISMISS_MS,
} from './extractionJobsStorage';

export const EXTRACTION_COMPLETE_EVENT = 'app:extraction-complete';
export const OPEN_RECIPE_EVENT = 'app:open-recipe';

interface UseExtractionJobsPollerProps {
  jobs: ExtractionJobEntry[];
  setJobsPersist: (updater: (prev: ExtractionJobEntry[]) => ExtractionJobEntry[]) => void;
  getAccessToken: () => Promise<string | null>;
  t: (key: string, params?: Record<string, string | number>) => string;
  toast: {
    success: (msg: string, opts?: { description?: string; action?: { label: string; onClick: () => void } }) => void;
    danger: (msg: string) => void;
  };
  addFailedJob: (entry: {
    sourceUrl: string;
    mode: 'link' | 'photo';
    error: string;
    errorCode: string | null;
    errorParams: Record<string, string | number> | null;
  }) => void;
  removeFromWaitlist: (url: string) => void;
  removeFailedJob: (url: string) => void;
  dismissJob: (id: string) => void;
}

export function useExtractionJobsPoller({
  jobs,
  setJobsPersist,
  getAccessToken,
  t,
  toast,
  addFailedJob,
  removeFromWaitlist,
  removeFailedJob,
  dismissJob,
}: UseExtractionJobsPollerProps) {
  const jobsRef = useRef<ExtractionJobEntry[]>(jobs);
  jobsRef.current = jobs;

  const finalizedRef = useRef<Set<string>>(new Set(jobs.filter((j) => isTerminal(j.status)).map((j) => j.id)));
  const inFlightRef = useRef<Set<string>>(new Set());
  const capturedFramesJobsRef = useRef<Set<string>>(new Set());
  const dismissTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const pollJobRef = useRef<((id: string) => Promise<void>) | null>(null);

  const finalizeCompletion = useCallback(
    async (job: ExtractionJob) => {
      const recipeTitle = job.title?.trim();
      const notifTitle = t('notification.recipeReady.title');
      const notifBody = recipeTitle
        ? t('notification.recipeReady.body', { title: recipeTitle })
        : t('notification.recipeReady.bodyFallback');

      void sendRecipeReadyNotification(notifTitle, notifBody, job.recipeId ?? undefined);

      const jobEntry = jobsRef.current.find((j) => j.id === job.id);
      const otherActive = jobsRef.current.filter((j) => j.id !== job.id && !isTerminal(j.status));
      const isSingleExtraction = !jobEntry?.hadMultipleConcurrent && otherActive.length === 0;

      if (isSingleExtraction && job.recipeId) {
        window.dispatchEvent(
          new CustomEvent(OPEN_RECIPE_EVENT, { detail: { recipeId: job.recipeId, jobId: job.id } })
        );
        dismissJob(job.id);
      } else {
        toast.success(t('toast.recipeReadyTitle'), {
          description: recipeTitle || undefined,
          action: job.recipeId
            ? {
                label: t('toast.viewRecipe'),
                onClick: () => {
                  window.dispatchEvent(
                    new CustomEvent(OPEN_RECIPE_EVENT, { detail: { recipeId: job.recipeId, jobId: job.id } })
                  );
                  dismissJob(job.id);
                },
              }
            : undefined,
        });

        setJobsPersist((prev) =>
          prev.map((j) =>
            j.id === job.id
              ? {
                  ...j,
                  status: 'completed',
                  progress: null,
                  recipeId: job.recipeId ?? null,
                  title: recipeTitle ?? j.title ?? null,
                }
              : j
          )
        );

        const existing = dismissTimersRef.current.get(job.id);
        if (existing) clearTimeout(existing);
        const timer = setTimeout(() => {
          dismissTimersRef.current.delete(job.id);
          setJobsPersist((prev) => prev.filter((j) => j.id !== job.id));
        }, COMPLETED_AUTO_DISMISS_MS);
        dismissTimersRef.current.set(job.id, timer);
      }

      if (job.sourceUrl) {
        removeFromWaitlist(job.sourceUrl);
        removeFailedJob(job.sourceUrl);
      }

      window.dispatchEvent(new CustomEvent(EXTRACTION_COMPLETE_EVENT, { detail: { recipeId: job.recipeId } }));
    },
    [dismissJob, setJobsPersist, t, toast, removeFromWaitlist, removeFailedJob]
  );

  const pollJob = useCallback(
    async (id: string) => {
      if (!id || typeof id !== 'string' || id === 'undefined') return;
      if (inFlightRef.current.has(id)) return;
      inFlightRef.current.add(id);
      try {
        const token = await getAccessToken();
        if (!token) return;

        const response = await fetch(apiUrl(`/api/jobs/${id}`), {
          headers: { Authorization: `Bearer ${token}` },
        });

        let data: { success?: boolean; job?: ExtractionJob; code?: string } | null = null;
        try {
          data = (await response.json()) as { success?: boolean; job?: ExtractionJob; code?: string };
        } catch {
          if (response.status === 404) dismissJob(id);
          return;
        }

        if (response.status === 404 || data?.code === 'JOB_NOT_FOUND') {
          dismissJob(id);
          return;
        }

        if (!response.ok || !data?.success || !data.job) return;
        const job: ExtractionJob = data.job;

        if (job.status === 'completed') {
          if (finalizedRef.current.has(id)) return;
          finalizedRef.current.add(id);
          await finalizeCompletion(job);
        } else if (job.status === 'failed') {
          if (finalizedRef.current.has(id)) return;
          finalizedRef.current.add(id);
          const envelope = job.error ? parseSerializedError(job.error) : null;
          toast.danger(t('toast.recipeFailedTitle'));

          const jobEntry = jobsRef.current.find((j) => j.id === id);
          if (jobEntry && jobEntry.mode === 'link') {
            addFailedJob({
              sourceUrl: jobEntry.sourceLabel,
              mode: 'link',
              error: job.error ?? 'form.validation.failedExtraction',
              errorCode: envelope?.code ?? null,
              errorParams: (envelope?.params as Record<string, string | number>) ?? null,
            });
          }

          setJobsPersist((prev) =>
            prev.map((j) =>
              j.id === id
                ? {
                    ...j,
                    status: 'failed',
                    progress: null,
                    error: job.error ?? 'form.validation.failedExtraction',
                    errorCode: envelope?.code ?? null,
                    errorParams: envelope?.params ?? null,
                  }
                : j
            )
          );
        } else if (job.status === 'awaiting_frames') {
          if (!capturedFramesJobsRef.current.has(id)) {
            capturedFramesJobsRef.current.add(id);
            handleClientFrameRequest(job, getAccessToken)
              .then(() => {
                setTimeout(() => {
                  void pollJobRef.current?.(id);
                }, 50);
              })
              .catch((err: unknown) => {
                console.warn('[ExtractionJobsContext] Frame handler failed:', err);
              });
          }
          setJobsPersist((prev) =>
            prev.map((j) => (j.id === id ? { ...j, status: job.status, progress: job.progress ?? null } : j))
          );
        } else {
          setJobsPersist((prev) =>
            prev.map((j) => (j.id === id ? { ...j, status: job.status, progress: job.progress ?? null } : j))
          );
        }
      } catch (err) {
        console.warn(`Failed to poll extraction job ${id}:`, err);
      } finally {
        inFlightRef.current.delete(id);
      }
    },
    [getAccessToken, finalizeCompletion, setJobsPersist, dismissJob, t, toast, addFailedJob]
  );

  pollJobRef.current = pollJob;

  // Single shared ticker polling every non-terminal tracked job.
  useEffect(() => {
    const interval = setInterval(() => {
      const active = jobsRef.current.filter((j) => !isTerminal(j.status));
      active.forEach((j) => {
        void pollJob(j.id);
      });
    }, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [pollJob]);

  // Sync active jobs from server on mount / login
  useEffect(() => {
    let isMounted = true;
    async function syncServerJobs() {
      try {
        const token = await getAccessToken();
        if (!token) return;

        const res = await fetch(apiUrl('/api/me/active-jobs'), {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data = (await res.json()) as {
          success?: boolean;
          jobs?: Array<{
            id: string;
            status: ExtractionJob['status'];
            kind: 'url' | 'photo' | 'remix';
            sourceUrl: string;
            progress: ExtractionJob['progress'];
          }>;
        };

        if (!isMounted || !data.jobs || !Array.isArray(data.jobs)) return;

        setJobsPersist((prev) => {
          const existingIds = new Set(prev.map((j) => j.id));
          const newEntries: ExtractionJobEntry[] = [];
          for (const sj of data.jobs!) {
            if (!existingIds.has(sj.id)) {
              newEntries.push({
                id: sj.id,
                sourceLabel: sj.sourceUrl || 'Rezept-Import',
                mode: sj.kind === 'photo' ? 'photo' : 'link',
                status: sj.status,
                progress: sj.progress ?? null,
                title: null,
                error: null,
                errorCode: null,
                errorParams: null,
                hadMultipleConcurrent: prev.length > 0,
              });
            }
          }
          if (newEntries.length === 0) return prev;
          const merged = [...prev, ...newEntries];
          jobsRef.current = merged;
          return merged;
        });
      } catch (err) {
        console.warn('[ExtractionJobsContext] Failed to sync server jobs:', err);
      }
    }

    void syncServerJobs();
    return () => {
      isMounted = false;
    };
  }, [getAccessToken, setJobsPersist]);

  // Clear pending timers on unmount
  useEffect(() => {
    const timers = dismissTimersRef.current;
    return () => {
      timers.forEach(clearTimeout);
      timers.clear();
    };
  }, []);

  return { pollJob };
}
