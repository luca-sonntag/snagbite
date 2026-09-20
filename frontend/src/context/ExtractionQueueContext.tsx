import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { formatSourceLabel } from '../utils/sourceLabel';
import type { ErrorParams } from '../errorCodes';

export interface WaitlistItem {
  id: string;
  url: string;
  sourceLabel: string;
  addedAt: string;
  origin: 'share' | 'manual' | 'retry';
}

export interface FailedExtractionEntry {
  id: string;
  sourceUrl: string;
  sourceLabel: string;
  mode: 'link' | 'photo';
  failedAt: string;
  error?: string | null;
  errorCode?: string | null;
  errorParams?: ErrorParams | null;
}

export interface ExtractionQueueContextValue {
  waitlist: WaitlistItem[];
  failedJobs: FailedExtractionEntry[];
  addToWaitlist: (url: string, origin?: 'share' | 'manual' | 'retry') => boolean;
  removeFromWaitlist: (idOrUrl: string) => void;
  clearWaitlist: () => void;
  addFailedJob: (entry: {
    sourceUrl: string;
    sourceLabel?: string;
    mode?: 'link' | 'photo';
    error?: string | null;
    errorCode?: string | null;
    errorParams?: ErrorParams | null;
  }) => void;
  removeFailedJob: (idOrUrl: string) => void;
  clearFailedJobs: () => void;
  moveFailedToWaitlist: (id: string) => boolean;
}

const ExtractionQueueContext = createContext<ExtractionQueueContextValue | undefined>(undefined);

const WAITLIST_KEY_PREFIX = 'kb_extraction_waitlist';
const FAILED_KEY_PREFIX = 'kb_extraction_failed';
const MAX_WAITLIST_ITEMS = 30;
const MAX_FAILED_ITEMS = 10;

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

export const ExtractionQueueProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const [waitlist, setWaitlist] = useState<WaitlistItem[]>(() =>
    loadFromStorage<WaitlistItem>(getStorageKey(WAITLIST_KEY_PREFIX, userId))
  );

  const [failedJobs, setFailedJobs] = useState<FailedExtractionEntry[]>(() =>
    loadFromStorage<FailedExtractionEntry>(getStorageKey(FAILED_KEY_PREFIX, userId))
  );

  // Sync state on user change
  useEffect(() => {
    setWaitlist(loadFromStorage<WaitlistItem>(getStorageKey(WAITLIST_KEY_PREFIX, userId)));
    setFailedJobs(loadFromStorage<FailedExtractionEntry>(getStorageKey(FAILED_KEY_PREFIX, userId)));
  }, [userId]);

  const addToWaitlist = useCallback(
    (rawUrl: string, origin: 'share' | 'manual' | 'retry' = 'manual'): boolean => {
      const cleanUrl = rawUrl.trim();
      if (!cleanUrl) return false;

      let added = false;
      setWaitlist((prev) => {
        // Prevent duplicate URLs in waitlist
        if (prev.some((item) => item.url.toLowerCase() === cleanUrl.toLowerCase())) {
          return prev;
        }

        const newItem: WaitlistItem = {
          id: `wait_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          url: cleanUrl,
          sourceLabel: formatSourceLabel(cleanUrl),
          addedAt: new Date().toISOString(),
          origin,
        };

        const updated = [newItem, ...prev].slice(0, MAX_WAITLIST_ITEMS);
        saveToStorage(getStorageKey(WAITLIST_KEY_PREFIX, userId), updated);
        added = true;
        return updated;
      });

      return added;
    },
    [userId]
  );

  const removeFromWaitlist = useCallback(
    (idOrUrl: string) => {
      setWaitlist((prev) => {
        const needle = idOrUrl.trim().toLowerCase();
        const updated = prev.filter(
          (item) => item.id !== idOrUrl && item.url.toLowerCase() !== needle
        );
        saveToStorage(getStorageKey(WAITLIST_KEY_PREFIX, userId), updated);
        return updated;
      });
    },
    [userId]
  );

  const clearWaitlist = useCallback(() => {
    setWaitlist([]);
    saveToStorage(getStorageKey(WAITLIST_KEY_PREFIX, userId), []);
  }, [userId]);

  const addFailedJob = useCallback(
    (entry: {
      sourceUrl: string;
      sourceLabel?: string;
      mode?: 'link' | 'photo';
      error?: string | null;
      errorCode?: string | null;
      errorParams?: ErrorParams | null;
    }) => {
      const cleanUrl = entry.sourceUrl.trim();
      if (!cleanUrl) return;

      setFailedJobs((prev) => {
        const label = entry.sourceLabel || formatSourceLabel(cleanUrl);
        const newEntry: FailedExtractionEntry = {
          id: `fail_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          sourceUrl: cleanUrl,
          sourceLabel: label,
          mode: entry.mode ?? 'link',
          failedAt: new Date().toISOString(),
          error: entry.error ?? null,
          errorCode: entry.errorCode ?? null,
          errorParams: entry.errorParams ?? null,
        };

        // Remove previous entry with same URL if present so the newest error is on top
        const withoutDuplicate = prev.filter(
          (item) => item.sourceUrl.toLowerCase() !== cleanUrl.toLowerCase()
        );
        const updated = [newEntry, ...withoutDuplicate].slice(0, MAX_FAILED_ITEMS);
        saveToStorage(getStorageKey(FAILED_KEY_PREFIX, userId), updated);
        return updated;
      });
    },
    [userId]
  );

  const removeFailedJob = useCallback(
    (idOrUrl: string) => {
      setFailedJobs((prev) => {
        const needle = idOrUrl.trim().toLowerCase();
        const updated = prev.filter(
          (item) => item.id !== idOrUrl && item.sourceUrl.toLowerCase() !== needle
        );
        saveToStorage(getStorageKey(FAILED_KEY_PREFIX, userId), updated);
        return updated;
      });
    },
    [userId]
  );

  const clearFailedJobs = useCallback(() => {
    setFailedJobs([]);
    saveToStorage(getStorageKey(FAILED_KEY_PREFIX, userId), []);
  }, [userId]);

  const moveFailedToWaitlist = useCallback(
    (id: string): boolean => {
      const item = failedJobs.find((j) => j.id === id);
      if (!item) return false;
      const success = addToWaitlist(item.sourceUrl, 'retry');
      removeFailedJob(id);
      return success;
    },
    [failedJobs, addToWaitlist, removeFailedJob]
  );

  return (
    <ExtractionQueueContext.Provider
      value={{
        waitlist,
        failedJobs,
        addToWaitlist,
        removeFromWaitlist,
        clearWaitlist,
        addFailedJob,
        removeFailedJob,
        clearFailedJobs,
        moveFailedToWaitlist,
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
