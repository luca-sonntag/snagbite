import { EventEmitter } from 'node:events';
import type { JobStatus, ProgressData } from './types.js';

export interface JobEventPayload {
  jobId: string;
  status: JobStatus;
  progress?: ProgressData | null;
  recipeId?: string | null;
  title?: string | null;
  error?: string | null;
  mediaRequest?: {
    videoUrl: string;
    thumbnailUrl?: string;
    durationSeconds?: number;
  };
}

const jobEventsEmitter = new EventEmitter();
// High listener limit in case multiple SSE connections or tabs listen concurrently
jobEventsEmitter.setMaxListeners(1000);

/**
 * Emits a real-time event for a specific extraction job.
 */
export function emitJobEvent(payload: JobEventPayload): void {
  jobEventsEmitter.emit(`job:${payload.jobId}`, payload);
}

/**
 * Subscribes to real-time events for a specific extraction job.
 * Returns an unsubscribe callback.
 */
export function subscribeJobEvents(
  jobId: string,
  listener: (payload: JobEventPayload) => void
): () => void {
  const eventName = `job:${jobId}`;
  jobEventsEmitter.on(eventName, listener);
  return () => {
    jobEventsEmitter.off(eventName, listener);
  };
}

export interface RecipeEventPayload {
  recipeId: string;
  type: 'cover_ready' | 'cover_failed';
  imageUrl?: string | null;
  imageUrls?: string[];
  isAiCover?: boolean;
}

/**
 * Emits a real-time event for a specific recipe (e.g. background AI cover completion).
 */
export function emitRecipeEvent(payload: RecipeEventPayload): void {
  jobEventsEmitter.emit(`recipe:${payload.recipeId}`, payload);
}

/**
 * Subscribes to real-time events for a specific recipe.
 * Returns an unsubscribe callback.
 */
export function subscribeRecipeEvents(
  recipeId: string,
  listener: (payload: RecipeEventPayload) => void
): () => void {
  const eventName = `recipe:${recipeId}`;
  jobEventsEmitter.on(eventName, listener);
  return () => {
    jobEventsEmitter.off(eventName, listener);
  };
}

