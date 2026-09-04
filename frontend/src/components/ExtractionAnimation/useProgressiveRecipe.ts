import { useState, useEffect, useRef, useMemo } from 'react';
import { useI18n } from '../../context/I18nContext';
import { hapticLight } from '../../utils/haptics';
import type { SupportedLanguage } from '../../i18n';
import type { ProgressStage, RecipePreviewData } from '../../types';
import type { ExtractionAnimationProps, PlatformType, ProgressiveRecipeState } from './types';

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
      'Rezeptur wird studiert...',
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
    completed: ['Rezept wird frisch serviert!'],
    failed: ['Der Topf ist übergelaufen!']
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
      'Studying recipe details...',
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
    completed: ['Recipe is ready to serve!'],
    failed: ['The pot boiled over!']
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
  queued: 10,
  scraping: 25,
  downloading_media: 45,
  awaiting_frames: 40,
  extracting_frames: 60,
  reading_photos: 30,
  extracting_recipe: 75,
  generating_cover: 88,
  finalizing: 96,
};

function detectPlatform(url: string, variant: 'link' | 'photo'): PlatformType {
  if (variant === 'photo' || url.startsWith('photo://')) return 'photo';
  try {
    const raw = url.match(/^https?:\/\//i) ? url : `https://${url}`;
    const parsed = new URL(raw);
    const host = parsed.hostname.toLowerCase();
    if (host.includes('instagram.com')) return 'instagram';
    if (host.includes('tiktok.com')) return 'tiktok';
    if (host.includes('youtube.com') || host.includes('youtu.be')) return 'youtube';
  } catch {
    // fallback to generic web
  }
  return 'web';
}

export function useProgressiveRecipe({
  url,
  jobStatus,
  progress,
  variant = 'link',
  photoPreviewUrl,
}: ExtractionAnimationProps): ProgressiveRecipeState {
  const { language } = useI18n();
  const [displayedIndex, setDisplayedIndex] = useState(0);
  const [funnyText, setFunnyText] = useState('');
  const [cachedPreview, setCachedPreview] = useState<RecipePreviewData | null>(null);

  const shownAtRef = useRef<number>(Date.now());
  const sceneOrder = variant === 'photo' ? PHOTO_SCENE_ORDER : SCENE_ORDER;
  const platform = useMemo(() => detectPlatform(url, variant), [url, variant]);

  // Sync and cache live preview data so it never flashes back
  useEffect(() => {
    if (progress?.preview) {
      setCachedPreview(prev => {
        const next = { ...(prev ?? {}), ...progress.preview };
        if (!prev?.title && next.title) {
          hapticLight();
        }
        return next;
      });
    } else if (photoPreviewUrl && !cachedPreview?.thumbnailUrl) {
      setCachedPreview(prev => ({ ...(prev ?? {}), thumbnailUrl: photoPreviewUrl }));
    }
  }, [progress?.preview, photoPreviewUrl, cachedPreview?.thumbnailUrl]);

  // Determine active stage
  const fallbackStage: ProgressStage = variant === 'photo'
    ? (jobStatus === 'processing' ? 'reading_photos' : 'queued')
    : (jobStatus === 'scraping' ? 'scraping' : jobStatus === 'processing' ? 'downloading_media' : 'queued');
  const activeStage = progress?.stage ?? fallbackStage;
  const targetIndex = Math.max(0, sceneOrder.indexOf(activeStage));

  // Monotonic step animation with comfortable transition floor
  useEffect(() => {
    if (displayedIndex >= targetIndex) return;

    const elapsed = Date.now() - shownAtRef.current;
    const remainingTime = Math.max(0, 1400 - elapsed);

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
    if (displayedStage === 'queued') funnyKey = 'pending';
    else if (displayedStage === 'scraping' || displayedStage === 'reading_photos') funnyKey = 'scraping';
    else if (jobStatus === 'completed') funnyKey = 'completed';
    else if (jobStatus === 'failed') funnyKey = 'failed';

    const texts = FUNNY_TEXTS[language][funnyKey] || [];
    if (texts.length === 0) return;

    const pickRandom = (curr: string) => {
      const filtered = texts.filter(t => t !== curr);
      return filtered[Math.floor(Math.random() * filtered.length)] ?? texts[0];
    };

    setFunnyText(pickRandom(''));
    const interval = setInterval(() => setFunnyText(prev => pickRandom(prev)), 3800);
    return () => clearInterval(interval);
  }, [jobStatus, displayedStage, language]);

  const targetPercent = SCENE_TARGET_PERCENT[displayedStage] ?? 20;
  const percent = progress?.percent !== undefined
    ? Math.min(progress.percent, targetPercent)
    : targetPercent;

  return {
    displayedStage,
    percent,
    preview: cachedPreview,
    platform,
    funnyText,
    isCompleted: jobStatus === 'completed',
  };
}
