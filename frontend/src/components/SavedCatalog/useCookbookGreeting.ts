import { useMemo, useState } from 'react';
import { useI18n } from '../../context/I18nContext';

interface GreetingResult {
  greetingText: string;
  subtitleText: string;
}

/**
 * Contextual time-of-day and day-of-week greeting hook for Cookbook Home.
 * Distinguishes between weekdays, Friday kickoff, Saturday highlights,
 * and cozy Sunday evenings / late-night wind-down, offering varied subtitles.
 */
export function useCookbookGreeting(): GreetingResult {
  const { t } = useI18n();

  // Stable random seed across re-renders for the session so titles don't jump on input/filter
  const [seed] = useState(() => Math.floor(Math.random() * 100));

  return useMemo(() => {
    const now = new Date();
    const hour = now.getHours();
    const minutes = now.getMinutes();
    const totalMinutes = hour * 60 + minutes;
    const day = now.getDay(); // 0 = Sunday, 1 = Monday, ..., 5 = Friday, 6 = Saturday

    const isSunday = day === 0;
    const isFriday = day === 5;
    const isSaturday = day === 6;
    const isWeekend = isSunday || isSaturday;

    const pick = (keys: string[]): string => {
      const key = keys[seed % keys.length];
      return t(key);
    };

    // 1. Deep Night (00:00 - 04:59)
    if (totalMinutes < 300) {
      return {
        greetingText: t('catalog.greeting.night'),
        subtitleText: pick([
          'catalog.greeting.subtitleNight1',
          'catalog.greeting.subtitleNight2',
          'catalog.greeting.subtitleNight3',
        ]),
      };
    }

    // 2. Morning (05:00 - 10:29)
    if (totalMinutes < 630) {
      if (isWeekend) {
        return {
          greetingText: t('catalog.greeting.weekend'),
          subtitleText: pick([
            'catalog.greeting.subtitleMorningWeekend1',
            'catalog.greeting.subtitleMorningWeekend2',
          ]),
        };
      }
      return {
        greetingText: t('catalog.greeting.morning'),
        subtitleText: pick([
          'catalog.greeting.subtitleMorning1',
          'catalog.greeting.subtitleMorning2',
          'catalog.greeting.subtitleMorning3',
        ]),
      };
    }

    // 3. Noon / Lunch (10:30 - 14:29)
    if (totalMinutes < 870) {
      if (isWeekend) {
        return {
          greetingText: t('catalog.greeting.weekend'),
          subtitleText: pick([
            'catalog.greeting.subtitleNoonWeekend1',
            'catalog.greeting.subtitleNoonWeekend2',
          ]),
        };
      }
      return {
        greetingText: t('catalog.greeting.noon'),
        subtitleText: pick([
          'catalog.greeting.subtitleNoon1',
          'catalog.greeting.subtitleNoon2',
          'catalog.greeting.subtitleNoon3',
        ]),
      };
    }

    // 4. Afternoon / Coffee time (14:30 - 16:59)
    if (totalMinutes < 1020) {
      if (isWeekend) {
        return {
          greetingText: t('catalog.greeting.weekend'),
          subtitleText: pick([
            'catalog.greeting.subtitleAfternoonWeekend1',
            'catalog.greeting.subtitleAfternoonWeekend2',
          ]),
        };
      }
      return {
        greetingText: t('catalog.greeting.afternoon'),
        subtitleText: pick([
          'catalog.greeting.subtitleAfternoon1',
          'catalog.greeting.subtitleAfternoon2',
        ]),
      };
    }

    // 5. Evening / Dinner (17:00 - 21:29)
    if (totalMinutes < 1290) {
      if (isSunday) {
        return {
          greetingText: t('catalog.greeting.sundayEvening'),
          subtitleText: pick([
            'catalog.greeting.subtitleSundayEvening1',
            'catalog.greeting.subtitleSundayEvening2',
            'catalog.greeting.subtitleSundayEvening3',
          ]),
        };
      }
      if (isFriday) {
        return {
          greetingText: t('catalog.greeting.weekend'),
          subtitleText: pick([
            'catalog.greeting.subtitleFridayEvening1',
            'catalog.greeting.subtitleFridayEvening2',
          ]),
        };
      }
      if (isSaturday) {
        return {
          greetingText: t('catalog.greeting.evening'),
          subtitleText: pick([
            'catalog.greeting.subtitleSaturdayEvening1',
            'catalog.greeting.subtitleSaturdayEvening2',
          ]),
        };
      }
      // Mon-Thu Workday Feierabend
      return {
        greetingText: t('catalog.greeting.evening'),
        subtitleText: pick([
          'catalog.greeting.subtitleEvening1',
          'catalog.greeting.subtitleEvening2',
          'catalog.greeting.subtitleEvening3',
        ]),
      };
    }

    // 6. Late Evening (21:30 - 23:59)
    if (isSunday) {
      return {
        greetingText: t('catalog.greeting.sundayEvening'),
        subtitleText: pick([
          'catalog.greeting.subtitleLateSunday1',
          'catalog.greeting.subtitleLateSunday2',
          'catalog.greeting.subtitleLateSunday3',
        ]),
      };
    }
    if (isFriday) {
      return {
        greetingText: t('catalog.greeting.evening'),
        subtitleText: pick([
          'catalog.greeting.subtitleLateFriday1',
          'catalog.greeting.subtitleLateEvening2',
        ]),
      };
    }
    if (isSaturday) {
      return {
        greetingText: t('catalog.greeting.evening'),
        subtitleText: pick([
          'catalog.greeting.subtitleLateSaturday1',
          'catalog.greeting.subtitleLateEvening2',
        ]),
      };
    }

    // Mon-Thu Late Evening
    return {
      greetingText: t('catalog.greeting.evening'),
      subtitleText: pick([
        'catalog.greeting.subtitleLateEvening1',
        'catalog.greeting.subtitleLateEvening2',
        'catalog.greeting.subtitleLateEvening3',
      ]),
    };
  }, [t, seed]);
}
