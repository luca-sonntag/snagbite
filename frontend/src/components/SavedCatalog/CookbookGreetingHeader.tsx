import { useMemo } from 'react';
import { useI18n } from '../../context/I18nContext';
import { useAuth } from '../../context/AuthContext';

/**
 * Editorial contextual greeting header for Cookbook Home.
 * Greets the user based on the time of day (Morning/Noon/Evening/Weekend)
 * with quiet luxury typography and personal warmth.
 */
export default function CookbookGreetingHeader() {
  const { t } = useI18n();
  const { user } = useAuth();

  const firstName = useMemo(() => {
    const raw =
      user?.user_metadata?.first_name ||
      user?.user_metadata?.full_name ||
      user?.user_metadata?.name ||
      user?.email?.split('@')[0] ||
      '';
    if (!raw) return '';
    const trimmed = raw.trim();
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  }, [user]);

  const { greetingText, subtitleText } = useMemo(() => {
    const now = new Date();
    const hour = now.getHours();
    const day = now.getDay(); // 0 = Sunday, 6 = Saturday
    const isWeekend = day === 0 || day === 6;

    if (isWeekend && hour >= 7 && hour < 14) {
      return {
        greetingText: t('catalog.greeting.weekend'),
        subtitleText: t('catalog.greeting.subtitleWeekend'),
      };
    }
    if (hour >= 5 && hour < 11) {
      return {
        greetingText: t('catalog.greeting.morning'),
        subtitleText: t('catalog.greeting.subtitleMorning'),
      };
    }
    if (hour >= 11 && hour < 15) {
      return {
        greetingText: t('catalog.greeting.noon'),
        subtitleText: t('catalog.greeting.subtitleNoon'),
      };
    }
    if (hour >= 15 && hour < 22) {
      return {
        greetingText: t('catalog.greeting.evening'),
        subtitleText: t('catalog.greeting.subtitleEvening'),
      };
    }
    return {
      greetingText: t('catalog.greeting.night'),
      subtitleText: t('catalog.greeting.subtitleNight'),
    };
  }, [t]);

  return (
    <header className="flex flex-col gap-1 pt-1 pb-0.5 select-none">
      <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
        <span>✨</span>
        <span>
          {greetingText}
          {firstName ? `, ${firstName}` : ''}
        </span>
      </div>
      <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white leading-tight">
        {subtitleText}
      </h2>
    </header>
  );
}
