import { useState, useMemo, useCallback, useEffect } from 'react';
import type { Ingredient, ShoppingListItem } from '../types';
import { useAuth } from '../context/AuthContext';
import { useDialog } from '../context/DialogContext';
import { useI18n } from '../context/I18nContext';
import { apiUrl } from '../api';
import { getParentIngredient, normalizeUnit } from '../utils/ingredientTaxonomy';
import { aggregateShoppingItems, extractActiveRecipes } from '../utils/shoppingAggregation';
import { findGroupMatchedIds } from '../components/ShoppingList/shoppingItemUtils';

export function useShoppingList() {
  const { session, isPremium, getAccessToken } = useAuth();
  const dialog = useDialog();
  const { t } = useI18n();

  const [shoppingList, setShoppingList] = useState<ShoppingListItem[]>(() => {
    try {
      const saved = localStorage.getItem('recipe_shopping_list');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [loading, setLoading] = useState(false);

  // Fetch shopping list from backend when authenticated
  const refreshList = useCallback(async () => {
    const token = await getAccessToken();
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(apiUrl('/api/shopping-list'), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setShoppingList((prev) => {
          const prevSynonyms = new Map(prev.map((i) => [i.id, i.synonyms]));
          return (data.items ?? []).map((item: ShoppingListItem) => ({
            ...item,
            synonyms: item.synonyms ?? prevSynonyms.get(item.id),
          }));
        });
      }
    } catch (err) {
      console.warn('[ShoppingList] Load failed:', err);
    } finally {
      setLoading(false);
    }
  }, [getAccessToken]);

  useEffect(() => {
    if (session) refreshList();
  }, [session, refreshList]);

  // Sync to localStorage as offline fallback
  useEffect(() => {
    try {
      localStorage.setItem('recipe_shopping_list', JSON.stringify(shoppingList));
    } catch {}
  }, [shoppingList]);

  // Add scaled ingredients from a recipe
  const addRecipeIngredients = async (
    ingredients: Ingredient[],
    recipeId: string,
    recipeTitle: string
  ): Promise<boolean> => {
    if (!isPremium) {
      const otherRecipes = shoppingList.filter((item) => item.recipeId && item.recipeId !== recipeId);
      if (otherRecipes.length > 0) {
        dialog.alert({
          title: t('premium.shoppingListLimit.title'),
          message: t('premium.shoppingListLimit.message'),
          status: 'warning',
          confirmLabel: 'OK',
        });
        return false;
      }
    }

    const newItems = ingredients.map((ing) => ({
      name: ing.name,
      baseName: ing.baseName,
      synonyms: ing.synonyms,
      parentIngredient: ing.parentIngredient || getParentIngredient(ing) || undefined,
      modifier: ing.modifier,
      brand: ing.brand,
      amount: ing.amount || 0,
      unit: normalizeUnit(ing.unit),
      recipeId,
      recipeTitle,
      checked: false,
      notes: ing.notes,
      category: ing.category,
      canonicalId: ing.canonicalId,
      typicalPackageAmount: ing.typicalPackageAmount,
      typicalPackageUnit: ing.typicalPackageUnit,
    }));

    const token = await getAccessToken();
    if (token) {
      try {
        const res = await fetch(apiUrl('/api/shopping-list/batch'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ items: newItems, recipeId }),
        });
        if (res.ok) {
          const data = await res.json();
          const returnedItems = (data.items ?? []).map((item: ShoppingListItem, idx: number) => ({
            ...item,
            synonyms: item.synonyms ?? newItems[idx]?.synonyms,
          }));
          setShoppingList((prev) => [...prev.filter((i) => i.recipeId !== recipeId), ...returnedItems]);
          return true;
        }
      } catch (err) {
        console.error('[ShoppingList] Batch add failed:', err);
      }
    }

    // Local fallback
    setShoppingList((prev) => [
      ...prev.filter((i) => i.recipeId !== recipeId),
      ...newItems.map((item, idx) => ({
        ...item,
        id: `${recipeId}-${encodeURIComponent(item.name)}-${idx}-${Date.now()}`,
        createdAt: new Date().toISOString(),
      })),
    ]);
    return true;
  };

  // Add custom manual item
  const addCustomItem = async (name: string, amount: number, unit: string, notes?: string) => {
    const itemDto = {
      name,
      amount: amount || 0,
      unit: normalizeUnit(unit),
      checked: false,
      notes,
      category: 'OTHER',
    };

    const token = await getAccessToken();
    if (token) {
      try {
        const res = await fetch(apiUrl('/api/shopping-list'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(itemDto),
        });
        if (res.ok) {
          const data = await res.json();
          setShoppingList((prev) => [data.item, ...prev]);
          return;
        }
      } catch (err) {
        console.error('[ShoppingList] Add manual failed:', err);
      }
    }

    // Local fallback
    const newItem: ShoppingListItem = {
      ...itemDto,
      id: `manual-${encodeURIComponent(name)}-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    setShoppingList((prev) => [newItem, ...prev]);
  };

  // Toggle check state of item IDs (in-cart status only; pantry transfer happens on finishShopping)
  const toggleItemIds = async (itemIds: string[], targetChecked: boolean) => {
    if (!itemIds || itemIds.length === 0) return;
    const idSet = new Set(itemIds);
    setShoppingList((prev) => prev.map((item) => (idSet.has(item.id) ? { ...item, checked: targetChecked } : item)));

    const token = await getAccessToken();
    if (token) {
      try {
        await fetch(apiUrl('/api/shopping-list/batch-toggle'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ ids: itemIds, checked: targetChecked, autoAddToPantry: false }),
        });
      } catch (err) {
        console.error('[ShoppingList] Toggle failed:', err);
      }
    }
  };

  // Delete items by ID
  const deleteItemIds = async (itemIds: string[]) => {
    if (!itemIds || itemIds.length === 0) return;
    const idSet = new Set(itemIds);
    setShoppingList((prev) => prev.filter((item) => !idSet.has(item.id)));

    const token = await getAccessToken();
    if (token) {
      try {
        await fetch(apiUrl('/api/shopping-list/delete-batch'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ ids: itemIds }),
        });
      } catch (err) {
        console.error('[ShoppingList] Delete failed:', err);
      }
    }
  };

  const clearAll = async () => {
    setShoppingList([]);
    const token = await getAccessToken();
    if (token) {
      fetch(apiUrl('/api/shopping-list/clear'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ onlyChecked: false }),
      }).catch(() => {});
    }
  };

  const clearChecked = async (transferToPantry = true) => {
    setShoppingList((prev) => prev.filter((item) => !item.checked));
    const token = await getAccessToken();
    if (token) {
      fetch(apiUrl('/api/shopping-list/clear'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ onlyChecked: true, transferToPantry }),
      })
        .then(() => {
          if (transferToPantry) {
            window.dispatchEvent(new CustomEvent('pantry-updated'));
          }
        })
        .catch(() => {});
    }
  };

  const removeRecipeFromList = async (recipeId: string) => {
    setShoppingList((prev) => prev.filter((item) => item.recipeId !== recipeId));
    const token = await getAccessToken();
    if (token) {
      fetch(apiUrl('/api/shopping-list/remove-recipe'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ recipeId }),
      }).catch(() => {});
    }
  };

  const restoreItems = (itemsToRestore: ShoppingListItem[]) => {
    if (!itemsToRestore || itemsToRestore.length === 0) return;
    setShoppingList((prev) => [...prev, ...itemsToRestore]);
  };

  const restoreList = (fullList: ShoppingListItem[]) => {
    setShoppingList(fullList);
  };

  const aggregatedList = useMemo(() => aggregateShoppingItems(shoppingList), [shoppingList]);
  const activeRecipes = useMemo(() => extractActiveRecipes(shoppingList), [shoppingList]);

  const toggleItemGroup = (
    groupKeyName: string,
    _modifier: string | undefined,
    unit: string,
    targetChecked: boolean
  ) => {
    toggleItemIds(findGroupMatchedIds(shoppingList, groupKeyName, unit), targetChecked);
  };

  const deleteItemGroup = (
    groupKeyName: string,
    _modifier: string | undefined,
    unit: string
  ) => {
    deleteItemIds(findGroupMatchedIds(shoppingList, groupKeyName, unit));
  };

  return {
    shoppingList,
    aggregatedList,
    activeRecipes,
    loading,
    refreshList,
    removeRecipeFromList,
    addRecipeIngredients,
    addCustomItem,
    toggleItemIds,
    deleteItemIds,
    toggleItemGroup,
    deleteItemGroup,
    clearAll,
    clearChecked,
    restoreItems,
    restoreList,
  };
}
