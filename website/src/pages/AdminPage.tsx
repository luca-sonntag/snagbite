import { useState, useEffect, useCallback } from 'react';
import { Lock, LogOut, AlertOctagon, ArrowLeft, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Spinner } from '@heroui/react';
import { supabase, isSupabaseConfigured } from '../supabase';
import { apiUrl } from '../api';
import AdminView from '../components/AdminView';

export default function AdminPage() {
  const [session, setSession] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkingAdmin, setCheckingAdmin] = useState(false);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  const checkAdminStatus = useCallback(async (accessToken: string) => {
    setCheckingAdmin(true);
    try {
      const res = await fetch(apiUrl('/api/admin/check'), {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setIsAdmin(!!data.isAdmin);
      } else {
        setIsAdmin(false);
      }
    } catch (err) {
      console.error('Failed to verify admin status:', err);
      setIsAdmin(false);
    } finally {
      setCheckingAdmin(false);
    }
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.access_token) {
        checkAdminStatus(session.access_token);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.access_token) {
        checkAdminStatus(session.access_token);
      } else {
        setIsAdmin(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [checkAdminStatus]);

  const handleGoogleSignIn = async () => {
    setAuthError(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/admin`,
        },
      });
      if (error) {
        setAuthError(error.message);
      }
    } catch (err: any) {
      setAuthError(err?.message || 'Failed to initiate Google sign-in.');
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setIsAdmin(null);
  };

  const getAccessToken = useCallback(async (): Promise<string | null> => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ?? null;
  }, []);

  if (loading || (session && checkingAdmin)) {
    return (
      <div className="light w-full min-h-[70vh] flex flex-col items-center justify-center gap-3 bg-gray-50 text-gray-900" style={{ colorScheme: 'light' }}>
        <Spinner color="success" size="lg" />
        <p className="text-sm font-semibold text-gray-500">
          Verifying credentials...
        </p>
      </div>
    );
  }

  // Case 0: Supabase is not configured
  if (!isSupabaseConfigured) {
    return (
      <div className="light w-full min-h-screen bg-gray-50 text-gray-900 flex flex-col items-center" style={{ colorScheme: 'light' }}>
        <div className="w-full max-w-md mx-auto px-4 py-16 flex flex-col items-center">
          <div className="w-full bg-white border-none rounded-3xl p-8 shadow-[0_2px_6px_rgba(0,0,0,0.03)] flex flex-col items-center text-center gap-6">
            <div className="p-3.5 rounded-2xl bg-amber-500/10 text-amber-600">
              <AlertCircle className="w-7 h-7" />
            </div>

            <div className="flex flex-col gap-1.5">
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
                Configuration Required
              </h1>
              <p className="text-xs text-gray-600 leading-relaxed">
                Supabase environment variables (<code className="font-mono text-emerald-700 bg-emerald-500/10 px-1 py-0.5 rounded">VITE_SUPABASE_URL</code> and <code className="font-mono text-emerald-700 bg-emerald-500/10 px-1 py-0.5 rounded">VITE_SUPABASE_ANON_KEY</code>) were not provided at build time.
              </p>
            </div>

            <Link
              to="/"
              className="text-xs text-gray-500 hover:text-gray-900 transition-colors flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to Website
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Case 1: User is not authenticated
  if (!session) {
    return (
      <div className="light w-full min-h-screen bg-gray-50 text-gray-900 flex flex-col items-center" style={{ colorScheme: 'light' }}>
        <div className="w-full max-w-md mx-auto px-4 py-16 flex flex-col items-center">
          <div className="w-full bg-white border-none rounded-3xl p-8 shadow-[0_2px_6px_rgba(0,0,0,0.03)] flex flex-col items-center text-center gap-6">
            <div className="p-3.5 rounded-2xl bg-emerald-500/10 text-emerald-600">
              <Lock className="w-7 h-7" />
            </div>

            <div className="flex flex-col gap-1.5">
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
                Admin Login
              </h1>
              <p className="text-xs text-gray-600 leading-relaxed">
                Sign in with your authorized Google account to access the Snagbite Admin Dashboard.
              </p>
            </div>

            {authError && (
              <div className="w-full p-3.5 bg-rose-500/10 text-rose-600 text-xs rounded-2xl border-none text-left">
                {authError}
              </div>
            )}

            <button
              onClick={handleGoogleSignIn}
              className="w-full py-3.5 px-4 rounded-2xl bg-gray-900 hover:bg-gray-800 text-white font-bold text-sm active:scale-95 transition-all flex items-center justify-center gap-3 cursor-pointer border-none shadow-[0_2px_6px_rgba(0,0,0,0.03)]"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Sign in with Google</span>
            </button>

            <Link
              to="/"
              className="text-xs text-gray-500 hover:text-gray-900 transition-colors flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to Website
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Case 2: User is authenticated but NOT an admin
  if (isAdmin === false) {
    return (
      <div className="light w-full min-h-screen bg-gray-50 text-gray-900 flex flex-col items-center" style={{ colorScheme: 'light' }}>
        <div className="w-full max-w-md mx-auto px-4 py-16 flex flex-col items-center">
          <div className="w-full bg-white border-none rounded-3xl p-8 shadow-[0_2px_6px_rgba(0,0,0,0.03)] flex flex-col items-center text-center gap-6">
            <div className="p-3.5 rounded-2xl bg-rose-500/10 text-rose-600">
              <AlertOctagon className="w-7 h-7" />
            </div>

            <div className="flex flex-col gap-1.5">
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
                Access Denied
              </h1>
              <p className="text-xs text-gray-600 leading-relaxed">
                The account <strong className="text-gray-900 font-mono">{session.user?.email}</strong> is not authorized to access the Admin Panel.
              </p>
            </div>

            <div className="w-full flex flex-col gap-3">
              <button
                onClick={handleSignOut}
                className="w-full py-3.5 px-4 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 font-bold text-sm active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer border-none"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out & Switch Account</span>
              </button>

              <Link
                to="/"
                className="text-xs text-gray-500 hover:text-gray-900 transition-colors flex items-center justify-center gap-1.5 py-2"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to Home
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Case 3: Authorized Admin User
  return (
    <div className="light w-full min-h-screen bg-gray-50 text-gray-900" style={{ colorScheme: 'light' }}>
      <AdminView
        getAccessToken={getAccessToken}
        onSignOut={handleSignOut}
        userEmail={session.user?.email}
      />
    </div>
  );
}
