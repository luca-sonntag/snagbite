import { createAuthClient } from 'better-auth/react';
import { API_BASE_URL } from './api';

function getAuthBaseUrl(): string {
  if (API_BASE_URL && (API_BASE_URL.startsWith('http://') || API_BASE_URL.startsWith('https://'))) {
    return API_BASE_URL;
  }
  if (typeof window !== 'undefined' && window.location?.origin) {
    return API_BASE_URL ? `${window.location.origin}${API_BASE_URL}` : window.location.origin;
  }
  return 'http://localhost:3000';
}

const baseURL = getAuthBaseUrl();

export const AUTH_TOKEN_KEY = 'snagbite.website.admin.token';

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
    // Ignore storage errors
  }
}

export const authClient = createAuthClient({
  baseURL,
  fetchOptions: {
    credentials: 'include',
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
