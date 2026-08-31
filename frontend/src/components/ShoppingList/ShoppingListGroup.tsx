import { CheckCheck } from 'lucide-react';
import type { AggregatedShoppingItem } from '../../types';
import { translateCategory, getCategoryTheme } from '../../i18n';
import { useI18n } from '../../context/I18nContext';
import { usePantry } from '../../context/PantryContext';
import ShoppingListItem from './ShoppingListItem';
import { findPantryStock } from './shoppingItemUtils';

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
    <div className="rounded-2xl md:rounded-3xl bg-white dark:bg-gray-900 shadow-[0_2px_6px_rgba(0,0,0,0.03)] border-none p-3 sm:p-4 transition-all flex flex-col gap-2">
      {groupedCategories.map((group) => {
        const isGroupCollapsing = collapsingKeys.has(`group-${group.category}`);
        const theme = getCategoryTheme(group.category);
        const openCount = group.items.length;

        return (
          <div
            key={group.category}
            className={`flex flex-col transition-all ${
              isGroupCollapsing ? 'animate-group-collapse' : 'animate-group-expand'
            }`}
          >
            <div className="flex items-center justify-between gap-2 px-2 pt-1 pb-0.5">
              <div className="flex flex-col gap-1 select-none flex-1 min-w-0 text-left">
                <div className={`w-8 h-1 rounded-full ${theme.barClass}`} />
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-900 dark:text-gray-100 truncate">
                    {translateCategory(group.category)}
                  </span>
                  <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium leading-none mt-0.5">
                    {openCount} {t('shopping.toBuyCount', { defaultValue: 'offen' })}
                  </span>
                </div>
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
                const pantryStock = findPantryStock(item, pantryItems);

                return (
                  <ShoppingListItem
                    key={displayKey}
                    item={item}
                    isChecked={false}
                    isCheckingOff={checkingKeys?.has(displayKey)}
                    isCollapsing={collapsingKeys.has(displayKey)}
                    pantryStockStr={pantryStock || undefined}
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
