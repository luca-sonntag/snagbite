import React from 'react';
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

  const daysText =
    limitStatus.windowDays === 1
      ? t('form.remainingExtractionsToday')
      : t('form.remainingExtractionsDays', { days: limitStatus.windowDays });

  return (
    <div className="flex items-center justify-center -mt-1">
      <p className="text-center text-xs text-gray-500 dark:text-gray-400 font-medium">
        {t('form.remainingExtractions', {
          remaining: limitStatus.remaining,
          limit: limitStatus.limit,
          days: daysText,
        })}
      </p>
    </div>
  );
};

export default ExtractQuotaBadge;
