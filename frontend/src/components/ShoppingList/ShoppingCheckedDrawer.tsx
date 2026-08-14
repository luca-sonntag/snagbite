import { useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import type { AggregatedShoppingItem } from '../../types';
import { useI18n } from '../../context/I18nContext';
import ShoppingListItem from './ShoppingListItem';

interface ShoppingCheckedDrawerProps {
  items: AggregatedShoppingItem[];
  getItemKey: (item: AggregatedShoppingItem) => string;
  onItemToggle: (item: AggregatedShoppingItem) => void;
  onDelete: (item: AggregatedShoppingItem) => void;
  formatItemAmount: (amount: number, unit: string) => string;
  collapsingKeys: Set<string>;
}

/**
 * Collapsible "Erledigt" container holding completed items.
 * Defaulted to collapsed to keep the primary view focused on open items.
 */
export default function ShoppingCheckedDrawer({
  items,
  getItemKey,
  onItemToggle,
  onDelete,
  formatItemAmount,
  collapsingKeys
}: ShoppingCheckedDrawerProps) {
  const { t } = useI18n();
  const [isExpanded, setIsExpanded] = useState(false);

  if (items.length === 0) return null;

  return (
    <div className="rounded-2xl md:rounded-3xl bg-white dark:bg-gray-900 shadow-[0_2px_6px_rgba(0,0,0,0.03)] border-none overflow-hidden transition-all">
      <button
        type="button"
        onClick={() => setIsExpanded((prev) => !prev)}
        aria-expanded={isExpanded}
        className="flex items-center justify-between gap-2.5 w-full px-4 py-3 text-left select-none hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors cursor-pointer outline-none"
      >
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <span className="w-6 h-6 rounded-lg bg-emerald-500/10 dark:bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
            <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 stroke-[2.5]" />
          </span>
          <span className="text-sm font-bold text-gray-700 dark:text-gray-200 truncate">
            {t('shopping.doneCount', { count: items.length })}
          </span>
        </div>
        <div className="flex items-center flex-shrink-0 text-gray-400 dark:text-gray-500">
          <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {isExpanded && (
        <ul className="flex flex-col gap-0.5 px-2 pb-2.5 pt-0.5 animate-fade-in divide-y divide-black/[0.03] dark:divide-white/[0.03]">
          {items.map((item) => {
            const displayKey = `checked-${getItemKey(item)}`;
            return (
              <ShoppingListItem
                key={displayKey}
                item={item}
                isChecked
                isCollapsing={collapsingKeys.has(displayKey)}
                onClick={() => onItemToggle(item)}
                onDelete={() => onDelete(item)}
                formatItemAmount={formatItemAmount}
              />
            );
          })}
        </ul>
      )}
    </div>
  );
}

