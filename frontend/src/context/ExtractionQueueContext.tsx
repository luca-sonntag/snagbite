import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from './AuthContext';
import { useI18n } from './I18nContext';
import { useToast } from './ToastContext';
import { resolveErrorCode } from '../i18n';
import { formatSourceLabel } from '../utils/sourceLabel';
import type { ErrorParams } from '../errorCodes';
import {
  QUEUE_KEY_PREFIX,
  MAX_QUEUE_ITEMS,
  getStorageKey,
  saveToStorage,
  loadQueueWithMigration,
} from './queueStorage';

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
  isQueueSheetOpen: boolean;
  setIsQueueSheetOpen: (open: boolean) => void;
  openQueueSheet: () => void;
  closeQueueSheet: () => void;
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

export const ExtractionQueueProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const { t, language } = useI18n();
  const toast = useToast();

  const [items, setItems] = useState<QueueItem[]>(() => loadQueueWithMigration(userId));
  const [isQueueSheetOpen, setIsQueueSheetOpen] = useState(false);

  const openQueueSheet = useCallback(() => {
    setIsQueueSheetOpen(true);
  }, []);

  const closeQueueSheet = useCallback(() => {
    setIsQueueSheetOpen(false);
  }, []);

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
              setIsQueueSheetOpen(true);
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
        isQueueSheetOpen,
        setIsQueueSheetOpen,
        openQueueSheet,
        closeQueueSheet,
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
