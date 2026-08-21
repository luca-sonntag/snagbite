import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import type { ExtractionJob, ProgressData } from '../types';
import { type ErrorParams, parseSerializedError } from '../errorCodes';
import { apiUrl } from '../api';
import { useAuth } from './AuthContext';
import { useI18n } from '../context/I18nContext';

import { sendNativeNotification } from '../native';
import { handleClientFrameRequest } from '../utils/videoFrames';

export type ExtractionMode = 'link' | 'photo';

/** One tracked background extraction (premium multi-job flow). */
export interface ExtractionJobEntry {
  id: string;
  /** Human-readable source shown on the card (the URL, or a "Photos" label). */
  sourceLabel: string;
  mode: ExtractionMode;
  status: ExtractionJob['status'];
  progress: ProgressData | null;
  /** Recipe title, filled once the job completes. */
  title?: string | null;
  /** Recipe ID in the cookbook, filled once the job completes. */
  recipeId?: string | null;
  error?: string | null;
  errorCode?: string | null;
  errorParams?: ErrorParams | null;
}

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
/** Fired on window when the user taps a completed card, so App can open the recipe. */
export const OPEN_RECIPE_EVENT = 'app:open-recipe';

const STORAGE_KEY = 'kb_extraction_jobs';
const POLL_INTERVAL_MS = 2000;
/**
 * A finished (completed) card auto-dismisses this long after it completes, so the
 * Extract tab doesn't fill up with old cards — the recipe is already in the
 * cookbook and a notification fired. Failed cards stay until dismissed manually.
 */
const COMPLETED_AUTO_DISMISS_MS = 25000;

type PersistedJob = Pick<ExtractionJobEntry, 'id' | 'sourceLabel' | 'mode' | 'status' | 'title' | 'recipeId' | 'error' | 'errorCode'>;

function isTerminal(status: ExtractionJob['status']): boolean {
  return status === 'completed' || status === 'failed' || status === 'cancelled';
}

function loadPersisted(): ExtractionJobEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as PersistedJob[];
    if (!Array.isArray(parsed)) return [];
    // Never restore finished cards or invalid job ids — they'd just clutter the tab on next launch.
    return parsed.filter(p => p && p.id && p.id !== 'undefined' && !isTerminal(p.status ?? 'pending')).map(p => ({
      id: p.id,
      sourceLabel: p.sourceLabel,
      mode: p.mode,
      status: p.status ?? 'pending',
      progress: null,
      title: p.title ?? null,
      recipeId: p.recipeId ?? null,
      error: p.error ?? null,
      errorCode: p.errorCode ?? null,
      errorParams: null,
    }));
  } catch {
    return [];
  }
}

