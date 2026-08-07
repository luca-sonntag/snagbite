import type { Response } from 'express';

/**
 * Machine-readable error codes for the whole application.
 *
 * Every user-facing failure — synchronous API responses *and* asynchronous
 * worker/scrape failures persisted on a job — is identified by one of these
 * stable codes. The frontend maps each code to a localized (DE/EN) message
 * (see `frontend/src/errorCodes.ts`), so the wire only ever carries a code plus
 * a small, structured `params` bag for interpolation — never a pre-formatted,
 * locale-frozen sentence.
 *
 * IMPORTANT: this list is the single source of truth. When you add a code here,
 * add the matching message to `frontend/src/errorCodes.ts` (the two files are
 * kept deliberately in sync because backend and frontend are separate packages).
 */
export type AppErrorCode =
  // ── Request validation (400) ──────────────────────────────────────────────
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
  // ── Auth (401) ────────────────────────────────────────────────────────────
  | 'UNAUTHORIZED'
  // ── Limits & premium (403 / 429) ──────────────────────────────────────────
  | 'PREMIUM_REQUIRED'
  | 'COOKBOOK_FULL'
  | 'RATE_LIMIT_EXCEEDED'
  | 'ACTIVE_JOB_EXISTS'
  | 'TOO_MANY_REQUESTS'
  // ── Not found (404) ───────────────────────────────────────────────────────
  | 'JOB_NOT_FOUND'
  | 'RECIPE_NOT_FOUND'
  | 'COLLECTION_NOT_FOUND'
  | 'PARENT_JOB_NOT_FOUND'
  // ── Scraping / extraction (async worker failures) ─────────────────────────
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
  // ── Server (500) ──────────────────────────────────────────────────────────
  | 'PHOTO_UPLOAD_FAILED'
  | 'REVENUECAT_FAILED'
  | 'PROFILE_UPDATE_FAILED'
  | 'CHAT_CHIPS_FAILED'
  | 'REMIX_CONFIRM_FAILED'
  | 'CHAT_FAILED'
  | 'ACCOUNT_DELETE_FAILED'
  // ── Social (friends / profile) ────────────────────────────────────────────
  | 'FRIEND_CODE_INVALID'
  | 'FRIEND_SELF'
  | 'ALREADY_FRIENDS'
  | 'REQUEST_EXISTS'
  | 'FRIENDSHIP_NOT_FOUND'
  | 'PROFILE_NAME_INVALID'
  | 'INTERNAL_ERROR';

/** Structured, JSON-serializable values interpolated into the localized message. */
export type ErrorParams = Record<string, string | number>;

/** Default HTTP status per code, used when a call site doesn't override it. */
const DEFAULT_STATUS: Record<AppErrorCode, number> = {
  MISSING_FIELD: 400,
  INVALID_FIELD: 400,
  INVALID_URL: 400,
  YOUTUBE_SHORTS_ONLY: 400,
  REMIX_PROMPT_TOO_LONG: 400,
  MESSAGE_TOO_LONG: 400,
  TOO_MANY_SCREENSHOTS: 400,
  SCREENSHOTS_TOO_LARGE: 400,
  TOO_MANY_PHOTOS: 400,
  PHOTOS_TOO_LARGE: 413,
  PHOTO_REQUIRED: 400,
  PARENT_JOB_NOT_COMPLETED: 400,
  UNAUTHORIZED: 401,
  PREMIUM_REQUIRED: 403,
  COOKBOOK_FULL: 403,
  RATE_LIMIT_EXCEEDED: 429,
  ACTIVE_JOB_EXISTS: 429,
  TOO_MANY_REQUESTS: 429,
  JOB_NOT_FOUND: 404,
  RECIPE_NOT_FOUND: 404,
  COLLECTION_NOT_FOUND: 404,
  PARENT_JOB_NOT_FOUND: 404,
  SCRAPE_FAILED: 502,
  SCRAPE_TIMEOUT: 504,
  VIDEO_TOO_LONG: 400,
  MEDIA_DOWNLOAD_FAILED: 502,
  NOT_A_RECIPE: 422,
  MULTIPLE_RECIPES: 422,
  WEBSITE_NO_RECIPE: 422,
  PHOTO_UNREADABLE: 422,
  PHOTO_NOT_MATCHING: 422,
  PHOTO_IMPORT_EXPIRED: 500,
  EXTRACTION_FAILED: 500,
  UNRELATED_REMIX_REQUEST: 422,
  PHOTO_UPLOAD_FAILED: 502,
  REVENUECAT_FAILED: 500,
  PROFILE_UPDATE_FAILED: 500,
  CHAT_CHIPS_FAILED: 500,
  REMIX_CONFIRM_FAILED: 500,
  CHAT_FAILED: 500,
  ACCOUNT_DELETE_FAILED: 500,
  FRIEND_CODE_INVALID: 404,
  FRIEND_SELF: 400,
  ALREADY_FRIENDS: 409,
  REQUEST_EXISTS: 409,
  FRIENDSHIP_NOT_FOUND: 404,
  PROFILE_NAME_INVALID: 400,
  INTERNAL_ERROR: 500,
};

/**
 * A typed application error carrying a stable {@link AppErrorCode}, optional
 * interpolation `params`, and the HTTP status to answer with. The `message` is
 * an English developer/log string only — it is never shown to end users, who
 * always see the code-resolved localized text on the client.
 */
export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly params: ErrorParams;
  readonly httpStatus: number;

  constructor(
    code: AppErrorCode,
    options: { params?: ErrorParams; httpStatus?: number; message?: string } = {},
  ) {
    super(options.message ?? code);
    this.name = 'AppError';
    this.code = code;
    this.params = options.params ?? {};
    this.httpStatus = options.httpStatus ?? DEFAULT_STATUS[code];
  }
}

/** Type guard for {@link AppError}. */
export function isAppError(err: unknown): err is AppError {
  return err instanceof AppError;
}

/**
 * The persisted/transport shape of an error. Stored verbatim in the job's
 * `error` column (async failures) and returned in API responses (sync failures).
 * The frontend parses this into a localized message.
 */
export interface SerializedError {
  code: AppErrorCode;
  params?: ErrorParams;
}

/**
 * Serializes any thrown value into a compact JSON envelope for persistence in
 * the job `error` column. Unknown/non-AppError throws collapse to
 * `EXTRACTION_FAILED` so the user never sees a raw stack/library message; the
 * original text is kept in `params._detail` for admin/DB debugging only (the
 * frontend ignores underscore-prefixed params).
 */
export function serializeJobError(err: unknown): string {
  if (isAppError(err)) {
    const payload: SerializedError = { code: err.code };
    if (Object.keys(err.params).length > 0) payload.params = err.params;
    return JSON.stringify(payload);
  }
  const detail = err instanceof Error ? err.message : String(err);
  return JSON.stringify({ code: 'EXTRACTION_FAILED', params: { _detail: detail } } satisfies SerializedError);
}

/**
 * Writes a standardized error response: `{ success, code, params?, error }`.
 * `error` remains an English string for logs/back-compat; clients localize via
 * `code` + `params`. Non-AppError values become a generic `INTERNAL_ERROR`.
 */
export function sendAppError(res: Response, err: unknown): void {
  const appErr = isAppError(err) ? err : new AppError('INTERNAL_ERROR');
  const body: { success: false; code: AppErrorCode; params?: ErrorParams; error: string } = {
    success: false,
    code: appErr.code,
    error: appErr.message,
  };
  if (Object.keys(appErr.params).length > 0) body.params = appErr.params;
  res.status(appErr.httpStatus).json(body);
}
