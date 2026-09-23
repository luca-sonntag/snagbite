import type { QueueItem } from './ExtractionQueueContext';
import { formatSourceLabel } from '../utils/sourceLabel';
import type { ErrorParams } from '../errorCodes';

export const QUEUE_KEY_PREFIX = 'kb_extraction_queue';
export const OLD_WAITLIST_KEY_PREFIX = 'kb_extraction_waitlist';
export const OLD_FAILED_KEY_PREFIX = 'kb_extraction_failed';
export const MAX_QUEUE_ITEMS = 30;

export function getStorageKey(prefix: string, userId?: string | null): string {
  return `${prefix}_${userId || 'anon'}`;
}

export function loadFromStorage<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

export function saveToStorage<T>(key: string, data: T[]): void {
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

export function loadQueueWithMigration(userId?: string | null): QueueItem[] {
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
