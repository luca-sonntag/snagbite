import React, { useState } from 'react';
import { Card } from '@heroui/react';
import { PlusCircle } from 'lucide-react';
import { useI18n } from '../../context/I18nContext';
import { useAuth } from '../../context/AuthContext';
import { useExtractionJobs } from '../../context/ExtractionJobsContext';
import { PageHeader } from '../PageHeader';
import PremiumModal from '../PremiumModal';
import PremiumHint from '../PremiumHint';
import PremiumUpgradeCard from '../PremiumUpgradeCard';
import ExtractionAnimation from '../ExtractionAnimation';
import ExtractionAdCard from '../ExtractionAdCard';
import { useExtractForm } from './useExtractForm';
import PhotoExtractGrid from './PhotoExtractGrid';
import UrlExtractInput from './UrlExtractInput';
import ExtractModeTiles from './ExtractModeTiles';
import MagicClipboardBanner from './MagicClipboardBanner';
import ExtractQuotaBadge from './ExtractQuotaBadge';
import ExtractSubmitButton from './ExtractSubmitButton';
import QuickShareTipCard from './QuickShareTipCard';
import ExtractDemoRecipes from './ExtractDemoRecipes';
import ExtractHelpAccordions from './ExtractHelpAccordions';
import type { ExtractFormProps } from './types';

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
    detectedClipboardUrl,
    applyClipboardUrl,
    dismissClipboardBanner,
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
    <div className={`flex flex-col gap-4 w-full ${isPending ? 'flex-1 justify-between min-h-0' : ''}`}>
      {!isPending && (
        <PageHeader
          icon={<PlusCircle className="w-6 h-6" />}
          title={t('form.headerTitle') || t('app.title')}
          subtitle={t('form.headerSubtitle')}
        />
      )}

      {/* Premium Upgrade Promotion */}
      {!isPending && !hideUpgradeCard && !blockedByLimit && (
        <PremiumUpgradeCard onUpgradeClick={() => setIsPremiumModalOpen(true)} />
      )}

      {errorBanner}

      {/* Magic Clipboard Quick-Import Banner */}
      {!isPending && mode === 'link' && detectedClipboardUrl && (
        <MagicClipboardBanner
          detectedUrl={detectedClipboardUrl}
          onApply={applyClipboardUrl}
          onDismiss={dismissClipboardBanner}
          disabled={submitDisabled}
        />
      )}

      {/* Extraction Animation (during active job) */}
      {isPending ? (
        <div className="flex flex-col w-full flex-1 justify-between gap-3 min-h-0">
          <div className="flex-1 flex items-center justify-center min-h-0 py-1">
            <ExtractionAnimation
              url={url}
              isPending={isPending}
              jobStatus={jobStatus}
              progress={progress}
              variant={mode === 'photo' ? 'photo' : 'link'}
              photoPreviewUrl={mode === 'photo' ? photoPreviews[0] : undefined}
              compact={!isRealPremium}
            />
          </div>
          {!isRealPremium && (
            <div className="shrink-0 w-full pb-1">
              <ExtractionAdCard isActive={isActive} />
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-3.5 w-full">
          {/* Visual Action Tiles (Mode Switcher) */}
          <ExtractModeTiles
            mode={mode}
            setMode={setMode}
            photosCount={photos.length}
            disabled={isPending}
          />

          {/* Input Card */}
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
              {mode === 'photo' ? (
                <>
                  <PhotoExtractGrid
                    photos={photos}
                    photoPreviews={photoPreviews}
                    cameraInputRef={cameraInputRef}
                    galleryInputRef={galleryInputRef}
                    onPhotoChange={handlePhotoChange}
                    onRemovePhoto={removePhoto}
                    onOpenPicker={openPicker}
                  />
                  <p className="text-center text-[11px] leading-relaxed text-gray-400 dark:text-gray-500 pt-1">
                    {t('form.photo.tips')}
                  </p>
                </>
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

              {/* Action Button: Rewarded Video Ad (if limit reached) vs Submit */}
              <ExtractSubmitButton
                mode={mode}
                isPending={isPending}
                isUploadingPhotos={isUploadingPhotos}
                submitDisabled={submitDisabled}
                extractionLimitReached={extractionLimitReached}
                cookbookFull={cookbookFull}
                isWatchingAd={isWatchingAd}
                setIsWatchingAd={setIsWatchingAd}
                url={url}
                photosCount={photos.length}
                handleFormSubmit={handleFormSubmit}
                claimRewardedCredit={claimRewardedCredit}
              />

              {/* Quota & Limit Indicators */}
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
              ) : (
                <ExtractQuotaBadge
                  limitStatus={limitStatus}
                  isRealPremium={isRealPremium}
                  activeCount={liveActiveCount}
                  maxConcurrent={maxConcurrent}
                />
              )}

              {/* Premium Modal */}
              <PremiumModal isOpen={isPremiumModalOpen} onOpenChange={setIsPremiumModalOpen} />
            </form>
          </Card>
        </div>
      )}

      {/* Quick Share Tip & Accordions — hidden during active extraction */}
      {!isPending && mode === 'link' && (
        <>
          <QuickShareTipCard
            onLearnMore={() => {
              const el = document.getElementById('share-help-accordion');
              el?.scrollIntoView({ behavior: 'smooth' });
            }}
          />
          <ExtractDemoRecipes onDemoClick={handleDemoClick} />
          <div id="share-help-accordion">
            <ExtractHelpAccordions />
          </div>
        </>
      )}
    </div>
  );
};

export default ExtractForm;
