import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import type { ExtractionJob } from '../types';
import { parseSerializedError } from '../errorCodes';
import { apiUrl } from '../api';
import { useAuth } from './AuthContext';
import { useI18n } from '../context/I18nContext';
import { useToast } from './ToastContext';
import { sendRecipeReadyNotification } from '../native';
import { handleClientFrameRequest } from '../utils/videoFrames';
import { useExtractionQueue } from './ExtractionQueueContext';
import {
  type ExtractionMode,
  type ExtractionJobEntry,
  loadPersisted,
  persist,
  isTerminal,
  POLL_INTERVAL_MS,
  COMPLETED_AUTO_DISMISS_MS,
} from './extractionJobsStorage';

export type { ExtractionMode, ExtractionJobEntry };

interface ExtractionJobsContextValue {
  jobs: ExtractionJobEntry[];
  /** Number of jobs still in flight (not completed/failed). */
  activeCount: number;
  addJob: (jobId: string, meta: { sourceLabel: string; mode: ExtractionMode }) => void;
  dismissJob: (id: string) => void;
}

const ExtractionJobsContext = createContext<ExtractionJobsContextValue | undefined>(undefined);

export function useExtractionJobs(): ExtractionJobsContextValue {
  const ctx = useContext(ExtractionJobsContext);
  if (!ctx) throw new Error('useExtractionJobs must be used within ExtractionJobsProvider');
  return ctx;
}

/** Fired on window when a background extraction completes, so App can refresh history. */
export const EXTRACTION_COMPLETE_EVENT = 'app:extraction-complete';
/** Fired on window when a recipe should be opened in the catalog view. */
export const OPEN_RECIPE_EVENT = 'app:open-recipe';

export function ExtractionJobsProvider({ children }: { children: React.ReactNode }) {
  const { getAccessToken } = useAuth();
  const { t } = useI18n();
  const toast = useToast();
  const { addFailedJob, removeFromWaitlist, removeFailedJob } = useExtractionQueue();

  const [jobs, setJobs] = useState<ExtractionJobEntry[]>(() => loadPersisted());

  // Ref mirror so the polling interval always reads the latest jobs without a
  // stale closure (mirrors the pattern in TimerContext).
  const jobsRef = useRef<ExtractionJobEntry[]>(jobs);
  jobsRef.current = jobs;

  // Guards so a job is only finalized (notification fired,
  // completion event dispatched) exactly once — even across re-render/StrictMode.
  const finalizedRef = useRef<Set<string>>(new Set(jobs.filter((j) => isTerminal(j.status)).map((j) => j.id)));
  // Prevents overlapping polls of the same job within a slow tick.
  const inFlightRef = useRef<Set<string>>(new Set());
  // Tracks jobs where client frame capture has already been kicked off.
  const capturedFramesJobsRef = useRef<Set<string>>(new Set());
  // Pending auto-dismiss timers for completed cards, keyed by job id.
  const dismissTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const setJobsPersist = useCallback((updater: (prev: ExtractionJobEntry[]) => ExtractionJobEntry[]) => {
    setJobs((prev) => {
      const next = updater(prev);
      persist(next);
      return next;
    });
  }, []);

  const pollJobRef = useRef<((id: string) => Promise<void>) | null>(null);

  const addJob = useCallback(
    (jobId: string, meta: { sourceLabel: string; mode: ExtractionMode }) => {
      if (!jobId || typeof jobId !== 'string' || jobId === 'undefined') return;
      setJobsPersist((prev) => {
        if (prev.some((j) => j.id === jobId)) return prev;
        const currentlyActive = prev.filter((j) => !isTerminal(j.status));
        const isMulti = currentlyActive.length > 0;
        const entry: ExtractionJobEntry = {
          id: jobId,
          sourceLabel: meta.sourceLabel,
          mode: meta.mode,
          status: 'pending',
          progress: null,
          title: null,
          error: null,
          errorCode: null,
          errorParams: null,
          hadMultipleConcurrent: isMulti,
        };
        const next = isMulti
          ? prev.map((j) => (!isTerminal(j.status) ? { ...j, hadMultipleConcurrent: true } : j)).concat(entry)
          : [...prev, entry];
        jobsRef.current = next;
        return next;
      });
      // Eagerly poll immediately on enqueue without waiting for ticker
      setTimeout(() => {
        void pollJobRef.current?.(jobId);
      }, 20);
    },
    [setJobsPersist]
  );

  const dismissJob = useCallback(
    (id: string) => {
      const timer = dismissTimersRef.current.get(id);
      if (timer) {
        clearTimeout(timer);
        dismissTimersRef.current.delete(id);
      }
      inFlightRef.current.delete(id);
      capturedFramesJobsRef.current.delete(id);
      setJobsPersist((prev) => {
        const next = prev.filter((j) => j.id !== id);
        jobsRef.current = next;
        return next;
      });
    },
    [setJobsPersist]
  );

  const finalizeCompletion = useCallback(
    async (job: ExtractionJob) => {
      const recipeTitle = job.title?.trim();
      const notifTitle = t('notification.recipeReady.title');
      const notifBody = recipeTitle
        ? t('notification.recipeReady.body', { title: recipeTitle })
        : t('notification.recipeReady.bodyFallback');
      // The tap routes to the produced recipe, not to the task that produced it
      void sendRecipeReadyNotification(notifTitle, notifBody, job.recipeId ?? undefined);

      const jobEntry = jobsRef.current.find((j) => j.id === job.id);
      const otherActive = jobsRef.current.filter((j) => j.id !== job.id && !isTerminal(j.status));
      const isSingleExtraction = !jobEntry?.hadMultipleConcurrent && otherActive.length === 0;

      if (isSingleExtraction && job.recipeId) {
        // Auto-open recipe when only a single recipe is extracted
        window.dispatchEvent(
          new CustomEvent(OPEN_RECIPE_EVENT, { detail: { recipeId: job.recipeId, jobId: job.id } })
        );
        dismissJob(job.id);
      } else {
        // Multiple extractions: keep in list as completed card and display toast with action
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

        // Auto-dismiss the finished card after a short grace period so the tab stays clean.
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
        let data: any;
        try {
          data = await response.json();
        } catch {
          if (response.status === 404) {
            dismissJob(id);
          }
          return;
        }

        if (response.status === 404 || data?.code === 'JOB_NOT_FOUND') {
          dismissJob(id);
          return;
        }

        if (!response.ok || !data.success || !data.job) return;

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
              errorParams: envelope?.params ?? null,
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
                // Eagerly poll immediately after frames were submitted
                setTimeout(() => {
                  void pollJobRef.current?.(id);
                }, 50);
              })
              .catch((err) => {
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
    [getAccessToken, finalizeCompletion, setJobsPersist, dismissJob, t, toast]
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

  // Clear any pending auto-dismiss timers on unmount.
  useEffect(() => {
    const timers = dismissTimersRef.current;
    return () => {
      timers.forEach(clearTimeout);
      timers.clear();
    };
  }, []);

  const activeCount = jobs.filter((j) => !isTerminal(j.status)).length;

  return (
    <ExtractionJobsContext.Provider value={{ jobs, activeCount, addJob, dismissJob }}>
      {children}
    </ExtractionJobsContext.Provider>
  );
}
