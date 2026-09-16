import React from 'react';
import { ShoppingCart, Package, CheckCheck, Trash2 } from 'lucide-react';
import { useI18n } from '../../context/I18nContext';
import { hapticSelection, hapticLight } from '../../utils/haptics';

interface ShoppingStickyHeaderProps {
  activeTab: 'shopping' | 'pantry';
  onTabChange: (tab: 'shopping' | 'pantry') => void;
  shoppingTotal: number;
  pantryActiveCount: number;
  isCollapsed: boolean;
  checkedCount: number;
  totalCount: number;
  progress: number;
  onClearChecked: () => void;
  onClearAll: () => void;
}

/**
 * Pinned sticky header for Shopping List and Pantry tabs.
 * Smoothly reveals a compact progress strip when scrolled down past the full progress card,
 * exactly matching the UX of RecipeDetails.
 */
export const ShoppingStickyHeader: React.FC<ShoppingStickyHeaderProps> = ({
  activeTab,
  onTabChange,
  shoppingTotal,
  pantryActiveCount,
  isCollapsed,
  checkedCount,
  totalCount,
  progress,
  onClearChecked,
  onClearAll,
}) => {
  const { t } = useI18n();

  return (
    <div
      id="shopping-sticky-header"
      className={`sticky top-[var(--app-sticky-top,0px)] z-30 -mx-4 px-4 bg-[#f8fafc]/95 dark:bg-gray-950/95 backdrop-blur-md transition-all duration-200 flex flex-col border-none pt-2 ${
        isCollapsed
          ? 'shadow-[0_4px_16px_rgba(0,0,0,0.04)] pb-2.5'
          : 'pb-1.5'
      }`}
    >
      {/* 1. Segmented Tab Control */}
      <div className="flex p-1 bg-gray-100 dark:bg-gray-800 rounded-2xl gap-1 border-none shadow-none">
        <button
          type="button"
          onClick={() => {
            if (activeTab !== 'shopping') {
              hapticSelection();
              onTabChange('shopping');
            }
          }}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 sm:px-4 rounded-xl text-xs sm:text-sm transition-all duration-200 min-h-[42px] cursor-pointer border-none outline-none ${
            activeTab === 'shopping'
              ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white font-bold shadow-[0_2px_6px_rgba(0,0,0,0.06)]'
              : 'bg-transparent text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white font-medium'
          }`}
        >
          <ShoppingCart className="w-4 h-4 shrink-0" />
          <span>{t('shopping.tabShoppingList')}</span>
          {shoppingTotal > 0 && (
            <span
              className={`text-[11px] px-2 py-0.5 rounded-full font-bold transition-colors ${
                activeTab === 'shopping'
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
              }`}
            >
              {shoppingTotal}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => {
            if (activeTab !== 'pantry') {
              hapticSelection();
              onTabChange('pantry');
            }
          }}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 sm:px-4 rounded-xl text-xs sm:text-sm transition-all duration-200 min-h-[42px] cursor-pointer border-none outline-none ${
            activeTab === 'pantry'
              ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white font-bold shadow-[0_2px_6px_rgba(0,0,0,0.06)]'
              : 'bg-transparent text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white font-medium'
          }`}
        >
          <Package className="w-4 h-4 shrink-0" />
          <span>{t('shopping.tabPantry')}</span>
          {pantryActiveCount > 0 && (
            <span
              className={`text-[11px] px-2 py-0.5 rounded-full font-bold transition-colors ${
                activeTab === 'pantry'
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
              }`}
            >
              {pantryActiveCount}
            </span>
          )}
        </button>
      </div>

      {/* 2. Collapsed Compact Progress Strip (smooth animated transition just like RecipeDetails) */}
      <div
        className={`overflow-hidden motion-safe:transition-all motion-safe:duration-200 ${
          isCollapsed && activeTab === 'shopping' && totalCount > 0
            ? 'max-h-20 opacity-100 pt-2'
            : 'max-h-0 opacity-0 pointer-events-none py-0'
        }`}
        aria-hidden={!isCollapsed}
      >
        <div className="bg-white dark:bg-gray-900 px-3.5 py-2 rounded-2xl border-none shadow-[0_2px_6px_rgba(0,0,0,0.03)] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <span className="text-xs font-bold text-gray-900 dark:text-white shrink-0 tabular-nums">
              {checkedCount}/{totalCount}
            </span>
            <div className="h-2 flex-1 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-[11px] text-gray-500 dark:text-gray-400 font-semibold tabular-nums shrink-0">
              {Math.round(progress)}%
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {checkedCount > 0 && (
              <button
                type="button"
                onClick={() => {
                  hapticLight();
                  onClearChecked();
                }}
                className="w-9 h-9 min-w-[36px] min-h-[36px] rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 active:scale-95 transition-all flex items-center justify-center cursor-pointer border-none"
                aria-label={t('shopping.clearChecked')}
              >
                <CheckCheck className="w-4.5 h-4.5" />
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                hapticLight();
                onClearAll();
              }}
              className="w-9 h-9 min-w-[36px] min-h-[36px] rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-400 hover:text-red-500 dark:hover:text-red-400 active:scale-95 transition-all flex items-center justify-center cursor-pointer border-none"
              aria-label={t('shopping.clearAll')}
            >
              <Trash2 className="w-4.5 h-4.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShoppingStickyHeader;
