/**
 * Operator alerts: push notifications to the app operator (not to end users —
 * those live in `notifications/` + `push/`). Every alertable business event is
 * declared once in {@link AlertEventMap}; the compiler then forces a matching
 * formatter in `formatters.ts`.
 */

/** How a new account was created (derived from the Better-Auth endpoint). */
export type SignupMethod = 'email' | 'google' | 'google-one-tap' | 'oauth' | 'unknown';

/** Where a failed extraction job came from. */
export type JobSource = 'instagram' | 'tiktok' | 'youtube' | 'facebook' | 'photo' | 'website';

/**
 * Payload per event type. Fields marked as personal data (`email`, free-text
 * `message`) are only rendered when `ALERTS_INCLUDE_PII=true`.
 */
export interface AlertEventMap {
  'user.signed_up': {
    /** Total user count after this signup, `null` when the count query failed. */
    userNumber: number | null;
    method: SignupMethod;
    /** Personal data — rendered masked and only with `includePii`. */
    email: string | null;
  };
  'user.deleted': {
    accountAgeDays: number | null;
    /** Personal data — rendered masked and only with `includePii`. */
    email: string | null;
  };
  'subscription.changed': {
    previousTier: string | null;
    newTier: string;
    source: 'revenuecat' | 'client-fallback';
  };
  'feedback.created': {
    feedbackType: 'bug' | 'idea';
    /** Personal data (free text) — excerpt rendered only with `includePii`. */
    message: string;
    screenshotCount: number;
  };
  'job.failed': {
    errorCode: string;
    source: JobSource;
    /** Technical detail for non-AppError failures (truncated in the alert). */
    detail: string | null;
  };
}

export type AlertEventType = keyof AlertEventMap;

/** Discriminated union of all alertable events. */
export type AlertEvent = {
  [K in AlertEventType]: { type: K; payload: AlertEventMap[K] };
}[AlertEventType];

/** ntfy priority scale: 1 = min, 3 = default, 5 = urgent. */
export type AlertPriority = 1 | 2 | 3 | 4 | 5;

/** Channel-neutral alert produced by a formatter. */
export interface FormattedAlert {
  title: string;
  message: string;
  priority: AlertPriority;
  /** ntfy tags; emoji shortcodes (e.g. `tada`) render as an icon before the title. */
  tags: string[];
  clickUrl?: string;
}

/** Context a formatter needs besides the payload. */
export interface FormatContext {
  includePii: boolean;
  adminUrl?: string;
}

/** A delivery target (ntfy today; Telegram, Discord, mail … later). */
export interface AlertChannel {
  readonly name: string;
  send(alert: FormattedAlert): Promise<void>;
}

/** Runtime switches resolved from the environment (see `settings.ts`). */
export interface AlertSettings {
  enabled: boolean;
  /** Prefix such as `dev` for non-production environments, `null` in production. */
  envLabel: string | null;
  disabledEvents: ReadonlySet<string>;
  includePii: boolean;
  adminUrl?: string;
}
