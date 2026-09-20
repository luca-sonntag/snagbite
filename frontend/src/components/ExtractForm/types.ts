import React from 'react';
import type { ExtractionJob, ProgressData, LimitStatus, Recipe } from '../../types';

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
  handleFormSubmit: (e: React.FormEvent, overrideUrl?: string) => void;
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
  onSavePublicRecipe?: (recipe: Recipe) => Promise<void>;
  savedRecipeIds?: Set<string>;
  initialOpenSheet?: 'link' | 'photo' | null;
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
  onDemoClick: (url: string, recipe?: Recipe) => Promise<void> | void;
  savedRecipeIds?: Set<string>;
  className?: string;
}

export interface ExtractActionCardsProps {
  onOpenLinkSheet: () => void;
  onOpenPhotoSheet: () => void;
  photosCount?: number;
  disabled?: boolean;
  linkDisabled?: boolean;
}

export interface ExtractQuotaBadgeProps {
  limitStatus?: LimitStatus | null;
  isRealPremium?: boolean;
  activeCount?: number;
  maxConcurrent?: number;
}

export interface UrlExtractSheetProps {
  isOpen: boolean;
  onClose: () => void;
  url: string;
  setUrl: (url: string) => void;
  urlError: string;
  validateUrl: (url: string) => boolean;
  isPending: boolean;
  canPaste: boolean;
  onPaste: () => void;
  submitDisabled: boolean;
  isWaitlistMode?: boolean;
  handleFormSubmit: (e: React.FormEvent, overrideUrl?: string) => void;
}

export interface PhotoExtractSheetProps {
  isOpen: boolean;
  onClose: () => void;
  photos: File[];
  photoPreviews: string[];
  cameraInputRef: React.RefObject<HTMLInputElement | null>;
  galleryInputRef: React.RefObject<HTMLInputElement | null>;
  onPhotoChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemovePhoto: (index: number) => void;
  onOpenPicker: (ref: React.RefObject<HTMLInputElement | null>) => void;
  isPending: boolean;
  isUploadingPhotos: boolean;
  submitDisabled: boolean;
  handleFormSubmit: (e: React.FormEvent) => void;
}

export interface UseExtractFormProps {
  url: string;
  setUrl: (url: string) => void;
  urlError?: string;
  setUrlError?: (error: string) => void;
  validateUrl: (url: string) => boolean;
  isPending: boolean;
  photos: File[];
  setPhotos: (photos: File[]) => void;
  blockedByLimit: boolean;
  atConcurrencyLimit: boolean;
  setIsPremiumModalOpen: (open: boolean) => void;
  onAutoSubmit?: (url: string) => void;
}
