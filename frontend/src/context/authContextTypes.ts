import { createContext, useContext } from 'react';
import type { AuthUser, AuthSession } from '../auth';

export interface AuthState {
  user: AuthUser | null;
  session: AuthSession | null;
  loading: boolean;
  autoSignedIn: boolean;
  authError: string | null;
  isPremium: boolean;
  isAdmin: boolean;
  hasTrialAvailable: boolean;
  trialDays: number;
  trialLoading: boolean;
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

export const AuthContext = createContext<AuthState | undefined>(undefined);

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
