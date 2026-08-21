import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { Capacitor } from '@capacitor/core';
import { SocialLogin } from '@capgo/capacitor-social-login';
import { supabase } from '../supabase';
import { apiUrl } from '../api';
import { TEST_LOGIN_ENABLED, TEST_USER_EMAIL, TEST_USER_PASSWORD } from '../env';
import { ONBOARDING_KEY } from '../hooks/useOnboarding';

const GOOGLE_WEB_CLIENT_ID = import.meta.env.VITE_GOOGLE_WEB_CLIENT_ID as string | undefined;

// Set after an explicit sign-out so the app doesn't immediately silent-sign-in
// again with the same on-device Google account on the next cold start.
// Cleared again once the user signs in (any method) of their own accord.
const AUTO_SIGNIN_DISABLED_KEY = 'kb_auto_signin_disabled';

// Set once the user has given consent to the privacy policy / terms by
// explicitly signing in from the AuthForm (which displays the consent notice).
// The silent on-device Google sign-in is gated on this flag so that NO data
// processing happens before the user has seen the legal notice — required for
// an Austrian sole proprietorship. Persists across sign-out (consent stays
// valid); only cleared by wiping app storage (e.g. reinstall).
const LEGAL_CONSENT_KEY = 'kb_legal_consent_v1';

// Lazily initialize the native Google Sign-In plugin exactly once. Safe to call
// repeatedly; only the first call hits the plugin.
let socialLoginInitialized: Promise<void> | null = null;
function ensureSocialLoginInitialized() {
  if (!socialLoginInitialized) {
    socialLoginInitialized = SocialLogin.initialize({
      google: { webClientId: GOOGLE_WEB_CLIENT_ID },
    });
  }
  return socialLoginInitialized;
}

