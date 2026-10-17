import { readFileSync } from 'fs';
import { importPKCS8, SignJWT } from 'jose';
import { config } from '../config.js';

/**
 * Minimal Firebase Cloud Messaging HTTP v1 sender.
 *
 * We deliberately avoid the heavy `firebase-admin` SDK: the only thing we need
 * is to mint an OAuth2 access token from the service account (a signed JWT
 * exchanged at Google's token endpoint) and POST a message to the v1 send
 * endpoint. `jose` (already a backend dependency)
 * signs the assertion, so no new dependency is required.
 */

const FCM_SCOPE = 'https://www.googleapis.com/auth/firebase.messaging';
const GOOGLE_TOKEN_URI = 'https://oauth2.googleapis.com/token';

interface ServiceAccount {
  client_email: string;
  private_key: string;
  token_uri?: string;
  project_id?: string;
}

let _serviceAccount: ServiceAccount | null | undefined;
let _cachedToken: { accessToken: string; expiresAt: number } | null = null;

/** Result of a single-token send so the caller can prune dead tokens. */
export interface FcmSendResult {
  token: string;
  ok: boolean;
  /** true when FCM says the token is permanently invalid (should be disabled). */
  unregistered: boolean;
  error?: string;
}

export interface FcmMessage {
  title: string;
  body: string;
  imageUrl?: string;
  /** String-only data payload (FCM v1 requires string values); used for tap routing. */
  data?: Record<string, string>;
}

/**
 * Load and cache the service-account credentials. `FCM_SERVICE_ACCOUNT_JSON` may
 * be the raw JSON (single-line env var) or an absolute path to the .json file.
 * Returns null when notifications are not configured.
 */
function getServiceAccount(): ServiceAccount | null {
  if (_serviceAccount !== undefined) return _serviceAccount;

  const raw = config.FCM_SERVICE_ACCOUNT_JSON?.trim();
  if (!raw) {
    _serviceAccount = null;
    return null;
  }

  try {
    const text = raw.startsWith('{') ? raw : readFileSync(raw, 'utf-8');
    const parsed = JSON.parse(text) as ServiceAccount;
    if (!parsed.client_email || !parsed.private_key) {
      throw new Error('service account missing client_email or private_key');
    }
    _serviceAccount = parsed;
  } catch (err: any) {
    console.error('[fcm] Failed to load FCM_SERVICE_ACCOUNT_JSON:', err.message);
    _serviceAccount = null;
  }
  return _serviceAccount;
}

/** Whether FCM is fully configured (project id + service account present). */
export function isFcmConfigured(): boolean {
  return !!config.FCM_PROJECT_ID && !!getServiceAccount();
}

/** Mint (and cache) a short-lived OAuth2 access token for the FCM scope. */
async function getAccessToken(): Promise<string> {
  const now = Date.now();
  if (_cachedToken && _cachedToken.expiresAt > now + 60_000) {
    return _cachedToken.accessToken;
  }

  const sa = getServiceAccount();
  if (!sa) throw new Error('FCM service account not configured');

  const tokenUri = sa.token_uri || GOOGLE_TOKEN_URI;
  const iat = Math.floor(now / 1000);
  const key = await importPKCS8(sa.private_key, 'RS256');
  const assertion = await new SignJWT({ scope: FCM_SCOPE })
    .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
    .setIssuer(sa.client_email)
    .setSubject(sa.client_email)
    .setAudience(tokenUri)
    .setIssuedAt(iat)
    .setExpirationTime(iat + 3600)
    .sign(key);

  const res = await fetch(tokenUri, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`FCM token exchange failed (${res.status}): ${detail}`);
  }

  const json = (await res.json()) as { access_token: string; expires_in: number };
  _cachedToken = {
    accessToken: json.access_token,
    expiresAt: now + (json.expires_in ?? 3600) * 1000,
  };
  return _cachedToken.accessToken;
}

/**
 * Send one message to a single device token. Returns a structured result rather
 * than throwing so the worker can keep going and disable dead tokens. An FCM
 * `UNREGISTERED` / `NOT_FOUND` error means the token is permanently invalid.
 */
export async function sendToToken(token: string, message: FcmMessage): Promise<FcmSendResult> {
  try {
    const accessToken = await getAccessToken();
    const projectId = config.FCM_PROJECT_ID;

    // Data-only FCM payload so Android OS does not auto-render text-only notifications.
    // Instead, Capacitor receives the data payload and LocalNotifications renders the
    // rich BigPictureStyle image banner with high priority.
    const dataPayload: Record<string, string> = {
      title: message.title,
      body: message.body,
      ...(message.imageUrl ? { imageUrl: message.imageUrl } : {}),
      ...(message.data ?? {}),
    };

    const payload = {
      message: {
        token,
        data: dataPayload,
        android: {
          priority: 'HIGH' as const,
        },
      },
    };

    const res = await fetch(
      `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      },
    );

    if (res.ok) return { token, ok: true, unregistered: false };

    const errText = await res.text().catch(() => '');
    // FCM v1 surfaces a dead token as HTTP 404 with status UNREGISTERED, or 400
    // INVALID_ARGUMENT for a malformed token — both mean "stop using this token".
    const unregistered =
      res.status === 404 ||
      /UNREGISTERED|NOT_FOUND|INVALID_ARGUMENT/i.test(errText);
    return { token, ok: false, unregistered, error: `HTTP ${res.status}: ${errText}` };
  } catch (err: any) {
    return { token, ok: false, unregistered: false, error: err?.message ?? String(err) };
  }
}
