import { useState } from 'react';
import { Heart, Bell, UserMinus, ShieldCheck, Clock, Loader2 } from 'lucide-react';
import { useHousehold } from './useHousehold';
import { useToast } from '../../context/ToastContext';
import { useDialog } from '../../context/DialogContext';
import { useI18n } from '../../context/I18nContext';
import { hapticLight, hapticNotification } from '../../utils/haptics';

interface HouseholdActiveCardProps {
  onOpenUpgrade?: () => void;
  onClose: () => void;
}

export default function HouseholdActiveCard({ onOpenUpgrade, onClose }: HouseholdActiveCardProps) {
  const {
    partnerProfile,
    isTrialActive,
    trialEndsAt,
    hasHouseholdPro,
    hasPaidPro,
    isPauseLocked,
    nudgePartner,
    unlink,
  } = useHousehold();
  const toast = useToast();
  const dialog = useDialog();
  const { t } = useI18n();
  const [nudgeLoading, setNudgeLoading] = useState(false);
  const [unlinkLoading, setUnlinkLoading] = useState(false);

  const isProActive = Boolean(hasPaidPro || (hasHouseholdPro && !isTrialActive));

  const partnerName = partnerProfile?.displayName || t('household.partnerDefault');
  const avatarUrl = partnerProfile?.avatarUrl;

  const handleNudge = async () => {
    if (nudgeLoading) return;
    hapticLight();
    setNudgeLoading(true);
    try {
      const res = await nudgePartner();
      if (res.success) {
        hapticNotification('success');
        toast.success(t('household.nudge.success', { name: partnerName }));
      } else {
        toast.info(res.error || t('household.nudge.cooldown'));
      }
    } finally {
      setNudgeLoading(false);
    }
  };

  const handleUnlink = async () => {
    hapticNotification('warning');
    const confirmed = await dialog.confirm({
      title: t('household.unlink.button'),
      message: t('household.unlink.confirm', { name: partnerName }),
      confirmLabel: t('household.unlink.button'),
      status: 'danger',
    });
    if (!confirmed) return;

    setUnlinkLoading(true);
    try {
      const res = await unlink();
      if (res.success) {
        toast.info(t('household.unlink.success'));
        onClose();
      } else {
        toast.danger(res.error || t('household.unlink.error'));
      }
    } finally {
      setUnlinkLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-5 text-stone-900 dark:text-stone-100">
      {/* Connected Partner Header */}
      <div className="flex items-center gap-3.5 p-4 rounded-3xl bg-black/[0.03] dark:bg-white/[0.04]">
        <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-lg overflow-hidden shrink-0 shadow-xs">
          {avatarUrl ? (
            <img src={avatarUrl} alt={partnerName} className="w-full h-full object-cover" />
          ) : (
            <span>{partnerName.charAt(0).toUpperCase()}</span>
          )}
        </div>
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-base tracking-tight truncate">{partnerName}</span>
            <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500 shrink-0" />
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
            <span className="text-xs text-stone-500 dark:text-stone-400 font-medium">
              {t('household.status.connected')}
            </span>
          </div>
        </div>
      </div>

      {/* Trial / Paused / Active PRO Banner */}
      {isProActive && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/15 flex items-center gap-3">
          <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <div className="flex flex-col text-xs">
            <span className="font-bold text-emerald-700 dark:text-emerald-400">
              {t('household.pro.activeTitle')}
            </span>
            <span className="text-stone-600 dark:text-stone-400">
              {t('household.pro.activeDesc')}
            </span>
          </div>
        </div>
      )}

      {!isProActive && isTrialActive && trialEndsAt && (
        <div className="p-3.5 rounded-2xl bg-amber-500/10 dark:bg-amber-500/15 flex items-center gap-3">
          <Clock className="w-5 h-5 text-amber-600 shrink-0" />
          <div className="flex flex-col text-xs">
            <span className="font-bold text-amber-700 dark:text-amber-400">
              {t('household.trial.activeTitle')}
            </span>
            <span className="text-stone-600 dark:text-stone-400">
              {t('household.trial.activeDesc')}
            </span>
          </div>
        </div>
      )}

      {isPauseLocked && (
        <div className="p-4 rounded-2xl bg-rose-500/10 text-rose-600 flex flex-col gap-2">
          <span className="font-bold text-sm">{t('household.paused.title')}</span>
          <span className="text-xs">{t('household.paused.desc')}</span>
          {onOpenUpgrade && (
            <button
              type="button"
              onClick={onOpenUpgrade}
              className="mt-1 h-10 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs flex items-center justify-center gap-1.5 border-none cursor-pointer active:scale-95 transition-all shadow-xs"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>{t('household.paused.upgradeAction')}</span>
            </button>
          )}
        </div>
      )}

      {/* Action buttons: Nudge and Unlink */}
      <div className="flex flex-col gap-2 pt-1">
        {!isProActive && onOpenUpgrade && (
          <button
            type="button"
            disabled={nudgeLoading}
            onClick={handleNudge}
            className="h-11 rounded-2xl bg-black/[0.04] dark:bg-white/[0.06] hover:bg-black/[0.06] dark:hover:bg-white/[0.08] text-stone-800 dark:text-stone-200 font-semibold text-xs flex items-center justify-center gap-2 border-none cursor-pointer active:scale-95 transition-all disabled:opacity-50"
          >
            {nudgeLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bell className="w-4 h-4" />}
            <span>{t('household.nudge.button')}</span>
          </button>
        )}

        <button
          type="button"
          disabled={unlinkLoading}
          onClick={handleUnlink}
          className="h-10 rounded-2xl text-stone-400 hover:text-rose-600 dark:hover:text-rose-400 font-medium text-xs flex items-center justify-center gap-1.5 border-none bg-transparent cursor-pointer active:scale-95 transition-all disabled:opacity-50"
        >
          {unlinkLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserMinus className="w-3.5 h-3.5" />}
          <span>{t('household.unlink.button')}</span>
        </button>
      </div>
    </div>
  );
}
