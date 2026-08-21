import { useState, useEffect, useRef } from 'react';
import { ChefHat } from 'lucide-react';
import { useI18n } from '../context/I18nContext';
import { useAuth } from '../context/AuthContext';
import type { SupportedLanguage } from '../i18n';
import type { ExtractionJob, ProgressData, ProgressStage } from '../types';

interface ExtractionAnimationProps {
  url: string;
  isPending: boolean;
  jobStatus: ExtractionJob['status'] | null;
  progress: ProgressData | null;
  /** Which stage sequence to walk — photo imports never scrape or download. */
  variant?: 'link' | 'photo';
  /** Compact height layout for free users when an ad banner is rendered below. */
  compact?: boolean;
}

const FUNNY_TEXTS: Record<SupportedLanguage, Record<'pending' | 'scraping' | 'processing' | 'completed' | 'failed', string[]>> = {
  de: {
    pending: [
      'Kochmütze wird gerichtet...',
      'Arbeitsplatte wird vorbereitet...',
      'Kochschürze wird festgeknotet...',
      'Der Ofen wird vorgeheizt...',
      'Frische Zutaten werden sortiert...',
      'Kochlöffel wird bereitgelegt...'
    ],
    scraping: [
      'Rezept-Video wird angeschaut...',
      'Geheime Gewürze werden entdeckt...',
      'Zutatenliste wird zusammengestellt...',
      'Chefkoch studiert die Zubereitung...',
      'Frische Kräuter werden gezupft...',
      'Schritt-für-Schritt-Ablauf wird erfasst...'
    ],
    processing: [
      'Soße wird abgeschmeckt und verfeinert...',
      'Zwiebeln werden geschnitten (ohne Tränen!)...',
      'Portionsgrößen werden perfekt berechnet...',
      'Eine Prise Magie wird hinzugefügt...',
      'Schritte werden leicht verständlich formuliert...',
      'Nährwerte werden präzise ermittelt...'
    ],
    completed: [
      'Rezept wird frisch serviert!'
    ],
    failed: [
      'Der Topf ist übergelaufen!'
    ]
  },
  en: {
    pending: [
      'Adjusting the chef\'s hat...',
      'Prepping the kitchen counter...',
      'Tying the apron...',
      'Preheating the oven...',
      'Sorting fresh ingredients...',
      'Setting out the wooden spoon...'
    ],
    scraping: [
      'Watching the recipe video...',
      'Discovering secret seasonings...',
      'Gathering the ingredient list...',
      'Studying the cooking technique...',
      'Plucking fresh garden herbs...',
      'Capturing step-by-step instructions...'
    ],
    processing: [
      'Tasting and perfecting the sauce...',
      'Chopping onions (without tears!)...',
      'Balancing portion sizes...',
      'Adding a pinch of cooking magic...',
      'Writing clear cooking steps...',
      'Calculating nutritional values...'
    ],
    completed: [
      'Recipe is ready to serve!'
    ],
    failed: [
      'The pot boiled over!'
    ]
  }
};

const SCENE_ORDER: ProgressStage[] = [
  'queued',
  'scraping',
  'downloading_media',
  'extracting_frames',
  'extracting_recipe',
  'generating_cover',
  'finalizing'
];

const PHOTO_SCENE_ORDER: ProgressStage[] = [
  'queued',
  'reading_photos',
  'extracting_recipe',
  'generating_cover',
  'finalizing'
];

const SCENE_TARGET_PERCENT: Record<ProgressStage, number> = {
  queued: 8,
  scraping: 25,
  downloading_media: 50,
  awaiting_frames: 40,
  extracting_frames: 65,
  reading_photos: 30,
  extracting_recipe: 75,
  generating_cover: 88,
  finalizing: 95,
};

