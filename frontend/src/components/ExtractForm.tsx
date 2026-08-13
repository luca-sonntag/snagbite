import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Card, TextField, Label, Input, Button, FieldError, Spinner, Accordion } from '@heroui/react';
import { BookOpen, Camera, Clipboard, Globe, HelpCircle, ImagePlus, Link2, Play, X } from 'lucide-react';
import { MAX_IMPORT_PHOTOS } from '../hooks/useRecipeExtraction';
import { Clipboard as CapClipboard } from '@capacitor/clipboard';
import { Capacitor } from '@capacitor/core';
import { useI18n } from '../context/I18nContext';
import { useAuth } from '../context/AuthContext';
import { useExtractionJobs } from '../context/ExtractionJobsContext';
import { isTrialBannerDismissed, TRIAL_BANNER_DISMISS_EVENT } from './TrialBanner';
import PremiumModal from './PremiumModal';
import PremiumHint from './PremiumHint';
import PremiumUpgradeCard from './PremiumUpgradeCard';
import type { ProgressData } from '../types';
import ExtractionAnimation from './ExtractionAnimation';
import ExtractionAdCard from './ExtractionAdCard';
import { showRewardedAd } from '../utils/ads';

import { InstagramIcon, ShareStep1Mockup, ShareStep2Mockup, ShareStep3Mockup } from './ShareMockups';

// Custom SVG component for YouTube icon
const YoutubeIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z" />
    <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" fill="currentColor" />
  </svg>
);

const TikTokIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.75a4.85 4.85 0 0 1-1.01-.06z" />
  </svg>
);

const FacebookIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path>
  </svg>
);



export type ExtractMode = 'link' | 'photo';

interface ExtractFormProps {
  isActive?: boolean;
  url: string;
  setUrl: (url: string) => void;
  urlError: string;
  setUrlError?: (error: string) => void;
  validateUrl: (url: string) => boolean;
  isPending: boolean;
  handleFormSubmit: (e: React.FormEvent) => void;
  limitStatus?: { limit: number; used: number; remaining: number; windowDays: number; savedRecipes: number; maxSavedRecipes: number; cookbookFull: boolean; maxConcurrent?: number; activeCount?: number } | null;
  jobStatus: 'pending' | 'scraping' | 'processing' | 'completed' | 'failed' | null;
  progress: ProgressData | null;
  errorBanner?: React.ReactNode;
  mode: ExtractMode;
  setMode: (mode: ExtractMode) => void;
  photos: File[];
  setPhotos: (photos: File[]) => void;
  isUploadingPhotos: boolean;
  claimRewardedCredit?: () => Promise<boolean>;
}

