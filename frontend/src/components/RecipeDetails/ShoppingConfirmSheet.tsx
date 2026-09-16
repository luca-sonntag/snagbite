import { useEffect, useMemo, useState } from 'react';
import { Button, Drawer } from '@heroui/react';
import { Salad } from 'lucide-react';
import { useI18n } from '../../context/I18nContext';
import { usePantry } from '../../context/PantryContext';
import { useModalOverlay } from '../../context/OverlayStackContext';
import { hapticLight, hapticNotification } from '../../utils/haptics';
import { formatQuantity } from '../../utils/formatQuantity';
import type { Ingredient, Recipe, MealPlanRecipeSummary } from '../../types';
import { findPantryStockMatch } from '../ShoppingList/shoppingItemUtils';
import ShoppingConfirmItem, { type MergedShoppingSheetItem } from './ShoppingConfirmItem';
import ServingsStepper from '../ServingsStepper';

interface ShoppingConfirmSheetProps {
  isOpen: boolean;
  onClose: () => void;
  recipe?: Recipe | MealPlanRecipeSummary;
  sortedIngredients: Array<{ group: { name: string; items: Ingredient[] }; originalIdx: number }>;
  scaleFactor?: number;
  formatAmount?: (amount: number | undefined, unit: string | undefined) => string;
  onConfirm: (selectedIngredients: Ingredient[]) => Promise<void> | void;
  /** Optional label shown in the header when the sheet is used in bulk mode */
  recipeLabel?: string;
}

