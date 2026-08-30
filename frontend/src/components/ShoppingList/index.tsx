import { useState } from 'react';
import { ShoppingCart, Package } from 'lucide-react';
import type { AggregatedShoppingItem, ShoppingListItem, SavedRecipe } from '../../types';
import { useI18n } from '../../context/I18nContext';
import { usePantry } from '../../context/PantryContext';
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
        icon={<ShoppingCart className="w-6 h-6" />}
        title={activeTab === 'shopping' ? t('shopping.title') : t('pantry.title')}
        subtitle={activeTab === 'shopping' ? t('shopping.subtitle') : t('pantry.subtitle')}
      />

      {/* Segmented Tab Control */}
      <div className="flex p-1 bg-default-100 dark:bg-default-50 rounded-2xl gap-1">
        <button
          type="button"
          onClick={() => setActiveTab('shopping')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold transition-all min-h-[44px] ${
            activeTab === 'shopping'
              ? 'bg-content1 text-foreground shadow-xs'
              : 'text-default-500 hover:text-foreground'
          }`}
        >
          <ShoppingCart className="w-4 h-4" />
          <span>{t('shopping.tabShoppingList')}</span>
          {shoppingTotal > 0 && (
            <span
              className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${
                activeTab === 'shopping'
                  ? 'bg-primary/10 text-primary'
                  : 'bg-default-200 text-default-600'
              }`}
            >
              {shoppingTotal}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('pantry')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold transition-all min-h-[44px] ${
            activeTab === 'pantry'
              ? 'bg-content1 text-foreground shadow-xs'
              : 'text-default-500 hover:text-foreground'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>{t('shopping.tabPantry')}</span>
          {pantryActiveCount > 0 && (
            <span
              className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${
                activeTab === 'pantry'
                  ? 'bg-warning-500/20 text-warning-700 dark:text-warning-300'
                  : 'bg-default-200 text-default-600'
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
