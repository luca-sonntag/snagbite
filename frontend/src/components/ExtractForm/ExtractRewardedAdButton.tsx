import React, { useState } from 'react';
import { Button, Spinner } from '@heroui/react';
import { Play } from 'lucide-react';
import { useI18n } from '../../context/I18nContext';
import { useToast } from '../../context/ToastContext';
import { showRewardedAd } from '../../utils/ads';

interface ExtractRewardedAdButtonProps {
  claimRewardedCredit?: () => Promise<boolean>;
  disabled?: boolean;
  bonusCredits?: number;
}

export const ExtractRewardedAdButton: React.FC<ExtractRewardedAdButtonProps> = ({
  claimRewardedCredit,
  disabled = false,
  bonusCredits = 3,
}) => {
  const { t } = useI18n();
  const toast = useToast();
  const [isWatchingAd, setIsWatchingAd] = useState(false);

  const handleWatchAd = async () => {
    if (isWatchingAd || disabled) return;
    setIsWatchingAd(true);
    try {
      const earned = await showRewardedAd();
      if (earned && claimRewardedCredit) {
        const success = await claimRewardedCredit();
        if (success) {
          toast.success(
            bonusCredits === 1
              ? t('ads.rewardedSuccessSingular')
              : t('ads.rewardedSuccess', { count: bonusCredits })
          );
        } else {
          toast.danger(t('ads.rewardedFailed'));
        }
      } else if (!earned) {
        toast.danger(t('ads.rewardedFailed'));
      }
    } catch (err) {
      console.error('Error watching rewarded ad:', err);
      toast.danger(t('ads.rewardedFailed'));
    } finally {
      setIsWatchingAd(false);
    }
  };

  const buttonLabel =
    bonusCredits === 1
      ? t('ads.rewardedBtnSingular')
      : t('ads.rewardedBtn', { count: bonusCredits });

  return (
    <Button
      type="button"
      fullWidth
      isDisabled={disabled || isWatchingAd}
      onClick={handleWatchAd}
      className="py-3 h-11 text-xs sm:text-sm rounded-2xl font-bold border-none text-white bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] transition-all shadow-sm shadow-emerald-600/20 flex items-center justify-center gap-2 cursor-pointer"
    >
      {isWatchingAd ? (
        <>
          <Spinner color="current" size="sm" />
          <span>{t('ads.rewardedLoading')}</span>
        </>
      ) : (
        <>
          <Play className="w-3.5 h-3.5 fill-current" />
          <span>{buttonLabel}</span>
        </>
      )}
    </Button>
  );
};

export default ExtractRewardedAdButton;
