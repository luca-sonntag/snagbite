import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from './AuthContext';
import { useI18n } from './I18nContext';
import { useToast } from './ToastContext';
import { resolveErrorCode } from '../i18n';
import { formatSourceLabel } from '../utils/sourceLabel';
import type { ErrorParams } from '../errorCodes';

export interface QueueItem {
  id: string;
  url: string;
  sourceUrl: string;
  sourceLabel: string;
  addedAt: string;
  origin?: 'share' | 'manual' | 'retry';
  status: 'waiting' | 'failed';
  error?: string | null;
  errorCode?: string | null;
  errorParams?: ErrorParams | null;
  mode?: 'link' | 'photo';
}

export type WaitlistItem = QueueItem;
export type FailedExtractionEntry = QueueItem;

export interface ExtractionQueueContextValue {
  items: QueueItem[];
  waitingCount: number;
  failedCount: number;
  addToQueue: (url: string, origin?: 'share' | 'manual' | 'retry') => boolean;
  removeFromQueue: (idOrUrl: string) => void;
  clearQueue: () => void;
  addFailedJob: (entry: {
    sourceUrl: string;
    sourceLabel?: string;
    mode?: 'link' | 'photo';
    error?: string | null;
    errorCode?: string | null;
    errorParams?: ErrorParams | null;
    silentToast?: boolean;
  }) => void;
  retryItem: (idOrUrl: string) => boolean;

  // Backward compatibility aliases
  waitlist: QueueItem[];
  failedJobs: QueueItem[];
  addToWaitlist: (url: string, origin?: 'share' | 'manual' | 'retry') => boolean;
  removeFromWaitlist: (idOrUrl: string) => void;
  clearWaitlist: () => void;
  removeFailedJob: (idOrUrl: string) => void;
  clearFailedJobs: () => void;
  moveFailedToWaitlist: (id: string) => boolean;
}

const ExtractionQueueContext = createContext<ExtractionQueueContextValue | undefined>(undefined);

const QUEUE_KEY_PREFIX = 'kb_extraction_queue';
const OLD_WAITLIST_KEY_PREFIX = 'kb_extraction_waitlist';
const OLD_FAILED_KEY_PREFIX = 'kb_extraction_failed';
const MAX_QUEUE_ITEMS = 30;

function getStorageKey(prefix: string, userId?: string | null): string {
  return `${prefix}_${userId || 'anon'}`;
}

function loadFromStorage<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

