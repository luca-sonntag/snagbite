import React, { useState } from 'react';
import { Play, Copy, ExternalLink, Trash2, Check, Globe, RefreshCw, AlertCircle } from 'lucide-react';
import { useI18n } from '../../context/I18nContext';
import { useToast } from '../../context/ToastContext';
import { resolveErrorCode } from '../../i18n';
import { hapticLight, hapticMedium } from '../../utils/haptics';
import { getSourceChannel, getUrlIdentifier } from '../../utils/sourceLabel';
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
  const urlIdentifier = getUrlIdentifier(item.url);

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
    <div className="p-3 bg-white dark:bg-gray-900 rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border-none transition-all">
      <div className="flex items-center justify-between gap-2 min-w-0">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
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
              <Play className="w-4 h-4 fill-current ml-0.5" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 min-w-0">
              <p className="text-xs font-bold text-gray-900 dark:text-white truncate">
                {item.sourceLabel}
              </p>
              {urlIdentifier && (
                <span className="text-[10px] font-mono font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded-md truncate max-w-[120px]">
                  {urlIdentifier}
                </span>
              )}
            </div>
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

        <div className="flex items-center gap-0.5 shrink-0 -mr-1">
          <button
            type="button"
            onClick={handleCopy}
            title={t('queue.btnCopyLink')}
            className="w-8.5 h-8.5 min-w-[34px] min-h-[34px] rounded-xl flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-black/5 dark:hover:bg-white/5 active:scale-90 transition-all border-none bg-transparent cursor-pointer touch-manipulation"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
          </button>
          <button
            type="button"
            onClick={handleOpen}
            title={t('queue.btnOpenLink')}
            className="w-8.5 h-8.5 min-w-[34px] min-h-[34px] rounded-xl flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-black/5 dark:hover:bg-white/5 active:scale-90 transition-all border-none bg-transparent cursor-pointer touch-manipulation"
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
            className="w-8.5 h-8.5 min-w-[34px] min-h-[34px] rounded-xl flex items-center justify-center text-gray-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 active:scale-90 transition-all border-none bg-transparent cursor-pointer touch-manipulation"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          {/* Primary Analyze / Retry Icon Button */}
          <button
            type="button"
            onClick={handleAction}
            disabled={!canAnalyze}
            title={isFailed ? t('queue.btnRetry') : t('queue.btnAnalyzeNow')}
            aria-label={isFailed ? t('queue.btnRetry') : t('queue.btnAnalyzeNow')}
            className={`w-9 h-9 min-w-[36px] min-h-[36px] rounded-xl flex items-center justify-center transition-all border-none active:scale-90 cursor-pointer touch-manipulation ml-0.5 ${
              isFailed
                ? canAnalyze
                  ? 'bg-amber-500 hover:bg-amber-400 text-white shadow-sm shadow-amber-500/25'
                  : 'bg-amber-500/20 text-amber-300 opacity-50 cursor-not-allowed'
                : canAnalyze
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm shadow-emerald-600/25'
                  : 'bg-emerald-600/20 text-emerald-300 opacity-50 cursor-not-allowed'
            }`}
          >
            {isFailed ? (
              <RefreshCw className="w-4 h-4 stroke-[2.25px]" />
            ) : (
              <Play className="w-4 h-4 fill-current ml-0.5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default WaitlistItemCard;