// Best-effort silent sign-in with an on-device Google account (Android only —
// this app has no iOS platform, and the plugin's silent-selection options are
// documented as Android-only). Any failure (no account, ambiguous accounts,
// user dismissal) is expected and swallowed: the caller falls back to the
// normal AuthForm with no visible error.
async function attemptSilentGoogleSignIn(): Promise<{ success: boolean; error?: string }> {
  if (Capacitor.getPlatform() !== 'android') return { success: false };
  if (!GOOGLE_WEB_CLIENT_ID) return { success: false };
  if (localStorage.getItem(AUTO_SIGNIN_DISABLED_KEY)) return { success: false };
  // No silent sign-in before the user has seen the legal notice and consented
  // (by signing in explicitly at least once). This must be the first guard: it
  // prevents any Google/Supabase data processing on a fresh install.
  if (!localStorage.getItem(LEGAL_CONSENT_KEY)) return { success: false };

  try {
    console.log('attemptSilentGoogleSignIn: Initializing social login');
    await ensureSocialLoginInitialized();
    console.log('attemptSilentGoogleSignIn: Calling SocialLogin.login');
    const { result } = await SocialLogin.login({
      provider: 'google',
      options: {
        style: 'bottom',
        filterByAuthorizedAccounts: false,
        autoSelectEnabled: true,
      },
    });
    console.log('attemptSilentGoogleSignIn: SocialLogin.login completed', result);
    const idToken = 'idToken' in result ? result.idToken : null;
    if (!idToken) {
      console.warn('attemptSilentGoogleSignIn: No ID token returned from Google login');
      return { success: false, error: 'Google sign-in did not return an ID token.' };
    }

    console.log('attemptSilentGoogleSignIn: Signing in to Supabase with ID token');
    const { error } = await supabase.auth.signInWithIdToken({ provider: 'google', token: idToken });
    if (error) {
      console.error('attemptSilentGoogleSignIn: Supabase sign-in failed', error);
      return { success: false, error: error.message };
    }
    console.log('attemptSilentGoogleSignIn: Supabase sign-in successful');
    return { success: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error('attemptSilentGoogleSignIn: Error caught during silent login', message, e);
    // User dismissing the account picker / no account is not an error worth surfacing.
    if (/cancel/i.test(message)) {
      return { success: false };
    }
    return { success: false, error: message };
  }
}

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  // True when the current session was established by the silent on-device
  // Google sign-in (not an explicit user action). Used to hide the logout
  // button — the user never chose to log in, and signing out would just get
  // undone by the next silent sign-in.
  autoSignedIn: boolean;
  authError: string | null;
  isPremium: boolean;
  isAdmin: boolean;
  /** True when RevenueCat offerings include at least one package with a free trial (introPrice.price === 0). */
  hasTrialAvailable: boolean;
  /** Trial length in days, derived from RevenueCat introPrice.periodNumberOfUnits. */
  trialDays: number;
  /** True until the initial trial lookup has completed (success or failure). */
  trialLoading: boolean;
  /** Re-fetch trial info from RevenueCat (e.g. after the user dismisses the banner). */
  refreshTrialInfo: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string) => Promise<{ error?: string; needsConfirmation?: boolean }>;
  signInWithGoogle: () => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  getAccessToken: () => Promise<string | null>;
  updateUserMetadata: (metadata: Record<string, any>) => Promise<{ error?: string }>;
  deleteAccount: () => Promise<{ error?: string }>;
  refreshSession: () => Promise<{ error?: string }>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoSignedIn, setAutoSignedIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [hasTrialAvailable, setHasTrialAvailable] = useState(false);
  const [trialDays, setTrialDays] = useState(0);
  const [trialLoading, setTrialLoading] = useState(true);
  const trialLoadedRef = useRef(false);

  const isPremium = user?.app_metadata?.tier === 'premium' || user?.app_metadata?.tier === 'alpha';

  const refreshSession = useCallback(async () => {
    const { data, error } = await supabase.auth.refreshSession();
    if (error) {
      console.error('Error refreshing session:', error.message);
      return { error: error.message };
    }
    if (data.session) {
      setSession(data.session);
      setUser(data.session.user ?? null);
    }
    return {};
  }, []);

  useEffect(() => {
    if (TEST_LOGIN_ENABLED) {
      // Dev / preview only (VITE_TEST_LOGIN=true): auto-sign-in as the seeded
      // test user so the app renders the authenticated UI in a headless / mobile
      // browser without the native Google flow. Produces a real Supabase JWT, so
      // all backend calls work against the dev environment. On success the
      // onAuthStateChange listener below applies the session.
      supabase.auth.getSession().then(async ({ data: { session } }) => {
        if (session) {
          setSession(session);
          setUser(session.user);
          setLoading(false);
          return;
        }
        const { error } = await supabase.auth.signInWithPassword({
          email: TEST_USER_EMAIL!,
          password: TEST_USER_PASSWORD!,
        });
        if (error) {
          setAuthError(error.message);
          setLoading(false);
        }
      });
    } else {
      // Get initial session
      supabase.auth.getSession().then(async ({ data: { session } }) => {
        if (!session) {
          // No active session on cold start: try to sign in silently with an
          // on-device Google account before falling back to the login form.
          // On success, the onAuthStateChange listener below already applied
          // the new session — don't overwrite it with the stale `session`
          // (still null here) captured before the silent attempt ran.
          const res = await attemptSilentGoogleSignIn();
          if (res.success) {
            setAutoSignedIn(true);
            setAuthError(null);
            return;
          } else if (res.error) {
            setAuthError(res.error);
          }
        }
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      });
    }

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  /**
   * Load RevenueCat offerings to detect whether any subscription package
   * has a free trial (introPrice.price === 0). If so, extract the trial
   * length in days from the longest available trial. Used by TrialBanner
   * to decide whether to show itself and what "N Tage" label to render.
   */
  const refreshTrialInfo = useCallback(async () => {
    if (!trialLoadedRef.current) {
      setTrialLoading(true);
    }
    try {
      const { getSubscriptionOfferings } = await import('../utils/purchase');
      const packages = await getSubscriptionOfferings();
      if (!packages || packages.length === 0) {
        setHasTrialAvailable(false);
        setTrialDays(0);
        return;
      }
      const trialPkgs = packages.filter(
        (p: any) => p.product?.introPrice && p.product.introPrice.price === 0
      );
      if (trialPkgs.length === 0) {
        setHasTrialAvailable(false);
        setTrialDays(0);
        return;
      }
      setHasTrialAvailable(true);
      // Use the longest trial across all packages so the banner reads "X Tage" honestly
      const maxDays = Math.max(
        ...trialPkgs.map((p: any) => p.product.introPrice.periodNumberOfUnits || 0)
      );
      setTrialDays(maxDays);
      console.log('[Auth] Trial available, longest trial days:', maxDays);
    } catch (err) {
      console.warn('[Auth] Failed to load trial info:', err);
      setHasTrialAvailable(false);
      setTrialDays(0);
    } finally {
      setTrialLoading(false);
      trialLoadedRef.current = true;
    }
  }, []);

  // Load trial info once a session exists (and refresh when it changes).
  useEffect(() => {
    if (!session) {
      setHasTrialAvailable(false);
      setTrialDays(0);
      setTrialLoading(false);
      return;
    }
    refreshTrialInfo();
  }, [session, refreshTrialInfo]);

  const checkAdminStatus = useCallback(async (token: string | null) => {
    if (!token) {
      setIsAdmin(false);
      return;
    }
    try {
      const response = await fetch(apiUrl('/api/admin/check'), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setIsAdmin(!!data.isAdmin);
      } else {
        setIsAdmin(false);
      }
    } catch (e) {
      console.warn('Failed to check admin status:', e);
      setIsAdmin(false);
    }
  }, []);

  useEffect(() => {
    if (!session) {
      setIsAdmin(false);
      return;
    }
    checkAdminStatus(session.access_token);
  }, [session, checkAdminStatus]);

  /**
   * Reconcile the locally cached tier with the authoritative server tier in the
   * background. Runs on session load so the paywall (and the rest of the app)
   * already reflects the correct tier by the time it's opened, instead of the
   * modal having to verify on open. Only acts on a genuine mismatch to avoid
   * needless session refreshes.
   */
  const reconcileServerTier = useCallback(async (token: string, localTier: string | undefined) => {
    try {
      const res = await fetch(apiUrl('/api/extractions/limit'), {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data.success && data.tier && data.tier !== localTier) {
        console.log(`[Auth] Tier mismatch (local: ${localTier}, server: ${data.tier}). Refreshing session...`);
        await refreshSession();
      }
    } catch (err) {
      console.warn('[Auth] Background tier reconciliation failed:', err);
    }
  }, [refreshSession]);

  useEffect(() => {
    if (!session) return;
    const localTier = session.user?.app_metadata?.tier;
    // Premium/alpha are already authoritative locally — nothing to reconcile.
    if (localTier === 'premium' || localTier === 'alpha') return;
    reconcileServerTier(session.access_token, localTier);
  }, [session, reconcileServerTier]);

  const signIn = useCallback(async (email: string, password: string) => {
    setAuthError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    localStorage.removeItem(AUTO_SIGNIN_DISABLED_KEY);
    localStorage.setItem(LEGAL_CONSENT_KEY, '1');
    setAutoSignedIn(false);
    return {};
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    setAuthError(null);
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return { error: error.message };
    // If user is immediately confirmed (no email confirmation), session is available
    if (data.session) {
      localStorage.removeItem(AUTO_SIGNIN_DISABLED_KEY);
      localStorage.setItem(LEGAL_CONSENT_KEY, '1');
      setAutoSignedIn(false);
      return {};
    }
    return { needsConfirmation: true };
  }, []);

  const signInWithGoogle = useCallback(async () => {
    setAuthError(null);
    // Native (Capacitor): use the OS account-picker dialog to get a Google ID
    // token, then exchange it for a Supabase session — no browser redirect.
    if (Capacitor.isNativePlatform()) {
      if (!GOOGLE_WEB_CLIENT_ID) {
        return { error: 'Google sign-in is not configured (missing VITE_GOOGLE_WEB_CLIENT_ID).' };
      }
      try {
        console.log('signInWithGoogle: Initializing social login');
        await ensureSocialLoginInitialized();
        console.log('signInWithGoogle: Calling SocialLogin.login');
        const { result } = await SocialLogin.login({
          provider: 'google',
          options: {},
        });
        console.log('signInWithGoogle: SocialLogin.login completed', result);
        // Online-mode Google response carries the OpenID Connect ID token.
        const idToken = 'idToken' in result ? result.idToken : null;
        if (!idToken) {
          console.warn('signInWithGoogle: No ID token returned from Google login');
          return { error: 'Google sign-in did not return an ID token.' };
        }

        console.log('signInWithGoogle: Signing in to Supabase with ID token');
        const { error } = await supabase.auth.signInWithIdToken({
          provider: 'google',
          token: idToken,
        });
        if (error) {
          console.error('signInWithGoogle: Supabase sign-in failed', error);
          return { error: error.message };
        }
        console.log('signInWithGoogle: Supabase sign-in successful');
        localStorage.removeItem(AUTO_SIGNIN_DISABLED_KEY);
        localStorage.setItem(LEGAL_CONSENT_KEY, '1');
        setAutoSignedIn(false);
        return {};
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        console.error('signInWithGoogle: Error caught during manual login', message, e);
        // User dismissing the account picker is not an error worth surfacing.
        if (/cancel/i.test(message)) return {};
        return { error: message };
      }
    }

    // Web: the redirect-based OAuth flow (opens the provider in the browser).
    // Record consent before the redirect navigates away — the user clicked
    // "sign in" on the AuthForm, which carries the legal notice.
    localStorage.setItem(LEGAL_CONSENT_KEY, '1');
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    });
    if (error) return { error: error.message };
    return {};
  }, []);

  const signOut = useCallback(async () => {
    // Set before signing out so a cold restart won't silently sign the user
    // right back in with the same on-device Google account.
    localStorage.setItem(AUTO_SIGNIN_DISABLED_KEY, '1');
    // Ensure onboarding is marked as completed locally so the welcome guide is never shown on sign-out
    localStorage.setItem(ONBOARDING_KEY, 'true');
    if (Capacitor.getPlatform() === 'android') {
      // Best effort: clears Credential Manager's cached state. Harmlessly
      // rejects if the user never signed in via Google.
      await SocialLogin.logout({ provider: 'google' }).catch(() => {});
    }
    await supabase.auth.signOut();
    setAutoSignedIn(false);
  }, []);

  const getAccessToken = useCallback(async (): Promise<string | null> => {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  }, []);

  const updateUserMetadata = useCallback(async (metadata: Record<string, any>) => {
    const { data, error } = await supabase.auth.updateUser({ data: metadata });
    if (error) return { error: error.message };
    if (data.user) {
      setUser(data.user);
    }
    return {};
  }, []);

  const deleteAccount = useCallback(async () => {
    try {
      const token = await getAccessToken();
      if (!token) return { error: 'Not authenticated' };

      const response = await fetch(apiUrl('/api/users/me'), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const data = await response.json();
        return { error: data.error || 'Failed to delete account' };
      }

      await signOut();
      return {};
    } catch (e) {
      return { error: e instanceof Error ? e.message : 'Unknown error' };
    }
  }, [getAccessToken, signOut]);

  return (
    <AuthContext.Provider value={{ user, session, loading, autoSignedIn, authError, isPremium, isAdmin, hasTrialAvailable, trialDays, trialLoading, refreshTrialInfo, signIn, signUp, signInWithGoogle, signOut, getAccessToken, updateUserMetadata, deleteAccount, refreshSession }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}