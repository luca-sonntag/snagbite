import { useEffect, useMemo, useState } from 'react';
import { Button, Drawer } from '@heroui/react';
import { Salad } from 'lucide-react';
import { useI18n } from '../../context/I18nContext';
import { usePantry } from '../../context/PantryContext';
import { getCategoryTheme } from '../../i18n';
import { hapticLight, hapticNotification } from '../../utils/haptics';
import type { Ingredient, Recipe } from '../../types';
import { findPantryStock } from '../ShoppingList/shoppingItemUtils';
import ShoppingConfirmItem, { type MergedShoppingSheetItem } from './ShoppingConfirmItem';

interface ShoppingConfirmSheetProps {
  isOpen: boolean;
  onClose: () => void;
  recipe: Recipe;
  sortedIngredients: Array<{ group: { name: string; items: Ingredient[] }; originalIdx: number }>;
  scaleFactor: number;
  formatAmount: (amount: number | undefined, unit: string | undefined) => string;
  onConfirm: (selectedIngredients: Ingredient[]) => void;
  /** Optional label shown in the header when the sheet is used in bulk mode */
  recipeLabel?: string;
}

export default function ShoppingConfirmSheet({
  isOpen,
  onClose,
  recipe,
  sortedIngredients,
  scaleFactor,
  formatAmount,
  onConfirm,
  recipeLabel,
}: ShoppingConfirmSheetProps) {
  const { t, translateCategory } = useI18n();
  const { pantryItems } = usePantry();
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});

  // Merge ingredients that share a parent in the same recipe (e.g. Gurkenwasser -> Gewürzgurken)
  const mergedGroups = useMemo(() => {
    const allItemsInRecipe = sortedIngredients.flatMap((g) => g.group.items);
    const childMap = new Map<string, Ingredient[]>();
    const childrenSet = new Set<Ingredient>();

    for (const { group } of sortedIngredients) {
      for (const ing of group.items) {
        if (ing.parentIngredient?.baseName || ing.parentIngredient?.name) {
          const parentBase = (ing.parentIngredient.baseName || '').toLowerCase().trim();
          const parentName = (ing.parentIngredient.name || '').toLowerCase().trim();

          const parentInRecipe = allItemsInRecipe.find(
            (other) =>
              other !== ing &&
              ((other.baseName && other.baseName.toLowerCase().trim() === parentBase) ||
                other.name.toLowerCase().trim() === parentName)
          );

          if (parentInRecipe) {
            childrenSet.add(ing);
            const parentKey = `${parentInRecipe.name}-${parentInRecipe.baseName || ''}`;
            const list = childMap.get(parentKey) || [];
            list.push(ing);
            childMap.set(parentKey, list);
          }
        }
      }
    }

    return sortedIngredients.map(({ group, originalIdx }) => {
      const items: MergedShoppingSheetItem[] = [];
      group.items.forEach((ing, idx) => {
        if (childrenSet.has(ing)) return;

        const parentKey = `${ing.name}-${ing.baseName || ''}`;
        const children = childMap.get(parentKey) || [];

        items.push({
          id: `${ing.name}-${originalIdx}-${idx}`,
          primaryIngredient: ing,
          childIngredients: children,
          groupCategory: group.name,
          originalGroupIdx: originalIdx,
        });
      });

      return {
        groupName: group.name,
        originalIdx,
        items,
      };
    });
  }, [sortedIngredients]);

  // Initialize selection when drawer opens, taking pantry stock & staple status into account
  useEffect(() => {
    if (isOpen) {
      const initial: Record<string, boolean> = {};
      mergedGroups.forEach(({ items }) => {
        items.forEach((item) => {
          const inStock = !!findPantryStock(item.primaryIngredient, pantryItems);
          initial[item.id] = !inStock && !item.primaryIngredient.isStaple;
        });
      });
      setSelectedIds(initial);
    }
  }, [isOpen, mergedGroups, pantryItems]);

  const toggleItem = (id: string) => {
    hapticLight();
    setSelectedIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleConfirm = () => {
    hapticNotification('success');
    const itemsToAdd: Ingredient[] = [];
    mergedGroups.forEach(({ groupName, items }) => {
      items.forEach((item) => {
        if (selectedIds[item.id]) {
          const ing = item.primaryIngredient;
          const baseAmount = ing.amount || 0;
          const scaledAmount = baseAmount * scaleFactor;
          itemsToAdd.push({
            ...ing,
            amount: scaledAmount,
            unit: ing.unit || '',
            category: groupName || ing.category,
          });
        }
      });
    });
    onConfirm(itemsToAdd);
    onClose();
  };

  const selectedCount = Object.values(selectedIds).filter(Boolean).length;

  return (
    <div onClick={(e) => e.stopPropagation()}>
      <Drawer>
        <Drawer.Backdrop isOpen={isOpen} onOpenChange={(open) => { if (!open) onClose(); }} className="!z-[100]">
          <Drawer.Content placement="bottom" className="!z-[100]">
            <Drawer.Dialog className="relative !bg-white dark:!bg-gray-900 max-h-[85vh] flex flex-col p-5 pb-[calc(1.5rem_+_var(--safe-area-inset-bottom))] rounded-t-3xl border-none shadow-[0_-4px_30px_rgba(0,0,0,0.12)]">
              <Drawer.Handle />

              {/* Header */}
              <Drawer.Header className="pb-3 mb-1">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 border-none flex items-center justify-center">
                    <Salad className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <Drawer.Heading className="text-base font-bold text-gray-900 dark:text-white">
                      {t('recipe.shoppingConfirmTitle')}
                    </Drawer.Heading>
                    {recipeLabel ? (
                      <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5 truncate max-w-[220px]">
                        {recipeLabel}
                      </p>
                    ) : (
                      <p className="text-xs text-gray-500 dark:text-gray-400 font-normal mt-0.5">
                        {t('recipe.shoppingConfirmSubtitle')}
                      </p>
                    )}
                  </div>
                </div>
              </Drawer.Header>

              {/* Body */}
              <Drawer.Body className="overflow-y-auto py-2 flex-1 flex flex-col gap-4">
                <div className="flex flex-col gap-4">
                  {mergedGroups.map(({ groupName, items }, sortedIdx) => {
                    if (items.length === 0) return null;
                    const theme = getCategoryTheme(groupName);

                    return (
                      <div key={sortedIdx} className="flex flex-col gap-1.5">
                        {recipe.ingredients.length > 1 && (
                          <h4 className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest flex items-center gap-2 mt-2">
                            <span className={`w-1 h-3.5 rounded-full ${theme.barClass} shrink-0`} />
                            <span>{translateCategory(groupName)}</span>
                          </h4>
                        )}
                        <div className="flex flex-col gap-1">
                          {items.map((item) => {
                            const pantryStock = findPantryStock(item.primaryIngredient, pantryItems);
                            return (
                              <ShoppingConfirmItem
                                key={item.id}
                                item={item}
                                isChecked={!!selectedIds[item.id]}
                                onToggle={() => toggleItem(item.id)}
                                formatAmount={formatAmount}
                                groupCategory={groupName}
                                pantryStock={pantryStock}
                              />
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Drawer.Body>

              {/* Footer */}
              <Drawer.Footer className="pt-3 flex gap-2">
                <Button
                  variant="tertiary"
                  onPress={onClose}
                  className="w-full h-12 rounded-2xl font-bold bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 border-none active:scale-95 transition-all cursor-pointer"
                >
                  {t('recipe.shoppingConfirmCancel')}
                </Button>
                <Button
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-none border-none transition-all h-12 rounded-2xl active:scale-95 cursor-pointer"
                  onPress={handleConfirm}
                  isDisabled={selectedCount === 0}
                >
                  {selectedCount === 1
                    ? t('recipe.shoppingConfirmAddOne')
                    : t('recipe.shoppingConfirmAddMany', { count: selectedCount })}
                </Button>
              </Drawer.Footer>
            </Drawer.Dialog>
          </Drawer.Content>
        </Drawer.Backdrop>
      </Drawer>
    </div>
  );
}
