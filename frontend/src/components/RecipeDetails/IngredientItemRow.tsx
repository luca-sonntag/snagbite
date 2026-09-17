import React from 'react';
import { ChevronRight } from 'lucide-react';
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
  hideNutrition = false,
}) => {
  const { t } = useI18n();

  const rawFormatted = formatAmount(ingredient.amount, ingredient.unit)?.trim() ?? '';
  const unit = (ingredient.unit ?? '').trim();
  const alreadyHasUnit =
    Boolean(unit) &&
    (rawFormatted.endsWith(` ${unit}`) ||
      rawFormatted.toLowerCase().endsWith(unit.toLowerCase()));
  const displayAmount =
    alreadyHasUnit || !unit
      ? rawFormatted
      : rawFormatted
      ? `${rawFormatted} ${unit}`.trim()
      : '';
  const name = ingredient.name;
  const uniqueId = `${name}-${originalIdx}-${itemIdx}`;
  const parent = getParentIngredient(ingredient);
  const showParentBadge = parent && parent.name.toLowerCase().trim() !== name.toLowerCase().trim();
  const hasCalories = !hideNutrition && ingredient.calories !== undefined && ingredient.calories !== null;
  const canOpenNutrition = isPremium && hasCalories;

  const handleNutritionClick = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!canOpenNutrition) return;

    hapticLight();
    onSelectNutrition?.(ingredient, categoryName);
  };

  return (
    <li
      key={uniqueId}
      onClick={() => {
        if (canOpenNutrition) {
          handleNutritionClick();
        }
      }}
      className={`group flex items-center justify-between gap-3 px-4.5 py-3 sm:px-6 transition-colors hover:bg-black/[0.015] dark:hover:bg-white/[0.02] active:bg-black/[0.03] dark:active:bg-white/[0.04] select-none ${
        canOpenNutrition ? 'cursor-pointer' : ''
      }`}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {/* Ingredient Icon */}
        <IngredientIcon
          baseName={ingredient.baseName}
          canonicalId={ingredient.canonicalId}
          category={categoryName || ingredient.category}
          name={name}
          synonyms={ingredient.synonyms}
          size="md"
        />

        {/* Details */}
        <div className="flex-1 min-w-0 flex flex-col justify-center">
          {ingredient.replacedOriginal && (
            <span className="text-[11px] leading-tight text-red-500/70 dark:text-red-400/70 line-through font-normal truncate block mb-0.5">
              {ingredient.replacedOriginal}
            </span>
          )}

          {/* Ingredient name & metadata tags */}
          <div className="flex items-baseline flex-wrap gap-x-1.5 min-w-0 text-sm font-semibold text-gray-900 dark:text-white leading-snug">
            {ingredient.brand && (
              <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400 bg-black/[0.05] dark:bg-white/[0.08] px-1.5 py-0.5 rounded-md leading-tight">
                {ingredient.brand}
              </span>
            )}
            <span>{name}</span>
            {showParentBadge && (
              <span className="text-xs text-gray-400 dark:text-gray-500 font-normal">
                {t('recipe.parentDerivedLabel', { parent: parent.name })}
              </span>
            )}
            {ingredient.modifier && (
              <span className="text-xs text-gray-400 dark:text-gray-500 font-normal">
                ({ingredient.modifier})
              </span>
            )}
          </div>

          {/* Notes */}
          {ingredient.notes && (
            <div className="text-[11px] text-gray-400 dark:text-gray-500 truncate mt-0.5">
              {ingredient.notes}
            </div>
          )}
        </div>
      </div>

      {/* Right side: Amount and/or Kcal chevron chip for premium users */}
      <div className="flex items-center gap-2 shrink-0 self-center">
        {displayAmount && (
          <span className="font-bold text-sm tabular-nums text-gray-800 dark:text-gray-200 text-right">
            {displayAmount}
          </span>
        )}
        {canOpenNutrition && (
          <button
            type="button"
            onClick={handleNutritionClick}
            className="min-h-[28px] px-2 py-0.5 rounded-full inline-flex items-center gap-1 text-[11px] font-semibold shrink-0 border-none transition-all active:scale-95 cursor-pointer select-none bg-black/5 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/15 text-gray-600 dark:text-gray-300"
            title={ingredient.matchedName ? t('recipe.verifiedIngredientTooltip', { name: ingredient.matchedName }) : undefined}
            aria-label={t('recipe.nutritionTitle')}
          >
            <span className="tabular-nums">{Math.round(ingredient.calories! * scaleFactor)} kcal</span>
            <ChevronRight className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 -ml-0.5" />
          </button>
        )}
      </div>
    </li>
  );
};

export default IngredientItemRow;
