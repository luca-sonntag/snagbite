import { useState, useMemo } from 'react';
import type { Ingredient, ShoppingListItem, AggregatedShoppingItem } from '../types';
import { useAuth } from '../context/AuthContext';
import { useDialog } from '../context/DialogContext';
import { useI18n } from '../context/I18nContext';
import {
  getParentIngredient,
  normalizeFoodBaseKey,
  normalizeUnit,
  getIngredientDisplayName,
} from '../utils/ingredientTaxonomy';

export function useShoppingList() {
  const { isPremium } = useAuth();
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

  const saveList = (listOrUpdater: ShoppingListItem[] | ((prev: ShoppingListItem[]) => ShoppingListItem[])) => {
    setShoppingList(prev => {
      const next = typeof listOrUpdater === 'function' ? listOrUpdater(prev) : listOrUpdater;
      try {
        localStorage.setItem('recipe_shopping_list', JSON.stringify(next));
      } catch (err) {
        console.error('Failed to save shopping list:', err);
      }
      return next;
    });
  };

  // Add scaled, unchecked ingredients from a recipe
  const addRecipeIngredients = (ingredients: Ingredient[], recipeId: string, recipeTitle: string) => {
    if (!isPremium) {
      const otherRecipes = shoppingList.filter(item => item.recipeId && item.recipeId !== recipeId);
      if (otherRecipes.length > 0) {
        dialog.alert({
          title: t('premium.shoppingListLimit.title'),
          message: t('premium.shoppingListLimit.message'),
          status: 'warning',
          confirmLabel: 'OK'
        });
        return;
      }
    }

    saveList(prevList => {
      // Remove previous items from this recipe to prevent duplicates on portion adjustments
      const filteredList = prevList.filter(item => item.recipeId !== recipeId);

      // Map new ingredients
      const newItems: ShoppingListItem[] = ingredients.map((ing, idx) => ({
        id: `${recipeId}-${encodeURIComponent(ing.name)}-${idx}-${Date.now()}`,
        name: ing.name,
        baseName: ing.baseName,
        parentIngredient: ing.parentIngredient || getParentIngredient(ing) || undefined,
        modifier: ing.modifier,
        amount: ing.amount || 0,
        unit: normalizeUnit(ing.unit),
        recipeId,
        recipeTitle,
        checked: false,
        notes: ing.notes,
        createdAt: new Date().toISOString(),
        category: ing.category
      }));

      return [...filteredList, ...newItems];
    });
  };

  // Add custom manual item
  const addCustomItem = (name: string, amount: number, unit: string, notes?: string) => {
    saveList(prevList => {
      const newItem: ShoppingListItem = {
        id: `manual-${encodeURIComponent(name)}-${Date.now()}`,
        name,
        amount: amount || 0,
        unit: normalizeUnit(unit),
        checked: false,
        notes,
        createdAt: new Date().toISOString(),
        category: 'OTHER'
      };
      return [...prevList, newItem];
    });
  };

  // Toggle check state of specific item IDs
  const toggleItemIds = (itemIds: string[], targetChecked: boolean) => {
    if (!itemIds || itemIds.length === 0) return;
    const idSet = new Set(itemIds);
    saveList(prevList =>
      prevList.map(item => (idSet.has(item.id) ? { ...item, checked: targetChecked } : item))
    );
  };

  // Delete specific items by ID
  const deleteItemIds = (itemIds: string[]) => {
    if (!itemIds || itemIds.length === 0) return;
    const idSet = new Set(itemIds);
    saveList(prevList => prevList.filter(item => !idSet.has(item.id)));
  };

  // Toggle check state of an aggregated group (legacy wrapper matching fallback)
  const toggleItemGroup = (groupKeyName: string, _modifier: string | undefined, unit: string, targetChecked: boolean) => {
    const keyName = groupKeyName.toLowerCase().trim();
    const keyUnit = normalizeUnit(unit).toLowerCase().trim();

    saveList(prevList =>
      prevList.map(item => {
        const baseKey = normalizeFoodBaseKey(item).toLowerCase().trim();
        const parent = getParentIngredient(item);
        const matchName =
          baseKey === keyName ||
          (parent?.baseName && parent.baseName.toLowerCase().trim() === keyName) ||
          (parent?.name && parent.name.toLowerCase().trim() === keyName) ||
          (item.baseName && item.baseName.toLowerCase().trim() === keyName) ||
          (item.name && item.name.toLowerCase().trim() === keyName);

        const effectiveUnit = normalizeUnit(parent ? (parent.unit || item.unit) : item.unit).toLowerCase().trim();
        const matchUnit = effectiveUnit === keyUnit || normalizeUnit(item.unit).toLowerCase().trim() === keyUnit;

        if (matchName && matchUnit) {
          return { ...item, checked: targetChecked };
        }
        return item;
      })
    );
  };

  // Delete all items of an aggregated group (legacy wrapper matching fallback)
  const deleteItemGroup = (groupKeyName: string, _modifier: string | undefined, unit: string) => {
    const keyName = groupKeyName.toLowerCase().trim();
    const keyUnit = normalizeUnit(unit).toLowerCase().trim();

    saveList(prevList =>
      prevList.filter(item => {
        const baseKey = normalizeFoodBaseKey(item).toLowerCase().trim();
        const parent = getParentIngredient(item);
        const matchName =
          baseKey === keyName ||
          (parent?.baseName && parent.baseName.toLowerCase().trim() === keyName) ||
          (parent?.name && parent.name.toLowerCase().trim() === keyName) ||
          (item.baseName && item.baseName.toLowerCase().trim() === keyName) ||
          (item.name && item.name.toLowerCase().trim() === keyName);

        const effectiveUnit = normalizeUnit(parent ? (parent.unit || item.unit) : item.unit).toLowerCase().trim();
        const matchUnit = effectiveUnit === keyUnit || normalizeUnit(item.unit).toLowerCase().trim() === keyUnit;

        return !(matchName && matchUnit);
      })
    );
  };

  // Clear all items from the list
  const clearAll = () => {
    saveList([]);
  };

  // Clear only checked items
  const clearChecked = () => {
    saveList(prevList => prevList.filter(item => !item.checked));
  };

  // Aggregate items: group by raw parent ingredient or lowercase base key / unit.
  const aggregatedList = useMemo(() => {
    const uncheckedMap = new Map<string, AggregatedShoppingItem>();
    const checkedMap = new Map<string, AggregatedShoppingItem>();

    shoppingList.forEach(item => {
      const parent = getParentIngredient(item);
      const groupKeyName = normalizeFoodBaseKey(item);
      const displayUnit = normalizeUnit(parent ? (parent.unit || item.unit) : item.unit);

      const key = `${groupKeyName.toLowerCase().trim()}|${displayUnit.toLowerCase().trim()}`;
      const targetMap = item.checked ? checkedMap : uncheckedMap;

      const currentSubName = item.modifier ? `${item.name} (${item.modifier})` : item.name;

      const existing = targetMap.get(key);
      if (existing) {
        existing.amount += item.amount;
        if (!existing.itemIds.includes(item.id)) {
          existing.itemIds.push(item.id);
        }
        if (!existing.category && item.category) {
          existing.category = item.category;
        }

        // Initialize subItems on existing if merging items with different details/modifiers
        if (!existing.subItems && (existing.modifier !== item.modifier || existing.name !== item.name || existing.baseName !== item.baseName)) {
          const firstSubName = existing.modifier ? `${existing.name} (${existing.modifier})` : existing.name;
          const firstItemSource = existing.sources[0];
          existing.subItems = [{
            name: firstSubName,
            rawName: existing.name,
            baseName: existing.baseName || existing.name,
            modifier: existing.modifier,
            amount: existing.amount - item.amount,
            unit: existing.unit,
            recipeTitle: firstItemSource?.recipeTitle || ''
          }];
          existing.modifier = undefined;
        }

        if (existing.subItems) {
          const sub = existing.subItems.find(s => s.name.toLowerCase() === currentSubName.toLowerCase() && s.recipeTitle === item.recipeTitle);
          if (sub) {
            sub.amount += item.amount;
          } else {
            existing.subItems.push({
              name: currentSubName,
              rawName: item.name,
              baseName: item.baseName || item.name,
              modifier: item.modifier,
              amount: item.amount,
              unit: item.unit,
              recipeTitle: item.recipeTitle
            });
          }
        }

        // Avoid duplicate sources for the same recipe
        const hasSource = existing.sources.some(s => s.recipeId === item.recipeId);
        if (!hasSource) {
          existing.sources.push({
            recipeId: item.recipeId,
            recipeTitle: item.recipeTitle,
            amount: item.amount,
            unit: item.unit
          });
        } else {
          // If already has source, add the amount to that source
          const sourceObj = existing.sources.find(s => s.recipeId === item.recipeId);
          if (sourceObj) {
            sourceObj.amount += item.amount;
          }
        }
      } else {
        const initialSubItems = parent ? [{
          name: currentSubName,
          rawName: item.name,
          baseName: item.baseName || item.name,
          modifier: item.modifier,
          amount: item.amount,
          unit: item.unit,
          recipeTitle: item.recipeTitle
        }] : undefined;

        const displayName = getIngredientDisplayName(item);

        targetMap.set(key, {
          name: displayName,
          baseName: groupKeyName,
          parentIngredient: parent || undefined,
          modifier: parent ? undefined : item.modifier,
          unit: displayUnit,
          amount: item.amount,
          checked: item.checked,
          category: item.category,
          itemIds: [item.id],
          sources: [{
            recipeId: item.recipeId,
            recipeTitle: item.recipeTitle,
            amount: item.amount,
            unit: item.unit
          }],
          subItems: initialSubItems
        });
      }
    });

    return {
      unchecked: Array.from(uncheckedMap.values()),
      checked: Array.from(checkedMap.values())
    };
  }, [shoppingList]);

  // Aggregate active recipes that have ingredients on the shopping list
  const activeRecipes = useMemo(() => {
    const recipeMap = new Map<string, { recipeId: string; recipeTitle: string; totalItems: number; checkedItems: number }>();

    shoppingList.forEach(item => {
      if (!item.recipeId) return;
      const existing = recipeMap.get(item.recipeId);
      if (existing) {
        existing.totalItems += 1;
        if (item.checked) existing.checkedItems += 1;
      } else {
        recipeMap.set(item.recipeId, {
          recipeId: item.recipeId,
          recipeTitle: item.recipeTitle || '',
          totalItems: 1,
          checkedItems: item.checked ? 1 : 0,
        });
      }
    });

    return Array.from(recipeMap.values());
  }, [shoppingList]);

  // Remove all ingredients of a specific recipe from the list
  const removeRecipeFromList = (recipeId: string) => {
    saveList(prevList => prevList.filter(item => item.recipeId !== recipeId));
  };

  return {
    shoppingList,
    aggregatedList,
    activeRecipes,
    removeRecipeFromList,
    addRecipeIngredients,
    addCustomItem,
    toggleItemIds,
    deleteItemIds,
    toggleItemGroup,
    deleteItemGroup,
    clearAll,
    clearChecked
  };
}
