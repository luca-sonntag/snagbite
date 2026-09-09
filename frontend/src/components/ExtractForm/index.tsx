import React, { useState } from 'react';
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
import ExtractActionCards from './ExtractActionCards';
import ExtractQuotaBadge from './ExtractQuotaBadge';
import ExtractRewardedAdButton from './ExtractRewardedAdButton';
import UrlExtractSheet from './UrlExtractSheet';
import PhotoExtractSheet from './PhotoExtractSheet';
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
  onSavePublicRecipe,
}) => {
  const { t } = useI18n();
  const { user, isPremium } = useAuth();
  const { activeCount: liveActiveCount } = useExtractionJobs();
  const [isPremiumModalOpen, setIsPremiumModalOpen] = useState(false);
  const [isLinkSheetOpen, setIsLinkSheetOpen] = useState(false);
  const [isPhotoSheetOpen, setIsPhotoSheetOpen] = useState(false);

  const isRealPremium = user?.app_metadata?.tier === 'premium';
  const cookbookFull = !isRealPremium && !!limitStatus?.cookbookFull;
  const extractionLimitReached =
    !isRealPremium && !cookbookFull && !!limitStatus && limitStatus.limit >= 0 && limitStatus.remaining <= 0;
  const blockedByLimit = cookbookFull || extractionLimitReached;

  const maxConcurrent = limitStatus?.maxConcurrent ?? 1;
  const showConcurrency = isPremium && maxConcurrent > 1;
  const atConcurrencyLimit = showConcurrency && liveActiveCount >= maxConcurrent;
  const submitDisabled = blockedByLimit || atConcurrencyLimit;

  const {
    canPaste,
    cameraInputRef,
    galleryInputRef,
    photoPreviews,
    handlePaste,
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
    onAutoSubmit: (pastedUrl: string) => {
      handleSheetSubmit({ preventDefault: () => {} } as React.FormEvent, pastedUrl);
    },
  });


  const handleDemoClick = (demoUrl: string, recipe?: import('../../types').Recipe) => {
    if (isPending || atConcurrencyLimit) return;
    if (recipe && recipe.id && onSavePublicRecipe) {
      if (cookbookFull) {
        setIsPremiumModalOpen(true);
        return;
      }
      onSavePublicRecipe(recipe);
      return;
    }
    if (blockedByLimit) {
      setIsPremiumModalOpen(true);
      return;
    }
    setMode('link');
    setUrl(demoUrl);
    validateUrl(demoUrl);
    handleSheetSubmit({ preventDefault: () => {} } as React.FormEvent, demoUrl);
  };

  const handleSheetSubmit = (e: React.FormEvent, overrideUrl?: string) => {
    if (atConcurrencyLimit) {
      e.preventDefault();
      return;
    }
    if (blockedByLimit) {
      e.preventDefault();
      setIsPremiumModalOpen(true);
      return;
    }
    setIsLinkSheetOpen(false);
    setIsPhotoSheetOpen(false);
    handleFormSubmit(e, overrideUrl);
  };

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
      {!isPending && !blockedByLimit && (
        <PremiumUpgradeCard onUpgradeClick={() => setIsPremiumModalOpen(true)} />
      )}

      {errorBanner}

      {/* Extraction Animation (active job) */}
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
        <div className="flex flex-col gap-4 w-full">
          {/* Main Action Cards (Clean Flat Premium) */}
          <ExtractActionCards
            onOpenLinkSheet={() => {
              setMode('link');
              setIsLinkSheetOpen(true);
            }}
            onOpenPhotoSheet={() => {
              setMode('photo');
              setIsPhotoSheetOpen(true);
            }}
            photosCount={photos.length}
            disabled={isPending || submitDisabled}
          />

          {/* Kochbuch voll / Limit Status unter den Import-Karten */}
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
              <ExtractRewardedAdButton
                claimRewardedCredit={claimRewardedCredit}
                bonusCredits={limitStatus?.rewardedAdBonusCredits ?? 3}
                disabled={isPending}
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

          {/* Inspiration / Demo Recipes */}
          <ExtractDemoRecipes onDemoClick={handleDemoClick} />

          {/* Step-by-Step Help Guide */}
          <ExtractHelpAccordions />

          {/* Video / Link Bottom Sheet */}
          <UrlExtractSheet
            isOpen={isLinkSheetOpen}
            onClose={() => setIsLinkSheetOpen(false)}
            url={url}
            setUrl={setUrl}
            urlError={urlError}
            validateUrl={validateUrl}
            isPending={isPending}
            canPaste={canPaste}
            onPaste={handlePaste}
            submitDisabled={submitDisabled}
            handleFormSubmit={handleSheetSubmit}
          />

          {/* Photo Scanner Bottom Sheet */}
          <PhotoExtractSheet
            isOpen={isPhotoSheetOpen}
            onClose={() => setIsPhotoSheetOpen(false)}
            photos={photos}
            photoPreviews={photoPreviews}
            cameraInputRef={cameraInputRef}
            galleryInputRef={galleryInputRef}
            onPhotoChange={handlePhotoChange}
            onRemovePhoto={removePhoto}
            onOpenPicker={openPicker}
            isPending={isPending}
            isUploadingPhotos={isUploadingPhotos}
            submitDisabled={submitDisabled}
            handleFormSubmit={handleSheetSubmit}
          />

          {/* Premium Modal */}
          <PremiumModal isOpen={isPremiumModalOpen} onOpenChange={setIsPremiumModalOpen} />
        </div>
      )}
    </div>
  );
};

export default ExtractForm;
