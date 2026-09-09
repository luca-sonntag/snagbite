import React from 'react';
import type { IngredientGroup } from '../../types';
import { ServingsStepper } from '../ServingsStepper';
import { useI18n } from '../../context/I18nContext';

interface PreviewIngredientsListProps {
  ingredients: IngredientGroup[];
  servings: number;
  onDecreaseServings: () => void;
  onIncreaseServings: () => void;
  formatAmount: (amount: number | undefined | null, unit: string | undefined | null) => string;
}

export const PreviewIngredientsList: React.FC<PreviewIngredientsListProps> = ({
  ingredients,
  servings,
  onDecreaseServings,
  onIncreaseServings,
  formatAmount,
}) => {
  const { t } = useI18n();

  const totalIngredientsCount = ingredients.reduce(
    (acc, group) => acc + (group.items?.length || 0),
    0
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2 pt-1">
        <div className="flex items-center gap-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
            {t('recipe.preview.ingredients')}
          </h4>
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/10 text-gray-500 dark:text-gray-400">
            {totalIngredientsCount}
          </span>
        </div>
        <ServingsStepper
          servings={servings}
          onDecrease={onDecreaseServings}
          onIncrease={onIncreaseServings}
          size="sm"
          showIcon={false}
          ariaLabel={t('recipe.serves')}
        />
      </div>

      <div className="flex flex-col gap-3">
        {ingredients.map((group, gIdx) => {
          const showGroupTitle =
            Boolean(group.name) &&
            group.name.toLowerCase() !== 'default' &&
            group.name.trim() !== '';

          return (
            <div key={group.name || gIdx} className="flex flex-col gap-1.5">
              {showGroupTitle && (
                <h5 className="text-xs font-bold text-gray-800 dark:text-gray-200 mt-1">
                  {group.name}
                </h5>
              )}
              <ul className="flex flex-col gap-1 list-none p-0 m-0">
                {group.items.map((item, iIdx) => {
                  const formattedAmt = formatAmount(item.amount, item.unit);
                  return (
                    <li
                      key={item.canonicalId || `${item.name}-${iIdx}`}
                      className="flex items-baseline gap-2 py-1.5 px-2.5 rounded-xl bg-gray-50/80 dark:bg-gray-800/40 text-xs text-gray-800 dark:text-gray-200"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 self-center" />
                      {(formattedAmt || item.unit) && (
                        <span className="font-bold shrink-0 text-gray-900 dark:text-white">
                          {formattedAmt} {item.unit || ''}
                        </span>
                      )}
                      <span className="min-w-0 break-words font-medium">
                        {item.name}
                        {item.modifier ? ` (${item.modifier})` : ''}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PreviewIngredientsList;
