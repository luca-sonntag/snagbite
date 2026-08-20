import { useState, useMemo } from 'react';
import { Check, Trash2, ChevronDown } from 'lucide-react';
import type { AggregatedShoppingItem } from '../../types';
import { useI18n } from '../../context/I18nContext';
import { getCategoryTheme } from '../../i18n';

interface ShoppingListItemProps {
  item: AggregatedShoppingItem;
  isChecked: boolean;
  isCheckingOff?: boolean;
  isCollapsing?: boolean;
  onClick: () => void;
  onDelete: () => void;
  formatItemAmount: (amount: number, unit: string) => string;
}

export default function ShoppingListItem({
  item,
  isChecked,
  isCheckingOff = false,
  isCollapsing = false,
  onClick,
  onDelete,
  formatItemAmount
}: ShoppingListItemProps) {
  const { t } = useI18n();
  const [showSources, setShowSources] = useState(false);
  const amountStr = formatItemAmount(item.amount, item.unit);
  const sourceCount = item.sources?.length ?? 0;
  const hasMultipleSources = sourceCount > 1;

  const animationClass = isCollapsing ? 'animate-item-collapse' : 'animate-item-expand';

  // Smart structural deduplication for sub-items and modifiers (100% language-agnostic):
  // Uses baseName matching from ingredient taxonomy and accumulates modifier amounts cleanly.
  const extraNote = useMemo(() => {
    const mainBaseName = (item.baseName || item.name || '').toLowerCase().trim();

    if (item.subItems && item.subItems.length > 0) {
      const notes: string[] = [];
      const modifierAmounts = new Map<string, { totalAmount: number; unit: string; mod: string }>();

      for (const sub of item.subItems) {
        const subRawName = (sub.rawName || sub.name || '').trim();
        const subBaseName = (sub.baseName || subRawName).toLowerCase().trim();

        // Structural check: is subItem a distinct ingredient type (e.g. Eigelb vs Ei)?
        const isDistinctName =
          subBaseName &&
          subBaseName !== mainBaseName &&
          (!item.parentIngredient || subBaseName !== item.parentIngredient.baseName.toLowerCase().trim());

        const mod = sub.modifier?.trim();

        if (isDistinctName) {
          const amtStr = formatItemAmount(sub.amount, sub.unit);
          const modStr = mod ? ` (${mod})` : '';
          notes.push(`${amtStr ? `${amtStr} ` : ''}${subRawName}${modStr}`);
        } else if (mod) {
          // Accumulate amounts for identical modifiers (e.g. gerieben, Saft von)
          const key = `${mod.toLowerCase()}|${sub.unit.toLowerCase()}`;
          const existing = modifierAmounts.get(key);
          if (existing) {
            existing.totalAmount += sub.amount;
          } else {
            modifierAmounts.set(key, { totalAmount: sub.amount, unit: sub.unit, mod });
          }
        }
      }

      // Add accumulated modifier notes (amount omitted: modifier applies to the item regardless of subset)
      modifierAmounts.forEach(({ mod }) => {
        notes.push(mod);
      });

      const result = Array.from(new Set(notes.filter(Boolean))).join(', ');
      if (result) return result;
    }

    if (item.modifier) {
      return item.modifier.trim() || null;
    }

    return null;
  }, [item, amountStr, formatItemAmount]);

  // Compact, dimmed row used inside the "Erledigt" drawer.
  if (isChecked) {
    const theme = getCategoryTheme(item.category || '');

    return (
      <li className={`rounded-xl hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors group ${animationClass}`}>
        <div className="flex items-center justify-between gap-2 py-1.5 px-2 min-h-[40px]">
          <button
            type="button"
            onClick={onClick}
            className="flex items-center gap-2.5 cursor-pointer flex-1 min-w-0 text-left outline-none"
            aria-label={t('shopping.restoreItem')}
          >
            {/* Category color indicator pill on the left */}
            <span
              className={`w-1 h-4 rounded-full ${theme.barClass} shrink-0 opacity-80`}
              title={item.category || undefined}
            />

            <span className="w-5 h-5 rounded-md bg-emerald-500/15 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0 transition-colors">
              <Check className="w-3.5 h-3.5 stroke-[2.5]" />
            </span>
            {amountStr && (
              <span className="flex-shrink-0 bg-black/5 dark:bg-white/5 text-gray-400 dark:text-gray-500 font-semibold tabular-nums rounded-md px-1.5 py-0.5 text-[11px] whitespace-nowrap line-through opacity-70">
                {amountStr}
              </span>
            )}
            <span className="text-sm text-gray-400 dark:text-gray-500 line-through min-w-0 leading-tight flex flex-wrap items-baseline gap-x-1.5">
              <span className="break-words">{item.name}</span>
              {extraNote && (
                <span className="text-xs font-normal opacity-70">
                  {extraNote}
                </span>
              )}
            </span>
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="w-7 h-7 flex items-center justify-center text-gray-300 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-all cursor-pointer flex-shrink-0"
            aria-label={t('shopping.deleteItem')}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </li>
    );
  }

  // Active (to-buy) row — big tap target, amount as a scannable chip.
  return (
    <li className={`rounded-xl hover:bg-black/[0.03] dark:hover:bg-white/[0.03] transition-colors group ${animationClass}`}>
      <div className="flex items-center justify-between gap-2 py-1.5 px-2 min-h-[40px]">
        <button
          type="button"
          onClick={onClick}
          className="flex items-center gap-2.5 cursor-pointer flex-1 min-w-0 text-left outline-none"
          aria-label={item.name}
        >
          {isCheckingOff ? (
            <span className="w-5 h-5 rounded-md bg-emerald-500/15 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0 transition-all duration-200 scale-105">
              <Check className="w-3.5 h-3.5 stroke-[2.5]" />
            </span>
          ) : (
            <span className="w-5 h-5 rounded-md border-2 border-black/15 dark:border-white/20 group-hover:border-emerald-500/60 flex items-center justify-center flex-shrink-0 transition-colors" />
          )}

          {amountStr && (
            <span
              className={`flex-shrink-0 tabular-nums rounded-md px-1.5 py-0.5 text-[11px] whitespace-nowrap transition-all duration-200 ${
                isCheckingOff
                  ? 'bg-black/5 dark:bg-white/5 text-gray-400 dark:text-gray-500 font-semibold line-through opacity-70'
                  : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold'
              }`}
            >
              {amountStr}
            </span>
          )}

          <span
            className={`text-sm min-w-0 leading-tight flex flex-wrap items-baseline gap-x-1.5 transition-all duration-200 ${
              isCheckingOff
                ? 'text-gray-400 dark:text-gray-500 line-through'
                : 'font-medium text-gray-800 dark:text-gray-100'
            }`}
          >
            <span className="break-words">{item.name}</span>
            {extraNote && (
              <span
                className={`text-xs font-normal ${
                  isCheckingOff ? 'opacity-70' : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                {extraNote}
              </span>
            )}
          </span>
        </button>

        <div className="flex items-center flex-shrink-0 gap-1">
          {hasMultipleSources && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowSources((s) => !s);
              }}
              className="inline-flex items-center gap-1 pl-2 pr-1.5 h-6 rounded-full text-[10px] font-semibold text-gray-500 dark:text-gray-400 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-all cursor-pointer"
              aria-label={t('shopping.recipeCount', { count: sourceCount })}
              aria-expanded={showSources}
            >
              <span>{t('shopping.recipeCount', { count: sourceCount })}</span>
              <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${showSources ? 'rotate-180' : ''}`} />
            </button>
          )}
          <button
            type="button"
            onClick={onDelete}
            className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-red-500 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-all cursor-pointer flex-shrink-0"
            aria-label={t('shopping.deleteItem')}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Per-recipe breakdown — only rendered for merged items and only when expanded */}
      {hasMultipleSources && showSources && (
        <div className="pl-[38px] pr-3 pb-2 -mt-0.5 flex flex-col gap-1 animate-item-expand">
          {item.sources.map((src, sIdx) => (
            <div
              key={sIdx}
              className="flex items-center justify-between gap-2 text-[11px] text-gray-500 dark:text-gray-400"
            >
              <span className="truncate">{src.recipeTitle || t('shopping.manual')}</span>
              {src.amount > 0 && (
                <span className="flex-shrink-0 font-medium tabular-nums opacity-80">
                  {formatItemAmount(src.amount, src.unit)}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </li>
  );
}

