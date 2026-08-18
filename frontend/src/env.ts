// Centralized, typed access to the Vite env flags that configure the dev /
// preview experience. Keeping them here (instead of reading import.meta.env
// ad-hoc) makes it obvious which flags exist and keeps the auth bypass in a
// single, greppable place.

/**
 * When `true`, the app auto-signs-in with a seeded test user on startup instead
 * of showing the login form. Set ONLY in dev / preview builds via
 * `VITE_TEST_LOGIN=true` (see `.env.development`). It is never set in the
 * production / Play Store build, so the auto-login code below is dead code there.
 */
const TEST_LOGIN_FLAG = import.meta.env.VITE_TEST_LOGIN === 'true';

/** Test-user credentials. Injected as build variables / `.env.development.local` — never committed. */
export const TEST_USER_EMAIL = import.meta.env.VITE_TEST_USER_EMAIL as string | undefined;
export const TEST_USER_PASSWORD = import.meta.env.VITE_TEST_USER_PASSWORD as string | undefined;

/**
 * Auto-login is only active when the flag is on AND credentials are present, so
 * a misconfigured build (flag on, no creds) falls back to the normal login form
 * rather than crashing.
 */
export const TEST_LOGIN_ENABLED = TEST_LOGIN_FLAG && !!TEST_USER_EMAIL && !!TEST_USER_PASSWORD;

/**
 * App-open ad timing knobs (milliseconds). These default to the production
 * values and can be overridden — for on-device testing without editing code —
 * via `.env.development.local`, e.g. `VITE_APP_OPEN_MIN_INTERVAL_MS=5000`. That
 * makes the every-3rd-open cadence and the resume threshold fire in seconds
 * instead of hours so the flow is verifiable in a single sitting.
 */
function envMs(raw: string | undefined, fallback: number): number {
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

/** Minimum gap between two app-open ads (the time floor). Default 4h. */
export const APP_OPEN_MIN_INTERVAL_MS = envMs(
  import.meta.env.VITE_APP_OPEN_MIN_INTERVAL_MS as string | undefined,
  4 * 60 * 60 * 1000,
);

/** How long the app must be backgrounded before a resume counts as an eligible "open". Default 4h. */
export const APP_OPEN_RESUME_MIN_BG_MS = envMs(
  import.meta.env.VITE_APP_OPEN_RESUME_MIN_BG_MS as string | undefined,
  4 * 60 * 60 * 1000,
);
