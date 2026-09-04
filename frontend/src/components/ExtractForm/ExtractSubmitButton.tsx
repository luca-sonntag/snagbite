import React from 'react';
import { Button, Spinner } from '@heroui/react';
import { Play, BookOpen } from 'lucide-react';
import { useI18n } from '../../context/I18nContext';
import { showRewardedAd } from '../../utils/ads';
import type { ExtractMode } from './types';

interface ExtractSubmitButtonProps {
  mode?: ExtractMode;
  isPending: boolean;
  isUploadingPhotos: boolean;
  submitDisabled: boolean;
  extractionLimitReached: boolean;
  cookbookFull: boolean;
  isWatchingAd: boolean;
  setIsWatchingAd: (watching: boolean) => void;
  url: string;
  photosCount: number;
  handleFormSubmit: (e: React.FormEvent) => void;
  claimRewardedCredit?: () => Promise<boolean>;
}

export const ExtractSubmitButton: React.FC<ExtractSubmitButtonProps> = ({
  mode: _mode,
  isPending,
  isUploadingPhotos,
  submitDisabled,
  extractionLimitReached,
  cookbookFull,
  isWatchingAd,
  setIsWatchingAd,
  url,
  photosCount,
  handleFormSubmit,
  claimRewardedCredit,
}) => {
  const { t } = useI18n();

  if (extractionLimitReached && !cookbookFull) {
    return (
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
                if (claimed && (url.trim() || photosCount > 0)) {
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
                {url.trim() || photosCount > 0
                  ? 'Video ansehen & Rezept erstellen (+1)'
                  : 'Video ansehen (+1 Rezept)'}
              </span>
            </>
          )}
        </Button>
      </div>
    );
  }

  return (
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
  );
};

export default ExtractSubmitButton;
