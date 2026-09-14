import React from 'react';
import { Plus } from 'lucide-react';
import { useI18n } from '../../context/I18nContext';
import { hapticLight } from '../../utils/haptics';
import type { DayEmptyBannerProps } from './types';

export const DayEmptyBanner: React.FC<DayEmptyBannerProps> = ({
  onAddRecipe,
}) => {
  const { t } = useI18n();

  const handleAdd = () => {
    hapticLight();
    onAddRecipe();
  };

  return (
    <div className="w-full flex items-center justify-between gap-3 p-3.5 sm:p-4 rounded-2xl md:rounded-3xl bg-white dark:bg-gray-900/90 shadow-2xs ring-1 ring-black/[0.04] dark:ring-white/[0.06] animate-fade-in select-none">
      <div className="min-w-0">
        <h4 className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white truncate">
          {t('mealPlanner.dayEmptyBannerTitle')}
        </h4>
        <p className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 line-clamp-1 mt-0.5">
          {t('mealPlanner.dayEmptyBannerSubtitle')}
        </p>
      </div>

      <button
        type="button"
        onClick={handleAdd}
        className="shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold active:scale-95 transition-all duration-150 cursor-pointer border-none shadow-2xs min-h-[44px]"
      >
        <Plus className="w-4 h-4 stroke-[2.5]" />
        <span>{t('mealPlanner.planRecipe')}</span>
      </button>
    </div>
  );
};

export default DayEmptyBanner;
