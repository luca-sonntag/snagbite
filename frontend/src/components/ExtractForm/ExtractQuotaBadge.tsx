import React from 'react';
import { Zap } from 'lucide-react';
import { useI18n } from '../../context/I18nContext';
import type { ExtractQuotaBadgeProps } from './types';

export const ExtractQuotaBadge: React.FC<ExtractQuotaBadgeProps> = ({
  limitStatus,
  isRealPremium,
  activeCount = 0,
  maxConcurrent = 1,
}) => {
  const { t } = useI18n();

  const showConcurrency = isRealPremium && maxConcurrent > 1;
  const atConcurrencyLimit = showConcurrency && activeCount >= maxConcurrent;

  if (showConcurrency && (activeCount > 0 || atConcurrencyLimit)) {
    return (
      <p
        className={`text-center text-xs font-medium -mt-1 ${
          atConcurrencyLimit ? 'text-amber-600 dark:text-amber-400' : 'text-gray-500 dark:text-gray-400'
        }`}
      >
        {atConcurrencyLimit
          ? t('form.concurrentLimitReached', { max: maxConcurrent })
          : t('form.concurrentCounter', { active: activeCount, max: maxConcurrent })}
      </p>
    );
  }

  if (isRealPremium) {
    return null;
  }

  if (!limitStatus || limitStatus.limit < 0) {
    return null;
  }

  const remaining = limitStatus.remaining;
  const isLow = remaining <= 3 && remaining > 0;

  const daysText =
    limitStatus.windowDays === 1
      ? t('form.remainingExtractionsToday')
      : t('form.remainingExtractionsDays', { days: limitStatus.windowDays });

  return (
    <div className="flex items-center justify-center -mt-1">
      <div
        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium transition-colors ${
          isLow
            ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300'
            : 'text-gray-500 dark:text-gray-400'
        }`}
      >
        <Zap className="w-3 h-3 text-emerald-500 shrink-0" />
        <span>
          {t('form.remainingExtractions', {
            remaining: limitStatus.remaining,
            limit: limitStatus.limit,
            days: daysText,
          })}
        </span>
      </div>
    </div>
  );
};

export default ExtractQuotaBadge;
