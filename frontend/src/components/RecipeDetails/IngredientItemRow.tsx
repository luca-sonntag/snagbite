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
      className={`group flex items-center justify-between gap-3 px-3 py-2.5 sm:px-3.5 sm:py-2.5 rounded-2xl bg-slate-50/80 hover:bg-slate-100/90 dark:bg-gray-800/40 dark:hover:bg-gray-800/70 transition-all border-none ${
        hasCalories
          ? 'cursor-pointer active:scale-[0.99]'
          : ''
      }`}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <IngredientIcon
          baseName={ingredient.baseName}
          canonicalId={ingredient.canonicalId}
          category={categoryName}
          name={name}
          synonyms={ingredient.synonyms}
          size="md"
        />
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
              <span className="text-xs text-gray-400 dark:text-gray-400 font-normal">
                {t('recipe.parentDerivedLabel', { parent: parent.name })}
              </span>
            )}
            {ingredient.modifier && (
              <span className="text-xs text-gray-500 dark:text-gray-400 font-normal">
                ({ingredient.modifier})
              </span>
            )}
          </div>

          {/* Amount & notes */}
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 font-normal mt-0.5">
            {(amountStr || unitStr) && (
              <span className="font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                {`${amountStr}${unitStr}`.trim()}
              </span>
            )}
            {ingredient.notes && (
              <span className="text-[11px] text-gray-400 dark:text-gray-500 truncate">
                {ingredient.notes}
              </span>
            )}
          </div>
        </div>
      </div>

      {hasCalories && (
        <button
          type="button"
          onClick={handleNutritionClick}
          className={`min-h-[32px] px-2.5 py-1 rounded-full inline-flex items-center gap-1 text-xs font-bold shrink-0 border-none transition-all active:scale-95 cursor-pointer select-none shadow-2xs ${
            isPremium
              ? 'bg-white hover:bg-gray-50 dark:bg-gray-750 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200'
              : 'bg-white/80 hover:bg-white dark:bg-gray-750 dark:hover:bg-gray-700 text-gray-400 dark:text-gray-400'
          }`}
          title={isPremium && ingredient.matchedName ? t('recipe.verifiedIngredientTooltip', { name: ingredient.matchedName }) : undefined}
          aria-label={t('recipe.nutritionTitle')}
        >
          {isPremium ? (
            <>
              <span className="tabular-nums">{Math.round(ingredient.calories! * scaleFactor)} kcal</span>
              <ChevronRight className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 -ml-0.5" />
            </>
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </button>
      )}
    </li>
  );
};

export default IngredientItemRow;
