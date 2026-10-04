import { Capacitor } from '@capacitor/core';
import { SocialLogin } from '@capgo/capacitor-social-login';
import { authClient, normalizeSession, setStoredToken, type AuthSession } from '../auth';

export const GOOGLE_WEB_CLIENT_ID = import.meta.env.VITE_GOOGLE_WEB_CLIENT_ID as string | undefined;

export const AUTO_SIGNIN_DISABLED_KEY = 'kb_auto_signin_disabled';
export const LEGAL_CONSENT_KEY = 'kb_legal_consent_v1';

let socialLoginInitialized: Promise<void> | null = null;

export function ensureSocialLoginInitialized(): Promise<void> {
  if (!socialLoginInitialized) {
    socialLoginInitialized = SocialLogin.initialize({
      google: { webClientId: GOOGLE_WEB_CLIENT_ID },
    });
  }
  return socialLoginInitialized;
}

export interface NativeSignInResult {
  success: boolean;
  session?: AuthSession;
  error?: string;
  cancelled?: boolean;
}

/**
 * Exchange a Google ID token from Capacitor SocialLogin with Better-Auth's One-Tap callback.
 */
async function exchangeIdTokenWithBackend(idToken: string): Promise<NativeSignInResult> {
  try {
    const res = await authClient.$fetch<{ token?: string; user?: any }>('/one-tap/callback', {
      method: 'POST',
      body: { idToken },
    });

    if (res.data?.token && res.data?.user) {
      setStoredToken(res.data.token);
      const session = normalizeSession(res.data.token, res.data.user);
      return { success: true, session };
    }

    if (res.error) {
      return { success: false, error: (res.error as any).message || 'One-tap callback failed' };
    }

    return { success: false, error: 'Empty response from authentication callback' };
  } catch (err: any) {
    return { success: false, error: err?.message || String(err) };
  }
}

/**
 * Silent Google sign-in on Android devices.
 */
export async function attemptSilentGoogleSignIn(): Promise<NativeSignInResult> {
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') return { success: false };
  if (!Capacitor.isPluginAvailable('SocialLogin')) return { success: false };
  if (!GOOGLE_WEB_CLIENT_ID) return { success: false };
  if (localStorage.getItem(AUTO_SIGNIN_DISABLED_KEY)) return { success: false };
  if (!localStorage.getItem(LEGAL_CONSENT_KEY)) return { success: false };

  try {
    await ensureSocialLoginInitialized();
    const { result } = await SocialLogin.login({
      provider: 'google',
      options: {
        style: 'bottom',
        filterByAuthorizedAccounts: false,
        autoSelectEnabled: true,
      },
    });

    const idToken = 'idToken' in result ? result.idToken : null;
    if (!idToken) {
      return { success: false, error: 'Google sign-in did not return an ID token.' };
    }

    return await exchangeIdTokenWithBackend(idToken);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    if (/cancel/i.test(message)) {
      return { success: false, cancelled: true };
    }
    return { success: false, error: message };
  }
}

/**
 * Interactive Google sign-in on native Android devices.
 */
export async function signInWithNativeGoogle(): Promise<NativeSignInResult> {
  if (!GOOGLE_WEB_CLIENT_ID) {
    return { success: false, error: 'Google sign-in is not configured (missing VITE_GOOGLE_WEB_CLIENT_ID).' };
  }

  try {
    await ensureSocialLoginInitialized();
    const { result } = await SocialLogin.login({
      provider: 'google',
      options: {},
    });

    const idToken = 'idToken' in result ? result.idToken : null;
    if (!idToken) {
      return { success: false, error: 'Google sign-in did not return an ID token.' };
    }

    return await exchangeIdTokenWithBackend(idToken);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    if (/cancel/i.test(message)) {
      return { success: false, cancelled: true };
    }
    return { success: false, error: message };
  }
}

/**
 * Clear cached native Google login state on sign-out.
 */
export async function signOutNativeGoogle(): Promise<void> {
  if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android' && Capacitor.isPluginAvailable('SocialLogin')) {
    await SocialLogin.logout({ provider: 'google' }).catch(() => {});
  }
}
