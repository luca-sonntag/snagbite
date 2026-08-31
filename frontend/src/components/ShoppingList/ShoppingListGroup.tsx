import { CheckCheck } from 'lucide-react';
import type { AggregatedShoppingItem } from '../../types';
import { translateCategory, getCategoryTheme } from '../../i18n';
import { useI18n } from '../../context/I18nContext';
import { usePantry } from '../../context/PantryContext';
import ShoppingListItem from './ShoppingListItem';
import { findPantryStockMatch } from './shoppingItemUtils';

interface ShoppingListGroupProps {
  groupedCategories: Array<{ category: string; items: AggregatedShoppingItem[] }>;
  getItemKey: (item: AggregatedShoppingItem) => string;
  onItemToggle: (item: AggregatedShoppingItem) => void;
  onGroupHeaderClick: (items: AggregatedShoppingItem[]) => void;
  onDelete: (item: AggregatedShoppingItem) => void;
  formatItemAmount: (amount: number, unit: string) => string;
  collapsingKeys: Set<string>;
  checkingKeys?: Set<string>;
}

/**
 * Renders the active (still-to-buy) shopping list as aisle sections, ordered by
 * the supermarket category order. Checked items live in the separate "Erledigt"
 * drawer, so every item shown here is unchecked.
 */
export default function ShoppingListGroup({
  groupedCategories,
  getItemKey,
  onItemToggle,
  onGroupHeaderClick,
  onDelete,
  formatItemAmount,
  collapsingKeys,
  checkingKeys
}: ShoppingListGroupProps) {
  const { t } = useI18n();
  const { pantryItems } = usePantry();

  if (groupedCategories.length === 0) return null;

  return (
    <div className="flex flex-col gap-4">
      {groupedCategories.map((group) => {
        const theme = getCategoryTheme(group.category);

        return (
          <div
            key={group.category}
            className="flex flex-col gap-1.5 bg-black/[0.02] dark:bg-white/[0.02] rounded-2xl p-2.5 sm:p-3"
          >
            {/* Category Header */}
            <div className="flex items-center justify-between gap-2 px-1 pb-1">
              <div className="flex items-center gap-2 min-w-0">
                <span className={`w-1.5 h-4 rounded-full ${theme.barClass}`} />
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 truncate">
                  {translateCategory(group.category)}
                </span>
                <span className="text-[11px] text-gray-400 dark:text-gray-500 font-medium">
                  {group.items.length}
                </span>
              </div>

              <button
                type="button"
                onClick={() => onGroupHeaderClick(group.items)}
                aria-label={t('shopping.checkGroup', { defaultValue: 'Gruppe abhaken' })}
                title={t('shopping.checkGroup', { defaultValue: 'Alle in dieser Kategorie abhaken' })}
                className="w-9 h-9 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-xl bg-black/5 dark:bg-white/5 hover:bg-emerald-500/15 hover:text-emerald-600 dark:hover:text-emerald-400 text-gray-500 dark:text-gray-400 transition-all cursor-pointer active:scale-95 flex-shrink-0 border-none"
              >
                <CheckCheck className="w-4 h-4" />
              </button>
            </div>
            <ul className="flex flex-col gap-0.5">
              {group.items.map((item) => {
                const displayKey = `unchecked-${getItemKey(item)}`;
                const pantryStockMatch = findPantryStockMatch(item, pantryItems);

                return (
                  <ShoppingListItem
                    key={displayKey}
                    item={item}
                    isChecked={false}
                    isCheckingOff={checkingKeys?.has(displayKey)}
                    isCollapsing={collapsingKeys.has(displayKey)}
                    pantryStockMatch={pantryStockMatch}
                    onClick={() => onItemToggle(item)}
                    onDelete={() => onDelete(item)}
                    formatItemAmount={formatItemAmount}
                  />
                );
              })}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