export default function ExtractForm({
  isActive = true,
  url,
  setUrl,
  urlError,
  setUrlError,
  validateUrl,
  isPending,
  handleFormSubmit,
  limitStatus,
  jobStatus,
  progress,
  errorBanner,
  mode,
  setMode,
  photos,
  setPhotos,
  isUploadingPhotos,
  claimRewardedCredit
}: ExtractFormProps) {
  const { t } = useI18n();
  const { user, isPremium, hasTrialAvailable, trialDays, trialLoading } = useAuth();
  const { activeCount: liveActiveCount } = useExtractionJobs();
  const [isPremiumModalOpen, setIsPremiumModalOpen] = useState(false);
  const [isWatchingAd, setIsWatchingAd] = useState(false);
  const [canPaste, setCanPaste] = useState(false);
  // React to TrialBanner dismissal so the upgrade card re-appears as soon
  // as the banner is closed.
  const [trialDismissed, setTrialDismissed] = useState(isTrialBannerDismissed);

  useEffect(() => {
    const onDismiss = () => setTrialDismissed(true);
    window.addEventListener(TRIAL_BANNER_DISMISS_EVENT, onDismiss);
    return () => window.removeEventListener(TRIAL_BANNER_DISMISS_EVENT, onDismiss);
  }, []);

  // Cookbook is full → block new extractions and steer to upgrade.
  // Premium/Unlimited users never get capped.
  const isRealPremium = user?.app_metadata?.tier === 'premium';
  const cookbookFull = !isRealPremium && !!limitStatus?.cookbookFull;
  const extractionLimitReached = !isRealPremium && !cookbookFull && !!limitStatus && limitStatus.limit >= 0 && limitStatus.remaining <= 0;
  const blockedByLimit = cookbookFull || extractionLimitReached;

  // Concurrency (premium/alpha background flow): how many extractions may run in
  // parallel, and whether that ceiling is currently reached. Free users have a
  // limit of 1 and run in the foreground, so no counter is shown for them.
  const maxConcurrent = limitStatus?.maxConcurrent ?? 1;
  const showConcurrency = isPremium && maxConcurrent > 1;
  const atConcurrencyLimit = showConcurrency && liveActiveCount >= maxConcurrent;
  const submitDisabled = blockedByLimit || atConcurrencyLimit || (mode === 'photo' && photos.length === 0);

  // Mirror TrialBanner's own visibility logic so the redundant UpgradeCard
  // disappears in exactly the same situations: premium users, while the
  // RevenueCat trial lookup is in-flight, or while the trial banner is on
  // screen (including after a previous dismiss on this device).
  const trialBannerShowing = !isPremium
    && !trialLoading
    && hasTrialAvailable
    && trialDays > 0
    && !trialDismissed;
  const hideUpgradeCard = isRealPremium || trialLoading || trialBannerShowing;

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      setCanPaste(true);
    } else if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.readText === 'function') {
      setCanPaste(true);
    }
  }, []);

  const handlePaste = async () => {
    try {
      let text = '';
      if (Capacitor.isNativePlatform()) {
        const result = await CapClipboard.read();
        text = result.value;
      } else {
        text = await navigator.clipboard.readText();
      }
      if (text) {
        setUrl(text);
        validateUrl(text);
      }
    } catch (err) {
      console.error('Failed to read clipboard:', err);
      setUrlError?.(t('form.pasteFailed'));
    }
  };

  const handleDemoClick = (demoUrl: string) => {
    if (isPending) return;
    if (atConcurrencyLimit) return;
    if (blockedByLimit) { setIsPremiumModalOpen(true); return; }
    setUrl(demoUrl);
    validateUrl(demoUrl);

    // Auto-submit the form
    setTimeout(() => {
      const form = document.querySelector('form');
      if (form) {
        form.requestSubmit();
      }
    }, 50);
  };

  // Camera vs gallery are two inputs rather than one: `capture` asks Android for
  // the camera app directly, while the gallery picker needs `multiple` and must
  // not carry `capture`. Plain file inputs keep this shippable over OTA — a
  // native camera plugin would require a full Play Store release.
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const photosFull = photos.length >= MAX_IMPORT_PHOTOS;

  // Preview URLs are derived once per selection and revoked when it changes —
  // creating them inline during render would mint a new URL on every re-render.
  const photoPreviews = useMemo(() => photos.map(photo => URL.createObjectURL(photo)), [photos]);
  useEffect(() => () => photoPreviews.forEach(URL.revokeObjectURL), [photoPreviews]);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files ?? []);
    // Reset so re-picking the very same file fires onChange again.
    e.target.value = '';
    if (picked.length === 0) return;
    setPhotos([...photos, ...picked].slice(0, MAX_IMPORT_PHOTOS));
  };

  const removePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index));
  };

  const openPicker = (ref: React.RefObject<HTMLInputElement | null>) => {
    if (blockedByLimit) { setIsPremiumModalOpen(true); return; }
    ref.current?.click();
  };

  const DEMO_RECIPES = [
    {
      name: 'Instagram Reel',
      url: 'https://www.instagram.com/p/DYixugyxvSe/',
      color: 'from-pink-500 to-rose-500',
      icon: <InstagramIcon className="w-4 h-4 text-white" />
    },
    {
      name: 'TikTok Video',
      url: 'https://www.tiktok.com/@on_todays_bake/video/7618942237535194390',
      color: 'from-gray-900 to-black dark:from-gray-800 dark:to-gray-900',
      icon: <TikTokIcon className="w-4 h-4 text-white" />
    }
  ];

  return (
    <div className={`flex flex-col gap-4 w-full ${isPending ? 'flex-1 justify-center my-auto min-h-0' : ''}`}>
      {/* Premium Upgrade Promotion — displayed at very top (only when no contextual limit banner is shown) */}
      {!isPending && !hideUpgradeCard && !blockedByLimit && (
        <PremiumUpgradeCard onUpgradeClick={() => setIsPremiumModalOpen(true)} />
      )}
      {errorBanner}
      {/* Input Card or Extraction Animation Card */}
      {isPending ? (
        <div className="flex flex-col w-full gap-4">
          <ExtractionAnimation
            url={url}
            isPending={isPending}
            jobStatus={jobStatus}
            progress={progress}
            variant={mode === 'photo' ? 'photo' : 'link'}
          />
          {/* Freemium ad in the empty space below the animation (native only). */}
          {!isRealPremium && <ExtractionAdCard isActive={isActive} />}
        </div>
      ) : (
        <Card className="!bg-white dark:!bg-gray-900 p-6 rounded-3xl border-none shadow-[0_2px_6px_rgba(0,0,0,0.03)]">
          <form
            onSubmit={(e) => {
              if (atConcurrencyLimit) { e.preventDefault(); return; }
              if (blockedByLimit) { e.preventDefault(); setIsPremiumModalOpen(true); return; }
              handleFormSubmit(e);
            }}
            className="flex flex-col gap-3"
          >
            {/* Input channel switch: a shared link vs. your own photos. */}
            <div className="flex items-center gap-1 p-1 rounded-2xl bg-gray-100 dark:bg-gray-800 border-none">
              {(['link', 'photo'] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setMode(option)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer outline-none border-none ${mode === option
                    ? 'bg-white dark:bg-gray-900 text-emerald-600 dark:text-emerald-400 shadow-[0_2px_6px_rgba(0,0,0,0.03)]'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}
                >
                  {option === 'link' ? <Link2 className="w-3.5 h-3.5" /> : <Camera className="w-3.5 h-3.5" />}
                  <span>{t(`form.mode.${option}`)}</span>
                </button>
              ))}
            </div>

            {mode === 'photo' ? (
              <div className="flex flex-col gap-3">
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handlePhotoChange}
                  className="hidden"
                />
                <input
                  ref={galleryInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handlePhotoChange}
                  className="hidden"
                />

                {photos.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 py-6 px-4 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-center">
                    <div className="p-2.5 rounded-full bg-emerald-500/10">
                      <Camera className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{t('form.photo.emptyTitle')}</p>
                    <p className="text-xs leading-relaxed text-gray-500 dark:text-gray-400 max-w-[16rem]">
                      {t('form.photo.emptyHint')}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {photos.map((photo, index) => (
                      <div key={`${photo.name}-${index}`} className="relative aspect-square rounded-xl overflow-hidden border-none bg-gray-100 dark:bg-gray-800 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
                        <img
                          src={photoPreviews[index]}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                        {/* The badge is the page order sent to the extractor. */}
                        <span className="absolute bottom-1 left-1 w-5 h-5 rounded-full bg-black/65 text-white text-[10px] font-bold flex items-center justify-center backdrop-blur-sm">
                          {index + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => removePhoto(index)}
                          className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/65 text-white flex items-center justify-center backdrop-blur-sm active:scale-90 transition-transform cursor-pointer border-none"
                          aria-label={t('form.photo.remove')}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => openPicker(cameraInputRef)}
                    disabled={photosFull}
                    className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-2xl text-xs font-semibold bg-gray-100 dark:bg-gray-800 border-none text-gray-900 dark:text-white disabled:opacity-40 hover:bg-gray-200 dark:hover:bg-gray-700 active:scale-95 transition-all cursor-pointer"
                  >
                    <Camera className="w-4 h-4" />
                    <span>{t('form.photo.takePhoto')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => openPicker(galleryInputRef)}
                    disabled={photosFull}
                    className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-2xl text-xs font-semibold bg-gray-100 dark:bg-gray-800 border-none text-gray-900 dark:text-white disabled:opacity-40 hover:bg-gray-200 dark:hover:bg-gray-700 active:scale-95 transition-all cursor-pointer"
                  >
                    <ImagePlus className="w-4 h-4" />
                    <span>{t('form.photo.fromGallery')}</span>
                  </button>
                </div>

                <p className="text-center text-[11px] text-gray-400 dark:text-gray-500">
                  {t('form.photo.counter', { count: photos.length, max: MAX_IMPORT_PHOTOS })}
                </p>
              </div>
            ) : (
              <TextField
                fullWidth
                name="url"
                value={url}
                onChange={(val) => {
                  setUrl(val);
                  if (urlError) validateUrl(val);
                }}
                isInvalid={!!urlError}
              >
                <Label className="sr-only">{t('form.urlLabel')}</Label>
                <div className="relative">
                  <Link2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-gray-400 dark:text-gray-500 pointer-events-none" />
                  <Input
                    placeholder={t('form.urlPlaceholderShort')}
                    className="w-full !bg-gray-100 dark:!bg-gray-800 border-none rounded-2xl pl-11 !pr-12 py-3.5 text-sm text-gray-900 dark:text-white shadow-[0_1px_3px_rgba(0,0,0,0.02)] focus:ring-2 focus:ring-emerald-500/30 focus:outline-none transition-all"
                    disabled={isPending}
                  />
                  <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    {url && (
                      <button
                        type="button"
                        className="text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-white text-xl font-bold w-8 h-8 flex items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors border-none"
                        onClick={() => setUrl('')}
                        disabled={isPending}
                      >
                        ×
                      </button>
                    )}
                    {canPaste && !url && (
                      <button
                        type="button"
                        className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 w-8 h-8 flex items-center justify-center rounded-full hover:bg-emerald-500/10 transition-colors border-none"
                        onClick={handlePaste}
                        disabled={isPending}
                        title={t('form.pasteTooltip')}
                      >
                        <Clipboard className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
                {urlError && <FieldError className="text-xs text-red-500 mt-1">{urlError}</FieldError>}
              </TextField>
            )}

            {extractionLimitReached && !cookbookFull ? (
              <div className="flex flex-col gap-2">
                <Button
                  type="button"
                  fullWidth
                  isDisabled={isWatchingAd || isPending}
                  onClick={async () => {
                    setIsWatchingAd(true);
                    try {
                      const earned = await showRewardedAd();
                      if (earned && claimRewardedCredit) {
                        const claimed = await claimRewardedCredit();
                        if (claimed && (url.trim() || photos.length > 0)) {
                          handleFormSubmit({ preventDefault: () => {} } as React.FormEvent);
                        }
                      }
                    } catch (err) {
                      console.error('Error during rewarded ad flow:', err);
                    } finally {
                      setIsWatchingAd(false);
                    }
                  }}
                  className="py-3.5 h-12 text-sm rounded-2xl font-bold border-none text-white bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-500 hover:to-teal-500 active:scale-95 transition-all shadow-none flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isWatchingAd ? (
                    <>
                      <Spinner color="current" size="sm" />
                      <span>{t('ads.rewardedLoading')}</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 fill-current" />
                      <span>
                        {(url.trim() || photos.length > 0)
                          ? 'Video ansehen & Rezept erstellen (+1)'
                          : 'Video ansehen (+1 Rezept)'}
                      </span>
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <Button
                type="submit"
                fullWidth
                isPending={isPending || isUploadingPhotos}
                isDisabled={submitDisabled}
                className={`py-3.5 h-12 text-sm rounded-2xl font-semibold border-none text-white ${submitDisabled
                  ? 'bg-gray-400 dark:bg-gray-700 cursor-not-allowed opacity-70 shadow-none'
                  : isPending
                    ? 'bg-emerald-800 shadow-none'
                    : 'bg-emerald-600 hover:bg-emerald-500 active:scale-95 transition-all shadow-none'
                  }`}
              >
                {({ isPending }) => (
                  <span className="flex items-center gap-2 justify-center">
                    {isPending ? (
                      <>
                        <Spinner color="current" size="sm" />
                        <span>{isUploadingPhotos ? t('form.photo.btnUploading') : t('form.btnPending')}</span>
                      </>
                    ) : (
                      <>
                        <BookOpen className="w-4 h-4" />
                        <span>{t('form.btnSubmit')}</span>
                      </>
                    )}
                  </span>
                )}
              </Button>
            )}

            {/* Premium parallel-extraction counter — how many run at once. */}
            {showConcurrency && (liveActiveCount > 0 || atConcurrencyLimit) && (
              <p className={`text-center text-xs font-medium -mt-1 ${atConcurrencyLimit ? 'text-amber-600 dark:text-amber-400' : 'text-gray-500 dark:text-gray-400'
                }`}>
                {atConcurrencyLimit
                  ? t('form.concurrentLimitReached', { max: maxConcurrent })
                  : t('form.concurrentCounter', { active: liveActiveCount, max: maxConcurrent })}
              </p>
            )}

            {cookbookFull ? (
              <div className="flex flex-col gap-2.5 -mt-1">
                <PremiumHint
                  variant="banner"
                  onClick={() => setIsPremiumModalOpen(true)}
                  label={t('premium.hint.catalogFull', {
                    count: limitStatus?.savedRecipes ?? 0,
                    limit: limitStatus?.maxSavedRecipes ?? 5
                  })}
                  cta={t('premium.hint.upgrade')}
                />
              </div>
            ) : extractionLimitReached ? (
              <div className="flex flex-col gap-2.5 -mt-1">
                <PremiumHint
                  variant="banner"
                  onClick={() => setIsPremiumModalOpen(true)}
                  label={t('premium.hint.extractionLimitReached', {
                    used: limitStatus?.used ?? 0,
                    limit: limitStatus?.limit ?? 0
                  })}
                  cta={t('premium.hint.upgrade')}
                />
              </div>
            ) : limitStatus && limitStatus.limit >= 0 ? (
              <div className="flex flex-col items-center gap-1.5 -mt-1">
                <p className="text-center text-xs text-gray-500 dark:text-gray-400 font-medium transition-colors">
                  {t('form.remainingExtractions', {
                    remaining: limitStatus.remaining,
                    limit: limitStatus.limit,
                    days: limitStatus.windowDays === 1
                      ? t('form.remainingExtractionsToday')
                      : t('form.remainingExtractionsDays', { days: limitStatus.windowDays })
                  })}
                </p>
                {!isRealPremium && (
                  <PremiumHint
                    variant="inline"
                    onClick={() => setIsPremiumModalOpen(true)}
                    label={t('premium.hint.extractUnlimited')}
                  />
                )}
              </div>
            ) : null}

            {/* Premium Modal */}
            <PremiumModal isOpen={isPremiumModalOpen} onOpenChange={setIsPremiumModalOpen} />

            {/* Supported Platforms */}
            {mode === 'link' ? (
              <div className="flex items-center justify-center gap-2 pt-1">
                <span className="text-[10px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                  {t('form.platformsTitle')}
                </span>
                <div className="flex items-center gap-3">
                  <InstagramIcon className="w-4 h-4 text-gray-300 dark:text-gray-600" />
                  <TikTokIcon className="w-4 h-4 text-gray-300 dark:text-gray-600" />
                  <YoutubeIcon className="w-4 h-4 text-gray-300 dark:text-gray-600" />
                  <FacebookIcon className="w-4 h-4 text-gray-300 dark:text-gray-600" />
                  <Globe className="w-4 h-4 text-gray-300 dark:text-gray-600" />
                </div>
              </div>
            ) : (
              <p className="text-center text-[11px] leading-relaxed text-gray-400 dark:text-gray-500 pt-1">
                {t('form.photo.tips')}
              </p>
            )}
          </form>
        </Card>
      )}

      {/* Other cards & accordions — hidden during active extraction */}
      {!isPending && (
        <>
          {/* Link-only guidance: sharing a post and the per-platform help below
              have no meaning for a photo import. */}
          {mode === 'link' && (<>
            {/* Share Directly Accordion */}
            <Accordion variant="surface" className="w-full bg-white/50 dark:bg-gray-900/50 backdrop-blur-md rounded-2xl border border-black/5 dark:border-white/5 overflow-hidden" defaultExpandedKeys={['share']}>
              <Accordion.Item className="border-none" id="share">
                <Accordion.Heading>
                  <Accordion.Trigger className="px-5 py-4 flex items-center justify-between text-gray-800 dark:text-gray-200 hover:bg-black/5 dark:hover:bg-white/5">
                    <span className="flex items-center gap-2 text-sm font-semibold">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                        <polyline points="16 6 12 2 8 6" />
                        <line x1="12" y1="2" x2="12" y2="15" />
                      </svg>
                      {t('form.helpShareTitle')}
                    </span>
                    <Accordion.Indicator />
                  </Accordion.Trigger>
                </Accordion.Heading>
                <Accordion.Panel>
                  <Accordion.Body className="px-5 pb-5 pt-3 text-xs text-gray-600 dark:text-gray-400 flex flex-col gap-4 border-t border-black/5 dark:border-white/5">
                    <p className="leading-relaxed">{t('form.helpShareDesc')}</p>

                    {/* Visual Step-by-Step Guide */}
                    <div className="flex flex-col gap-3 pt-1">
                      {/* Step 1 */}
                      <div className="flex gap-4 p-3 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/5 dark:border-white/5 items-center justify-between">
                        <div className="flex-1 flex flex-col gap-1">
                          <h4 className="font-semibold text-gray-800 dark:text-gray-200 text-xs">
                            {t('form.helpShareStep1Title')}
                          </h4>
                          <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-normal">
                            {t('form.helpShareStep1Desc')}
                          </p>
                        </div>
                        <ShareStep1Mockup />
                      </div>

                      {/* Step 2 */}
                      <div className="flex gap-4 p-3 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/5 dark:border-white/5 items-center justify-between">
                        <div className="flex-1 flex flex-col gap-1">
                          <h4 className="font-semibold text-gray-800 dark:text-gray-200 text-xs">
                            {t('form.helpShareStep2Title')}
                          </h4>
                          <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-normal">
                            {t('form.helpShareStep2Desc')}
                          </p>
                        </div>
                        <ShareStep2Mockup />
                      </div>

                      {/* Step 3 */}
                      <div className="flex gap-4 p-3 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/5 dark:border-white/5 items-center justify-between">
                        <div className="flex-1 flex flex-col gap-1">
                          <h4 className="font-semibold text-gray-800 dark:text-gray-200 text-xs">
                            {t('form.helpShareStep3Title')}
                          </h4>
                          <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-normal">
                            {t('form.helpShareStep3Desc')}
                          </p>
                        </div>
                        <ShareStep3Mockup />
                      </div>
                    </div>

                    <p className="text-[10px] text-gray-400 dark:text-gray-500 text-center italic mt-1 leading-normal">
                      {t('form.helpShareStep')}
                    </p>
                  </Accordion.Body>
                </Accordion.Panel>
              </Accordion.Item>
            </Accordion>

            {/* Help / Instructions Accordion */}
            <Accordion variant="surface" className="w-full bg-white/50 dark:bg-gray-900/50 backdrop-blur-md rounded-2xl border border-black/5 dark:border-white/5 overflow-hidden">
              <Accordion.Item className="border-none">
                <Accordion.Heading>
                  <Accordion.Trigger className="px-5 py-4 flex items-center justify-between text-gray-800 dark:text-gray-200 hover:bg-black/5 dark:hover:bg-white/5">
                    <span className="flex items-center gap-2 text-sm font-semibold">
                      <HelpCircle className="w-4 h-4 text-emerald-500" />
                      {t('form.helpTitle')}
                    </span>
                    <Accordion.Indicator />
                  </Accordion.Trigger>
                </Accordion.Heading>
                <Accordion.Panel>
                  <Accordion.Body className="px-5 pb-5 pt-1 text-xs text-gray-600 dark:text-gray-400 flex flex-col gap-3.5 border-t border-black/5 dark:border-white/5">
                    <div className="flex gap-2.5 items-start">
                      <div className="p-1.5 rounded-lg bg-pink-500/10 text-pink-600 dark:text-pink-400 shrink-0">
                        <InstagramIcon className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-0.5">Instagram Reel</h4>
                        <p>{t('form.helpSteps.instagram')}</p>
                      </div>
                    </div>
                    <div className="flex gap-2.5 items-start">
                      <div className="p-1.5 rounded-lg bg-black/10 dark:bg-white/10 text-gray-800 dark:text-gray-200 shrink-0">
                        <TikTokIcon className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-0.5">TikTok Video</h4>
                        <p>{t('form.helpSteps.tiktok')}</p>
                      </div>
                    </div>
                    <div className="flex gap-2.5 items-start">
                      <div className="p-1.5 rounded-lg bg-red-500/10 text-red-600 dark:text-red-400 shrink-0">
                        <YoutubeIcon className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-0.5">YouTube Shorts</h4>
                        <p>{t('form.helpSteps.youtube')}</p>
                      </div>
                    </div>
                    <div className="flex gap-2.5 items-start">
                      <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 shrink-0">
                        <FacebookIcon className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-0.5">Facebook Video</h4>
                        <p>{t('form.helpSteps.facebook')}</p>
                      </div>
                    </div>
                    <div className="flex gap-2.5 items-start">
                      <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
                        <Globe className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-0.5">Recipe Website</h4>
                        <p>{t('form.helpSteps.website')}</p>
                      </div>
                    </div>
                  </Accordion.Body>
                </Accordion.Panel>
              </Accordion.Item>
            </Accordion>

            {/* Demo Recipes Card */}
            <Card className="glass-panel p-5 mb-3 rounded-2xl border border-black/5 dark:border-white/5 shadow-md flex flex-col gap-3">
              <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {t('form.demoTitle')}
              </span>
              <div className="grid grid-cols-2 gap-2">
                {DEMO_RECIPES.map((demo, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleDemoClick(demo.url)}
                    disabled={isPending}
                    className="flex flex-col items-center justify-center p-3 rounded-xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 hover:bg-black/10 dark:hover:bg-white/10 active:scale-95 transition-all text-center gap-1.5 group"
                  >
                    <div className={`p-2 rounded-lg bg-gradient-to-br ${demo.color} shadow-sm group-hover:scale-110 transition-transform`}>
                      {demo.icon}
                    </div>
                    <span className="text-[11px] font-semibold text-gray-700 dark:text-gray-300">
                      {demo.name}
                    </span>
                  </button>
                ))}
              </div>
            </Card>
          </>)}
        </>
      )}
    </div>
  );
}

