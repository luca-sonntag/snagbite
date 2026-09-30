import React from 'react';
import { ShoppingCart, Package } from 'lucide-react';
import { useI18n } from '../../context/I18nContext';
import { hapticSelection } from '../../utils/haptics';

interface ShoppingSegmentedTabsProps {
  activeTab: 'shopping' | 'pantry';
  onTabChange: (tab: 'shopping' | 'pantry') => void;
  shoppingTotal: number;
  pantryActiveCount: number;
}

export const ShoppingSegmentedTabs: React.FC<ShoppingSegmentedTabsProps> = ({
  activeTab,
  onTabChange,
  shoppingTotal,
  pantryActiveCount,
}) => {
  const { t } = useI18n();

  return (
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
  );
};

export default ShoppingSegmentedTabs;
