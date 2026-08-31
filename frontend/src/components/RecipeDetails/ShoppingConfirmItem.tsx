import { Check, Package } from 'lucide-react';
import type { Ingredient } from '../../types';
import { useI18n } from '../../context/I18nContext';
import { getCategoryTheme } from '../../i18n';
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
  pantryStock: string | null;
}

export default function ShoppingConfirmItem({
  item,
  isChecked,
  onToggle,
  formatAmount,
  groupCategory,
  pantryStock,
}: ShoppingConfirmItemProps) {
  const { t } = useI18n();
  const ing = item.primaryIngredient;
  const theme = getCategoryTheme(groupCategory || ing.category || '');
  const scaledAmount = formatAmount(ing.amount, ing.unit);
  const amountStr = scaledAmount ? `${scaledAmount}` : '';
  const unitStr = ing.unit ? ` ${ing.unit}` : '';
  const displayAmount = (amountStr || unitStr) ? `${amountStr}${unitStr}`.trim() : null;

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

        {/* Amount & Status (Pantry Stock or Staple in line 2) */}
        {(displayAmount || pantryStock || ing.isStaple) && (
          <div className="flex items-baseline flex-wrap gap-x-1.5 mt-0.5">
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

            {pantryStock ? (
              <span
                className={`text-[11px] font-medium transition-colors inline-flex items-center gap-1 ${
                  isChecked
                    ? 'text-amber-700 dark:text-amber-300'
                    : 'text-amber-600/75 dark:text-amber-400/75'
                }`}
              >
                {displayAmount && <span className="opacity-40 font-normal">·</span>}
                <Package
                  className={`w-3 h-3 shrink-0 stroke-[2.2] ${
                    isChecked
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-amber-600/70 dark:text-amber-400/70'
                  }`}
                />
                <span>{t('recipe.inPantryStock', { amount: pantryStock })}</span>
              </span>
            ) : ing.isStaple ? (
              <span
                className={`text-[11px] font-medium transition-colors inline-flex items-center gap-1 ${
                  isChecked
                    ? 'text-gray-500 dark:text-gray-400'
                    : 'text-gray-400 dark:text-gray-500'
                }`}
              >
                {displayAmount && <span className="opacity-40 font-normal">·</span>}
                <span>{t('recipe.staplePillLabel')}</span>
              </span>
            ) : null}
          </div>
        )}

        {/* Child ingredients */}
        {item.childIngredients.length > 0 && (
          <div className="text-[11px] font-medium text-gray-500 dark:text-gray-400 mt-1 flex flex-wrap gap-1">
            {item.childIngredients.map((child, cIdx) => {
              const childAmt = formatAmount(child.amount, child.unit);
              return (
                <span
                  key={cIdx}
                  className="bg-emerald-500/10 dark:bg-emerald-400/15 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-lg text-[10px] font-medium"
                >
                  + {child.name}{childAmt ? ` (${childAmt} ${child.unit || ''})` : ''}
                </span>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
