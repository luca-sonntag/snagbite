import { useState, useEffect, useMemo } from 'react';
import { useI18n } from '../context/I18nContext';

interface AppSplashScreenProps {
  /** True when auth and initial data have resolved */
  isReady: boolean;
  /** Callback fired when the exit fade-out transition has completely finished */
  onFinished?: () => void;
}

const MIN_DISPLAY_TIME_MS = 1600;
const EXIT_TRANSITION_MS = 320;
const QUOTE_ROTATION_INTERVAL_MS = 1100;

export default function AppSplashScreen({ isReady, onFinished }: AppSplashScreenProps) {
  const { t } = useI18n();
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [isMounted, setIsMounted] = useState(true);
  const [quoteIndex, setQuoteIndex] = useState(0);

  const messages = useMemo(() => [
    t('app.loading.preparingCookbook'),
    t('app.loading.loadingRecipes'),
    t('app.loading.gettingReady'),
  ], [t]);

  // Ensure minimum presentation time to prevent jarring flicker
  useEffect(() => {
    const timer = setTimeout(() => {
      setMinTimeElapsed(true);
    }, MIN_DISPLAY_TIME_MS);
    return () => clearTimeout(timer);
  }, []);

  // Rotate microcopy every interval
  useEffect(() => {
    const quoteTimer = setInterval(() => {
      setQuoteIndex((prev) => (prev + 1) % messages.length);
    }, QUOTE_ROTATION_INTERVAL_MS);
    return () => clearTimeout(quoteTimer);
  }, [messages.length]);

  // Trigger smooth exit transition once ready and min time elapsed
  useEffect(() => {
    if (isReady && minTimeElapsed && !isExiting) {
      const exitStartTimer = setTimeout(() => {
        setIsExiting(true);
      }, 0);
      const exitFinishTimer = setTimeout(() => {
        setIsMounted(false);
        onFinished?.();
      }, EXIT_TRANSITION_MS);
      return () => {
        clearTimeout(exitStartTimer);
        clearTimeout(exitFinishTimer);
      };
    }
  }, [isReady, minTimeElapsed, isExiting, onFinished]);

  if (!isMounted) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-950 select-none transition-all duration-300 ease-out ${
        isExiting ? 'opacity-0 scale-[1.02] pointer-events-none' : 'opacity-100 scale-100'
      }`}
    >
      {/* Ambient Emerald Glow Aura */}
      <div className="absolute w-72 h-72 bg-emerald-500/15 dark:bg-emerald-500/10 blur-3xl rounded-full pointer-events-none animate-glow-breathe" />

      {/* Main Logo Container with Gentle Breathing */}
      <div className="relative z-10 flex flex-col items-center">
        <div className="relative w-22 h-22 rounded-3xl bg-white dark:bg-gray-900 p-4 shadow-[0_12px_36px_rgba(16,185,129,0.22)] animate-logo-breathe overflow-hidden flex items-center justify-center">
          <img
            src="/logo-login.png"
            alt="Snagbite"
            className="w-full h-full object-contain"
          />

          {/* Diagonal Recipe Shimmer Sweep */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-3xl">
            <div className="w-full h-full bg-gradient-to-r from-transparent via-white/40 dark:via-white/20 to-transparent animate-shimmer-sweep" />
          </div>
        </div>

        {/* App Title */}
        <h1 className="mt-5 text-2xl font-black tracking-tight text-gray-900 dark:text-white">
          {t('app.title')}
        </h1>

        {/* 3-Tine Fork Wave Accent Dots */}
        <div className="flex items-center justify-center gap-1.5 mt-3.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-tine-bounce-1" />
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-tine-bounce-2" />
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-tine-bounce-3" />
        </div>

        {/* Rotating Microcopy */}
        <div className="h-6 mt-3 flex items-center justify-center">
          <p
            key={quoteIndex}
            className="text-xs font-semibold text-gray-500 dark:text-gray-400 animate-fade-in text-center px-4"
          >
            {messages[quoteIndex]}
          </p>
        </div>
      </div>
    </div>
  );
}
