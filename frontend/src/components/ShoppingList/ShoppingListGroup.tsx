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
    <div className="rounded-2xl md:rounded-3xl bg-white dark:bg-gray-900 shadow-[0_2px_6px_rgba(0,0,0,0.03)] border-none p-3 sm:p-4 transition-all flex flex-col gap-0">
      {groupedCategories.map((group, index) => {
        const isGroupCollapsing = collapsingKeys.has(`group-${group.category}`);
        const theme = getCategoryTheme(group.category);

        return (
          <div
            key={group.category}
            className={`flex flex-col transition-all ${
              index > 0 ? 'pt-1.5' : ''
            } ${
              isGroupCollapsing ? 'animate-group-collapse' : 'animate-group-expand'
            }`}
          >
            {/* Category Header */}
            <div className="flex items-center justify-between gap-2 px-2 pt-0.5 pb-0.5">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className={`w-1 h-3.5 rounded-full ${theme.barClass} shrink-0`} />
                <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 truncate">
                  {translateCategory(group.category)}
                </span>
                <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">
                  {group.items.length}
                </span>
              </div>

              <button
                type="button"
                onClick={() => onGroupHeaderClick(group.items)}
                aria-label={t('shopping.checkGroup', { defaultValue: 'Gruppe abhaken' })}
                title={t('shopping.checkGroup', { defaultValue: 'Alle in dieser Kategorie abhaken' })}
                className="w-7 h-7 min-w-[28px] min-h-[28px] flex items-center justify-center rounded-lg bg-black/5 dark:bg-white/5 hover:bg-emerald-500/15 hover:text-emerald-600 dark:hover:text-emerald-400 text-gray-500 dark:text-gray-400 transition-all cursor-pointer active:scale-95 flex-shrink-0 border-none"
              >
                <CheckCheck className="w-3.5 h-3.5" />
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
