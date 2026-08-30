import type { JobStatus, JobKind, ProgressData } from '@cookbook/shared';
import type { LlmUsage } from './llm.js';

/** Ephemeral client media hand-off: thumbnail + 4x4 grid or keyframes received from client. */
export interface ClientFramesPayload {
  thumbnailBase64?: string;
  gridBase64?: string;
  framesBase64?: string[];
}

/** An extraction task. Owns no recipe content — only a pointer to its result. */
export interface Job {
  id: string;
  userId: string;
  kind: JobKind;
  status: JobStatus;
  /** 'photo://<uploadId>' when kind === 'photo'. */
  sourceUrl: string;
  sourceUrlNormalized?: string | null;
  error?: string | null;
  progress?: ProgressData | null;
  /** Ephemeral client frames payload received while status was 'awaiting_frames'. Nulled on claim. */
  clientFrames?: ClientFramesPayload | null;
  /** Cached scraping result preserved while job is parked in awaiting_frames. */
  scrapeMeta?: unknown | null;
  /** The produced recipe. NULL until the job completes. */
  recipeId?: string | null;
  /** Remix input: the recipe being remixed and the instruction to apply. */
  parentRecipeId?: string | null;
  remixPrompt?: string | null;
  /**
   * Token/inference cost of THIS run. Deliberately not on the recipe: a shared
   * or published recipe must not carry the extractor's bill.
   */
  llmUsage?: LlmUsage | null;
  /** Total bytes of media (audio + video) downloaded by the worker for this job. */
  mediaBytes?: number;
  createdAt: string;
  updatedAt: string;
}
