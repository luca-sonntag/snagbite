import type React from 'react';
import type { ProFeatureId } from '../ProFeatureSheet/types';

export type DevOverlayName =
  | 'onboarding'
  | 'adNotice'
  | 'premium'
  | 'alphaWelcome'
  | 'reward'
  | 'feedback'
  | 'proFeature'
  | 'cooked'
  | 'notificationPrompt'
  | 'timerConfirm'
  | 'alert'
  | 'confirm'
  | 'toast'
  | 'ota';

export interface DevRewardOptions {
  xp?: number;
  base?: number;
  photoBonus?: number;
  streakBonus?: number;
  timerBonus?: number;
  levelUp?: boolean;
  level?: number;
  badges?: string[];
  streak?: number;
}

export interface DevCookedOptions {
  recipeId?: string;
  recipeTitle?: string;
  viaCookingMode?: boolean;
}

export interface DevTimerOptions {
  durationSeconds?: number;
  label?: string;
  recipeId?: string;
  stepNum?: number;
}

export interface DevAlertOptions {
  title?: string;
  message?: React.ReactNode;
  status?: 'info' | 'warning' | 'danger' | 'success';
  confirmLabel?: string;
}

export interface DevConfirmOptions {
  title?: string;
  message?: React.ReactNode;
  status?: 'info' | 'warning' | 'danger' | 'success';
  confirmLabel?: string;
  cancelLabel?: string;
}

export interface DevToastOptions {
  message?: string;
  type?: 'info' | 'success' | 'danger' | 'error' | 'warning';
}

export interface DevOtaOptions {
  version?: string;
  bundleId?: string;
}

export type DevOverlayOptions =
  | DevRewardOptions
  | DevCookedOptions
  | DevTimerOptions
  | DevAlertOptions
  | DevConfirmOptions
  | DevToastOptions
  | DevOtaOptions
  | ProFeatureId
  | Record<string, unknown>;

export interface ActiveDevOverlay {
  name: DevOverlayName;
  options?: DevOverlayOptions;
}

export interface DevShowFunction {
  (target: DevOverlayName | string, options?: DevOverlayOptions): void;
  onboarding: () => void;
  adNotice: () => void;
  premium: () => void;
  alphaWelcome: () => void;
  reward: (opts?: DevRewardOptions) => void;
  feedback: () => void;
  proFeature: (featureId?: ProFeatureId) => void;
  cooked: (opts?: DevCookedOptions) => void;
  notificationPrompt: () => void;
  timerConfirm: (opts?: DevTimerOptions) => void;
  alert: (opts?: DevAlertOptions) => void;
  confirm: (opts?: DevConfirmOptions) => void;
  toast: (opts?: DevToastOptions | string) => void;
  ota: (opts?: DevOtaOptions) => void;
}

export interface DevToolsApi {
  show: DevShowFunction;
  close: () => void;
  help: () => void;
  list: () => void;
}

declare global {
  interface Window {
    dev?: DevToolsApi;
    cookbookDev?: DevToolsApi;
  }
}
