import { useState } from 'react';
import { ArrowRight, Loader2 } from 'lucide-react';
import { useHousehold } from './useHousehold';
import { useToast } from '../../context/ToastContext';
import { useI18n } from '../../context/I18nContext';
import { hapticLight, hapticNotification } from '../../utils/haptics';
import HouseholdCooldownBanner from './HouseholdCooldownBanner';
import HouseholdHighlightsCard from './HouseholdHighlightsCard';
import HouseholdInviteCodeBox from './HouseholdInviteCodeBox';

interface HouseholdInviteCardProps {
  onSuccess: () => void;
}

export default function HouseholdInviteCard({ onSuccess }: HouseholdInviteCardProps) {
  const { inviteCode: existingCode, cooldownUntil, createInvite, acceptInvite } = useHousehold();
  const toast = useToast();
  const { t } = useI18n();

  const [code, setCode] = useState(existingCode || '');
  const [inputCode, setInputCode] = useState('');
  const [loadingInvite, setLoadingInvite] = useState(false);
  const [loadingJoin, setLoadingJoin] = useState(false);

  const isCooldown = Boolean(cooldownUntil && new Date(cooldownUntil) > new Date());

  const handleCreateInvite = async () => {
    if (loadingInvite || isCooldown) return;
    hapticLight();
    setLoadingInvite(true);
    try {
      const res = await createInvite();
      setCode(res.inviteCode);
      hapticNotification('success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t('household.invite.createError');
      toast.danger(msg);
    } finally {
      setLoadingInvite(false);
    }
  };

  const handleJoin = async () => {
    const trimmed = inputCode.trim().toUpperCase();
    if (!trimmed || loadingJoin || isCooldown) return;
    hapticLight();
    setLoadingJoin(true);
    try {
      const res = await acceptInvite(trimmed);
      if (res.success) {
        hapticNotification('success');
        toast.success(t('household.join.success'));
        onSuccess();
      } else {
        toast.danger(res.error || t('household.join.error'));
      }
    } finally {
      setLoadingJoin(false);
    }
  };

  const canJoin = inputCode.trim().length >= 6 && !loadingJoin && !isCooldown;

  return (
    <div className="flex flex-col gap-5 text-stone-900 dark:text-stone-100">
      {/* Active Cooldown Notice */}
      {isCooldown && cooldownUntil && (
        <HouseholdCooldownBanner cooldownUntil={cooldownUntil} />
      )}

      {/* Value highlights card */}
      <HouseholdHighlightsCard />

      {/* Invite generation section */}
      <div className="flex flex-col gap-2.5">
        <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400 dark:text-stone-500 px-0.5">
          {t('household.invite.sectionTitle')}
        </span>

        {code ? (
          <HouseholdInviteCodeBox code={code} />
        ) : (
          <button
            type="button"
            disabled={loadingInvite || isCooldown}
            onClick={handleCreateInvite}
            className="w-full h-12 min-h-[48px] rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white font-bold text-sm shadow-sm shadow-emerald-600/20 flex items-center justify-center gap-2 border-none cursor-pointer transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loadingInvite && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>{t('household.invite.createButton')}</span>
          </button>
        )}
      </div>

      {/* Editorial divider */}
      <div className="relative flex items-center py-1">
        <div className="flex-grow border-t border-black/5 dark:border-white/10" />
        <span className="shrink-0 px-3 text-[11px] font-semibold text-stone-400 uppercase tracking-wider select-none">
          {t('household.highlights.orDivider')}
        </span>
        <div className="flex-grow border-t border-black/5 dark:border-white/10" />
      </div>

      {/* Join with existing code section */}
      <div className="flex flex-col gap-2.5">
        <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400 dark:text-stone-500 px-0.5">
          {t('household.join.sectionTitle')}
        </span>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={inputCode}
            disabled={isCooldown}
            onChange={(e) => setInputCode(e.target.value.toUpperCase())}
            placeholder={t('household.join.placeholder')}
            maxLength={12}
            className="flex-1 h-12 px-4 rounded-2xl bg-black/[0.04] dark:bg-white/[0.06] border-none text-sm font-mono tracking-wider font-bold text-stone-900 dark:text-stone-100 placeholder:font-sans placeholder:tracking-normal placeholder:font-normal placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 disabled:opacity-40 transition-all"
          />
          <button
            type="button"
            disabled={!canJoin}
            onClick={handleJoin}
            className={`h-12 px-5 rounded-2xl font-bold text-xs flex items-center gap-1.5 border-none transition-all ${
              canJoin
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm shadow-emerald-600/20 active:scale-[0.98] cursor-pointer'
                : 'bg-black/[0.04] dark:bg-white/[0.06] text-stone-400 cursor-not-allowed opacity-50'
            }`}
          >
            {loadingJoin && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>{t('household.join.action')}</span>
            <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
          </button>
        </div>
      </div>
    </div>
  );
}
