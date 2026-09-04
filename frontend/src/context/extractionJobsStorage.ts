import type { ExtractionJob, ProgressData } from '../types';
import type { ErrorParams } from '../errorCodes';

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
  /** True if other extractions were active concurrently during this job's lifecycle */
  hadMultipleConcurrent?: boolean;
}

export type PersistedJob = Pick<
  ExtractionJobEntry,
  'id' | 'sourceLabel' | 'mode' | 'status' | 'title' | 'recipeId' | 'error' | 'errorCode' | 'hadMultipleConcurrent'
>;

export const STORAGE_KEY = 'kb_extraction_jobs';
/** Active polling interval for fast responsive extraction progress updates. */
export const POLL_INTERVAL_MS = 600;
/**
 * A finished (completed) card auto-dismisses this long after it completes, so the
 * Extract tab doesn't fill up with old cards. Failed cards stay until dismissed manually.
 */
export const COMPLETED_AUTO_DISMISS_MS = 25000;

export function isTerminal(status: ExtractionJob['status']): boolean {
  return status === 'completed' || status === 'failed' || status === 'cancelled';
}

export function loadPersisted(): ExtractionJobEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as PersistedJob[];
    if (!Array.isArray(parsed)) return [];
    // Never restore finished cards or invalid job ids — they'd just clutter the tab on next launch.
    const active = parsed.filter(
      (p) => p && p.id && p.id !== 'undefined' && !isTerminal(p.status ?? 'pending')
    );
    const isMultiPersisted = active.length > 1;
    return active.map((p) => ({
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
      hadMultipleConcurrent: p.hadMultipleConcurrent || isMultiPersisted,
    }));
  } catch {
    return [];
  }
}

export function persist(jobs: ExtractionJobEntry[]): void {
  try {
    // Only running jobs with valid ids survive a reload; finished/failed cards are session-scoped.
    const slim: PersistedJob[] = jobs
      .filter((j) => j && j.id && j.id !== 'undefined' && !isTerminal(j.status))
      .map((j) => ({
        id: j.id,
        sourceLabel: j.sourceLabel,
        mode: j.mode,
        status: j.status,
        title: j.title ?? null,
        recipeId: j.recipeId ?? null,
        error: j.error ?? null,
        errorCode: j.errorCode ?? null,
        hadMultipleConcurrent: j.hadMultipleConcurrent,
      }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(slim));
  } catch {
    /* ignore quota/serialization errors */
  }
}
