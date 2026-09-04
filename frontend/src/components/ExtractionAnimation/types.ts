import type { ExtractionJob, ProgressData, ProgressStage, RecipePreviewData } from '../../types';

export interface ExtractionAnimationProps {
  url: string;
  isPending: boolean;
  jobStatus: ExtractionJob['status'] | null;
  progress: ProgressData | null;
  /** Which stage sequence to walk — photo imports never scrape or download. */
  variant?: 'link' | 'photo';
  /** Compact height layout for free users when an ad banner is rendered below. */
  compact?: boolean;
  /** Direct client-side photo preview URL from local file input (photo mode). */
  photoPreviewUrl?: string;
}

export type PlatformType = 'instagram' | 'tiktok' | 'youtube' | 'web' | 'photo';

export interface ProgressiveRecipeState {
  displayedStage: ProgressStage;
  percent: number;
  preview: RecipePreviewData | null;
  platform: PlatformType;
  funnyText: string;
  isCompleted: boolean;
}
