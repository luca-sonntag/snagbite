import { Capacitor } from '@capacitor/core';
import type { AuthUser } from '../auth';
import { isNative } from '../native';
import { APP_VERSION, APP_BUILD } from '../version';
import { getRecentLogs, type LogEntry } from './consoleBuffer';
import { compressImage, PREVIEW_PROFILE } from './imageCompression';

export interface FeedbackContext {
  appVersion: string;
  appBuild: string;
  platform: string;
  isNative: boolean;
  userAgent: string;
  language: string;
  route: string;
  viewport: string;
  userId?: string;
  email?: string;
  tier?: string;
  logs: LogEntry[];
}

/** Gather diagnostic context to attach to a bug report / feedback submission. */
export function collectFeedbackContext(user: AuthUser | null, language: string): FeedbackContext {
  return {
    appVersion: APP_VERSION,
    appBuild: APP_BUILD,
    platform: Capacitor.getPlatform(),
    isNative: isNative(),
    userAgent: navigator.userAgent,
    language,
    route: window.location.hash || '/',
    viewport: `${window.innerWidth}x${window.innerHeight}`,
    userId: user?.id,
    email: user?.email,
    tier: (user?.app_metadata?.tier as string | undefined) ?? 'free',
    logs: getRecentLogs(),
  };
}

/**
 * Compress an image File into a JPEG data-URL (max 800px longest edge, 75%
 * quality). Keeps screenshot payloads small enough to fit under the backend's
 * 1mb JSON body cap.
 */
export function compressScreenshot(file: File): Promise<string> {
  return compressImage(file, PREVIEW_PROFILE);
}
