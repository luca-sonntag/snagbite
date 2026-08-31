import { Check, Package, Home, CornerDownRight } from 'lucide-react';
import type { Ingredient } from '../../types';
import { useI18n } from '../../context/I18nContext';
import { getCategoryTheme } from '../../i18n';
import type { PantryStockMatch } from '../ShoppingList/shoppingItemUtils';
import IngredientIcon from '../IngredientIcon';

export interface MergedShoppingSheetItem {
  id: string;
  primaryIngredient: Ingredient;
  childIngredients: Ingredient[];
  groupCategory?: string;
  originalGroupIdx: number;
}

interface ShoppingConfirmItemProps {
  item: MergedShoppingSheetItem;
  isChecked: boolean;
  onToggle: () => void;
  formatAmount: (amount: number | undefined, unit: string | undefined) => string;
  groupCategory?: string;
  pantryStockMatch?: PantryStockMatch | null;
  pantryStock?: string | null;
}

export default function ShoppingConfirmItem({
  item,
  isChecked,
  onToggle,
  formatAmount,
  groupCategory,
  pantryStockMatch,
  pantryStock,
}: ShoppingConfirmItemProps) {
  const { t } = useI18n();
  const ing = item.primaryIngredient;
  const theme = getCategoryTheme(groupCategory || ing.category || '');
  const scaledAmount = formatAmount(ing.amount, ing.unit);
  const amountStr = scaledAmount ? `${scaledAmount}` : '';
  const unitStr = ing.unit ? ` ${ing.unit}` : '';
  const displayAmount = (amountStr || unitStr) ? `${amountStr}${unitStr}`.trim() : null;

  const stockFormatted = pantryStockMatch ? pantryStockMatch.formattedStock : pantryStock;
  const isPartial = pantryStockMatch ? pantryStockMatch.isPartial : false;
  const status = pantryStockMatch?.status ?? (isPartial ? 'deficit' : 'sufficient');

  const stockBadgeClasses = (() => {
    if (status === 'sufficient') {
      return isChecked
        ? 'bg-emerald-500/15 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300'
        : 'bg-emerald-500/[0.06] text-emerald-700/60 dark:bg-emerald-500/[0.08] dark:text-emerald-400/60';
    }
    if (status === 'low') {
      return isChecked
        ? 'bg-amber-500/15 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300'
        : 'bg-amber-500/[0.06] text-amber-700/60 dark:bg-amber-500/[0.08] dark:text-amber-400/60';
    }
    // deficit
    return isChecked
      ? 'bg-rose-500/15 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300'
      : 'bg-rose-500/[0.06] text-rose-700/60 dark:bg-rose-500/[0.08] dark:text-rose-400/60';
  })();

  return (
    <div
      onClick={onToggle}
      className="group flex items-center gap-3 py-2 px-2.5 rounded-2xl hover:bg-black/[0.03] dark:hover:bg-white/[0.03] active:scale-[0.99] transition-colors cursor-pointer select-none"
    >
      {/* Category color bar */}
      <span
        className={`w-1 h-4 rounded-full ${theme.barClass} shrink-0 opacity-80`}
        title={groupCategory || ing.category || undefined}
      />

      {/* Checkbox indicator */}
      <div
        className={`w-6 h-6 rounded-lg border-none flex items-center justify-center flex-shrink-0 transition-all ${
          isChecked
            ? 'bg-emerald-500 text-white shadow-xs'
            : 'bg-black/5 dark:bg-white/10 group-hover:bg-emerald-500/20'
        }`}
      >
        {isChecked && <Check className="w-3.5 h-3.5 stroke-[3px]" />}
      </div>

      {/* Ingredient Icon */}
      <IngredientIcon
        baseName={ing.baseName}
        canonicalId={ing.canonicalId}
        category={groupCategory || ing.category}
        name={ing.name}
        size="md"
        className={isChecked ? '' : 'opacity-40 grayscale'}
      />

      {/* Details */}
      <div className="flex-1 min-w-0 flex flex-col justify-center">
        {/* Name (always clean in line 1) */}
        <div className="flex items-baseline flex-wrap gap-x-1.5 min-w-0 text-sm font-medium text-gray-900 dark:text-white leading-snug">
          <span className={isChecked ? '' : 'text-gray-400 dark:text-gray-500'}>{ing.name}</span>
        </div>

        {/* Amount & Status Micro-Pills (Option 4) */}
        {(displayAmount || stockFormatted || ing.isStaple) && (
          <div className="flex items-center flex-wrap gap-1.5 mt-0.5">
            {displayAmount && (
              <span
                className={`text-xs font-semibold tabular-nums leading-normal transition-colors ${
                  isChecked
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-gray-400 dark:text-gray-500'
                }`}
              >
                {displayAmount}
              </span>
            )}

            {stockFormatted ? (
              <span
                className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-md border-none select-none transition-colors ${stockBadgeClasses}`}
              >
                <Package className="w-3 h-3 shrink-0 stroke-[2.2] opacity-80" />
                <span>
                  {isPartial
                    ? t('recipe.inPantryStockPartial', { amount: stockFormatted })
                    : t('recipe.inPantryStock', { amount: stockFormatted })}
                </span>
              </span>
            ) : ing.isStaple ? (
              <span
                className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-md border-none select-none transition-colors ${
                  isChecked
                    ? 'bg-black/5 dark:bg-white/10 text-gray-700 dark:text-gray-200'
                    : 'bg-black/[0.04] dark:bg-white/[0.06] text-gray-500 dark:text-gray-400'
                }`}
              >
                <Home className="w-3 h-3 shrink-0 stroke-[2.2] opacity-80" />
                <span>{t('recipe.staplePillLabel')}</span>
              </span>
            ) : null}
          </div>
        )}

        {/* Child / Derived ingredients tree structure (Option 3) */}
        {item.childIngredients.length > 0 && (
          <div className="flex flex-col gap-0.5 mt-1 pl-0.5">
            {item.childIngredients.map((child, cIdx) => {
              const childAmt = formatAmount(child.amount, child.unit);
              const childUnitStr = child.unit ? ` ${child.unit}` : '';
              const childDisplayAmt = (childAmt || childUnitStr) ? `${childAmt}${childUnitStr}`.trim() : null;

              return (
                <div
                  key={cIdx}
                  className={`flex items-center gap-1.5 text-[11px] font-medium transition-colors ${
                    isChecked
                      ? 'text-gray-500 dark:text-gray-400'
                      : 'text-gray-400 dark:text-gray-500 opacity-60'
                  }`}
                >
                  <CornerDownRight className="w-3 h-3 shrink-0 text-gray-400 dark:text-gray-500 stroke-[2.2] opacity-70" />
                  <span>
                    {child.name}
                    {childDisplayAmt ? `: ${childDisplayAmt}` : ''}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
