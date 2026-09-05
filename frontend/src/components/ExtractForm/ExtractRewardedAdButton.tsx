import React, { useState } from 'react';
import { Button, Spinner } from '@heroui/react';
import { Play } from 'lucide-react';
import { useI18n } from '../../context/I18nContext';
import { showRewardedAd } from '../../utils/ads';

interface ExtractRewardedAdButtonProps {
  claimRewardedCredit?: () => Promise<boolean>;
  disabled?: boolean;
}

export const ExtractRewardedAdButton: React.FC<ExtractRewardedAdButtonProps> = ({
  claimRewardedCredit,
  disabled = false,
}) => {
  const { t } = useI18n();
  const [isWatchingAd, setIsWatchingAd] = useState(false);

  const handleWatchAd = async () => {
    if (isWatchingAd || disabled) return;
    setIsWatchingAd(true);
    try {
      const earned = await showRewardedAd();
      if (earned && claimRewardedCredit) {
        await claimRewardedCredit();
      }
    } catch (err) {
      console.error('Error watching rewarded ad:', err);
    } finally {
      setIsWatchingAd(false);
    }
  };

  return (
    <Button
      type="button"
      fullWidth
      isDisabled={disabled || isWatchingAd}
      onClick={handleWatchAd}
      className="py-3 h-11 text-xs sm:text-sm rounded-2xl font-bold border-none text-white bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-500 hover:to-teal-500 active:scale-[0.99] transition-all shadow-[0_2px_6px_rgba(0,0,0,0.03)] flex items-center justify-center gap-2 cursor-pointer"
    >
      {isWatchingAd ? (
        <>
          <Spinner color="current" size="sm" />
          <span>{t('ads.rewardedLoading')}</span>
        </>
      ) : (
        <>
          <Play className="w-3.5 h-3.5 fill-current" />
          <span>{t('ads.rewardedBtn')}</span>
        </>
      )}
    </Button>
  );
};

export default ExtractRewardedAdButton;