export default function ExtractionAnimation({ url: _url, jobStatus, progress, variant = 'link', compact: _compact = false }: ExtractionAnimationProps) {
  const { t, language } = useI18n();
  const { isPremium } = useAuth();
  const [displayedIndex, setDisplayedIndex] = useState(0);
  const [funnyText, setFunnyText] = useState('');

  // Track when the scene was displayed
  const shownAtRef = useRef<number>(Date.now());

  const sceneOrder = variant === 'photo' ? PHOTO_SCENE_ORDER : SCENE_ORDER;

  // Determine current active stage based on real progress or fallback
  const fallbackStage: ProgressStage = variant === 'photo'
    ? (jobStatus === 'processing' ? 'reading_photos' : 'queued')
    : (jobStatus === 'scraping' ? 'scraping' : jobStatus === 'processing' ? 'downloading_media' : 'queued');
  const activeStage = progress?.stage ?? fallbackStage;
  const targetIndex = Math.max(0, sceneOrder.indexOf(activeStage));

  // Monotonic increment state machine with 2-second floor
  useEffect(() => {
    if (displayedIndex >= targetIndex) {
      return;
    }

    const elapsed = Date.now() - shownAtRef.current;
    const remainingTime = Math.max(0, 1800 - elapsed);

    const timer = setTimeout(() => {
      setDisplayedIndex(prev => {
        const next = prev + 1;
        shownAtRef.current = Date.now();
        return next;
      });
    }, remainingTime);

    return () => clearTimeout(timer);
  }, [displayedIndex, targetIndex]);

  const displayedStage = sceneOrder[displayedIndex];

  // Rotate funny text based on displayed stage
  useEffect(() => {
    let funnyKey: 'pending' | 'scraping' | 'processing' | 'completed' | 'failed' = 'processing';
    if (displayedStage === 'queued') {
      funnyKey = 'pending';
    } else if (displayedStage === 'scraping' || displayedStage === 'reading_photos') {
      funnyKey = 'scraping';
    } else if (jobStatus === 'completed') {
      funnyKey = 'completed';
    } else if (jobStatus === 'failed') {
      funnyKey = 'failed';
    }

    const texts = FUNNY_TEXTS[language][funnyKey] || [];
    if (texts.length === 0) return;

    const pickRandom = (current: string) => {
      const available = texts.filter(t => t !== current);
      if (available.length === 0) return texts[0];
      const randomIndex = Math.floor(Math.random() * available.length);
      return available[randomIndex];
    };

    setFunnyText(pickRandom(''));

    const interval = setInterval(() => {
      setFunnyText(prev => pickRandom(prev));
    }, 4000);

    return () => clearInterval(interval);
  }, [jobStatus, displayedStage, language]);

  const targetPercent = SCENE_TARGET_PERCENT[displayedStage];
  const percent = progress?.percent !== undefined ? Math.min(progress.percent, targetPercent) : targetPercent;

  return (
    <div className="bg-white dark:bg-gray-900 rounded-3xl border-none shadow-[0_2px_6px_rgba(0,0,0,0.03)] p-6 sm:p-8 flex flex-col items-center justify-center text-center w-full">
      {/* Clean Minimal Icon */}
      <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-4">
        <ChefHat className="w-8 h-8 animate-pulse" />
      </div>

      {/* Clean Title & Subtle Subtitle */}
      <h3 className="text-base font-bold text-gray-900 dark:text-white leading-snug">
        {t(`job.progress.stages.${displayedStage}`)}
      </h3>
      <p
        key={funnyText}
        className="text-xs text-gray-500 dark:text-gray-400 mt-1 min-h-[1.25rem] italic animate-fade-in"
      >
        {funnyText}
      </p>

      {/* Minimal Clean Progress Bar */}
      <div className="w-full max-w-xs mt-5 flex flex-col gap-1.5">
        <div className="w-full bg-gray-100 dark:bg-gray-800 h-1.5 rounded-full overflow-hidden">
          <div
            className="bg-emerald-500 h-full rounded-full transition-all duration-500 ease-out"
            style={{ width: `${percent}%` }}
          />
        </div>
        <div className="flex justify-between items-center text-[11px] font-medium text-gray-400 dark:text-gray-500 px-0.5">
          <span>{language === 'de' ? 'Rezept-Erstellung' : 'Recipe Creation'}</span>
          <span className="font-semibold tabular-nums text-gray-700 dark:text-gray-300">{percent}%</span>
        </div>
      </div>

      {/* Background Notification Notice for Premium */}
      {isPremium && (
        <p className="text-[11px] leading-relaxed text-gray-400 dark:text-gray-500 mt-5 max-w-xs border-t border-gray-100 dark:border-gray-800/60 pt-3.5">
          {t('job.backgroundNotice')}
        </p>
      )}
    </div>
  );
}
