import { useState } from 'react';
import { ShoppingCart, Package } from 'lucide-react';
import type { AggregatedShoppingItem, ShoppingListItem, SavedRecipe } from '../../types';
import { useI18n } from '../../context/I18nContext';
import { usePantry } from '../../context/PantryContext';
import { hapticSelection } from '../../utils/haptics';
import { PageHeader } from '../PageHeader';
import { ShoppingListView } from './ShoppingListView';
import { PantryView } from '../Pantry/PantryView';

interface ActiveShoppingRecipe {
  recipeId: string;
  recipeTitle: string;
  totalItems: number;
  checkedItems: number;
}

interface ShoppingListProps {
  shoppingList?: ShoppingListItem[];
  aggregatedList: {
    toBuy?: AggregatedShoppingItem[];
    inPantry?: AggregatedShoppingItem[];
    unchecked?: AggregatedShoppingItem[];
    checked: AggregatedShoppingItem[];
  };
  activeRecipes?: ActiveShoppingRecipe[];
  history?: SavedRecipe[];
  onSelectRecipe?: (jobId: string) => void;
  onRemoveRecipe?: (recipeId: string) => void;
  addCustomItem: (name: string, amount: number, unit: string) => void;
  toggleItemIds?: (itemIds: string[], targetChecked: boolean) => void;
  deleteItemIds?: (itemIds: string[]) => void;
  toggleItemGroup: (name: string, modifier: string | undefined, unit: string, targetChecked: boolean) => void;
  deleteItemGroup: (name: string, modifier: string | undefined, unit: string) => void;
  clearAll: () => void;
  clearChecked: () => void;
  restoreItems?: (items: ShoppingListItem[]) => void;
  restoreList?: (items: ShoppingListItem[]) => void;
}

export default function ShoppingList(props: ShoppingListProps) {
  const { t } = useI18n();
  const { pantryItems } = usePantry();
  const [activeTab, setActiveTab] = useState<'shopping' | 'pantry'>('shopping');

  const toBuyCount = (props.aggregatedList.toBuy || props.aggregatedList.unchecked || []).length;
  const inPantryWarningCount = (props.aggregatedList.inPantry || []).length;
  const shoppingTotal = toBuyCount + inPantryWarningCount;
  const pantryActiveCount = pantryItems.filter((i) => i.amount > 0).length;

  return (
    <div className="flex flex-col gap-4">
      {/* Top Page Header with Title */}
      <PageHeader
        icon={activeTab === 'shopping' ? <ShoppingCart className="w-6 h-6" /> : <Package className="w-6 h-6" />}
        title={activeTab === 'shopping' ? t('shopping.title') : t('pantry.title')}
        subtitle={activeTab === 'shopping' ? t('shopping.subtitle') : t('pantry.subtitle')}
      />

      {/* Segmented Tab Control */}
      <div className="flex p-1 bg-gray-100 dark:bg-gray-800 rounded-2xl gap-1 border-none shadow-none">
        <button
          type="button"
          onClick={() => {
            if (activeTab !== 'shopping') {
              hapticSelection();
              setActiveTab('shopping');
            }
          }}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs sm:text-sm transition-all duration-200 min-h-[44px] cursor-pointer border-none outline-none ${
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
              setActiveTab('pantry');
            }
          }}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs sm:text-sm transition-all duration-200 min-h-[44px] cursor-pointer border-none outline-none ${
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

      {/* Main Tab Content */}
      {activeTab === 'shopping' ? (
        <ShoppingListView {...props} />
      ) : (
        <PantryView onSelectRecipe={props.onSelectRecipe} />
      )}
    </div>
  );
}
