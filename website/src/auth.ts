import { createAuthClient } from 'better-auth/react';
import { apiUrl } from './api';

const baseURL = apiUrl('');

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
