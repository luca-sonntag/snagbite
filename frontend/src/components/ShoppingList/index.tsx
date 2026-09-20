import { useState } from 'react';
import type { AggregatedShoppingItem, ShoppingListItem, SavedRecipe } from '../../types';
import { useI18n } from '../../context/I18nContext';
import { usePantry } from '../../context/PantryContext';
import { useDialog } from '../../context/DialogContext';
import { useToast } from '../../context/ToastContext';
import { PageHeader } from '../PageHeader';
import { ShoppingListView } from './ShoppingListView';
import { PantryView } from '../Pantry/PantryView';
import { ShoppingStickyHeader } from './ShoppingStickyHeader';
import { useShoppingSticky } from './useShoppingSticky';

interface ActiveShoppingRecipe {
  recipeId: string;
  recipeTitle: string;
  totalItems: number;
  checkedItems: number;
}

interface ShoppingListProps {
  isActive?: boolean;
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
  clearChecked: (transferToPantry?: boolean) => void;
  restoreItems?: (items: ShoppingListItem[]) => void;
  restoreList?: (items: ShoppingListItem[]) => void;
}

export default function ShoppingList(props: ShoppingListProps) {
  const { t } = useI18n();
  const { pantryItems } = usePantry();
  const dialog = useDialog();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<'shopping' | 'pantry'>('shopping');
  const { isCollapsed, setCollapseSentinel } = useShoppingSticky(props.isActive ?? true);

  const toBuyItems = props.aggregatedList.toBuy || props.aggregatedList.unchecked || [];
  const checkedCount = props.aggregatedList.checked.length;
  const inPantryWarningCount = (props.aggregatedList.inPantry || []).length;
  const shoppingTotal = toBuyItems.length + inPantryWarningCount;
  const totalCount = toBuyItems.length + checkedCount;
  const progress = totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0;
  const pantryActiveCount = pantryItems.filter((i) => i.amount > 0).length;

  const handleClearAll = async () => {
    const confirmed = await dialog.confirm({
      title: t('shopping.dialogClear.title'),
      message: t('shopping.dialogClear.message'),
      confirmLabel: t('shopping.dialogClear.confirm'),
      cancelLabel: t('shopping.dialogClear.cancel'),
      status: 'danger',
    });
    if (confirmed) {
      const allItems = [...(props.shoppingList || [])];
      props.clearAll();
      toast.info(t('toast.clearedAllItems'), {
        action:
          props.restoreList && allItems.length > 0
            ? {
                label: t('toast.undo'),
                onClick: () => props.restoreList!(allItems),
              }
            : undefined,
      });
    }
  };

  const handleClearChecked = async () => {
    const checkedItems = (props.shoppingList || []).filter((item) => item.checked);
    if (checkedItems.length === 0 && props.aggregatedList.checked.length === 0) return;
    const count = checkedItems.length || props.aggregatedList.checked.length;

    const confirmed = await dialog.confirm({
      title: t('shopping.finishShoppingConfirmTitle'),
      message: t('shopping.finishShoppingConfirmMessage', { count }),
      confirmLabel: t('shopping.finishShoppingConfirmBtn'),
      cancelLabel: t('shopping.dialogClear.cancel'),
      status: 'success',
    });
    if (!confirmed) return;

    props.clearChecked(true);
    toast.success(t('shopping.transferredToPantryToast', { count }));
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Top Page Header with Title */}
      <PageHeader
        title={activeTab === 'shopping' ? t('shopping.title') : t('pantry.title')}
        subtitle={activeTab === 'shopping' ? t('shopping.subtitle') : t('pantry.subtitle')}
      />

      {/* Sticky Header with Tabs & Progress */}
      <ShoppingStickyHeader
        activeTab={activeTab}
        onTabChange={setActiveTab}
        shoppingTotal={shoppingTotal}
        pantryActiveCount={pantryActiveCount}
        isCollapsed={isCollapsed}
        checkedCount={checkedCount}
        totalCount={totalCount}
        progress={progress}
        onClearChecked={handleClearChecked}
        onClearAll={handleClearAll}
      />

      {/* Main Tab Content */}
      {activeTab === 'shopping' ? (
        <ShoppingListView
          {...props}
          onClearAll={handleClearAll}
          onClearChecked={handleClearChecked}
          setCollapseSentinel={setCollapseSentinel}
        />
      ) : (
        <PantryView onSelectRecipe={props.onSelectRecipe} />
      )}
    </div>
  );
}
