/**
 * Frontend counterpart to `backend/src/errors.ts`: the machine-readable error
 * code registry. This module is intentionally message-free — it only knows the
 * set of codes and how to (de)serialize the transport/persisted envelope. The
 * localized copy for every code lives in the i18n dictionary (`uiTranslations`
 * under `error.codes.*`) and is resolved by `messageForCode` in `i18n.ts`.
 *
 * IMPORTANT: keep this list in sync with `AppErrorCode` in the backend and with
 * the `error.codes.*` entries in `i18n.ts`. A code with no i18n entry falls back
 * to a friendly generic message (never a raw dump), so an unmapped code degrades
 * gracefully rather than leaking internals.
 */
export type AppErrorCode =
  | 'MISSING_FIELD'
  | 'INVALID_FIELD'
  | 'INVALID_URL'
  | 'YOUTUBE_SHORTS_ONLY'
  | 'REMIX_PROMPT_TOO_LONG'
  | 'MESSAGE_TOO_LONG'
  | 'TOO_MANY_SCREENSHOTS'
  | 'SCREENSHOTS_TOO_LARGE'
  | 'TOO_MANY_PHOTOS'
  | 'PHOTOS_TOO_LARGE'
  | 'PHOTO_REQUIRED'
  | 'PARENT_JOB_NOT_COMPLETED'
  | 'UNAUTHORIZED'
  | 'PREMIUM_REQUIRED'
  | 'COOKBOOK_FULL'
  | 'RATE_LIMIT_EXCEEDED'
  | 'ACTIVE_JOB_EXISTS'
  | 'TOO_MANY_REQUESTS'
  | 'JOB_NOT_FOUND'
  | 'RECIPE_NOT_FOUND'
  | 'COLLECTION_NOT_FOUND'
  | 'PARENT_JOB_NOT_FOUND'
  | 'SCRAPE_FAILED'
  | 'SCRAPE_TIMEOUT'
  | 'VIDEO_TOO_LONG'
  | 'MEDIA_DOWNLOAD_FAILED'
  | 'NOT_A_RECIPE'
  | 'MULTIPLE_RECIPES'
  | 'WEBSITE_NO_RECIPE'
  | 'PHOTO_UNREADABLE'
  | 'PHOTO_NOT_MATCHING'
  | 'PHOTO_IMPORT_EXPIRED'
  | 'EXTRACTION_FAILED'
  | 'UNRELATED_REMIX_REQUEST'
  | 'PHOTO_UPLOAD_FAILED'
  | 'REVENUECAT_FAILED'
  | 'PROFILE_UPDATE_FAILED'
  | 'CHAT_CHIPS_FAILED'
  | 'REMIX_CONFIRM_FAILED'
  | 'CHAT_FAILED'
  | 'ACCOUNT_DELETE_FAILED'
  | 'FRIEND_CODE_INVALID'
  | 'FRIEND_SELF'
  | 'ALREADY_FRIENDS'
  | 'REQUEST_EXISTS'
  | 'FRIENDSHIP_NOT_FOUND'
  | 'PROFILE_NAME_INVALID'
  | 'INTERNAL_ERROR';

export type ErrorParams = Record<string, string | number>;

/** Transport/persisted shape emitted by the backend for async job failures. */
export interface SerializedError {
  code: AppErrorCode;
  params?: ErrorParams;
}

