import React, { useState, useMemo } from 'react';
import { Plus } from 'lucide-react';
import type { AggregatedShoppingItem, ShoppingListItem as ShoppingListItemType, SavedRecipe } from '../../types';
import { categoryOrder } from '../../i18n';
import { useDialog } from '../../context/DialogContext';
import { useI18n } from '../../context/I18nContext';
import { useToast } from '../../context/ToastContext';
import { formatQuantity } from '../../utils/formatQuantity';

import CustomItemForm from './CustomItemForm';
import ShoppingListGroup from './ShoppingListGroup';
import ShoppingCheckedDrawer from './ShoppingCheckedDrawer';
import ShoppingEmptyState from './ShoppingEmptyState';
import ShoppingAllDoneState from './ShoppingAllDoneState';
import ShoppingRecipeCarousel from './ShoppingRecipeCarousel';
import { partitionShoppingCategories, getShoppingItemKey } from './shoppingCategoryUtils';
import { useShoppingCollapseAnimation } from './useShoppingCollapseAnimation';

interface ActiveShoppingRecipe {
  recipeId: string;
  recipeTitle: string;
  totalItems: number;
  checkedItems: number;
}

interface ShoppingListViewProps {
  shoppingList?: ShoppingListItemType[];
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
  clearChecked: (transferToPantry?: boolean) => void;
  restoreItems?: (items: ShoppingListItemType[]) => void;
  setCollapseSentinel?: (el: HTMLDivElement | null) => void;
  showPackageRecommendations?: boolean;
}

