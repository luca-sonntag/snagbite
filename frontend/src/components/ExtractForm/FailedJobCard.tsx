import React, { useState } from 'react';
import { RefreshCw, Copy, ExternalLink, Bookmark, X, AlertCircle, Check } from 'lucide-react';
import { useI18n } from '../../context/I18nContext';
import { useToast } from '../../context/ToastContext';
import { resolveErrorCode } from '../../i18n';
import { hapticLight, hapticSuccess } from '../../utils/haptics';
import type { FailedExtractionEntry } from '../../context/ExtractionQueueContext';

interface FailedJobCardProps {
  entry: FailedExtractionEntry;
  onRetry: (url: string) => void;
  onDismiss: (id: string) => void;
  onMoveToWaitlist: (id: string) => void;
}

export const FailedJobCard: React.FC<FailedJobCardProps> = ({
  entry,
  onRetry,
  onDismiss,
  onMoveToWaitlist,
}) => {
  const { t, language } = useI18n();
  const toast = useToast();
  const [copied, setCopied] = useState(false);

  const localizedError =
    resolveErrorCode(entry.errorCode, entry.errorParams, entry.error, language) ||
    t('error.default');

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    hapticLight();
    try {
      await navigator.clipboard.writeText(entry.sourceUrl);
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
    window.open(entry.sourceUrl, '_blank', 'noopener,noreferrer');
  };

  const handleRetry = () => {
    hapticSuccess();
    onRetry(entry.sourceUrl);
  };

  const handleMoveToWaitlist = (e: React.MouseEvent) => {
    e.stopPropagation();
    hapticLight();
    onMoveToWaitlist(entry.id);
    toast.success(t('queue.toast.movedToWaitlist'));
  };

  return (
    <div className="flex flex-col gap-2.5 p-3.5 bg-white dark:bg-gray-900 rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border-none transition-all">
      <div className="flex items-start justify-between gap-2 min-w-0">
        <div className="flex items-start gap-2.5 min-w-0 flex-1">
          <div className="w-7 h-7 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
            <AlertCircle className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-gray-900 dark:text-white truncate">
              {entry.sourceLabel}
            </p>
            <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-0.5 leading-tight break-words">
              {localizedError}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            hapticLight();
            onDismiss(entry.id);
          }}
          title={t('queue.btnDismiss')}
          className="w-7 h-7 rounded-xl flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-black/5 dark:hover:bg-white/5 active:scale-90 transition-all border-none bg-transparent cursor-pointer shrink-0"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex items-center gap-2 pt-0.5">
        <button
          type="button"
          onClick={handleRetry}
          className="flex-1 py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white transition-all border-none active:scale-[0.98] cursor-pointer shadow-sm"
        >
          <RefreshCw className="w-3 h-3" />
          <span>{t('queue.btnRetry')}</span>
        </button>

        <button
          type="button"
          onClick={handleMoveToWaitlist}
          title={t('queue.btnMoveToWaitlist')}
          className="h-8 px-2.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 active:scale-95 transition-all border-none cursor-pointer"
        >
          <Bookmark className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{t('queue.btnMoveToWaitlist')}</span>
        </button>

        <button
          type="button"
          onClick={handleCopy}
          title={t('queue.btnCopyLink')}
          className="w-8 h-8 rounded-xl flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-black/5 dark:hover:bg-white/5 active:scale-90 transition-all border-none bg-transparent cursor-pointer shrink-0"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
        </button>

        <button
          type="button"
          onClick={handleOpen}
          title={t('queue.btnOpenLink')}
          className="w-8 h-8 rounded-xl flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-black/5 dark:hover:bg-white/5 active:scale-90 transition-all border-none bg-transparent cursor-pointer shrink-0"
        >
          <ExternalLink className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

export default FailedJobCard;
