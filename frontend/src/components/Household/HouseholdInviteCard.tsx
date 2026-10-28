import { useState } from 'react';
import { Copy, Share2, Check, Sparkles, Users, ArrowRight, Loader2 } from 'lucide-react';
import { useHousehold } from './useHousehold';
import { useToast } from '../../context/ToastContext';
import { useI18n } from '../../context/I18nContext';
import { hapticLight, hapticNotification } from '../../utils/haptics';

interface HouseholdInviteCardProps {
  onSuccess: () => void;
}

export default function HouseholdInviteCard({ onSuccess }: HouseholdInviteCardProps) {
  const { inviteCode: existingCode, createInvite, acceptInvite } = useHousehold();
  const toast = useToast();
  const { t } = useI18n();

  const [code, setCode] = useState(existingCode || '');
  const [inputCode, setInputCode] = useState('');
  const [loadingInvite, setLoadingInvite] = useState(false);
  const [loadingJoin, setLoadingJoin] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCreateInvite = async () => {
    if (loadingInvite) return;
    hapticLight();
    setLoadingInvite(true);
    try {
      const res = await createInvite();
      setCode(res.inviteCode);
      hapticNotification('success');
    } catch {
      toast.danger(t('household.invite.createError'));
    } finally {
      setLoadingInvite(false);
    }
  };

  const inviteUrl = code ? `${window.location.origin}/#/household-invite/${code}` : '';

  const handleCopyLink = async () => {
    if (!code) return;
    hapticLight();
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      toast.success(t('household.invite.copied'));
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.danger(t('household.invite.copyError'));
    }
  };

  const handleShare = async () => {
    if (!code) return;
    hapticLight();
    if (navigator.share) {
      try {
        await navigator.share({
          title: t('household.share.title'),
          text: t('household.share.text'),
          url: inviteUrl,
        });
        return;
      } catch {
        // User cancelled or fallback
      }
    }
    await handleCopyLink();
  };

  const handleJoin = async () => {
    const trimmed = inputCode.trim().toUpperCase();
    if (!trimmed || loadingJoin) return;
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

  return (
    <div className="flex flex-col gap-6 text-stone-900 dark:text-stone-100">
      {/* Value highlights */}
      <div className="flex flex-col gap-2 p-4 rounded-2xl bg-black/[0.03] dark:bg-white/[0.04]">
        <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400">
          <Sparkles className="w-4 h-4" />
          <span>{t('household.highlights.title')}</span>
        </div>
        <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
          {t('household.highlights.desc')}
        </p>
      </div>

      {/* Invite generation section */}
      <div className="flex flex-col gap-3">
        <span className="text-xs font-bold uppercase tracking-wider text-stone-400">
          {t('household.invite.sectionTitle')}
        </span>

        {code ? (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
              <span className="text-lg font-black tracking-widest font-mono pl-1">
                {code}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="w-9 h-9 rounded-xl bg-white dark:bg-stone-800 shadow-xs flex items-center justify-center border-none cursor-pointer active:scale-95 transition-all text-stone-700 dark:text-stone-300"
                  aria-label="Copy Link"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                </button>
                <button
                  type="button"
                  onClick={handleShare}
                  className="h-9 px-3 rounded-xl bg-emerald-600 text-white font-semibold text-xs flex items-center gap-1.5 border-none cursor-pointer active:scale-95 transition-all"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>{t('household.invite.share')}</span>
                </button>
              </div>
            </div>
            <span className="text-[11px] text-stone-500 text-center">
              {t('household.invite.shareHelp')}
            </span>
          </div>
        ) : (
          <button
            type="button"
            disabled={loadingInvite}
            onClick={handleCreateInvite}
            className="h-11 rounded-2xl bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 font-semibold text-xs flex items-center justify-center gap-2 border-none cursor-pointer active:scale-95 transition-all disabled:opacity-50"
          >
            {loadingInvite ? <Loader2 className="w-4 h-4 animate-spin" /> : <Users className="w-4 h-4" />}
            <span>{t('household.invite.createButton')}</span>
          </button>
        )}
      </div>

      {/* Join with existing code section */}
      <div className="flex flex-col gap-2.5 pt-2">
        <span className="text-xs font-bold uppercase tracking-wider text-stone-400">
          {t('household.join.sectionTitle')}
        </span>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={inputCode}
            onChange={(e) => setInputCode(e.target.value.toUpperCase())}
            placeholder={t('household.join.placeholder')}
            maxLength={12}
            className="flex-1 h-10 px-3.5 rounded-xl bg-black/[0.04] dark:bg-white/[0.06] border-none text-sm font-mono tracking-wider text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
          <button
            type="button"
            disabled={!inputCode.trim() || loadingJoin}
            onClick={handleJoin}
            className="h-10 px-4 rounded-xl bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 font-semibold text-xs flex items-center gap-1.5 border-none cursor-pointer active:scale-95 transition-all disabled:opacity-50"
          >
            {loadingJoin ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
            <span>{t('household.join.action')}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
