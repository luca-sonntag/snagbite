import React from 'react';
import type { ExtractionJob, ProgressData, LimitStatus } from '../../types';

export type ExtractMode = 'link' | 'photo';

export interface DemoRecipe {
  name: string;
  time: string;
  imageUrl: string;
  platform: string;
  url: string;
  icon: React.ReactNode;
}

export interface ExtractFormProps {
  isActive?: boolean;
  url: string;
  setUrl: (url: string) => void;
  urlError: string;
  setUrlError?: (error: string) => void;
  validateUrl: (url: string) => boolean;
  isPending: boolean;
  handleFormSubmit: (e: React.FormEvent) => void;
  limitStatus?: LimitStatus | null;
  jobStatus: ExtractionJob['status'] | null;
  progress: ProgressData | null;
  errorBanner?: React.ReactNode;
  mode: ExtractMode;
  setMode: (mode: ExtractMode) => void;
  photos: File[];
  setPhotos: (photos: File[]) => void;
  isUploadingPhotos: boolean;
  claimRewardedCredit?: () => Promise<boolean>;
}

export interface PhotoExtractGridProps {
  photos: File[];
  photoPreviews: string[];
  cameraInputRef: React.RefObject<HTMLInputElement | null>;
  galleryInputRef: React.RefObject<HTMLInputElement | null>;
  onPhotoChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemovePhoto: (index: number) => void;
  onOpenPicker: (ref: React.RefObject<HTMLInputElement | null>) => void;
}

export interface UrlExtractInputProps {
  url: string;
  setUrl: (url: string) => void;
  urlError: string;
  validateUrl: (url: string) => boolean;
  isPending: boolean;
  canPaste: boolean;
  onPaste: () => void;
}

export interface ExtractDemoRecipesProps {
  onDemoClick: (url: string) => void;
}

export interface ExtractModeTilesProps {
  mode: ExtractMode;
  setMode: (mode: ExtractMode) => void;
  photosCount: number;
  disabled?: boolean;
}

export interface MagicClipboardBannerProps {
  detectedUrl: string;
  onApply: (url: string) => void;
  onDismiss: () => void;
  disabled?: boolean;
}

export interface ExtractQuotaBadgeProps {
  limitStatus?: LimitStatus | null;
  isRealPremium?: boolean;
  activeCount?: number;
  maxConcurrent?: number;
}

export interface QuickShareTipCardProps {
  onLearnMore?: () => void;
}

export interface UseExtractFormProps {
  url: string;
  setUrl: (url: string) => void;
  urlError: string;
  setUrlError?: (error: string) => void;
  validateUrl: (url: string) => boolean;
  isPending: boolean;
  photos: File[];
  setPhotos: (photos: File[]) => void;
  blockedByLimit: boolean;
  atConcurrencyLimit: boolean;
  setIsPremiumModalOpen: (open: boolean) => void;
  handleFormSubmit?: (e: React.FormEvent) => void;
}
