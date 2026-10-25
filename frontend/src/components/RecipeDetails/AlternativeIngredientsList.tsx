import React from 'react';
import { ArrowRight } from 'lucide-react';
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

  return (
    <div className="flex flex-col gap-3 mt-2 pt-3 border-t border-black/[0.06] dark:border-white/[0.08]">
      {/* Section Header */}
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-base font-bold text-gray-900 dark:text-white">
          {t('recipe.alternativeIngredients')}
        </h3>
        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 rounded-full px-2.5 py-1 tabular-nums select-none">
          {alternativeIngredients.length}
        </span>
      </div>

      {/* Open-Canvas Alternative Ingredients List */}
      <div className="flex flex-col divide-y divide-black/[0.06] dark:divide-white/[0.08]">
        {alternativeIngredients.map((alt, idx) => (
          <div
            key={idx}
            className="py-3 px-0.5 transition-all"
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
