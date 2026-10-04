import React from 'react';
import { ChevronRight } from 'lucide-react';
import type { Ingredient } from '../../types';
import { useI18n } from '../../context/I18nContext';
import { getCategoryTheme } from '../../i18n';
import { cleanMatchedIngredientName } from '../../utils/formatNutrition';
import IngredientIcon from '../IngredientIcon';
import { hapticLight } from '../../utils/haptics';

export interface IngredientItemGridProps {
  ingredient: Ingredient;
  categoryName?: string;
  originalIdx: number;
  itemIdx: number;
  isPremium?: boolean;
  scaleFactor?: number;
  formatAmount: (amount: number | undefined, unit: string | undefined) => string;
  onSelectNutrition?: (ingredient: Ingredient, category?: string) => void;
  onOpenProFeature?: () => void;
  hideNutrition?: boolean;
}

export const IngredientItemGrid: React.FC<IngredientItemGridProps> = ({
  ingredient,
  categoryName,
  originalIdx,
  itemIdx,
  isPremium = false,
  formatAmount,
  onSelectNutrition,
  onOpenProFeature,
  hideNutrition = false,
}) => {
  const { t } = useI18n();
  const theme = getCategoryTheme(categoryName || ingredient.category || '');

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
  const hasCalories = !hideNutrition && ingredient.calories !== undefined && ingredient.calories !== null;
  const canOpenNutrition = isPremium && hasCalories;

  const handleClick = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (canOpenNutrition) {
      hapticLight();
      onSelectNutrition?.(ingredient, categoryName || ingredient.category || '');
    } else if (!isPremium && hasCalories) {
      hapticLight();
      onOpenProFeature?.();
    }
  };

  const isClickable = canOpenNutrition || (!isPremium && hasCalories);

  return (
    <li
      key={uniqueId}
      onClick={handleClick}
      className={`group relative flex items-center py-1.5 px-1 sm:px-1.5 rounded-xl transition-all duration-150 select-none bg-transparent hover:bg-black/[0.02] dark:hover:bg-white/[0.03] active:bg-black/[0.04] dark:active:bg-white/[0.05] active:scale-[0.98] min-h-[52px] sm:min-h-[54px] ${
        isClickable ? 'cursor-pointer' : ''
      }`}
      title={
        ingredient.matchedName
          ? t('recipe.verifiedIngredientTooltip', { name: cleanMatchedIngredientName(ingredient.matchedName) })
          : name
      }
    >
      {/* Category color bar / rectangle - delicate accent */}
      <span
        className={`w-1 h-4.5 rounded-full ${theme.barClass} shrink-0 opacity-85 mr-1`}
        title={categoryName || ingredient.category || undefined}
      />

      {/* Ingredient Icon */}
      <IngredientIcon
        baseName={ingredient.baseName}
        canonicalId={ingredient.canonicalId}
        category={categoryName || ingredient.category}
        name={name}
        synonyms={ingredient.synonyms}
        size="grid"
        className="mr-1.5"
        emptySpacingClass="w-1.5"
      />

      {/* Ingredient details */}
      <div className="flex-1 min-w-0 flex flex-col justify-center leading-snug">
        {ingredient.replacedOriginal && (
          <span className="text-[10px] leading-tight text-red-500/70 dark:text-red-400/70 line-through font-normal truncate block mb-0.5">
            {ingredient.replacedOriginal}
          </span>
        )}

        {/* Name and optional brand/modifier */}
        <div className="text-[14px] font-semibold text-gray-900 dark:text-white leading-snug line-clamp-2 break-words" title={name}>
          <span>{name}</span>
          {ingredient.modifier && (
            <span className="text-[11px] sm:text-xs text-gray-400 dark:text-gray-500 font-normal ml-1">
              ({ingredient.modifier.replace(/^\((.+)\)$/, '$1').trim()})
            </span>
          )}
        </div>

        {/* Amount in light gray (no kcal in card view) */}
        {displayAmount && (
          <div className="text-[11px] font-normal mt-0.5 truncate leading-tight">
            <span className="font-medium text-gray-500 dark:text-gray-400 tabular-nums truncate text-[11px]">
              {displayAmount}
            </span>
          </div>
        )}
      </div>

      {/* Chevron indicator */}
      <div className="shrink-0 ml-1 flex items-center text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300 group-hover:translate-x-0.5 transition-all">
        <ChevronRight className="w-3.5 h-3.5" />
      </div>
    </li>
  );
};

export default IngredientItemGrid;
