import React from 'react';
import { AlertCircle, CheckCheck, Trash2 } from 'lucide-react';
import type { AggregatedShoppingItem, PantryItem } from '../../types';
import { useI18n } from '../../context/I18nContext';
import { hapticLight, hapticHeavy } from '../../utils/haptics';
import ShoppingListItem from './ShoppingListItem';
import { findPantryStock } from './shoppingItemUtils';

interface ShoppingInPantryCardProps {
  inPantryItems: AggregatedShoppingItem[];
  pantryItems: PantryItem[];
  collapsingKeys: Set<string>;
  checkingKeys: Set<string>;
  getItemKey: (item: AggregatedShoppingItem) => string;
  onItemToggle: (item: AggregatedShoppingItem) => void;
  onGroupHeaderClick: (items: AggregatedShoppingItem[]) => void;
  onClearInPantry: () => void;
  onDeleteItem: (item: AggregatedShoppingItem) => void;
  formatItemAmount: (amount: number, unit: string) => string;
}

export const ShoppingInPantryCard: React.FC<ShoppingInPantryCardProps> = ({
  inPantryItems,
  pantryItems,
  collapsingKeys,
  checkingKeys,
  getItemKey,
  onItemToggle,
  onGroupHeaderClick,
  onClearInPantry,
  onDeleteItem,
  formatItemAmount,
}) => {
  const { t } = useI18n();

  if (!inPantryItems || inPantryItems.length === 0) return null;

  return (
    <div className="p-4 sm:p-5 bg-amber-500/10 dark:bg-amber-500/15 rounded-3xl border-none shadow-[0_2px_8px_rgba(0,0,0,0.03)] space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0">
            <AlertCircle className="w-4.5 h-4.5" />
          </div>
          <div className="min-w-0">
            <h4 className="font-bold text-xs sm:text-sm text-amber-900 dark:text-amber-200 leading-snug">
              {t('shopping.inPantrySection')}
            </h4>
            <p className="text-[11px] text-amber-800/80 dark:text-amber-300/80 mt-0.5">
              {t('shopping.inPantrySubtitle')}
            </p>
          </div>
        </div>

        {/* Header Actions for In Pantry Section */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => {
              hapticLight();
              onGroupHeaderClick(inPantryItems);
            }}
            aria-label={t('shopping.checkAll')}
            title={t('shopping.checkAll')}
            className="h-8 px-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-800 dark:text-amber-200 active:scale-95 transition-all text-xs font-semibold flex items-center gap-1.5 cursor-pointer border-none"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            <span>{t('shopping.checkAll')}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              hapticHeavy();
              onClearInPantry();
            }}
            aria-label={t('shopping.clearInPantryBtn')}
            title={t('shopping.clearInPantryBtn')}
            className="w-8 h-8 rounded-xl bg-amber-500/20 hover:bg-rose-500/20 text-amber-800 dark:text-amber-200 hover:text-rose-600 dark:hover:text-rose-400 active:scale-95 transition-all flex items-center justify-center cursor-pointer border-none"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Items List (Direct flat list without fake category header, with category color bars) */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl p-2 border-none shadow-xs">
        <ul className="space-y-0.5 divide-y divide-gray-100 dark:divide-gray-800">
          {inPantryItems.map((item) => {
            const key = getItemKey(item);
            const isCollapsing = collapsingKeys.has(key);
            const isCheckingOff = checkingKeys.has(key);
            const pantryStock = findPantryStock(item, pantryItems);

            return (
              <ShoppingListItem
                key={key}
                item={item}
                isChecked={false}
                isCheckingOff={isCheckingOff}
                isCollapsing={isCollapsing}
                showCategoryIndicator={true}
                pantryStockStr={pantryStock || undefined}
                onClick={() => onItemToggle(item)}
                onDelete={() => onDeleteItem(item)}
                formatItemAmount={formatItemAmount}
              />
            );
          })}
        </ul>
      </div>
    </div>
  );
};

export default ShoppingInPantryCard;
