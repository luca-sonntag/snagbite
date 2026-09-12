import React from 'react';
import type { Ingredient } from '../../types';
import { useI18n } from '../../context/I18nContext';
import { getParentIngredient } from '../../utils/ingredientTaxonomy';
import IngredientIcon from '../IngredientIcon';
import { hapticLight } from '../../utils/haptics';

interface IngredientItemRowProps {
  ingredient: Ingredient;
  categoryName: string;
  originalIdx: number;
  itemIdx: number;
  isPremium?: boolean;
  scaleFactor?: number;
  formatAmount: (amount: number | undefined, unit: string | undefined) => string;
  onSelectNutrition?: (ingredient: Ingredient, category: string) => void;
  onOpenPremium?: () => void;
  hideNutrition?: boolean;
}

export const IngredientItemRow: React.FC<IngredientItemRowProps> = ({
  ingredient,
  categoryName,
  originalIdx,
  itemIdx,
  isPremium = false,
  scaleFactor = 1,
  formatAmount,
  onSelectNutrition,
  onOpenPremium,
  hideNutrition = false,
}) => {
  const { t } = useI18n();

  const scaledAmount = formatAmount(ingredient.amount, ingredient.unit);
  const amountStr = scaledAmount ? `${scaledAmount} ` : '';
  const unitStr = ingredient.unit ? `${ingredient.unit} ` : '';
  const name = ingredient.name;
  const uniqueId = `${name}-${originalIdx}-${itemIdx}`;
  const parent = getParentIngredient(ingredient);
  const showParentBadge = parent && parent.name.toLowerCase().trim() !== name.toLowerCase().trim();
  const hasCalories = !hideNutrition && ingredient.calories !== undefined && ingredient.calories !== null;

  const handleNutritionClick = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!hasCalories) return;

    hapticLight();
    if (!isPremium) {
      onOpenPremium?.();
    } else {
      onSelectNutrition?.(ingredient, categoryName);
    }
  };

  return (
    <li
      key={uniqueId}
      onClick={() => {
        if (hasCalories) {
          handleNutritionClick();
        }
      }}
      className={`group relative flex items-center gap-2.5 p-2.5 sm:p-3 rounded-2xl transition-all border-none shadow-none bg-gray-50/80 dark:bg-gray-800/40 hover:bg-gray-100/80 dark:hover:bg-gray-800/70 odd:last:col-span-2 ${
        hasCalories
          ? 'cursor-pointer active:scale-[0.98]'
          : ''
      }`}
    >
      <div className="shrink-0">
        <IngredientIcon
          baseName={ingredient.baseName}
          canonicalId={ingredient.canonicalId}
          category={categoryName}
          name={name}
          synonyms={ingredient.synonyms}
          size="sm"
        />
      </div>

      <div className="flex-1 min-w-0 flex flex-col justify-center">
        {ingredient.replacedOriginal && (
          <span className="text-[10px] leading-tight text-red-500/70 dark:text-red-400/70 line-through truncate block mb-0.5">
            {ingredient.replacedOriginal}
          </span>
        )}

        {/* Brand tag */}
        {ingredient.brand && (
          <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400 bg-black/[0.04] dark:bg-white/[0.08] px-1.5 py-0.5 rounded leading-tight w-fit mb-0.5">
            {ingredient.brand}
          </span>
        )}

        {/* Ingredient name */}
        <div className="flex items-baseline flex-wrap gap-x-1 min-w-0">
          <span className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white leading-snug line-clamp-2 [word-break:break-word]">
            {name}
          </span>
          {showParentBadge && (
            <span className="text-[11px] text-gray-400 dark:text-gray-500 font-normal">
              {t('recipe.parentDerivedLabel', { parent: parent.name })}
            </span>
          )}
        </div>

        {/* Amount & Calories together */}
        <div className="flex items-center flex-wrap gap-x-1.5 text-xs mt-1">
          {(amountStr || unitStr) && (
            <span className="font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
              {`${amountStr}${unitStr}`.trim()}
            </span>
          )}
          {hasCalories && (
            <span className="text-[11px] font-medium text-gray-400 dark:text-gray-500 tabular-nums flex items-center gap-1">
              {(amountStr || unitStr) && <span className="text-gray-300 dark:text-gray-600">•</span>}
              <span>{Math.round(ingredient.calories! * scaleFactor)} kcal</span>
            </span>
          )}
        </div>

        {/* Modifier / Notes */}
        {(ingredient.modifier || ingredient.notes) && (
          <span className="text-[11px] text-gray-400 dark:text-gray-500 truncate mt-0.5">
            {ingredient.modifier ? `(${ingredient.modifier})` : ''} {ingredient.notes ?? ''}
          </span>
        )}
      </div>
    </li>
  );
};

export default IngredientItemRow;
