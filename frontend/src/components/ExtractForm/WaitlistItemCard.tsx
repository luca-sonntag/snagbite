import React, { useState } from 'react';
import { Play, Copy, ExternalLink, Trash2, Check, Globe, RefreshCw, AlertCircle } from 'lucide-react';
import { useI18n } from '../../context/I18nContext';
import { useToast } from '../../context/ToastContext';
import { resolveErrorCode } from '../../i18n';
import { hapticLight, hapticMedium } from '../../utils/haptics';
import { getSourceChannel } from '../../utils/sourceLabel';
import type { QueueItem } from '../../context/ExtractionQueueContext';

interface WaitlistItemCardProps {
  item: QueueItem;
  canAnalyze: boolean;
  onAnalyze: (url: string) => void;
  onRemove: (id: string) => void;
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
  const channel = getSourceChannel(item.url);

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
    <div className="flex flex-col gap-2.5 p-3.5 bg-white dark:bg-gray-900 rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border-none transition-all">
      <div className="flex items-start justify-between gap-2 min-w-0">
        <div className="flex items-start gap-2.5 min-w-0 flex-1">
          <div
            className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
              isFailed
                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                : 'bg-emerald-500/10 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
            }`}
          >
            {isFailed ? (
              <AlertCircle className="w-4 h-4" />
            ) : channel === 'web' ? (
              <Globe className="w-4 h-4" />
            ) : (
              <Play className="w-4 h-4 fill-current" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-gray-900 dark:text-white truncate">
              {item.sourceLabel}
            </p>
            {isFailed ? (
              <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-0.5 leading-snug line-clamp-2">
                {localizedError}
              </p>
            ) : (
              <p className="text-[11px] text-gray-400 dark:text-gray-500 truncate mt-0.5">
                {formatRelativeTime(item.addedAt, t)}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-0.5 shrink-0 -mr-1 -mt-1">
          <button
            type="button"
            onClick={handleCopy}
            title={t('queue.btnCopyLink')}
            className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-black/5 dark:hover:bg-white/5 active:scale-90 transition-all border-none bg-transparent cursor-pointer touch-manipulation"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
          </button>
          <button
            type="button"
            onClick={handleOpen}
            title={t('queue.btnOpenLink')}
            className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-black/5 dark:hover:bg-white/5 active:scale-90 transition-all border-none bg-transparent cursor-pointer touch-manipulation"
          >
            <ExternalLink className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => {
              hapticLight();
              onRemove(item.id);
            }}
            title={t('common.delete') || 'Löschen'}
            className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center text-gray-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 active:scale-90 transition-all border-none bg-transparent cursor-pointer touch-manipulation"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <button
        type="button"
        onClick={handleAction}
        className={`w-full min-h-[44px] py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all border-none active:scale-[0.98] cursor-pointer touch-manipulation ${
          isFailed
            ? canAnalyze
              ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-sm'
              : 'bg-amber-600/15 text-amber-700 dark:text-amber-300 hover:bg-amber-600/25'
            : canAnalyze
              ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm'
              : 'bg-emerald-600/15 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-600/25'
        }`}
      >
        {isFailed ? <RefreshCw className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
        <span>{isFailed ? t('queue.btnRetry') : t('queue.btnAnalyzeNow')}</span>
      </button>
    </div>
  );
};

export default WaitlistItemCard;
