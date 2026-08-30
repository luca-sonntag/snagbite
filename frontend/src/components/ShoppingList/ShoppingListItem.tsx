import { useState, useMemo } from 'react';
import { Check, Trash2, ChevronDown } from 'lucide-react';
import type { AggregatedShoppingItem } from '../../types';
import { useI18n } from '../../context/I18nContext';
import { getCategoryTheme } from '../../i18n';
import IngredientIcon from '../IngredientIcon';
import { hapticLight, hapticHeavy } from '../../utils/haptics';
import { extractExtraNote, getPackageRecommendation } from './shoppingItemUtils';

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
  formatItemAmount,
}: ShoppingListItemProps) {
  const { t } = useI18n();
  const [showSources, setShowSources] = useState(false);
  const amountStr = formatItemAmount(item.amount, item.unit);
  const sourceCount = item.sources?.length ?? 0;
  const hasMultipleSources = sourceCount > 1;

  const animationClass = isCollapsing ? 'animate-item-collapse' : 'animate-item-expand';
  const extraNote = useMemo(
    () => extractExtraNote(item, formatItemAmount),
    [item, formatItemAmount]
  );

  const packageRecommendation = useMemo(
    () => getPackageRecommendation(item.amount, item.unit, item.typicalPackageAmount, item.typicalPackageUnit),
    [item.amount, item.unit, item.typicalPackageAmount, item.typicalPackageUnit]
  );

  // Compact, dimmed row used inside the "Erledigt" drawer.
  if (isChecked) {
    const theme = getCategoryTheme(item.category || '');

    return (
      <li className={`rounded-xl hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors group ${animationClass}`}>
        <div className="flex items-center justify-between gap-2 py-2 px-2 min-h-[44px]">
          <button
            type="button"
            onClick={() => {
              hapticLight();
              onClick();
            }}
            className="flex items-center gap-3 cursor-pointer flex-1 min-w-0 text-left outline-none border-none bg-transparent"
            aria-label={t('shopping.restoreItem')}
          >
            <span
              className={`w-1 h-4 rounded-full ${theme.barClass} shrink-0 opacity-80`}
              title={item.category || undefined}
            />

            <span className="w-5 h-5 rounded-md bg-emerald-500/15 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0 transition-colors">
              <Check className="w-3.5 h-3.5 stroke-[2.5]" />
            </span>

            <IngredientIcon
              baseName={item.baseName}
              canonicalId={item.canonicalId}
              category={item.category}
              name={item.name}
              size="md"
              className="opacity-40 grayscale"
            />

            <div className="flex-1 min-w-0 flex flex-col justify-center">
              <div className="flex items-baseline flex-wrap gap-x-1.5 min-w-0 text-sm text-gray-400 dark:text-gray-500 line-through leading-snug">
                <span className="break-words [overflow-wrap:anywhere]">{item.name}</span>
                {extraNote && (
                  <span className="text-xs font-normal opacity-70 text-gray-500 dark:text-gray-400">
                    {extraNote}
                  </span>
                )}
              </div>

              {amountStr && (
                <div className="text-xs text-gray-400 dark:text-gray-500 font-semibold tabular-nums line-through opacity-70 mt-0.5">
                  {amountStr}
                </div>
              )}
            </div>
          </button>
          <button
            type="button"
            onClick={() => {
              hapticHeavy();
              onDelete();
            }}
            className="w-9 h-9 min-w-[36px] min-h-[36px] flex items-center justify-center text-gray-300 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-all cursor-pointer flex-shrink-0 border-none"
            aria-label={t('shopping.deleteItem')}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </li>
    );
  }

  // Active (to-buy) row — big tap target with stacked name and amount.
  return (
    <li className={`rounded-xl hover:bg-black/[0.03] dark:hover:bg-white/[0.03] transition-colors group ${animationClass}`}>
      <div className="flex items-center justify-between gap-2 py-2 px-2 min-h-[44px]">
        <button
          type="button"
          onClick={() => {
            hapticLight();
            onClick();
          }}
          className="flex items-center gap-3 cursor-pointer flex-1 min-w-0 text-left outline-none border-none bg-transparent"
          aria-label={item.name}
        >
          {isCheckingOff ? (
            <span className="w-5 h-5 rounded-md bg-emerald-500/15 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0 transition-all duration-200 scale-105">
              <Check className="w-3.5 h-3.5 stroke-[2.5]" />
            </span>
          ) : (
            <span className="w-5 h-5 rounded-md bg-black/5 dark:bg-white/10 group-hover:bg-emerald-500/20 border-none flex items-center justify-center flex-shrink-0 transition-colors" />
          )}

          <IngredientIcon
            baseName={item.baseName}
            canonicalId={item.canonicalId}
            category={item.category}
            name={item.name}
            size="md"
            className={isCheckingOff ? 'opacity-40 grayscale' : ''}
          />

          <div className="flex-1 min-w-0 flex flex-col justify-center">
            {/* 1. Name oben */}
            <div className="flex items-baseline flex-wrap gap-x-1.5 min-w-0 text-sm font-medium text-gray-900 dark:text-white leading-snug">
              <span className={`break-words [overflow-wrap:anywhere] ${isCheckingOff ? 'text-gray-400 dark:text-gray-500 line-through' : ''}`}>
                {item.name}
              </span>
              {extraNote && (
                <span
                  className={`text-xs font-normal ${
                    isCheckingOff ? 'opacity-70 text-gray-400 dark:text-gray-500' : 'text-gray-500 dark:text-gray-400'
                  }`}
                >
                  {extraNote}
                </span>
              )}
            </div>

            {/* 2. Menge & Packungsgröße */}
            <div className="flex items-baseline flex-wrap gap-x-1.5 mt-0.5">
              {packageRecommendation ? (
                <>
                  <span
                    className={`text-xs font-semibold tabular-nums leading-normal transition-all duration-200 ${
                      isCheckingOff
                        ? 'text-gray-400 dark:text-gray-500 font-semibold line-through opacity-70'
                        : 'text-emerald-600 dark:text-emerald-400'
                    }`}
                  >
                    {packageRecommendation}
                  </span>
                  {amountStr && (
                    <span
                      className={`text-[11px] font-medium transition-all duration-200 ${
                        isCheckingOff
                          ? 'text-gray-400 dark:text-gray-500 line-through opacity-60'
                          : 'text-gray-500 dark:text-gray-400'
                      }`}
                    >
                      · {t('shopping.recipeNeed', { amount: amountStr })}
                    </span>
                  )}
                </>
              ) : amountStr ? (
                <div
                  className={`text-xs font-semibold tabular-nums leading-normal transition-all duration-200 ${
                    isCheckingOff
                      ? 'text-gray-400 dark:text-gray-500 font-semibold line-through opacity-70'
                      : 'text-emerald-600 dark:text-emerald-400'
                  }`}
                >
                  {amountStr}
                </div>
              ) : null}
            </div>
          </div>
        </button>

        <div className="flex items-center flex-shrink-0 gap-1">
          {hasMultipleSources && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                hapticLight();
                setShowSources((s) => !s);
              }}
              className="inline-flex items-center gap-1 pl-2 pr-1.5 h-6 rounded-full text-[10px] font-semibold text-gray-500 dark:text-gray-400 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-all cursor-pointer border-none"
              aria-label={t('shopping.recipeCount', { count: sourceCount })}
              aria-expanded={showSources}
            >
              <span>{t('shopping.recipeCount', { count: sourceCount })}</span>
              <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${showSources ? 'rotate-180' : ''}`} />
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              hapticHeavy();
              onDelete();
            }}
            className="w-9 h-9 min-w-[36px] min-h-[36px] flex items-center justify-center text-gray-400 hover:text-red-500 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-all cursor-pointer flex-shrink-0 border-none"
            aria-label={t('shopping.deleteItem')}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Expandable recipe sources breakdown */}
      {hasMultipleSources && showSources && (
        <div className="ml-10 mr-3 mb-2 pt-1 border-t border-black/5 dark:border-white/5 flex flex-col gap-1 text-[11px] text-gray-500 dark:text-gray-400 animate-fade-in">
          {item.sources.map((source, idx) => {
            const sAmount = formatItemAmount(source.amount, source.unit);
            return (
              <div key={idx} className="flex items-center justify-between py-0.5">
                <span className="truncate max-w-[200px]">{source.recipeTitle || t('shopping.manual')}</span>
                <span className="font-semibold tabular-nums text-gray-700 dark:text-gray-300 shrink-0 ml-2">
                  {sAmount}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </li>
  );
}
