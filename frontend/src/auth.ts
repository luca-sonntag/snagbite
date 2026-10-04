import { createAuthClient } from 'better-auth/react';
import { inferAdditionalFields } from 'better-auth/client/plugins';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '');
const baseURL = API_BASE_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');

export const AUTH_TOKEN_KEY = 'snagbite.auth.token';

export function getStoredToken(): string | null {
  try {
    return localStorage.getItem(AUTH_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token: string | null): void {
  try {
    if (token) {
      localStorage.setItem(AUTH_TOKEN_KEY, token);
    } else {
      localStorage.removeItem(AUTH_TOKEN_KEY);
    }
  } catch {
    // Ignore storage errors in restricted contexts
  }
}

export const authClient = createAuthClient({
  baseURL,
  plugins: [
    inferAdditionalFields<{
      user: {
        tier: string;
        bonusCredits: number;
        customExtractionLimit?: number;
        notificationsEnabled: boolean;
      };
    }>(),
  ],
  fetchOptions: {
    onRequest(context) {
      const token = getStoredToken();
      if (token) {
        context.headers.set('authorization', `Bearer ${token}`);
      }
    },
    onResponse(context) {
      const setAuthToken = context.response.headers.get('set-auth-token');
      if (setAuthToken) {
        setStoredToken(setAuthToken);
      }
    },
  },
});

export interface AuthUser {
  id: string;
  email?: string;
  name?: string;
  image?: string;
  tier?: string;
  bonusCredits?: number;
  notificationsEnabled?: boolean;
  user_metadata?: {
    name?: string;
    notifications_enabled?: boolean;
    [key: string]: any;
  };
  app_metadata?: {
    tier?: string;
    [key: string]: any;
  };
}

export interface AuthSession {
  token: string;
  access_token: string;
  user: AuthUser;
  expiresAt: Date | string;
}

export function normalizeUser(rawUser: any): AuthUser {
  const tier = rawUser.tier || rawUser.app_metadata?.tier || 'free';
  return {
    ...rawUser,
    id: rawUser.id,
    email: rawUser.email,
    name: rawUser.name,
    image: rawUser.image,
    tier,
    bonusCredits: rawUser.bonusCredits ?? 0,
    notificationsEnabled: rawUser.notificationsEnabled ?? false,
    app_metadata: {
      tier,
      ...(rawUser.app_metadata || {}),
    },
    user_metadata: {
      name: rawUser.name,
      notifications_enabled: rawUser.notificationsEnabled,
      ...(rawUser.user_metadata || {}),
    },
  };
}

export function normalizeSession(token: string, rawUser: any, expiresAt?: Date | string): AuthSession {
  const user = normalizeUser(rawUser);
  return {
    token,
    access_token: token,
    user,
    expiresAt: expiresAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  };
}
