import type { AlertEventType } from './types.js';

/** At most `max` alerts of one type per sliding `windowMs`. */
export interface ThrottleRule {
  max: number;
  windowMs: number;
}

export type ThrottleRules = Partial<Record<AlertEventType, ThrottleRule>>;

export interface ThrottleDecision {
  allowed: boolean;
  /** Alerts of this type dropped since the last one that went out. */
  suppressedSinceLast: number;
}

export interface AlertThrottle {
  check(type: AlertEventType): ThrottleDecision;
}

/** Noisy events are capped; everything else passes unthrottled. */
export const DEFAULT_THROTTLE_RULES: ThrottleRules = {
  'job.failed': { max: 5, windowMs: 60 * 60 * 1000 },
};

/**
 * In-memory sliding-window throttle. Counts per process (web and worker are
 * throttled independently), which is good enough for operator alerts.
 */
export function createThrottle(rules: ThrottleRules, now: () => number = Date.now): AlertThrottle {
  const sent = new Map<AlertEventType, number[]>();
  const suppressed = new Map<AlertEventType, number>();

  return {
    check(type) {
      const rule = rules[type];
      if (!rule) return { allowed: true, suppressedSinceLast: 0 };

      const cutoff = now() - rule.windowMs;
      const recent = (sent.get(type) ?? []).filter((ts) => ts > cutoff);

      if (recent.length >= rule.max) {
        sent.set(type, recent);
        suppressed.set(type, (suppressed.get(type) ?? 0) + 1);
        return { allowed: false, suppressedSinceLast: 0 };
      }

      recent.push(now());
      sent.set(type, recent);
      const suppressedSinceLast = suppressed.get(type) ?? 0;
      suppressed.delete(type);
      return { allowed: true, suppressedSinceLast };
    },
  };
}