export const ShoppingListView: React.FC<ShoppingListViewProps> = ({
  shoppingList = [],
  aggregatedList,
  activeRecipes = [],
  history = [],
  onSelectRecipe,
  onRemoveRecipe,
  addCustomItem,
  toggleItemIds,
  deleteItemIds,
  toggleItemGroup,
  deleteItemGroup,
  clearChecked,
  setCollapseSentinel,
  showPackageRecommendations = true,
}) => {
  const dialog = useDialog();
  const { t } = useI18n();
  const toast = useToast();

  const [showAddForm, setShowAddForm] = useState(false);
  const { checkingKeys, setCheckingKeys, collapsingKeys, triggerCollapseAndAction } =
    useShoppingCollapseAnimation();

  const getItemKey = getShoppingItemKey;

  const { activeGroups, activeCategorySet, drawerCheckedItems } = useMemo(
    () => partitionShoppingCategories(aggregatedList, categoryOrder as readonly string[], shoppingList),
    [aggregatedList, shoppingList]
  );

  const executeToggle = (item: AggregatedShoppingItem, targetChecked: boolean) => {
    if (toggleItemIds && item.itemIds?.length) {
      toggleItemIds(item.itemIds, targetChecked);
    } else {
      toggleItemGroup(item.baseName || item.name, item.modifier, item.unit, targetChecked);
    }
  };

  const handleItemToggle = (item: AggregatedShoppingItem) => {
    const key = getItemKey(item);
    const cat = item.category || 'OTHER';

    if (!item.checked) {
      const displayKey = `unchecked-${key}`;
      if (checkingKeys.has(displayKey) || collapsingKeys.has(displayKey)) return;

      const toBuyList = aggregatedList.toBuy || aggregatedList.unchecked || [];
      const openInCat = toBuyList.filter((i) => (i.category || 'OTHER') === cat);
      const isLastOpenInGroup = openInCat.length <= 1;

      if (isLastOpenInGroup) {
        // Last open item in this category: checking it completes the entire category!
        // Smoothly collapse both the item and the whole category aisle.
        const keysToCollapse = [displayKey, `group-${cat}`];
        triggerCollapseAndAction(
          keysToCollapse,
          () => executeToggle(item, true),
          [displayKey]
        );
      } else {
        // Other items in this aisle remain unchecked.
        // Trigger check-off animation (green checkmark pop + strikethrough), then update state.
        setCheckingKeys((prev) => new Set(prev).add(displayKey));
        setTimeout(() => {
          executeToggle(item, true);
          requestAnimationFrame(() => {
            setCheckingKeys((prev) => {
              const next = new Set(prev);
              next.delete(displayKey);
              return next;
            });
          });
        }, 220);
      }
    } else {
      // Unchecking an item
      const displayKey = `checked-${key}`;
      if (collapsingKeys.has(displayKey)) return;

      const isInDrawer = !activeCategorySet.has(cat);
      if (isInDrawer) {
        // Collapses out of the completed drawer and reappears in the active aisle
        triggerCollapseAndAction([displayKey], () => executeToggle(item, false));
      } else {
        // Already inside an active aisle: uncheck immediately in place
        executeToggle(item, false);
      }
    }
  };

  const handleGroupHeaderClick = (items: AggregatedShoppingItem[]) => {
    const uncheckedItems = items.filter((i) => !i.checked);
    if (uncheckedItems.length === 0) return;
    const cat = items[0].category || 'OTHER';
    const keys = uncheckedItems.map((i) => `unchecked-${getItemKey(i)}`);
    const keysToCollapse = [...keys, `group-${cat}`];

    triggerCollapseAndAction(
      keysToCollapse,
      () => {
        if (toggleItemIds) {
          const allItemIds = uncheckedItems.flatMap((i) => i.itemIds || []);
          toggleItemIds(allItemIds, true);
        } else {
          uncheckedItems.forEach((i) => toggleItemGroup(i.baseName || i.name, i.modifier, i.unit, true));
        }
      },
      keys
    );
  };

  const formatItemAmount = (amount: number, unit: string) => {
    if (!amount) return '';
    const numberStr = formatQuantity(amount, unit);
    if (!numberStr) return '';
    const unitStr = unit ? ` ${unit}` : '';
    return `${numberStr}${unitStr}`;
  };

  const handleClearChecked = async () => {
    const checkedItems = (shoppingList || []).filter((item) => item.checked);
    if (checkedItems.length === 0 && aggregatedList.checked.length === 0) return;
    const count = checkedItems.length || aggregatedList.checked.length;

    const confirmed = await dialog.confirm({
      title: t('shopping.finishShoppingConfirmTitle'),
      message: t('shopping.finishShoppingConfirmMessage', { count }),
      confirmLabel: t('shopping.finishShoppingConfirmBtn'),
      cancelLabel: t('shopping.dialogClear.cancel'),
      status: 'success',
    });
    if (!confirmed) return;

    clearChecked(false);
    toast.success(t('shopping.transferredToPantryToast', { count }));
  };

  const handleRemoveRecipe = async (recipeId: string, recipeTitle: string) => {
    const confirmed = await dialog.confirm({
      title: t('shopping.removeRecipeConfirmTitle'),
      message: t('shopping.removeRecipeConfirmMessage', { title: recipeTitle }),
      confirmLabel: t('shopping.removeRecipeConfirmBtn'),
      cancelLabel: t('shopping.dialogClear.cancel'),
      status: 'danger',
    });
    if (confirmed && onRemoveRecipe) {
      onRemoveRecipe(recipeId);
    }
  };

  const toBuyItems = aggregatedList.toBuy || aggregatedList.unchecked || [];
  const checkedCount = aggregatedList.checked.length;
  const totalCount = toBuyItems.length + checkedCount;

  return (
    <div className="flex flex-col gap-4 relative">
      {/* Sentinel for sticky header's collapsed progress strip */}
      {setCollapseSentinel && (
        <div ref={setCollapseSentinel} aria-hidden="true" className="h-px -my-2 pointer-events-none" />
      )}

      <CustomItemForm
        isOpen={showAddForm}
        addCustomItem={addCustomItem}
        onClose={() => setShowAddForm(false)}
      />

      {totalCount === 0 ? (
        <ShoppingEmptyState onAddCustomItem={() => setShowAddForm(true)} />
      ) : (
        <div className="flex flex-col gap-3 pb-36">
          {activeRecipes.length > 0 && onSelectRecipe && (
            <ShoppingRecipeCarousel
              recipes={activeRecipes}
              history={history}
              onSelectRecipe={onSelectRecipe}
              onRemoveRecipe={handleRemoveRecipe}
            />
          )}

          {activeGroups.length > 0 ? (
            <ShoppingListGroup
              groupedCategories={activeGroups}
              getItemKey={getItemKey}
              onItemToggle={handleItemToggle}
              onGroupHeaderClick={handleGroupHeaderClick}
              onDelete={(item) =>
                deleteItemIds && item.itemIds?.length
                  ? deleteItemIds(item.itemIds)
                  : deleteItemGroup(item.baseName || item.name, item.modifier, item.unit)
              }
              formatItemAmount={formatItemAmount}
              collapsingKeys={collapsingKeys}
              checkingKeys={checkingKeys}
              showPackageRecommendations={showPackageRecommendations}
            />
          ) : (
            <ShoppingAllDoneState onClear={handleClearChecked} />
          )}

          <ShoppingCheckedDrawer
            items={drawerCheckedItems}
            getItemKey={getItemKey}
            onItemToggle={handleItemToggle}
            onDelete={(item) =>
              deleteItemIds && item.itemIds?.length
                ? deleteItemIds(item.itemIds)
                : deleteItemGroup(item.baseName || item.name, item.modifier, item.unit)
            }
            formatItemAmount={formatItemAmount}
            collapsingKeys={collapsingKeys}
          />
        </div>
      )}

      {/* Floating Add FAB */}
      <button
        id="tour-shopping-quick-add"
        type="button"
        onClick={() => setShowAddForm((p) => !p)}
        aria-label={t('shopping.addTitle')}
        className="fixed right-4 bottom-[calc(6.5rem_+_var(--safe-area-inset-bottom))] z-40 w-14 h-14 rounded-full flex items-center justify-center text-white bg-emerald-600 hover:bg-emerald-500 shadow-xl shadow-emerald-500/25 active:scale-95 transition-all cursor-pointer"
      >
        <Plus className={`w-6 h-6 transition-transform duration-200 ${showAddForm ? 'rotate-45' : ''}`} />
      </button>
    </div>
  );
};
