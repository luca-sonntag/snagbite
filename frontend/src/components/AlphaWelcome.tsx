import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { FlaskConical, Sparkles, Settings, MessageSquare, CalendarCheck, Check } from 'lucide-react';
import { useI18n } from '../context/I18nContext';
import { hapticMedium } from '../utils/haptics';

interface AlphaWelcomeProps {
  /** Called when the tester acknowledges the welcome. */
  onClose: () => void;
}

/**
 * Full-screen welcome overlay shown once to alpha testers after their first
 * login. Single screen: welcome message, key alpha info and a pointer to the
 * bug/feature reporting entry in Settings. Modeled on WelcomeGuide's portal
 * overlay (scroll-lock, safe-area padding, ambient glows).
 */
export default function AlphaWelcome({ onClose }: AlphaWelcomeProps) {
  const { t } = useI18n();

  // Scroll-lock + Escape to close (mirrors WelcomeGuide/PremiumModal).
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const infoItems = [
    { icon: FlaskConical, text: t('alphaWelcome.info.early') },
    { icon: CalendarCheck, text: t('alphaWelcome.info.keepInstalled') },
  ];

  const handleClose = () => {
    hapticMedium();
    onClose();
  };

  const overlay = (
    <div
      className="fixed inset-0 z-[200] flex flex-col bg-gray-50 dark:bg-gray-950"
      role="dialog"
      aria-modal="true"
      aria-label={t('alphaWelcome.title')}
    >
      {/* Ambient glows */}
      <div className="absolute top-[-12%] left-1/2 -translate-x-1/2 w-80 h-80 bg-amber-400/15 dark:bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-12%] right-[-15%] w-72 h-72 bg-emerald-400/10 dark:bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />

      <div
        className="relative flex flex-col h-full w-full max-w-md mx-auto px-6 select-none overflow-y-auto"
        style={{
          paddingTop: 'max(var(--safe-area-inset-top, 0px), 20px)',
          paddingBottom: 'max(var(--safe-area-inset-bottom, 0px), 24px)',
        }}
      >
        {/* Body */}
        <div className="flex-1 flex flex-col items-center justify-center gap-5 py-4">
          <div className="w-full flex flex-col items-center gap-5 animate-fade-in-up">
            {/* Icon */}
            <div className="relative shrink-0">
              <div className="absolute inset-0 rounded-[2rem] bg-amber-500/25 blur-2xl" />
              <div className="relative w-20 h-20 rounded-[2rem] bg-white dark:bg-gray-900 border-none flex items-center justify-center shadow-xl">
                <FlaskConical className="w-10 h-10 text-amber-500" strokeWidth={1.75} />
              </div>
              <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-amber-400 flex items-center justify-center shadow-lg shadow-amber-500/30">
                <Sparkles className="w-4.5 h-4.5 text-white fill-white" />
              </div>
            </div>

            {/* Title + intro */}
            <div className="flex flex-col items-center text-center gap-2.5">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400 uppercase tracking-wider">
                {t('alphaWelcome.badge')}
              </span>
              <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                {t('alphaWelcome.title')}
              </h2>
              <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-300 max-w-xs">
                {t('alphaWelcome.intro')}
              </p>
            </div>

            {/* Info card */}
            <div className="w-full rounded-2xl bg-white dark:bg-gray-900 border-none shadow-[0_2px_6px_rgba(0,0,0,0.03)] p-4 flex flex-col gap-3">
              <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                {t('alphaWelcome.info.heading')}
              </p>
              {infoItems.map(({ icon: Icon, text }, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="p-1.5 bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400 rounded-lg shrink-0">
                    <Icon className="w-4 h-4" />
                  </div>
                  <p className="text-xs leading-relaxed text-gray-600 dark:text-gray-300 pt-0.5">
                    {text}
                  </p>
                </div>
              ))}
              {/* Feedback pointer — highlighted */}
              <div className="flex items-start gap-3 pt-3 bg-gray-50/50 dark:bg-gray-800/30 p-2.5 rounded-xl">
                <div className="p-1.5 bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 rounded-lg shrink-0">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <p className="text-xs leading-relaxed text-gray-700 dark:text-gray-200 pt-0.5">
                  {t('alphaWelcome.info.feedback')}
                  <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                    {' '}
                    <Settings className="w-3.5 h-3.5" />
                    {t('alphaWelcome.info.settingsPath')}
                  </span>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer CTA */}
        <div className="shrink-0 pt-3">
          <button
            onClick={handleClose}
            className="w-full min-h-[48px] flex items-center justify-center gap-1.5 bg-amber-500 hover:bg-amber-400 active:scale-[0.98] text-white text-sm font-semibold px-6 py-3.5 rounded-2xl shadow-lg shadow-amber-500/25 transition-all cursor-pointer border-none"
          >
            <Check className="w-4 h-4" strokeWidth={2.5} />
            {t('alphaWelcome.cta')}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(overlay, document.body);
}
