import React from 'react';
import { CheckCheck, Trash2 } from 'lucide-react';
import { useI18n } from '../../context/I18nContext';

interface ShoppingProgressCardProps {
  checkedCount: number;
  totalCount: number;
  progress: number;
  onClearChecked: () => void;
  onClearAll: () => void;
}

export const ShoppingProgressCard: React.FC<ShoppingProgressCardProps> = ({
  checkedCount,
  totalCount,
  progress,
  onClearChecked,
  onClearAll,
}) => {
  const { t } = useI18n();

  if (totalCount === 0) return null;

  return (
    <div className="bg-white dark:bg-gray-900 p-4 sm:p-5 rounded-3xl border-none shadow-[0_2px_8px_rgba(0,0,0,0.03)] flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <span className="w-11 h-11 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 shadow-xs">
            <CheckCheck className="w-5 h-5" />
          </span>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white leading-snug">
              {t('shopping.progressSubtitle', { checked: checkedCount, total: totalCount })}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 font-medium">
              {Math.round(progress)}% {t('shopping.done')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {checkedCount > 0 && (
            <button
              type="button"
              onClick={onClearChecked}
              aria-label={t('shopping.clearChecked')}
              title={t('shopping.clearChecked')}
              className="h-9 px-3 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 active:scale-95 transition-all text-xs font-semibold flex items-center gap-1.5 cursor-pointer border-none"
            >
              <CheckCheck className="w-4 h-4" />
              <span className="hidden xs:inline sm:inline">{t('shopping.clearChecked')}</span>
            </button>
          )}
          <button
            type="button"
            onClick={onClearAll}
            aria-label={t('shopping.clearAll')}
            title={t('shopping.clearAll')}
            className="w-9 h-9 rounded-2xl bg-gray-100 dark:bg-gray-800 text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-500/10 active:scale-95 transition-all flex items-center justify-center cursor-pointer border-none"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Smooth Gradient Progress Bar */}
      <div className="h-2 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden p-0.5">
        <div
          className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};

export default ShoppingProgressCard;