function saveToStorage<T>(key: string, data: T[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {
    /* ignore quota errors */
  }
}

interface LegacyWaitlistItem {
  id: string;
  url: string;
  sourceLabel: string;
  addedAt: string;
  origin?: 'share' | 'manual' | 'retry';
}

interface LegacyFailedEntry {
  id: string;
  sourceUrl: string;
  sourceLabel: string;
  mode?: 'link' | 'photo';
  failedAt: string;
  error?: string | null;
  errorCode?: string | null;
  errorParams?: ErrorParams | null;
}

function loadQueueWithMigration(userId?: string | null): QueueItem[] {
  const unifiedKey = getStorageKey(QUEUE_KEY_PREFIX, userId);
  try {
    const rawUnified = localStorage.getItem(unifiedKey);
    if (rawUnified !== null) {
      const parsed = JSON.parse(rawUnified);
      return Array.isArray(parsed) ? (parsed as QueueItem[]) : [];
    }
  } catch {
    // fallback to checking legacy keys
  }

  // Migrate from separate legacy stores if unified key does not exist yet
  const oldWaitlistKey = getStorageKey(OLD_WAITLIST_KEY_PREFIX, userId);
  const oldFailedKey = getStorageKey(OLD_FAILED_KEY_PREFIX, userId);

  const oldWaitlist = loadFromStorage<LegacyWaitlistItem>(oldWaitlistKey);
  const oldFailed = loadFromStorage<LegacyFailedEntry>(oldFailedKey);

  if (oldWaitlist.length === 0 && oldFailed.length === 0) {
    return [];
  }

  const migratedFailed: QueueItem[] = oldFailed.map((f) => ({
    id: f.id || `queue_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    url: f.sourceUrl,
    sourceUrl: f.sourceUrl,
    sourceLabel: f.sourceLabel || formatSourceLabel(f.sourceUrl),
    addedAt: f.failedAt || new Date().toISOString(),
    origin: 'retry',
    status: 'failed',
    error: f.error ?? null,
    errorCode: f.errorCode ?? null,
    errorParams: f.errorParams ?? null,
    mode: f.mode ?? 'link',
  }));

  const migratedWaitlist: QueueItem[] = oldWaitlist.map((w) => ({
    id: w.id || `queue_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    url: w.url,
    sourceUrl: w.url,
    sourceLabel: w.sourceLabel || formatSourceLabel(w.url),
    addedAt: w.addedAt || new Date().toISOString(),
    origin: w.origin ?? 'manual',
    status: 'waiting',
  }));

  // Merge failed first, then waiting (avoiding URL duplicates)
  const seenUrls = new Set<string>();
  const merged: QueueItem[] = [];

  for (const item of [...migratedFailed, ...migratedWaitlist]) {
    const norm = item.url.trim().toLowerCase();
    if (!norm || seenUrls.has(norm)) continue;
    seenUrls.add(norm);
    merged.push(item);
  }

  const finalQueue = merged.slice(0, MAX_QUEUE_ITEMS);
  saveToStorage(unifiedKey, finalQueue);

  try {
    localStorage.removeItem(oldWaitlistKey);
    localStorage.removeItem(oldFailedKey);
  } catch {
    /* ignore */
  }

  return finalQueue;
}

export const ExtractionQueueProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const { t, language } = useI18n();
  const toast = useToast();

  const [items, setItems] = useState<QueueItem[]>(() => loadQueueWithMigration(userId));

  useEffect(() => {
    setItems(loadQueueWithMigration(userId));
  }, [userId]);

  const waitingCount = useMemo(() => items.filter((i) => i.status === 'waiting').length, [items]);
  const failedCount = useMemo(() => items.filter((i) => i.status === 'failed').length, [items]);

  const addToQueue = useCallback(
    (rawUrl: string, origin: 'share' | 'manual' | 'retry' = 'manual'): boolean => {
      const cleanUrl = rawUrl.trim();
      if (!cleanUrl) return false;

      let added = false;
      setItems((prev) => {
        const lower = cleanUrl.toLowerCase();
        const existingIdx = prev.findIndex((i) => i.url.toLowerCase() === lower);

        // Already in queue and waiting -> do nothing
        if (existingIdx !== -1 && prev[existingIdx].status === 'waiting') {
          return prev;
        }

        const newItem: QueueItem = {
          id:
            existingIdx !== -1
              ? prev[existingIdx].id
              : `queue_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          url: cleanUrl,
          sourceUrl: cleanUrl,
          sourceLabel: formatSourceLabel(cleanUrl),
          addedAt: new Date().toISOString(),
          origin,
          status: 'waiting',
        };

        const withoutExisting = prev.filter((_, idx) => idx !== existingIdx);
        const updated = [newItem, ...withoutExisting].slice(0, MAX_QUEUE_ITEMS);
        saveToStorage(getStorageKey(QUEUE_KEY_PREFIX, userId), updated);
        added = true;
        return updated;
      });

      return added;
    },
    [userId]
  );

  const removeFromQueue = useCallback(
    (idOrUrl: string) => {
      setItems((prev) => {
        const needle = idOrUrl.trim().toLowerCase();
        const updated = prev.filter(
          (item) => item.id !== idOrUrl && item.url.toLowerCase() !== needle
        );
        saveToStorage(getStorageKey(QUEUE_KEY_PREFIX, userId), updated);
        return updated;
      });
    },
    [userId]
  );

  const clearQueue = useCallback(() => {
    setItems([]);
    saveToStorage(getStorageKey(QUEUE_KEY_PREFIX, userId), []);
  }, [userId]);

  const retryItem = useCallback(
    (idOrUrl: string): boolean => {
      let found = false;
      setItems((prev) => {
        const needle = idOrUrl.trim().toLowerCase();
        const updated = prev.map((item) => {
          if (item.id === idOrUrl || item.url.toLowerCase() === needle) {
            found = true;
            return {
              ...item,
              status: 'waiting' as const,
              error: null,
              errorCode: null,
              errorParams: null,
              addedAt: new Date().toISOString(),
            };
          }
          return item;
        });
        if (found) {
          saveToStorage(getStorageKey(QUEUE_KEY_PREFIX, userId), updated);
        }
        return updated;
      });
      return found;
    },
    [userId]
  );

  const addFailedJob = useCallback(
    (entry: {
      sourceUrl: string;
      sourceLabel?: string;
      mode?: 'link' | 'photo';
      error?: string | null;
      errorCode?: string | null;
      errorParams?: ErrorParams | null;
      silentToast?: boolean;
    }) => {
      const cleanUrl = entry.sourceUrl.trim();
      if (!cleanUrl) return;

      if (!entry.silentToast) {
        const localizedError =
          resolveErrorCode(entry.errorCode, entry.errorParams ?? undefined, entry.error, language) ||
          t('error.default');

        toast.danger(t('toast.recipeFailedTitle'), {
          description: localizedError,
          duration: 4500,
          action: {
            label: t('queue.toast.viewWaitlist'),
            onClick: () => {
              if (window.location.hash !== '#/extract') {
                window.location.hash = '#/extract';
              }
            },
          },
        });
      }

      setItems((prev) => {
        const lower = cleanUrl.toLowerCase();
        const existing = prev.find((i) => i.url.toLowerCase() === lower);
        const label = entry.sourceLabel || existing?.sourceLabel || formatSourceLabel(cleanUrl);

        const newEntry: QueueItem = {
          id: existing?.id || `queue_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          url: cleanUrl,
          sourceUrl: cleanUrl,
          sourceLabel: label,
          mode: entry.mode ?? 'link',
          addedAt: new Date().toISOString(),
          origin: 'retry',
          status: 'failed',
          error: entry.error ?? null,
          errorCode: entry.errorCode ?? null,
          errorParams: entry.errorParams ?? null,
        };

        const withoutDuplicate = prev.filter((item) => item.url.toLowerCase() !== lower);
        const updated = [newEntry, ...withoutDuplicate].slice(0, MAX_QUEUE_ITEMS);
        saveToStorage(getStorageKey(QUEUE_KEY_PREFIX, userId), updated);
        return updated;
      });
    },
    [userId, language, t, toast]
  );

  // Backward compatibility getters & methods
  const waitlist = useMemo(() => items.filter((i) => i.status === 'waiting'), [items]);
  const failedJobs = useMemo(() => items.filter((i) => i.status === 'failed'), [items]);

  const clearWaitlist = useCallback(() => {
    setItems((prev) => {
      const updated = prev.filter((i) => i.status !== 'waiting');
      saveToStorage(getStorageKey(QUEUE_KEY_PREFIX, userId), updated);
      return updated;
    });
  }, [userId]);

  const clearFailedJobs = useCallback(() => {
    setItems((prev) => {
      const updated = prev.filter((i) => i.status !== 'failed');
      saveToStorage(getStorageKey(QUEUE_KEY_PREFIX, userId), updated);
      return updated;
    });
  }, [userId]);

  return (
    <ExtractionQueueContext.Provider
      value={{
        items,
        waitingCount,
        failedCount,
        addToQueue,
        removeFromQueue,
        clearQueue,
        addFailedJob,
        retryItem,
        waitlist,
        failedJobs,
        addToWaitlist: addToQueue,
        removeFromWaitlist: removeFromQueue,
        clearWaitlist,
        removeFailedJob: removeFromQueue,
        clearFailedJobs,
        moveFailedToWaitlist: retryItem,
      }}
    >
      {children}
    </ExtractionQueueContext.Provider>
  );
};

export function useExtractionQueue(): ExtractionQueueContextValue {
  const ctx = useContext(ExtractionQueueContext);
  if (!ctx) {
    throw new Error('useExtractionQueue must be used within ExtractionQueueProvider');
  }
  return ctx;
}
