import { useState, useEffect, useRef } from 'react';
import { Camera, ChefHat, Sparkles, UtensilsCrossed, CheckCircle2 } from 'lucide-react';
import { useI18n } from '../context/I18nContext';
import { useAuth } from '../context/AuthContext';
import type { SupportedLanguage } from '../i18n';
import type { ProgressData, ProgressStage } from '../types';

interface ExtractionAnimationProps {
  url: string;
  isPending: boolean;
  jobStatus: 'pending' | 'scraping' | 'processing' | 'completed' | 'failed' | null;
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
  'finalizing'
];

const PHOTO_SCENE_ORDER: ProgressStage[] = [
  'queued',
  'reading_photos',
  'extracting_recipe',
  'finalizing'
];

const SCENE_TARGET_PERCENT: Record<ProgressStage, number> = {
  queued: 8,
  scraping: 25,
  downloading_media: 50,
  extracting_frames: 65,
  reading_photos: 30,
  extracting_recipe: 85,
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

  const renderVisual = (stage: ProgressStage) => {
    switch (stage) {
      case 'queued':
        return (
          <div className="relative flex items-center justify-center">
            <div className="w-20 h-20 rounded-3xl bg-emerald-500/10 dark:bg-emerald-500/20 flex items-center justify-center shadow-inner relative">
              <ChefHat className="w-10 h-10 text-emerald-600 dark:text-emerald-400 animate-bounce" />
              <Sparkles className="w-4 h-4 text-amber-400 absolute -top-1 -right-1 animate-pulse" />
            </div>
          </div>
        );
      case 'scraping':
      case 'reading_photos':
        return (
          <div className="relative flex items-center justify-center">
            <div className="w-20 h-20 rounded-3xl bg-emerald-500/10 dark:bg-emerald-500/20 flex items-center justify-center shadow-inner relative">
              {stage === 'reading_photos' ? (
                <Camera className="w-10 h-10 text-emerald-600 dark:text-emerald-400 animate-pulse" />
              ) : (
                <UtensilsCrossed className="w-10 h-10 text-emerald-600 dark:text-emerald-400 animate-pulse" />
              )}
              <div className="absolute inset-0 rounded-3xl border border-emerald-500/30 animate-ping [animation-duration:2.5s]" />
            </div>
          </div>
        );
      case 'downloading_media':
      case 'extracting_frames':
      case 'extracting_recipe':
        return (
          <div className="relative flex items-center justify-center">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-emerald-500/20 via-teal-500/15 to-amber-500/15 dark:from-emerald-500/30 dark:via-teal-500/20 dark:to-amber-500/20 flex items-center justify-center shadow-inner relative">
              <ChefHat className="w-10 h-10 text-emerald-600 dark:text-emerald-400 animate-pulse" />
              <div className="flex gap-1 absolute -top-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce [animation-delay:0s]" />
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce [animation-delay:0.2s]" />
                <div className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-bounce [animation-delay:0.4s]" />
              </div>
            </div>
          </div>
        );
      case 'finalizing':
        return (
          <div className="relative flex items-center justify-center">
            <div className="w-20 h-20 rounded-3xl bg-emerald-500/15 dark:bg-emerald-500/25 flex items-center justify-center shadow-inner">
              <CheckCircle2 className="w-10 h-10 text-emerald-600 dark:text-emerald-400 animate-pulse" />
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-3xl border-none shadow-[0_2px_6px_rgba(0,0,0,0.03)] p-6 sm:p-8 flex flex-col items-center gap-6 w-full text-center">
      {/* Animated Hero Graphic */}
      <div className="relative w-24 h-24 flex items-center justify-center my-1">
        <div className="absolute inset-0 bg-emerald-500/10 dark:bg-emerald-500/15 rounded-full blur-xl animate-pulse" />
        <div key={displayedIndex} className="animate-fade-in relative z-10">
          {renderVisual(displayedStage)}
        </div>
      </div>

      {/* Progress & Stage Details */}
      <div className="flex flex-col gap-3 w-full max-w-sm">
        <div className="flex justify-between items-center text-xs font-semibold px-0.5">
          <span className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">
            {t(`job.progress.stages.${displayedStage}`)}
          </span>
          <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
            {percent}%
          </span>
        </div>

        {/* Progress Bar - Clean Flat Style */}
        <div className="w-full bg-gray-100 dark:bg-gray-800 h-2.5 rounded-full overflow-hidden relative">
          <div
            className="bg-emerald-500 h-full rounded-full transition-all duration-500 ease-out relative"
            style={{ width: `${percent}%` }}
          >
            <div className="absolute inset-0 bg-white/20 animate-pulse" />
          </div>
        </div>

        {/* Charming Food Quote */}
        <div className="pt-2 min-h-[1.75rem] flex items-center justify-center">
          <p
            key={funnyText}
            className="text-xs text-gray-500 dark:text-gray-400 italic opacity-95 animate-fade-in"
          >
            {funnyText}
          </p>
        </div>
      </div>

      {/* Background Notification Notice — for Premium users */}
      {isPremium && (
        <div className="w-full max-w-sm bg-gray-50 dark:bg-gray-800/60 rounded-2xl p-3 text-center border-none">
          <p className="text-[11px] leading-relaxed text-gray-500 dark:text-gray-400">
            {t('job.backgroundNotice')}
          </p>
        </div>
      )}
    </div>
  );
}
