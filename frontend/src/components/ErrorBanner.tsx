import { Button } from '@heroui/react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { tint, TINT } from '../utils/tint';
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
    <div style={tint(TINT.rose)} className="p-4 sm:p-5 rounded-3xl tint-surface border-none shadow-[0_2px_6px_rgba(0,0,0,0.03)] flex flex-col gap-3">
      <div className="flex items-start gap-3.5">
        <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0 flex items-center justify-center">
          <AlertCircle className="w-5 h-5" />
        </div>
        <div className="flex flex-col gap-0.5 min-w-0 flex-1">
          <h4 className="font-bold text-sm text-gray-900 dark:text-white leading-tight">
            {t('error.title')}
          </h4>
          <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed font-normal mt-0.5">
            {resolveErrorCode(jobErrorCode, jobErrorParams ?? undefined, jobError, language) || t('error.default')}
          </p>
        </div>
      </div>

      {canRetry && (
        <Button
          type="button"
          isDisabled={isPending}
          onClick={onRetry}
          className="h-9 text-xs rounded-2xl font-bold border-none text-gray-800 dark:text-gray-200 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 active:scale-95 transition-all shadow-none flex items-center justify-center gap-1.5 cursor-pointer w-fit px-4 ml-auto sm:ml-0"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>{t('error.retry')}</span>
        </Button>
      )}
    </div>
  );
}


