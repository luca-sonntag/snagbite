import { useState } from 'react';
import { Utensils, Loader2 } from 'lucide-react';
import { useHousehold } from './useHousehold';
import { useToast } from '../../context/ToastContext';
import { useI18n } from '../../context/I18nContext';
import { hapticLight, hapticNotification } from '../../utils/haptics';

interface ProposeCookButtonProps {
  recipeId: string;
  variant?: 'icon' | 'compact';
  className?: string;
}

export default function ProposeCookButton({
  recipeId,
  variant = 'icon',
  className = '',
}: ProposeCookButtonProps) {
  const { status, partnerProfile, proposeCook } = useHousehold();
  const toast = useToast();
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);

  // Only display propose action when active partner is connected
  if (status !== 'active') {
    return null;
  }

  const handlePropose = async () => {
    if (loading || !recipeId) return;
    hapticLight();
    setLoading(true);

    try {
      const res = await proposeCook(recipeId);
      if (res.success && res.sent) {
        hapticNotification('success');
        const partnerName = partnerProfile?.displayName || t('household.partnerDefault');
        toast.success(t('household.propose.success', { name: partnerName }));
      } else if (res.success && !res.sent) {
        toast.info(t('household.propose.cooldown'));
      } else {
        toast.danger(res.error || t('household.propose.error'));
      }
    } finally {
      setLoading(false);
    }
  };

  const partnerName = partnerProfile?.displayName || t('household.partnerDefault');
  const tooltipText = t('household.propose.tooltip', { name: partnerName });

  if (variant === 'compact') {
    return (
      <button
        type="button"
        disabled={loading}
        onClick={handlePropose}
        className={`h-9 px-3 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold text-xs flex items-center gap-1.5 transition-all border-none cursor-pointer active:scale-95 disabled:opacity-50 ${className}`}
      >
        {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Utensils className="w-3.5 h-3.5" />}
        <span>{t('household.propose.action')}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      disabled={loading}
      onClick={handlePropose}
      className={`w-11 h-11 min-w-[44px] min-h-[44px] flex-shrink-0 bg-black/65 hover:bg-black/80 text-white backdrop-blur-md border border-white/10 shadow-lg rounded-full flex items-center justify-center transition-all cursor-pointer active:scale-95 disabled:opacity-50 ${className}`}
      title={tooltipText}
      aria-label={tooltipText}
    >
      {loading ? <Loader2 className="w-5 h-5 animate-spin text-white" /> : <Utensils className="w-5 h-5 text-white" />}
    </button>
  );
}
