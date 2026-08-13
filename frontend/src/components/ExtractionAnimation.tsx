import { useState, useEffect, useRef } from 'react';
import { Camera, ChefHat, Video } from 'lucide-react';
import { useI18n } from '../context/I18nContext';
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
      'Hände werden gründlich gewaschen...',
      'Arbeitsplatte wird sauber gewischt...',
      'Die Pfannen werden vorgeheizt...',
      'Messer werden geschärft (Vorsicht!)...',
      'Kochschürze wird festgeknotet...',
      'Der Ofen wird auf Betriebstemperatur gebracht...',
      'Kochlöffel wird bereitgelegt...',
      'KI zieht die Kochschürze an...',
      'Gewürzregal wird auf Vollständigkeit geprüft...'
    ],
    scraping: [
      'Video-Küche wird durchwühlt...',
      'Video-Zutaten werden digital eingescannt...',
      'Die Tonspur wird aus dem Video gefiltert...',
      'Untertitel werden entziffert...',
      'Video-Metadaten werden analysiert...',
      'Audio-Frequenzen werden glattgebügelt...',
      'Anti-Spam-Wächter werden abgelenkt...',
      'Der digitale Küchenhelfer holt das Video ab...',
      'Video-Bilder werden stichprobenartig betrachtet...',
      'Koch-Video wird in die Küche getragen...'
    ],
    processing: [
      'KI probiert die Soße...',
      'Gemüse wird geschnippelt...',
      'Zwiebeln werden geschnitten (Tränen fließen!)...',
      'KI liest das Rezept Korrektur...',
      'Soße wird abgeschmeckt und nachgewürzt...',
      'Kreatives Küchen-Chaos wird verwaltet...',
      'Portionsgrößen werden mathematisch berechnet...',
      'KI berät sich mit dem Chefkoch...',
      'Eine Prise KI-Magie wird hinzugefügt...',
      'Gericht wird im Ofen überbacken...'
    ],
    completed: [
      'Rezept wird serviert!'
    ],
    failed: [
      'Der Topf ist übergelaufen!'
    ]
  },
  en: {
    pending: [
      'Adjusting chef\'s hat...',
      'Washing hands thoroughly...',
      'Wiping down the countertop...',
      'Preheating the pans...',
      'Sharpening knives (careful!)...',
      'Tying the apron...',
      'Bringing the oven to temperature...',
      'Setting out the wooden spoon...',
      'AI is putting on the apron...',
      'Checking the spice rack...'
    ],
    scraping: [
      'Rummaging through the video kitchen...',
      'Digitally scanning video ingredients...',
      'Filtering the audio track from the video...',
      'Deciphering subtitles...',
      'Analyzing video metadata...',
      'Smoothing out audio frequencies...',
      'Distracting the digital anti-spam guardians...',
      'The digital kitchen helper is fetching the video...',
      'Reviewing video frames...',
      'Carrying the cooking video into the kitchen...'
    ],
    processing: [
      'AI is tasting the sauce...',
      'Chopping vegetables...',
      'Chopping onions (tears are falling!)...',
      'AI is proofreading the recipe...',
      'Tasting and seasoning the sauce...',
      'Managing creative kitchen chaos...',
      'Mathematically calculating portion sizes...',
      'AI is consulting with the head chef...',
      'Adding a pinch of AI magic...',
      'Grilling the dish in the oven...'
    ],
    completed: [
      'Recipe is served!'
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

// Photo imports skip scraping, media download and frame extraction entirely.
// They need their own sequence because the scene walker advances one step at a
// time with a 2s floor — on the shared list it would spend six seconds showing
// "searching the reel" and "downloading audio" for a job that does neither.
const PHOTO_SCENE_ORDER: ProgressStage[] = [
  'queued',
  'reading_photos',
  'extracting_recipe',
  'finalizing'
];

const SCENE_TARGET_PERCENT: Record<ProgressStage, number> = {
  queued: 5,
  scraping: 15,
  downloading_media: 50,
  extracting_frames: 55,
  reading_photos: 20,
  extracting_recipe: 75,
  finalizing: 90,
};

export default function ExtractionAnimation({ url: _url, jobStatus, progress, variant = 'link', compact = false }: ExtractionAnimationProps) {
  const { t, language } = useI18n();
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
    const remainingTime = Math.max(0, 2000 - elapsed);

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
    } else if (displayedStage === 'scraping') {
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
    }, 5000);

    return () => clearInterval(interval);
  }, [jobStatus, displayedStage, language]);

  const targetPercent = SCENE_TARGET_PERCENT[displayedStage];
  const percent = progress?.percent !== undefined ? Math.min(progress.percent, targetPercent) : targetPercent;

  const renderInfographic = (stage: ProgressStage) => {
    switch (stage) {
      case 'queued':
        return (
          <div className="relative flex items-center justify-center h-28">
            <div className="absolute inset-0 bg-emerald-500/10 dark:bg-emerald-500/20 rounded-full blur-xl animate-pulse-slow w-20 h-20 -m-6" />
            <ChefHat className="w-16 h-16 text-emerald-600 dark:text-emerald-400 relative z-10 animate-bounce" />
          </div>
        );
      case 'scraping':
        return (
          <div className="relative flex items-center justify-center h-28">
            <div className="absolute w-24 h-24 rounded-full border-2 border-emerald-500/30 dark:border-emerald-400/30 animate-radar" />
            <div className="absolute w-16 h-16 rounded-full border border-emerald-500/20 dark:border-emerald-400/20" />
            <div className="p-4 rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 relative z-10">
              <Video className="w-10 h-10 text-emerald-600 dark:text-emerald-400 animate-pulse" />
            </div>
          </div>
        );
      case 'downloading_media':
        return (
          <div className="relative flex items-center justify-center h-28">
            <div className="w-16 h-24 rounded-xl border border-black/15 dark:border-white/15 bg-black/10 dark:bg-white/5 relative overflow-hidden flex items-center justify-center">
              {/* Shimmer overlay */}
              <div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full"
                style={{ animation: 'shimmer 1.5s infinite' }}
              />
              <div className="w-8 h-8 rounded-full bg-black/20 dark:bg-white/10 flex items-center justify-center">
                <div className="w-0 h-0 border-t-[5px] border-t-transparent border-l-[8px] border-l-gray-700 dark:border-l-white border-b-[5px] border-b-transparent ml-0.5" />
              </div>
            </div>
            <div className="absolute bottom-0 right-10 p-1.5 rounded-full bg-emerald-500 text-white shadow-lg animate-bounce-arrow">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 13l-7 7-7-7m14-6l-7 7-7-7" />
              </svg>
            </div>
          </div>
        );
      case 'extracting_frames':
        return (
          <div className="relative flex flex-col items-center justify-center h-28">
            <div className="flex gap-1.5 p-2 bg-gray-100 dark:bg-gray-900 rounded-lg shadow-sm border border-black/10 dark:border-white/10 relative overflow-hidden">
              <div className="absolute inset-x-0 h-1 bg-emerald-400 dark:bg-emerald-500 shadow-[0_0_8px_#34d399] animate-scan z-10" />

              {[...Array(3)].map((_, i) => (
                <div key={i} className="w-10 h-10 rounded bg-gray-200 dark:bg-gray-800 flex items-center justify-center relative overflow-hidden mt-1 mb-1">
                  <div className="w-6 h-6 rounded bg-gray-300 dark:bg-gray-700 flex items-center justify-center">
                    <div className={`w-3 h-3 rounded-full bg-emerald-500/30 dark:bg-emerald-500/20 ${i === 0 ? 'animate-pulse' : i === 1 ? 'animate-pulse [animation-delay:0.3s]' : 'animate-pulse [animation-delay:0.6s]'
                      }`} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      case 'reading_photos':
        return (
          <div className="relative flex items-center justify-center h-28">
            <div className="w-20 h-24 rounded-lg bg-white dark:bg-gray-900 border border-black/10 dark:border-white/10 shadow-sm rotate-[-4deg] relative overflow-hidden flex flex-col gap-1.5 p-3">
              <div className="absolute inset-x-0 h-1 bg-emerald-400 dark:bg-emerald-500 shadow-[0_0_8px_#34d399] animate-scan z-10" />
              <div className="h-1.5 w-3/4 rounded-full bg-emerald-500/30" />
              <div className="h-1 w-full rounded-full bg-black/15 dark:bg-white/15" />
              <div className="h-1 w-5/6 rounded-full bg-black/15 dark:bg-white/15" />
              <div className="h-1 w-full rounded-full bg-black/15 dark:bg-white/15" />
              <div className="h-1 w-2/3 rounded-full bg-black/15 dark:bg-white/15" />
            </div>
            <div className="absolute -right-1 bottom-3 p-2 rounded-full bg-emerald-500/10 dark:bg-emerald-500/20">
              <Camera className="w-5 h-5 text-emerald-600 dark:text-emerald-400 animate-pulse" />
            </div>
          </div>
        );
      case 'extracting_recipe':
        return (
          <div className="relative flex flex-col items-center justify-center gap-2.5 h-28">
            <div className="relative">
              <ChefHat className="w-10 h-10 text-emerald-600 dark:text-emerald-400 animate-bounce" />
            </div>

            <div className="flex flex-col gap-1 w-24 items-center">
              <div className="h-1 bg-emerald-500/30 rounded-full animate-write w-full" style={{ animationDelay: '0s' }} />
              <div className="h-1 bg-emerald-500/20 rounded-full animate-write w-full" style={{ animationDelay: '0.4s' }} />
              <div className="h-1 bg-emerald-500/15 rounded-full animate-write w-full" style={{ animationDelay: '0.8s' }} />
            </div>
          </div>
        );
      case 'finalizing':
        return (
          <div className="relative flex items-center justify-center h-28">
            <div className="w-14 h-14 rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 flex items-center justify-center scale-95 animate-pulse-slow">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" className="animate-[checkmark-draw_0.6s_ease-out_forwards]" style={{ strokeDasharray: 50, strokeDashoffset: 50 }} />
              </svg>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col items-center justify-center w-full text-center px-4 py-2 gap-3 transition-all duration-300">
      {/* Infographic Area */}
      <div className="flex items-center justify-center w-full py-4">
        <div key={displayedIndex} className="animate-fade-in flex flex-col items-center justify-center w-full">
          {renderInfographic(displayedStage)}
        </div>
      </div>

      {/* Progress & Status Area */}
      <div className="flex flex-col gap-4 w-full max-w-xs">
        {/* Stage details */}
        <div className="flex justify-between items-center text-xs font-semibold">
          <span className="text-gray-950 dark:text-white/95 tracking-wide uppercase">
            {t(`job.progress.stages.${displayedStage}`)}
          </span>
          <span className="text-emerald-600 dark:text-emerald-400 tabular-nums">
            {percent}%
          </span>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-emerald-500/10 dark:bg-emerald-500/10 h-2.5 rounded-full overflow-hidden relative shadow-inner">
          <div
            className="bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-600 h-full rounded-full transition-all duration-500 ease-out relative"
            style={{ width: `${percent}%` }}
          >
            <div className="absolute inset-0 bg-white/20 animate-pulse" />
          </div>
        </div>

        {/* Funny Rotating Copy */}
        <div className="pt-3 border-t border-black/5 dark:border-white/5 min-h-[40px] flex items-center justify-center text-center">
          <p
            key={funnyText}
            className="text-xs text-gray-500 dark:text-gray-400 italic opacity-95 animate-fade-in max-w-xs"
          >
            {funnyText}
          </p>
        </div>
      </div>

      {/* Background Notification Notice */}
      <div className="max-w-xs text-center px-4 pt-3 border-t border-black/5 dark:border-white/5">
        <p className="text-[11px] leading-relaxed text-gray-400 dark:text-gray-500">
          {t('job.backgroundNotice')}
        </p>
      </div>
    </div>
  );
}
