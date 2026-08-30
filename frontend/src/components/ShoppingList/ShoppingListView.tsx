import React, { useState, useMemo } from 'react';
import { Plus, Trash2, CheckCheck, AlertCircle } from 'lucide-react';
import type { AggregatedShoppingItem, ShoppingListItem, SavedRecipe } from '../../types';
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

interface ActiveShoppingRecipe {
  recipeId: string;
  recipeTitle: string;
  totalItems: number;
  checkedItems: number;
}

interface ShoppingListViewProps {
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
  restoreItems,
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

  const handleClearChecked = () => {
    const checkedItems = shoppingList.filter((item) => item.checked);
    if (checkedItems.length === 0) return;
    clearChecked();
    toast.info(t('toast.clearedCheckedItems', { count: checkedItems.length }), {
      action: restoreItems
        ? {
            label: t('toast.undo'),
            onClick: () => restoreItems(checkedItems),
          }
        : undefined,
    });
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
  const inPantryItems = aggregatedList.inPantry || [];
  const checkedCount = aggregatedList.checked.length;
  const totalCount = toBuyItems.length + inPantryItems.length + checkedCount;
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
      {/* Progress & Quick Actions */}
      <div className="w-full flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <p className="text-xs text-default-500">
            {totalCount > 0
              ? t('shopping.progressSubtitle', { checked: checkedCount, total: totalCount })
              : t('shopping.subtitle')}
          </p>

          {totalCount > 0 && (
            <div className="flex items-center gap-1.5 shrink-0">
              {checkedCount > 0 && (
                <button
                  onClick={handleClearChecked}
                  aria-label={t('shopping.clearChecked')}
                  title={t('shopping.clearChecked')}
                  className="w-9 h-9 flex items-center justify-center rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 active:scale-90 transition-all cursor-pointer"
                >
                  <CheckCheck className="w-4.5 h-4.5" />
                </button>
              )}
              <button
                onClick={handleClearAll}
                aria-label={t('shopping.clearAll')}
                title={t('shopping.clearAll')}
                className="w-9 h-9 flex items-center justify-center rounded-xl bg-default-100 text-default-500 hover:text-rose-600 hover:bg-rose-50 active:scale-90 transition-all cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {totalCount > 0 && (
          <div className="h-1.5 w-full bg-default-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>

      <CustomItemForm
        isOpen={showAddForm}
        addCustomItem={addCustomItem}
        onClose={() => setShowAddForm(false)}
      />

      {totalCount === 0 ? (
        <ShoppingEmptyState />
      ) : (
        <div className="flex flex-col gap-3 pb-28">
          {activeRecipes.length > 0 && onSelectRecipe && (
            <ShoppingRecipeCarousel
              recipes={activeRecipes}
              history={history}
              onSelectRecipe={onSelectRecipe}
              onRemoveRecipe={handleRemoveRecipe}
            />
          )}

          {/* Group: Schon im Vorrat (Bitte prüfen) */}
          {inPantryItems.length > 0 && (
            <div className="p-3.5 bg-warning-500/10 rounded-3xl border border-warning-500/20 space-y-2">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-warning-600" />
                <h4 className="font-bold text-xs text-warning-800 dark:text-warning-300">
                  {t('shopping.inPantrySection')}
                </h4>
              </div>
              <p className="text-[11px] text-default-500">{t('shopping.inPantrySubtitle')}</p>
              <ShoppingListGroup
                groupedCategories={[{ category: 'OTHER', items: inPantryItems }]}
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
            </div>
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
          ) : inPantryItems.length === 0 ? (
            <ShoppingAllDoneState onClear={handleClearChecked} />
          ) : null}

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
