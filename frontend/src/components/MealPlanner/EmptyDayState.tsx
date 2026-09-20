import React from 'react';
import { Plus, Sparkles, UtensilsCrossed } from 'lucide-react';
import { useI18n } from '../../context/I18nContext';
import { hapticLight, hapticMedium } from '../../utils/haptics';

interface EmptyDayStateProps {
  onAddRecipe: () => void;
  onRandomPick?: () => void;
}

export const EmptyDayState: React.FC<EmptyDayStateProps> = ({
  onAddRecipe,
  onRandomPick,
}) => {
  const { t } = useI18n();

  return (
    <div className="flex flex-col items-center justify-center py-10 px-4 text-center animate-fade-in select-none">
      {/* Minimalist Flat Icon Box */}
      <div className="w-13 h-13 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/15 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-3.5 border-none shadow-2xs">
        <UtensilsCrossed className="w-6 h-6 stroke-[1.75]" />
      </div>

      <h3 className="text-sm sm:text-base font-extrabold text-gray-900 dark:text-white mb-1">
        {t('mealPlanner.emptyDayTitle')}
      </h3>
      <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mb-5 max-w-xs leading-relaxed">
        {t('mealPlanner.emptyDaySubtitle')}
      </p>

      {/* Primary 1-Click Plan Button */}
      <button
        type="button"
        onClick={() => {
          hapticLight();
          onAddRecipe();
        }}
        className="flex items-center justify-center gap-2 w-full max-w-xs px-5 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold active:scale-[0.97] transition-all duration-150 cursor-pointer border-none shadow-sm min-h-[48px]"
      >
        <Plus className="w-5 h-5 stroke-[2.5]" />
        <span>{t('mealPlanner.planRecipe')}</span>
      </button>

      {/* Random Picker Button */}
      {onRandomPick && (
        <button
          type="button"
          onClick={() => {
            hapticMedium();
            onRandomPick();
          }}
          className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-750 text-gray-700 dark:text-gray-200 text-xs font-semibold active:scale-[0.96] transition-all duration-150 cursor-pointer border-none min-h-[38px]"
        >
          <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 stroke-[2]" />
          <span>{t('mealPlanner.quickAddRandom')}</span>
        </button>
      )}
    </div>
  );
};

export default EmptyDayState;