export default function ShoppingConfirmSheet({
  isOpen,
  onClose,
  recipe,
  sortedIngredients,
  scaleFactor = 1,
  onConfirm,
  recipeLabel,
}: ShoppingConfirmSheetProps) {
  const { t } = useI18n();
  const { pantryItems } = usePantry();
  useModalOverlay(isOpen, onClose);

  const baseServings = Math.max(1, Number(recipe?.servings) || 2);
  const initialServings = Math.max(1, Math.round(baseServings * (scaleFactor || 1)));
  const [servings, setServings] = useState<number>(initialServings);
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (isOpen) {
      setServings(initialServings);
    }
  }, [isOpen, initialServings]);

  const activeScaleFactor = servings / baseServings;

  // Merge ingredients that share a parent in the same recipe across all groups
  const allItems = useMemo(() => {
    const allIngredientsInRecipe = sortedIngredients.flatMap((g) => g.group.items);
    const childMap = new Map<string, Ingredient[]>();
    const childrenSet = new Set<Ingredient>();

    for (const { group } of sortedIngredients) {
      for (const ing of group.items) {
        if (ing.parentIngredient?.baseName || ing.parentIngredient?.name) {
          const parentBase = (ing.parentIngredient.baseName || '').toLowerCase().trim();
          const parentName = (ing.parentIngredient.name || '').toLowerCase().trim();

          const parentInRecipe = allIngredientsInRecipe.find(
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

    const items: MergedShoppingSheetItem[] = [];
    sortedIngredients.forEach(({ group, originalIdx }) => {
      group.items.forEach((ing, idx) => {
        if (childrenSet.has(ing)) return;

        const parentKey = `${ing.name}-${ing.baseName || ''}`;
        const children = childMap.get(parentKey) || [];

        items.push({
          id: `${ing.name}-${originalIdx}-${idx}`,
          primaryIngredient: ing,
          childIngredients: children,
          groupCategory: group.name || ing.category,
          originalGroupIdx: originalIdx,
        });
      });
    });

    return items;
  }, [sortedIngredients]);

  // Initialize selection when drawer opens or portions change, taking pantry stock & staple status into account
  useEffect(() => {
    if (isOpen) {
      const initial: Record<string, boolean> = {};
      allItems.forEach((item) => {
        const requiredAmt = (item.primaryIngredient.amount || 0) * activeScaleFactor;
        const stockMatch = findPantryStockMatch(
          item.primaryIngredient,
          pantryItems,
          requiredAmt,
          item.primaryIngredient.unit
        );
        const inStockAndSufficient = stockMatch ? !stockMatch.isPartial : false;
        initial[item.id] = !inStockAndSufficient && !item.primaryIngredient.isStaple;
      });
      setSelectedIds(initial);
    }
  }, [isOpen, allItems, pantryItems, activeScaleFactor]);

  const toggleItem = (id: string) => {
    hapticLight();
    setSelectedIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleConfirm = async () => {
    hapticNotification('success');
    const itemsToAdd: Ingredient[] = [];
    allItems.forEach((item) => {
      if (selectedIds[item.id]) {
        const ing = item.primaryIngredient;
        const baseAmount = ing.amount || 0;
        const scaledAmount = baseAmount * activeScaleFactor;
        itemsToAdd.push({
          ...ing,
          amount: scaledAmount,
          unit: ing.unit || '',
          category: item.groupCategory || ing.category,
        });
      }
    });
    await onConfirm(itemsToAdd);
    onClose();
  };

  const scaledFormatAmount = (amount: number | undefined, unit: string | undefined) => {
    if (!amount) return '';
    return formatQuantity(amount * activeScaleFactor, unit);
  };

  const selectedCount = Object.values(selectedIds).filter(Boolean).length;

  return (
    <div onClick={(e) => e.stopPropagation()}>
      <Drawer>
        <Drawer.Backdrop isOpen={isOpen} onOpenChange={(open) => { if (!open) onClose(); }} className="!z-[100]">
          <Drawer.Content placement="bottom" className="!z-[100]">
            <Drawer.Dialog className="relative !bg-gray-50 dark:!bg-gray-950 max-h-[85vh] flex flex-col p-5 pb-[calc(1.5rem_+_var(--safe-area-inset-bottom))] rounded-t-3xl border-none shadow-[0_-4px_30px_rgba(0,0,0,0.12)]">
              <Drawer.Handle />

              {/* Header */}
              <Drawer.Header className="pb-2 mb-1">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 border-none flex items-center justify-center shrink-0">
                    <Salad className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div className="min-w-0">
                    <Drawer.Heading className="text-base font-bold text-gray-900 dark:text-white truncate">
                      {t('recipe.shoppingConfirmTitle')}
                    </Drawer.Heading>
                    {recipeLabel ? (
                      <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5 truncate max-w-[240px] sm:max-w-[320px]">
                        {recipeLabel}
                      </p>
                    ) : (
                      <p className="text-xs text-gray-500 dark:text-gray-400 font-normal mt-0.5 truncate">
                        {t('recipe.shoppingConfirmSubtitle')}
                      </p>
                    )}
                  </div>
                </div>
              </Drawer.Header>

              {/* Dedicated Servings Stepper Row under Header */}
              <div className="flex items-center justify-between px-3.5 py-2 mb-2 rounded-2xl bg-white dark:bg-gray-900 shadow-2xs border-none select-none">
                <span className="text-sm font-bold text-gray-800 dark:text-gray-200">
                  {t('mealPlanner.servings') || 'Portionen'}
                </span>
                <ServingsStepper
                  servings={servings}
                  onDecrease={() => setServings((s) => Math.max(1, s - 1))}
                  onIncrease={() => setServings((s) => s + 1)}
                  size="sm"
                  showIcon={false}
                  ariaLabel={t('mealPlanner.servings')}
                />
              </div>

              {/* Body: persistent visible scrollbar and flat clean ingredient list */}
              <Drawer.Body className="overflow-y-scroll py-2 pr-1 flex-1 [scrollbar-width:thin] [scrollbar-color:rgba(156,163,175,0.4)_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-300 dark:[&::-webkit-scrollbar-thumb]:bg-gray-600 [&::-webkit-scrollbar-track]:bg-transparent">
                <div className="flex flex-col gap-1">
                  {allItems.map((item) => {
                    const requiredAmt = (item.primaryIngredient.amount || 0) * activeScaleFactor;
                    const pantryStockMatch = findPantryStockMatch(
                      item.primaryIngredient,
                      pantryItems,
                      requiredAmt,
                      item.primaryIngredient.unit
                    );
                    return (
                      <ShoppingConfirmItem
                        key={item.id}
                        item={item}
                        isChecked={!!selectedIds[item.id]}
                        onToggle={() => toggleItem(item.id)}
                        formatAmount={scaledFormatAmount}
                        groupCategory={item.groupCategory}
                        pantryStockMatch={pantryStockMatch}
                      />
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