function persist(jobs: ExtractionJobEntry[]): void {
  try {
    // Only running jobs with valid ids survive a reload; finished/failed cards are session-scoped.
    const slim: PersistedJob[] = jobs
      .filter(j => j && j.id && j.id !== 'undefined' && !isTerminal(j.status))
      .map(j => ({
        id: j.id,
        sourceLabel: j.sourceLabel,
        mode: j.mode,
        status: j.status,
        title: j.title ?? null,
        recipeId: j.recipeId ?? null,
        error: j.error ?? null,
        errorCode: j.errorCode ?? null,
      }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(slim));
  } catch {
    /* ignore quota/serialization errors */
  }
}

export function ExtractionJobsProvider({ children }: { children: React.ReactNode }) {
  const { getAccessToken } = useAuth();
  const { t } = useI18n();

  const [jobs, setJobs] = useState<ExtractionJobEntry[]>(() => loadPersisted());

  // Ref mirror so the polling interval always reads the latest jobs without a
  // stale closure (mirrors the pattern in TimerContext).
  const jobsRef = useRef<ExtractionJobEntry[]>(jobs);
  jobsRef.current = jobs;

  // Guards so a job is only finalized (notification fired,
  // completion event dispatched) exactly once — even across re-render/StrictMode.
  const finalizedRef = useRef<Set<string>>(new Set(jobs.filter(j => isTerminal(j.status)).map(j => j.id)));
  // Prevents overlapping polls of the same job within a slow tick.
  const inFlightRef = useRef<Set<string>>(new Set());
  // Tracks jobs where client frame capture has already been kicked off.
  const capturedFramesJobsRef = useRef<Set<string>>(new Set());
  // Pending auto-dismiss timers for completed cards, keyed by job id.
  const dismissTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const setJobsPersist = useCallback((updater: (prev: ExtractionJobEntry[]) => ExtractionJobEntry[]) => {
    setJobs(prev => {
      const next = updater(prev);
      persist(next);
      return next;
    });
  }, []);

  const addJob = useCallback((jobId: string, meta: { sourceLabel: string; mode: ExtractionMode }) => {
    if (!jobId || typeof jobId !== 'string' || jobId === 'undefined') return;
    setJobsPersist(prev => {
      if (prev.some(j => j.id === jobId)) return prev;
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
      };
      return [...prev, entry];
    });
  }, [setJobsPersist]);

  const dismissJob = useCallback((id: string) => {
    const timer = dismissTimersRef.current.get(id);
    if (timer) { clearTimeout(timer); dismissTimersRef.current.delete(id); }
    finalizedRef.current.delete(id);
    inFlightRef.current.delete(id);
    capturedFramesJobsRef.current.delete(id);
    setJobsPersist(prev => prev.filter(j => j.id !== id));
  }, [setJobsPersist]);

  const finalizeCompletion = useCallback(async (job: ExtractionJob) => {
    const notifTitle = t('notification.recipeReady.title');
    const notifBody = t('notification.recipeReady.body', { title: t('recipe.recipe') || 'Recipe' });
    // The tap routes to the produced recipe, not to the task that produced it
    // (App's registerNotificationTap → app:navigate-to-timer-step handler).
    sendNativeNotification(notifTitle, notifBody, job.recipeId ?? undefined, undefined, Math.floor(Date.now() / 1000));

    setJobsPersist(prev => prev.map(j =>
      j.id === job.id
        ? { ...j, status: 'completed', progress: null, recipeId: job.recipeId ?? null }
        : j
    ));

    // Auto-dismiss the finished card after a short grace period so the tab stays
    // clean. Tapping it (or a manual dismiss) cancels this via dismissJob.
    const existing = dismissTimersRef.current.get(job.id);
    if (existing) clearTimeout(existing);
    const timer = setTimeout(() => {
      dismissTimersRef.current.delete(job.id);
      setJobsPersist(prev => prev.filter(j => j.id !== job.id));
    }, COMPLETED_AUTO_DISMISS_MS);
    dismissTimersRef.current.set(job.id, timer);

    window.dispatchEvent(new CustomEvent(EXTRACTION_COMPLETE_EVENT, { detail: { recipeId: job.recipeId } }));
  }, [setJobsPersist, t]);

  const pollJob = useCallback(async (id: string) => {
    if (!id || typeof id !== 'string' || id === 'undefined') return;
    if (inFlightRef.current.has(id)) return;
    inFlightRef.current.add(id);
    try {
      const token = await getAccessToken();
      if (!token) return;

      const response = await fetch(apiUrl(`/api/jobs/${id}`), {
        headers: { 'Authorization': `Bearer ${token}` },
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
        setJobsPersist(prev => prev.map(j =>
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
        ));
      } else if (job.status === 'awaiting_frames') {
        if (!capturedFramesJobsRef.current.has(id)) {
          capturedFramesJobsRef.current.add(id);
          handleClientFrameRequest(job, getAccessToken).catch((err) => {
            console.warn('[ExtractionJobsContext] Frame handler failed:', err);
          });
        }
        setJobsPersist(prev => prev.map(j =>
          j.id === id ? { ...j, status: job.status, progress: job.progress ?? null } : j
        ));
      } else {
        setJobsPersist(prev => prev.map(j =>
          j.id === id ? { ...j, status: job.status, progress: job.progress ?? null } : j
        ));
      }
    } catch (err) {
      console.warn(`Failed to poll extraction job ${id}:`, err);
    } finally {
      inFlightRef.current.delete(id);
    }
  }, [getAccessToken, finalizeCompletion, setJobsPersist, dismissJob]);

  // Single shared ticker polling every non-terminal tracked job.
  useEffect(() => {
    const interval = setInterval(() => {
      const active = jobsRef.current.filter(j => !isTerminal(j.status));
      active.forEach(j => { void pollJob(j.id); });
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

  const activeCount = jobs.filter(j => !isTerminal(j.status)).length;

  return (
    <ExtractionJobsContext.Provider value={{ jobs, activeCount, addJob, dismissJob }}>
      {children}
    </ExtractionJobsContext.Provider>
  );
}