/** The complete set of known error codes (single source of truth on the client). */
export const ALL_ERROR_CODES: readonly AppErrorCode[] = [
  'MISSING_FIELD',
  'INVALID_FIELD',
  'INVALID_URL',
  'YOUTUBE_SHORTS_ONLY',
  'REMIX_PROMPT_TOO_LONG',
  'MESSAGE_TOO_LONG',
  'TOO_MANY_SCREENSHOTS',
  'SCREENSHOTS_TOO_LARGE',
  'TOO_MANY_PHOTOS',
  'PHOTOS_TOO_LARGE',
  'PHOTO_REQUIRED',
  'PARENT_JOB_NOT_COMPLETED',
  'UNAUTHORIZED',
  'PREMIUM_REQUIRED',
  'COOKBOOK_FULL',
  'RATE_LIMIT_EXCEEDED',
  'ACTIVE_JOB_EXISTS',
  'TOO_MANY_REQUESTS',
  'JOB_NOT_FOUND',
  'RECIPE_NOT_FOUND',
  'COLLECTION_NOT_FOUND',
  'PARENT_JOB_NOT_FOUND',
  'SCRAPE_FAILED',
  'SCRAPE_TIMEOUT',
  'VIDEO_TOO_LONG',
  'MEDIA_DOWNLOAD_FAILED',
  'NOT_A_RECIPE',
  'MULTIPLE_RECIPES',
  'WEBSITE_NO_RECIPE',
  'PHOTO_UNREADABLE',
  'PHOTO_NOT_MATCHING',
  'PHOTO_IMPORT_EXPIRED',
  'EXTRACTION_FAILED',
  'UNRELATED_REMIX_REQUEST',
  'PHOTO_UPLOAD_FAILED',
  'REVENUECAT_FAILED',
  'PROFILE_UPDATE_FAILED',
  'CHAT_CHIPS_FAILED',
  'REMIX_CONFIRM_FAILED',
  'CHAT_FAILED',
  'ACCOUNT_DELETE_FAILED',
  'FRIEND_CODE_INVALID',
  'FRIEND_SELF',
  'ALREADY_FRIENDS',
  'REQUEST_EXISTS',
  'FRIENDSHIP_NOT_FOUND',
  'PROFILE_NAME_INVALID',
  'INTERNAL_ERROR',
];

const ERROR_CODE_SET = new Set<string>(ALL_ERROR_CODES);

/** True when `code` is a known {@link AppErrorCode}. */
export function isKnownErrorCode(code: string): code is AppErrorCode {
  return ERROR_CODE_SET.has(code);
}

/** Non-temporary (permanent) error codes that will not succeed upon immediate retry. */
export const NON_RETRYABLE_ERROR_CODES: ReadonlySet<AppErrorCode> = new Set<AppErrorCode>([
  'MISSING_FIELD',
  'INVALID_FIELD',
  'INVALID_URL',
  'YOUTUBE_SHORTS_ONLY',
  'REMIX_PROMPT_TOO_LONG',
  'MESSAGE_TOO_LONG',
  'TOO_MANY_SCREENSHOTS',
  'SCREENSHOTS_TOO_LARGE',
  'TOO_MANY_PHOTOS',
  'PHOTOS_TOO_LARGE',
  'PARENT_JOB_NOT_COMPLETED',
  'UNAUTHORIZED',
  'PREMIUM_REQUIRED',
  'COOKBOOK_FULL',
  'RATE_LIMIT_EXCEEDED',
  'JOB_NOT_FOUND',
  'RECIPE_NOT_FOUND',
  'COLLECTION_NOT_FOUND',
  'PARENT_JOB_NOT_FOUND',
  'VIDEO_TOO_LONG',
  'NOT_A_RECIPE',
  'MULTIPLE_RECIPES',
  'WEBSITE_NO_RECIPE',
  // Retrying the same photos would fail identically — the user needs to take
  // better ones, so the UI hides the retry button.
  'PHOTO_UNREADABLE',
  'PHOTO_REQUIRED',
  'PHOTO_NOT_MATCHING',
  'UNRELATED_REMIX_REQUEST',
]);

/**
 * Returns true if an error code or raw error message represents a temporary (transient)
 * error that can be meaningfully retried by pressing "Retry".
 * Non-temporary (permanent) errors (e.g. invalid URLs, non-recipe videos, quota limits)
 * return false so the UI hides the retry button.
 */
export function isRetryableError(
  code?: string | null,
  rawError?: string | null
): boolean {
  if (code && isKnownErrorCode(code) && NON_RETRYABLE_ERROR_CODES.has(code)) {
    return false;
  }

  if (rawError && typeof rawError === 'string') {
    const lower = rawError.toLowerCase();
    if (
      lower.includes('invalidurl') ||
      lower.includes('invalid_url') ||
      lower.includes('unauthorized') ||
      lower.includes('not_a_recipe') ||
      lower.includes('cookbook_full') ||
      lower.includes('premium_required')
    ) {
      return false;
    }
  }

  return true;
}

/**
 * Attempts to parse a persisted job `error` string as a {@link SerializedError}
 * envelope (`{"code":...,"params":...}`). Returns null when the string is not an
 * envelope (legacy raw text, an i18n key, or a bare code).
 */
export function parseSerializedError(raw: string): SerializedError | null {
  const trimmed = raw.trim();
  if (!trimmed.startsWith('{')) return null;
  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (parsed && typeof parsed === 'object' && typeof (parsed as any).code === 'string') {
      return parsed as SerializedError;
    }
  } catch {
    /* not JSON — fall through */
  }
  return null;
}

