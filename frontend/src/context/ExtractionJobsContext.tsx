import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import { useI18n } from '../context/I18nContext';
import { useToast } from './ToastContext';
import { useExtractionQueue } from './ExtractionQueueContext';
import {
  type ExtractionMode,
  type ExtractionJobEntry,
  loadPersisted,
  persist,
  isTerminal,
} from './extractionJobsStorage';
import {
  useExtractionJobsPoller,
  EXTRACTION_COMPLETE_EVENT,
  OPEN_RECIPE_EVENT,
} from './useExtractionJobsPoller';

export type { ExtractionMode, ExtractionJobEntry };
export { EXTRACTION_COMPLETE_EVENT, OPEN_RECIPE_EVENT };

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

export function ExtractionJobsProvider({ children }: { children: React.ReactNode }) {
  const { getAccessToken } = useAuth();
  const { t, language } = useI18n();
  const toast = useToast();
  const { addFailedJob, removeFromWaitlist, removeFailedJob } = useExtractionQueue();

  const [jobs, setJobs] = useState<ExtractionJobEntry[]>(() => loadPersisted());
  const pollJobRef = useRef<((id: string) => Promise<void>) | null>(null);

  const setJobsPersist = useCallback((updater: (prev: ExtractionJobEntry[]) => ExtractionJobEntry[]) => {
    setJobs((prev) => {
      const next = updater(prev);
      persist(next);
      return next;
    });
  }, []);

  const dismissJob = useCallback(
    (id: string) => {
      setJobsPersist((prev) => prev.filter((j) => j.id !== id));
    },
    [setJobsPersist]
  );

  const { pollJob } = useExtractionJobsPoller({
    jobs,
    setJobsPersist,
    getAccessToken,
    t,
    language,
    toast,
    addFailedJob,
    removeFromWaitlist,
    removeFailedJob,
    dismissJob,
  });

  pollJobRef.current = pollJob;

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
        return isMulti
          ? prev.map((j) => (!isTerminal(j.status) ? { ...j, hadMultipleConcurrent: true } : j)).concat(entry)
          : [...prev, entry];
      });
      // Eagerly poll immediately on enqueue without waiting for ticker
      setTimeout(() => {
        void pollJobRef.current?.(jobId);
      }, 20);
    },
    [setJobsPersist]
  );

  const activeCount = jobs.filter((j) => !isTerminal(j.status)).length;

  return (
    <ExtractionJobsContext.Provider value={{ jobs, activeCount, addJob, dismissJob }}>
      {children}
    </ExtractionJobsContext.Provider>
  );
}
