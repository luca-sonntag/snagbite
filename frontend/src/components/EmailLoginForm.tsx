import { useState } from 'react';
import { Button } from '@heroui/react';
import { ArrowLeft, Mail, Lock, Info } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../context/I18nContext';
import { hapticLight, hapticMedium, hapticHeavy } from '../utils/haptics';

interface EmailLoginFormProps {
  onBackToGoogle: () => void;
}

export default function EmailLoginForm({ onBackToGoogle }: EmailLoginFormProps) {
  const { signIn } = useAuth();
  const { t } = useI18n();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;

    hapticMedium();
    setError(null);
    setSubmitting(true);

    try {
      const result = await signIn(email.trim(), password);
      if (result.error) {
        hapticHeavy();
        if (/invalid login credentials/i.test(result.error)) {
          setError(t('auth.invalidCredentials'));
        } else {
          setError(result.error);
        }
      } else {
        hapticLight();
      }
    } catch {
      hapticHeavy();
      setError(t('auth.unexpectedError'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full flex flex-col gap-4">
      <div className="flex items-center justify-between mb-1">
        <button
          type="button"
          onClick={() => {
            hapticLight();
            onBackToGoogle();
          }}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer py-1 px-1 -ml-1 rounded-lg"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>{t('auth.backToGoogle')}</span>
        </button>
      </div>

      <div className="flex flex-col gap-3">
        <div className="relative">
          <label className="block text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5 text-left">
            {t('auth.emailLabel')}
          </label>
          <div className="relative flex items-center">
            <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 pointer-events-none" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('auth.emailPlaceholder')}
              required
              autoComplete="email"
              className="w-full h-11 pl-10 pr-3.5 rounded-xl bg-white dark:bg-gray-800 border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)] text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
            />
          </div>
        </div>

        <div className="relative">
          <label className="block text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5 text-left">
            {t('auth.passwordLabel')}
          </label>
          <div className="relative flex items-center">
            <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 pointer-events-none" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t('auth.passwordPlaceholder')}
              required
              autoComplete="current-password"
              className="w-full h-11 pl-10 pr-3.5 rounded-xl bg-white dark:bg-gray-800 border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)] text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="w-full text-left text-xs text-rose-500 bg-rose-50 dark:bg-rose-950/30 border-none px-3.5 py-2.5 rounded-xl">
          <span className="leading-snug">{error}</span>
        </div>
      )}

      <Button
        type="submit"
        isDisabled={submitting || !email.trim() || !password}
        className="w-full h-11 min-h-[44px] bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl border-none shadow-[0_4px_16px_rgba(16,185,129,0.25)] active:scale-98 transition-all cursor-pointer flex items-center justify-center gap-2 mt-1"
      >
        {submitting ? (
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
        ) : (
          <span>{t('auth.signInButton')}</span>
        )}
      </Button>

      {/* Info notice for new users */}
      <div className="p-3 rounded-xl bg-emerald-500/5 dark:bg-emerald-500/10 border-none flex gap-2.5 items-start text-left mt-1">
        <Info className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
        <div className="text-[11px] text-gray-500 dark:text-gray-400 leading-snug">
          <span>{t('auth.newToSnagbiteNotice')} </span>
          <button
            type="button"
            onClick={() => {
              hapticLight();
              onBackToGoogle();
            }}
            className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline inline cursor-pointer"
          >
            {t('auth.startWithGoogle')} →
          </button>
        </div>
      </div>
    </form>
  );
}
