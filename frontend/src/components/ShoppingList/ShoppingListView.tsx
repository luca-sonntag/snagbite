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
import ShoppingProgressCard from './ShoppingProgressCard';
import ShoppingCheckedDrawer from './ShoppingCheckedDrawer';
import ShoppingEmptyState from './ShoppingEmptyState';
import ShoppingAllDoneState from './ShoppingAllDoneState';
import ShoppingRecipeCarousel from './ShoppingRecipeCarousel';

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
  clearAll: () => void;
  clearChecked: (transferToPantry?: boolean) => void;
  restoreItems?: (items: ShoppingListItemType[]) => void;
  restoreList?: (items: ShoppingListItemType[]) => void;
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
  clearAll,
  clearChecked,
  restoreList,
}) => {
  const dialog = useDialog();
  const { t } = useI18n();
  const toast = useToast();

  const [showAddForm, setShowAddForm] = useState(false);
  const [checkingKeys, setCheckingKeys] = useState<Set<string>>(new Set());
  const [collapsingKeys, setCollapsingKeys] = useState<Set<string>>(new Set());

  const getItemKey = (item: AggregatedShoppingItem) =>
    `${item.baseName || item.name}|${(item.modifier || '').toLowerCase().trim()}|${item.unit}`.toLowerCase();

  const categoryIndex = (cat: string) => {
    const idx = (categoryOrder as readonly string[]).indexOf(cat.toUpperCase());
    return idx === -1 ? 999 : idx;
  };

  const triggerCollapseAndAction = (
    keysToCollapse: string[],
    action: () => void,
    keysToMarkChecking?: string[]
  ) => {
    if (keysToMarkChecking && keysToMarkChecking.length > 0) {
      setCheckingKeys((prev) => {
        const next = new Set(prev);
        keysToMarkChecking.forEach((k) => next.add(k));
        return next;
      });

      setTimeout(() => {
        setCollapsingKeys((prev) => {
          const next = new Set(prev);
          keysToCollapse.forEach((k) => next.add(k));
          return next;
        });

        setTimeout(() => {
          action();
          requestAnimationFrame(() => {
            setCheckingKeys((prev) => {
              const next = new Set(prev);
              keysToMarkChecking.forEach((k) => next.delete(k));
              return next;
            });
            setCollapsingKeys((prev) => {
              const next = new Set(prev);
              keysToCollapse.forEach((k) => next.delete(k));
              return next;
            });
          });
        }, 200);
      }, 280);
    } else {
      setCollapsingKeys((prev) => {
        const next = new Set(prev);
        keysToCollapse.forEach((k) => next.add(k));
        return next;
      });
      setTimeout(() => {
        action();
        requestAnimationFrame(() => {
          setCollapsingKeys((prev) => {
            const next = new Set(prev);
            keysToCollapse.forEach((k) => next.delete(k));
            return next;
          });
        });
      }, 200);
    }
  };

  const handleItemToggle = (item: AggregatedShoppingItem) => {
    const key = getItemKey(item);
    const displayKey = `${item.checked ? 'checked' : 'unchecked'}-${key}`;
    const keysToCollapse = [displayKey];

    let keysToMarkChecking: string[] | undefined;
    if (!item.checked) {
      keysToMarkChecking = [displayKey];
      const cat = item.category || 'OTHER';
      const toBuyList = aggregatedList.toBuy || aggregatedList.unchecked || [];
      const openInCat = toBuyList.filter((i) => (i.category || 'OTHER') === cat);
      if (openInCat.length === 1) {
        keysToCollapse.push(`group-${cat}`);
      }
    }

    triggerCollapseAndAction(
      keysToCollapse,
      () => {
        if (toggleItemIds && item.itemIds?.length) {
          toggleItemIds(item.itemIds, !item.checked);
        } else {
          toggleItemGroup(item.baseName || item.name, item.modifier, item.unit, !item.checked);
        }
      },
      keysToMarkChecking
    );
  };

  const handleGroupHeaderClick = (items: AggregatedShoppingItem[]) => {
    if (items.length === 0) return;
    const keys = items.map((i) => `unchecked-${getItemKey(i)}`);
    const keysToCollapse = [...keys, `group-${items[0].category || 'OTHER'}`];

    triggerCollapseAndAction(
      keysToCollapse,
      () => {
        if (toggleItemIds) {
          const allItemIds = items.flatMap((i) => i.itemIds || []);
          toggleItemIds(allItemIds, true);
        } else {
          items.forEach((i) => toggleItemGroup(i.baseName || i.name, i.modifier, i.unit, true));
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

  const handleClearAll = async () => {
    const confirmed = await dialog.confirm({
      title: t('shopping.dialogClear.title'),
      message: t('shopping.dialogClear.message'),
      confirmLabel: t('shopping.dialogClear.confirm'),
      cancelLabel: t('shopping.dialogClear.cancel'),
      status: 'danger',
    });
    if (confirmed) {
      const allItems = [...shoppingList];
      clearAll();
      toast.info(t('toast.clearedAllItems'), {
        action:
          restoreList && allItems.length > 0
            ? {
                label: t('toast.undo'),
                onClick: () => restoreList(allItems),
              }
            : undefined,
      });
    }
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

    clearChecked(true);
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
  const progress = totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0;

  // Active aisles to buy
  const activeGroups = useMemo(() => {
    const groups: Record<string, AggregatedShoppingItem[]> = {};
    toBuyItems.forEach((item) => {
      const cat = item.category || 'OTHER';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(item);
    });
    return Object.keys(groups)
      .map((category) => ({ category, items: groups[category] }))
      .sort((a, b) => categoryIndex(a.category) - categoryIndex(b.category));
  }, [toBuyItems]);

  const checkedSorted = useMemo(() => {
    return [...aggregatedList.checked].sort(
      (a, b) => categoryIndex(a.category || 'OTHER') - categoryIndex(b.category || 'OTHER')
    );
  }, [aggregatedList.checked]);

  return (
    <div className="flex flex-col gap-4 relative">
      {/* Progress & Quick Actions Card */}
      <ShoppingProgressCard
        checkedCount={checkedCount}
        totalCount={totalCount}
        progress={progress}
        onClearChecked={handleClearChecked}
        onClearAll={handleClearAll}
      />

      <CustomItemForm
        isOpen={showAddForm}
        addCustomItem={addCustomItem}
        onClose={() => setShowAddForm(false)}
      />

      {totalCount === 0 ? (
        <ShoppingEmptyState />
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
            />
          ) : (
            <ShoppingAllDoneState onClear={handleClearChecked} />
          )}

          <ShoppingCheckedDrawer
            items={checkedSorted}
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
