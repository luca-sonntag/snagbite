import React, { useEffect, useState, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { apiUrl } from '../api';
import { TEST_LOGIN_ENABLED, TEST_USER_EMAIL, TEST_USER_PASSWORD } from '../env';
import { ONBOARDING_KEY } from '../hooks/useOnboarding';
import {
  authClient,
  normalizeUser,
  normalizeSession,
  getStoredToken,
  setStoredToken,
  type AuthUser,
  type AuthSession,
} from '../auth';
import {
  AUTO_SIGNIN_DISABLED_KEY,
  LEGAL_CONSENT_KEY,
  attemptSilentGoogleSignIn,
  signInWithNativeGoogle,
  signOutNativeGoogle,
} from './authNative';
import { useTrialInfo } from './useTrialInfo';
import { useAdminCheck } from './useAdminCheck';
import { AuthContext, useAuth, type AuthState } from './authContextTypes';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoSignedIn, setAutoSignedIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const isAdmin = useAdminCheck(session);
  const { hasTrialAvailable, trialDays, trialLoading, refreshTrialInfo } = useTrialInfo(session);

  const isPremium = user?.tier === 'premium' || user?.tier === 'alpha' || user?.app_metadata?.tier === 'premium' || user?.app_metadata?.tier === 'alpha';

  const refreshSession = useCallback(async (): Promise<{ error?: string }> => {
    try {
      const res = await authClient.getSession();
      if (res.data?.session && res.data?.user) {
        const token = res.data.session.token;
        setStoredToken(token);
        const norm = normalizeSession(token, res.data.user, res.data.session.expiresAt);
        setSession(norm);
        setUser(norm.user);
        return {};
      }
      return { error: 'No active session' };
    } catch (err: any) {
      return { error: err.message || 'Session refresh failed' };
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    async function initAuth() {
      if (TEST_LOGIN_ENABLED) {
        try {
          const existing = await authClient.getSession();
          if (existing.data?.session && existing.data?.user) {
            if (!mounted) return;
            const norm = normalizeSession(existing.data.session.token, existing.data.user, existing.data.session.expiresAt);
            setStoredToken(norm.token);
            setSession(norm);
            setUser(norm.user);
            setLoading(false);
            return;
          }
          const loginRes = await authClient.signIn.email({
            email: TEST_USER_EMAIL!,
            password: TEST_USER_PASSWORD!,
          });
          if (!mounted) return;
          if (loginRes.data?.token && loginRes.data?.user) {
            const norm = normalizeSession(loginRes.data.token, loginRes.data.user);
            setStoredToken(norm.token);
            setSession(norm);
            setUser(norm.user);
          } else if (loginRes.error) {
            setAuthError(loginRes.error.message || 'Test user login failed');
          }
        } catch (e: any) {
          if (mounted) setAuthError(e.message);
        } finally {
          if (mounted) setLoading(false);
        }
        return;
      }

      try {
        const sessionRes = await authClient.getSession();
        if (sessionRes.data?.session && sessionRes.data?.user) {
          if (!mounted) return;
          const norm = normalizeSession(sessionRes.data.session.token, sessionRes.data.user, sessionRes.data.session.expiresAt);
          setStoredToken(norm.token);
          setSession(norm);
          setUser(norm.user);
          setLoading(false);
          return;
        }

        const silentRes = await attemptSilentGoogleSignIn();
        if (!mounted) return;
        if (silentRes.success && silentRes.session) {
          setSession(silentRes.session);
          setUser(silentRes.session.user);
          setAutoSignedIn(true);
          setAuthError(null);
        } else if (silentRes.error) {
          setAuthError(silentRes.error);
        }
      } catch (err: any) {
        if (mounted) setAuthError(err.message);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    initAuth();
    return () => {
      mounted = false;
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    setAuthError(null);
    try {
      const res = await authClient.signIn.email({ email, password });
      if (res.error) return { error: res.error.message || 'Login failed' };
      if (res.data?.token && res.data?.user) {
        setStoredToken(res.data.token);
        const norm = normalizeSession(res.data.token, res.data.user);
        setSession(norm);
        setUser(norm.user);
      } else {
        await refreshSession();
      }
      localStorage.removeItem(AUTO_SIGNIN_DISABLED_KEY);
      localStorage.setItem(LEGAL_CONSENT_KEY, '1');
      setAutoSignedIn(false);
      return {};
    } catch (err: any) {
      return { error: err.message || 'Login failed' };
    }
  }, [refreshSession]);

  const signUp = useCallback(async (email: string, password: string) => {
    setAuthError(null);
    try {
      const res = await authClient.signUp.email({
        email,
        password,
        name: email.split('@')[0],
      });
      if (res.error) return { error: res.error.message || 'Signup failed' };
      if (res.data?.token && res.data?.user) {
        setStoredToken(res.data.token);
        const norm = normalizeSession(res.data.token, res.data.user);
        setSession(norm);
        setUser(norm.user);
        localStorage.removeItem(AUTO_SIGNIN_DISABLED_KEY);
        localStorage.setItem(LEGAL_CONSENT_KEY, '1');
        setAutoSignedIn(false);
        return {};
      }
      return { needsConfirmation: true };
    } catch (err: any) {
      return { error: err.message || 'Signup failed' };
    }
  }, []);

  const signInWithGoogle = useCallback(async () => {
    setAuthError(null);
    if (Capacitor.isNativePlatform() && Capacitor.isPluginAvailable('SocialLogin')) {
      const res = await signInWithNativeGoogle();
      if (res.cancelled) return {};
      if (res.error) return { error: res.error };
      if (res.session) {
        setSession(res.session);
        setUser(res.session.user);
        localStorage.removeItem(AUTO_SIGNIN_DISABLED_KEY);
        localStorage.setItem(LEGAL_CONSENT_KEY, '1');
        setAutoSignedIn(false);
        return {};
      }
      return { error: 'Native sign-in failed' };
    }

    localStorage.setItem(LEGAL_CONSENT_KEY, '1');
    try {
      await authClient.signIn.social({
        provider: 'google',
        callbackURL: window.location.origin,
      });
      return {};
    } catch (err: any) {
      return { error: err.message || 'Google sign-in failed' };
    }
  }, []);

  const signOut = useCallback(async () => {
    localStorage.setItem(AUTO_SIGNIN_DISABLED_KEY, '1');
    localStorage.setItem(ONBOARDING_KEY, 'true');
    await signOutNativeGoogle();
    try {
      await authClient.signOut();
    } catch {
      // Best-effort sign-out
    }
    setStoredToken(null);
    setSession(null);
    setUser(null);
    setAutoSignedIn(false);
  }, []);

  const getAccessToken = useCallback(async (): Promise<string | null> => {
    return session?.token ?? getStoredToken();
  }, [session]);

  const updateUserMetadata = useCallback(async (metadata: Record<string, any>) => {
    try {
      const res = await (authClient.updateUser as any)({
        ...metadata,
        notificationsEnabled: metadata.notifications_enabled ?? metadata.notificationsEnabled,
      });
      if (res.error) return { error: res.error.message || 'Update failed' };
      if (res.data) {
        setUser((prev) => (prev ? normalizeUser({ ...prev, ...res.data }) : null));
      }
      return {};
    } catch (err: any) {
      return { error: err.message || 'Update failed' };
    }
  }, []);

  const deleteAccount = useCallback(async () => {
    try {
      const token = await getAccessToken();
      if (!token) return { error: 'Not authenticated' };

      const response = await fetch(apiUrl('/api/users/me'), {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
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
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        autoSignedIn,
        authError,
        isPremium,
        isAdmin,
        hasTrialAvailable,
        trialDays,
        trialLoading,
        refreshTrialInfo,
        signIn,
        signUp,
        signInWithGoogle,
        signOut,
        getAccessToken,
        updateUserMetadata,
        deleteAccount,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export { useAuth, type AuthState };
export type { AuthUser as User, AuthSession as Session };