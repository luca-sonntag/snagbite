import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import type { StepIngredientItem } from './types';
import { useI18n } from '../../context/I18nContext';
import IngredientIcon from '../IngredientIcon';

interface CookingModeIngredientsProps {
  ingredients: StepIngredientItem[];
  formatAmount: (amount: number, unit?: string) => string;
}

export const CookingModeIngredients: React.FC<CookingModeIngredientsProps> = ({
  ingredients,
  formatAmount,
}) => {
  const { t } = useI18n();

  const count = ingredients?.length ?? 0;

  return (
    <div className="w-full px-2 py-4 sm:px-4 sm:py-5 flex flex-col text-left">
      {/* Section Header inside cohesive card */}
      <div className="flex items-center justify-between gap-2 mb-3 shrink-0">
        <h3 className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
          {t('recipe.ingredientsForStep')}
        </h3>
        <span
          className={`text-[11px] font-bold rounded-full px-2.5 py-0.5 tabular-nums select-none ${
            count > 0
              ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10'
              : 'text-gray-400 dark:text-gray-500 bg-black/[0.04] dark:bg-white/[0.06]'
          }`}
        >
          {count}
        </span>
      </div>

      {count === 0 ? (
        /* Empty State when no ingredients are needed for this step */
        <div className="flex items-center gap-2.5 py-2.5 px-3 rounded-2xl bg-black/[0.02] dark:bg-white/[0.02] text-gray-500 dark:text-gray-400">
          <CheckCircle2 className="w-4 h-4 text-emerald-500/80 shrink-0" />
          <span className="text-xs sm:text-[13px] font-normal leading-tight">
            {t('recipe.noIngredientsForStep')}
          </span>
        </div>
      ) : (
        /* 2-Column Grid with comfortable spacing */
        <ul className="grid grid-cols-2 gap-x-3.5 sm:gap-x-8 gap-y-3 text-xs sm:text-sm">
          {ingredients.map((ing, i) => {
            const scaledAmount = formatAmount(ing.amount, ing.unit);
            const amountStr = scaledAmount ? `${scaledAmount} ` : '';
            const unitStr = ing.unit ? `${ing.unit} ` : '';

            return (
              <li
                key={`${ing.name}-${i}`}
                className="flex items-center gap-2.5 sm:gap-3 py-1 px-1 rounded-xl transition-colors min-w-0"
              >
                <IngredientIcon
                  baseName={ing.baseName}
                  canonicalId={ing.canonicalId}
                  category={ing.category}
                  name={ing.name}
                  synonyms={ing.synonyms}
                  size="md"
                />
                <div className="flex-1 min-w-0 flex flex-col justify-center leading-snug">
                  {ing.replacedOriginal && (
                    <span className="text-[10px] leading-tight text-red-500/70 dark:text-red-400/70 line-through font-normal truncate block">
                      {ing.replacedOriginal}
                    </span>
                  )}

                  {/* Name & modifier */}
                  <div className="flex items-baseline flex-wrap gap-x-1 min-w-0 text-xs sm:text-sm font-semibold text-gray-900 dark:text-white">
                    <span className="truncate">{ing.name}</span>
                    {ing.modifier && (
                      <span className="text-[11px] text-gray-400 dark:text-gray-500 font-normal truncate">
                        ({ing.modifier})
                      </span>
                    )}
                  </div>

                  {/* Amount & notes */}
                  <div className="flex items-center gap-1.5 text-xs sm:text-sm text-gray-500 dark:text-gray-400 font-normal mt-0.5">
                    {(amountStr || unitStr) && (
                      <span className="font-bold text-emerald-600 dark:text-emerald-400 tabular-nums truncate text-xs sm:text-sm">
                        {`${amountStr}${unitStr}`.trim()}
                      </span>
                    )}
                    {ing.notes && (
                      <span className="text-[10.5px] text-gray-400 dark:text-gray-500 truncate">
                        {ing.notes}
                      </span>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default CookingModeIngredients;
