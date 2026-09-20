import React from 'react';
import { ArrowLeftRight, ArrowRight } from 'lucide-react';
import type { AlternativeIngredient } from '../../types';
import { useI18n } from '../../context/I18nContext';

interface AlternativeIngredientsListProps {
  alternativeIngredients: AlternativeIngredient[];
}

export const AlternativeIngredientsList: React.FC<AlternativeIngredientsListProps> = ({
  alternativeIngredients,
}) => {
  const { t } = useI18n();

  if (!alternativeIngredients || alternativeIngredients.length === 0) return null;

  const medallion =
    'w-9 h-9 rounded-full bg-emerald-500/5 flex items-center justify-center flex-shrink-0';
  const medallionIcon = 'w-[18px] h-[18px] text-emerald-600 dark:text-emerald-400';

  return (
    <div className="flex flex-col gap-4 mt-2">
      {/* Section Header (OUTSIDE card) */}
      <div className="flex items-center gap-3">
        <div className={medallion}>
          <ArrowLeftRight className={medallionIcon} />
        </div>
        <h3 className="text-base font-bold text-gray-900 dark:text-white">
          {t('recipe.alternativeIngredients')}
        </h3>
        <span className="ml-auto text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 rounded-full px-2.5 py-1 tabular-nums select-none">
          {alternativeIngredients.length}
        </span>
      </div>

      {/* Clean Flat Card Container */}
      <div className="glass-panel rounded-2xl p-4 sm:p-5 flex flex-col gap-2.5">
        {alternativeIngredients.map((alt, idx) => (
          <div
            key={idx}
            className="bg-gray-50/80 dark:bg-gray-800/50 rounded-xl p-3.5 transition-all"
          >
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 line-through decoration-gray-400/60 bg-gray-200/60 dark:bg-gray-700/50 px-2.5 py-1 rounded-lg">
                {alt.original}
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 dark:bg-emerald-500/20 px-2.5 py-1 rounded-lg">
                {alt.substitute}
              </span>
            </div>
            {alt.notes && (
              <p className="text-xs text-gray-600 dark:text-gray-300 mt-2 leading-relaxed">
                {alt.notes}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default AlternativeIngredientsList;
