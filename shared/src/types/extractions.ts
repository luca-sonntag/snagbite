export interface LimitStatus {
  limit: number;
  used: number;
  remaining: number;
  windowDays: number;
  tier: 'free' | 'alpha' | 'premium';
  savedRecipes: number;
  maxSavedRecipes: number;
  cookbookFull: boolean;
  maxConcurrent: number;
  activeCount: number;
  rewardedAdBonusCredits?: number;
}

export type JobStatus = 'pending' | 'scraping' | 'processing' | 'awaiting_frames' | 'completed' | 'failed' | 'cancelled';
export type JobKind = 'url' | 'photo' | 'remix';
export type ProgressStage = 'queued' | 'scraping' | 'downloading_media' | 'extracting_frames' | 'reading_photos' | 'awaiting_frames' | 'extracting_recipe' | 'generating_cover' | 'finalizing';

export interface RecipePreviewData {
  thumbnailUrl?: string;
  authorHandle?: string;
  title?: string;
  category?: string;
  servings?: number;
  totalTimeMinutes?: number;
  ingredientCount?: number;
  ingredientsSample?: string[];
  stepCount?: number;
  coverUrl?: string;
}

export interface ProgressData {
  percent: number;
  stage: ProgressStage;
  preview?: RecipePreviewData;
}

export interface MediaRequest {
  videoUrl?: string;
  thumbnailUrl?: string;
  durationSeconds?: number;
  kind?: 'audio' | 'video' | 'keyframes';
  status?: 'pending' | 'downloading' | 'ready' | 'failed';
  url?: string;
  mediaType?: string;
  fileSize?: number;
  duration?: number;
  error?: string;
}

export interface ExtractionJob {
  id: string;
  kind: JobKind;
  sourceUrl: string;
  status: JobStatus;
  progress?: ProgressData | null;
  mediaRequest?: MediaRequest | null;
  error?: string;
  recipeId?: string | null;
  title?: string | null;
  parentRecipeId?: string | null;
  remixPrompt?: string | null;
  createdAt: string | number;
  updatedAt?: string;
  media?: MediaRequest;
}
