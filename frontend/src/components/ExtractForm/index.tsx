import React, { useState } from 'react';
import { Card, Button, Spinner } from '@heroui/react';
import { BookOpen, Camera, Globe, Link2, Play, Sparkles } from 'lucide-react';
import { useI18n } from '../../context/I18nContext';
import { useAuth } from '../../context/AuthContext';
import { useExtractionJobs } from '../../context/ExtractionJobsContext';
import { PageHeader } from '../PageHeader';
import PremiumModal from '../PremiumModal';
import PremiumHint from '../PremiumHint';
import PremiumUpgradeCard from '../PremiumUpgradeCard';
import ExtractionAnimation from '../ExtractionAnimation';
import ExtractionAdCard from '../ExtractionAdCard';
import { showRewardedAd } from '../../utils/ads';
import { InstagramIcon } from '../ShareMockups';
import { useExtractForm } from './useExtractForm';
import PhotoExtractGrid from './PhotoExtractGrid';
import UrlExtractInput from './UrlExtractInput';
import ExtractDemoRecipes from './ExtractDemoRecipes';
import ExtractHelpAccordions from './ExtractHelpAccordions';
import type { ExtractFormProps } from './types';

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

export const ExtractForm: React.FC<ExtractFormProps> = ({
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
  claimRewardedCredit,
}) => {
  const { t } = useI18n();
  const { user, isPremium, hasTrialAvailable, trialDays, trialLoading } = useAuth();
  const { activeCount: liveActiveCount } = useExtractionJobs();
  const [isPremiumModalOpen, setIsPremiumModalOpen] = useState(false);
  const [isWatchingAd, setIsWatchingAd] = useState(false);

  const isRealPremium = user?.app_metadata?.tier === 'premium';
  const cookbookFull = !isRealPremium && !!limitStatus?.cookbookFull;
  const extractionLimitReached =
    !isRealPremium && !cookbookFull && !!limitStatus && limitStatus.limit >= 0 && limitStatus.remaining <= 0;
  const blockedByLimit = cookbookFull || extractionLimitReached;

  const maxConcurrent = limitStatus?.maxConcurrent ?? 1;
  const showConcurrency = isPremium && maxConcurrent > 1;
  const atConcurrencyLimit = showConcurrency && liveActiveCount >= maxConcurrent;
  const submitDisabled = blockedByLimit || atConcurrencyLimit || (mode === 'photo' && photos.length === 0);

  const {
    canPaste,
    trialDismissed,
    cameraInputRef,
    galleryInputRef,
    photoPreviews,
    handlePaste,
    handleDemoClick,
    handlePhotoChange,
    removePhoto,
    openPicker,
  } = useExtractForm({
    url,
    setUrl,
    urlError,
    setUrlError,
    validateUrl,
    isPending,
    photos,
    setPhotos,
    blockedByLimit,
    atConcurrencyLimit,
    setIsPremiumModalOpen,
  });

  const trialBannerShowing =
    !isPremium && !trialLoading && hasTrialAvailable && trialDays > 0 && !trialDismissed;
  const hideUpgradeCard = isRealPremium || trialLoading || trialBannerShowing;

  return (
    <div className={`flex flex-col gap-4 w-full ${isPending ? 'flex-1 justify-center my-auto min-h-0' : ''}`}>
      {!isPending && (
        <PageHeader
          icon={<Sparkles className="w-6 h-6" />}
          title={t('form.headerTitle') || t('app.title')}
          subtitle={t('form.headerSubtitle')}
        />
      )}

      {/* Premium Upgrade Promotion */}
      {!isPending && !hideUpgradeCard && !blockedByLimit && (
        <PremiumUpgradeCard onUpgradeClick={() => setIsPremiumModalOpen(true)} />
      )}

      {errorBanner}

      {/* Input Card or Extraction Animation Card */}
      {isPending ? (
        <div className="flex flex-col w-full gap-4 my-auto justify-center">
          <ExtractionAnimation
            url={url}
            isPending={isPending}
            jobStatus={jobStatus}
            progress={progress}
            variant={mode === 'photo' ? 'photo' : 'link'}
            photoPreviewUrl={mode === 'photo' ? photoPreviews[0] : undefined}
            compact={!isRealPremium}
          />
          {!isRealPremium && <ExtractionAdCard isActive={isActive} />}
        </div>
      ) : (
        <Card className="!bg-white dark:!bg-gray-900 p-5 sm:p-6 rounded-3xl border-none shadow-[0_2px_6px_rgba(0,0,0,0.03)]">
          <form
            onSubmit={(e) => {
              if (atConcurrencyLimit) {
                e.preventDefault();
                return;
              }
              if (blockedByLimit) {
                e.preventDefault();
                setIsPremiumModalOpen(true);
                return;
              }
              handleFormSubmit(e);
            }}
            className="flex flex-col gap-3.5"
          >
            {/* Input channel switch: a shared link vs. your own photos. */}
            <div className="flex items-center gap-1 p-1 rounded-2xl bg-gray-100 dark:bg-gray-800 border-none">
              {(['link', 'photo'] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setMode(option)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer outline-none border-none ${
                    mode === option
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
              <PhotoExtractGrid
                photos={photos}
                photoPreviews={photoPreviews}
                cameraInputRef={cameraInputRef}
                galleryInputRef={galleryInputRef}
                onPhotoChange={handlePhotoChange}
                onRemovePhoto={removePhoto}
                onOpenPicker={openPicker}
              />
            ) : (
              <UrlExtractInput
                url={url}
                setUrl={setUrl}
                urlError={urlError}
                validateUrl={validateUrl}
                isPending={isPending}
                canPaste={canPaste}
                onPaste={handlePaste}
              />
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
                        {url.trim() || photos.length > 0
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
                className={`py-3.5 h-12 text-sm rounded-2xl font-bold border-none text-white ${
                  submitDisabled
                    ? 'bg-gray-300 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed opacity-80 shadow-none'
                    : isPending
                      ? 'bg-emerald-700 shadow-none'
                      : 'bg-emerald-600 hover:bg-emerald-500 active:scale-95 transition-all shadow-none cursor-pointer'
                }`}
              >
                {({ isPending: btnPending }) => (
                  <span className="flex items-center gap-2 justify-center">
                    {btnPending ? (
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

            {/* Premium parallel-extraction counter */}
            {showConcurrency && (liveActiveCount > 0 || atConcurrencyLimit) && (
              <p
                className={`text-center text-xs font-medium -mt-1 ${
                  atConcurrencyLimit ? 'text-amber-600 dark:text-amber-400' : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                {atConcurrencyLimit
                  ? t('form.concurrentLimitReached', { max: maxConcurrent })
                  : t('form.concurrentCounter', { active: liveActiveCount, max: maxConcurrent })}
              </p>
            )}

            {cookbookFull ? (
              <div className="flex justify-center -mt-1">
                <PremiumHint
                  variant="inline"
                  onClick={() => setIsPremiumModalOpen(true)}
                  label={t('premium.hint.catalogFull', {
                    count: limitStatus?.savedRecipes ?? 0,
                    limit: limitStatus?.maxSavedRecipes ?? 5,
                  })}
                />
              </div>
            ) : extractionLimitReached ? (
              <div className="flex flex-col gap-2.5 -mt-1">
                <PremiumHint
                  variant="banner"
                  onClick={() => setIsPremiumModalOpen(true)}
                  label={t('premium.hint.extractionLimitReached', {
                    used: limitStatus?.used ?? 0,
                    limit: limitStatus?.limit ?? 0,
                  })}
                  cta={t('premium.hint.upgrade')}
                />
              </div>
            ) : limitStatus && limitStatus.limit >= 0 ? (
              <p className="text-center text-xs text-gray-500 dark:text-gray-400 font-medium -mt-1">
                {t('form.remainingExtractions', {
                  remaining: limitStatus.remaining,
                  limit: limitStatus.limit,
                  days:
                    limitStatus.windowDays === 1
                      ? t('form.remainingExtractionsToday')
                      : t('form.remainingExtractionsDays', { days: limitStatus.windowDays }),
                })}
              </p>
            ) : null}

            {/* Premium Modal */}
            <PremiumModal isOpen={isPremiumModalOpen} onOpenChange={setIsPremiumModalOpen} />

            {/* Supported Platforms (Subtle Monochrome) */}
            {mode === 'link' ? (
              <div className="flex items-center justify-center gap-2 pt-0.5">
                <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                  {t('form.platformsTitle')}
                </span>
                <div className="flex items-center gap-2.5 text-gray-400 dark:text-gray-500">
                  <InstagramIcon className="w-3.5 h-3.5" />
                  <TikTokIcon className="w-3.5 h-3.5" />
                  <YoutubeIcon className="w-3.5 h-3.5" />
                  <FacebookIcon className="w-3.5 h-3.5" />
                  <Globe className="w-3.5 h-3.5" />
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
      {!isPending && mode === 'link' && (
        <>
          <ExtractDemoRecipes onDemoClick={handleDemoClick} />
          <ExtractHelpAccordions />
        </>
      )}
    </div>
  );
};
export default ExtractForm;
