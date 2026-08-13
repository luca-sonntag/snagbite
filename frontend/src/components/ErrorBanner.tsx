import { Button } from '@heroui/react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { useI18n } from '../context/I18nContext';
import { resolveErrorCode } from '../i18n';
import { isRetryableError } from '../errorCodes';
import type { ErrorParams } from '../errorCodes';

interface ErrorBannerProps {
  isPending: boolean;
  jobStatus: 'pending' | 'scraping' | 'processing' | 'completed' | 'failed' | null;
  jobError: string | null;
  jobErrorCode?: string | null;
  jobErrorParams?: ErrorParams | null;
  /** Re-runs the failed import. The caller decides what "again" means per input
   *  channel — resubmitting the URL, or re-uploading the selected photos. */
  onRetry: () => void;
}

export default function ErrorBanner({
  isPending,
  jobStatus,
  jobError,
  jobErrorCode,
  jobErrorParams,
  onRetry
}: ErrorBannerProps) {
  const { t, language } = useI18n();

  if (isPending || jobStatus !== 'failed') return null;

  if (jobErrorCode === 'RATE_LIMIT_EXCEEDED') {
    return null;
  }

  const canRetry = isRetryableError(jobErrorCode, jobError);

  return (
    <div className="p-5 rounded-3xl bg-white dark:bg-gray-900 border-none shadow-[0_2px_6px_rgba(0,0,0,0.03)] flex flex-col gap-3.5">
      <div className="flex items-start gap-3">
        <div className="p-2.5 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 shrink-0 flex items-center justify-center">
          <AlertCircle className="w-5 h-5" />
        </div>
        <div className="flex flex-col gap-0.5 min-w-0 flex-1">
          <h4 className="font-bold text-sm text-gray-900 dark:text-white leading-tight">
            {t('error.title')}
          </h4>
          <p className="text-xs text-gray-500 dark:text-gray-400 leading-snug">
            {resolveErrorCode(jobErrorCode, jobErrorParams ?? undefined, jobError, language) || t('error.default')}
          </p>
        </div>
      </div>

      {canRetry && (
        <Button
          type="button"
          isDisabled={isPending}
          onClick={onRetry}
          className="h-10 text-xs rounded-2xl font-bold border-none text-rose-600 dark:text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 active:scale-95 transition-all shadow-none flex items-center justify-center gap-2 cursor-pointer w-fit px-4"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>{t('error.retry')}</span>
        </Button>
      )}
    </div>
  );
}


