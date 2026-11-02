import React, { useState } from 'react';
import { Play, Copy, ExternalLink, Trash2, Check, RefreshCw, AlertCircle, Globe, Camera } from 'lucide-react';
import { useI18n } from '../../context/I18nContext';
import { useToast } from '../../context/ToastContext';
import { resolveErrorCode } from '../../i18n';
import { hapticLight, hapticMedium } from '../../utils/haptics';
import { InstagramIcon } from '../ShareMockups';
import type { QueueItem } from '../../context/ExtractionQueueContext';

interface WaitlistItemCardProps {
  item: QueueItem;
  canAnalyze: boolean;
  onAnalyze: (url: string) => void;
  onRemove: (id: string) => void;
}

const TikTokIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.75a4.85 4.85 0 0 1-1.01-.06z" />
  </svg>
);

const YoutubeIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z" />
    <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" fill="currentColor" />
  </svg>
);

function renderPlatformIcon(url: string, label: string, mode?: string) {
  if (mode === 'photo') {
    return <Camera className="w-5 h-5 text-amber-600 dark:text-amber-400" />;
  }
  const lowerUrl = (url || '').toLowerCase();
  const lowerLabel = (label || '').toLowerCase();
  if (lowerUrl.includes('instagram') || lowerLabel.includes('instagram')) {
    return <InstagramIcon className="w-5 h-5 text-rose-600 dark:text-rose-400" />;
  }
  if (lowerUrl.includes('tiktok') || lowerLabel.includes('tiktok')) {
    return <TikTokIcon className="w-5 h-5 text-gray-900 dark:text-white" />;
  }
  if (lowerUrl.includes('youtube') || lowerUrl.includes('youtu.be') || lowerLabel.includes('youtube')) {
    return <YoutubeIcon className="w-5 h-5 text-red-600 dark:text-red-400" />;
  }
  return <Globe className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />;
}

function formatRelativeTime(
  dateStr: string,
  t: (key: string, params?: Record<string, string | number>) => string
): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 2) return t('queue.timeAgo.justNow');
  if (diffMin < 60) return t('queue.timeAgo.minutes', { m: diffMin });
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return t('queue.timeAgo.hours', { h: diffHours });
  const diffDays = Math.floor(diffHours / 24);
  return t('queue.timeAgo.days', { d: diffDays });
}

export const WaitlistItemCard: React.FC<WaitlistItemCardProps> = ({
  item,
  canAnalyze,
  onAnalyze,
  onRemove,
}) => {
  const { t, language } = useI18n();
  const toast = useToast();
  const [copied, setCopied] = useState(false);

  const isFailed = item.status === 'failed';

  const localizedError = isFailed
    ? resolveErrorCode(item.errorCode, item.errorParams ?? undefined, item.error, language) ||
      t('error.default')
    : null;

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    hapticLight();
    try {
      await navigator.clipboard.writeText(item.url);
      setCopied(true);
      toast.success(t('queue.toast.linkCopied'));
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  const handleOpen = (e: React.MouseEvent) => {
    e.stopPropagation();
    hapticLight();
    window.open(item.url, '_blank', 'noopener,noreferrer');
  };

  const handleAction = () => {
    hapticMedium();
    onAnalyze(item.url);
  };

  return (
    <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-gray-900 border border-black/[0.04] dark:border-white/[0.06] shadow-[0_2px_8px_rgba(0,0,0,0.04)] dark:shadow-none flex flex-col gap-3 transition-all select-none">
      {/* Header: Platform Badge + Title & Time + Safe Delete */}
      <div className="flex items-start justify-between gap-3 min-w-0">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="w-10 h-10 rounded-xl bg-black/[0.04] dark:bg-white/[0.06] flex items-center justify-center shrink-0">
            {renderPlatformIcon(item.url, item.sourceLabel, item.mode)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-gray-900 dark:text-white truncate leading-tight">
              {item.sourceLabel}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-1">
              {formatRelativeTime(item.addedAt, t)}
            </p>
          </div>
        </div>

        {/* Delete Button (Comfortable 44x44px target safely away from primary action) */}
        <button
          type="button"
          onClick={() => {
            hapticLight();
            onRemove(item.id);
          }}
          title={t('common.delete') || 'Löschen'}
          aria-label={t('common.delete') || 'Löschen'}
          className="w-11 h-11 min-w-[44px] min-h-[44px] -mr-1.5 -mt-1.5 rounded-xl flex items-center justify-center text-gray-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 active:scale-90 transition-all border-none bg-transparent cursor-pointer touch-manipulation shrink-0"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Failed Error Details */}
      {isFailed && localizedError && (
        <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-300 text-xs leading-relaxed flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
          <span className="flex-1 break-words">{localizedError}</span>
        </div>
      )}

      {/* Action Footer: Secondary Tools (Left) & Primary CTA (Right) */}
      <div className="flex items-center justify-between gap-2 pt-2 border-t border-black/[0.04] dark:border-white/[0.06]">
        {/* Secondary Actions (Copy & Open) */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopy}
            title={t('queue.btnCopyLink')}
            aria-label={t('queue.btnCopyLink')}
            className="h-11 min-h-[44px] min-w-[44px] px-3 rounded-xl flex items-center gap-1.5 text-xs font-semibold text-gray-600 dark:text-gray-300 bg-black/[0.04] dark:bg-white/[0.06] hover:bg-black/[0.07] dark:hover:bg-white/[0.1] active:scale-95 transition-all border-none cursor-pointer touch-manipulation"
          >
            {copied ? (
              <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <Copy className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            )}
            <span className="hidden xs:inline">{copied ? 'Kopiert' : 'Link'}</span>
          </button>

          <button
            type="button"
            onClick={handleOpen}
            title={t('queue.btnOpenLink')}
            aria-label={t('queue.btnOpenLink')}
            className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center text-gray-500 dark:text-gray-400 bg-black/[0.04] dark:bg-white/[0.06] hover:bg-black/[0.07] dark:hover:bg-white/[0.1] active:scale-95 transition-all border-none cursor-pointer touch-manipulation"
          >
            <ExternalLink className="w-4 h-4" />
          </button>
        </div>

        {/* Primary CTA (Bold, tactile, thumb-friendly 44px touch target) */}
        <button
          type="button"
          onClick={handleAction}
          disabled={!canAnalyze}
          title={isFailed ? t('queue.btnRetry') : t('queue.btnAnalyzeNow')}
          aria-label={isFailed ? t('queue.btnRetry') : t('queue.btnAnalyzeNow')}
          className={`h-11 min-h-[44px] px-4 rounded-xl flex items-center justify-center gap-2 text-xs sm:text-sm font-semibold transition-all border-none active:scale-95 touch-manipulation shadow-xs shrink-0 ${
            !canAnalyze
              ? 'bg-gray-200 dark:bg-gray-800 text-gray-400 cursor-not-allowed opacity-50'
              : isFailed
                ? 'bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white cursor-pointer'
                : 'bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white cursor-pointer'
          }`}
        >
          {isFailed ? (
            <>
              <RefreshCw className="w-4 h-4 stroke-[2.25px]" />
              <span>{t('queue.btnRetry')}</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-current ml-0.5" />
              <span>{t('queue.btnAnalyzeNow')}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default WaitlistItemCard;
