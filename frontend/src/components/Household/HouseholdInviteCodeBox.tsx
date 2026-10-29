import { useState } from 'react';
import { Copy, Share2, Check } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { useI18n } from '../../context/I18nContext';
import { hapticLight } from '../../utils/haptics';

interface HouseholdInviteCodeBoxProps {
  code: string;
}

export default function HouseholdInviteCodeBox({ code }: HouseholdInviteCodeBoxProps) {
  const toast = useToast();
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);

  const inviteUrl = `${window.location.origin}/#/household-invite/${code}`;

  const handleCopyLink = async () => {
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
        // Fallback to copy
      }
    }
    await handleCopyLink();
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between p-3.5 rounded-2xl bg-emerald-500/10 text-emerald-800 dark:text-emerald-200">
        <span className="text-xl font-black tracking-widest font-mono pl-1.5 text-emerald-700 dark:text-emerald-300">
          {code}
        </span>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleCopyLink}
            className="h-9 px-3 rounded-xl bg-white dark:bg-stone-800 shadow-xs flex items-center gap-1.5 border-none cursor-pointer active:scale-95 transition-all text-stone-700 dark:text-stone-200 text-xs font-semibold"
            aria-label={t('household.invite.copyButton')}
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? t('household.invite.copiedButton') : t('household.invite.copyButton')}</span>
          </button>
          <button
            type="button"
            onClick={handleShare}
            className="h-9 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-1.5 border-none cursor-pointer active:scale-95 transition-all shadow-xs"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>{t('household.invite.share')}</span>
          </button>
        </div>
      </div>
      <span className="text-[11px] text-stone-400 dark:text-stone-500 text-center">
        {t('household.invite.shareHelp')}
      </span>
    </div>
  );
}
