import { useEffect, useMemo, useState } from 'react';
import { Button, Drawer } from '@heroui/react';
import { Salad } from 'lucide-react';
import { useI18n } from '../../context/I18nContext';
import { usePantry } from '../../context/PantryContext';
import { hapticLight, hapticNotification } from '../../utils/haptics';
import type { Ingredient, Recipe } from '../../types';
import { findPantryStockMatch } from '../ShoppingList/shoppingItemUtils';
import ShoppingConfirmItem, { type MergedShoppingSheetItem } from './ShoppingConfirmItem';

interface ShoppingConfirmSheetProps {
  isOpen: boolean;
  onClose: () => void;
  recipe?: Recipe;
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
  sortedIngredients,
  scaleFactor,
  formatAmount,
  onConfirm,
  recipeLabel,
}: ShoppingConfirmSheetProps) {
  const { t } = useI18n();
  const { pantryItems } = usePantry();
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});

  // Group items by normalized food base key so alternative forms and parts merge cleanly
  const mergedGroups = useMemo(() => {
    return sortedIngredients.map(({ group, originalIdx }) => {
      const itemMap = new Map<string, MergedShoppingSheetItem>();

      group.items.forEach((ing) => {
        const id = `${ing.name}-${ing.amount}-${ing.unit}`;
        if (!itemMap.has(id)) {
          itemMap.set(id, {
            id,
            primaryIngredient: ing,
            childIngredients: [],
            groupCategory: group.name || ing.category,
            originalGroupIdx: originalIdx,
          });
        }
      });

      // Attach sub-ingredients (e.g. Gurkenwasser from Gewürzgurken)
      const primaryItems: MergedShoppingSheetItem[] = [];
      itemMap.forEach((mergedItem) => {
        const parentInfo = mergedItem.primaryIngredient.parentIngredient;
        if (parentInfo && parentInfo.name) {
          const parentItem = Array.from(itemMap.values()).find(
            (p) =>
              p.primaryIngredient.name.toLowerCase().trim() === parentInfo.name.toLowerCase().trim() ||
              (p.primaryIngredient.baseName &&
                p.primaryIngredient.baseName.toLowerCase().trim() === parentInfo.baseName.toLowerCase().trim())
          );

          if (parentItem && parentItem.id !== mergedItem.id) {
            parentItem.childIngredients.push(mergedItem.primaryIngredient);
            return;
          }
        }
        primaryItems.push(mergedItem);
      });

      return {
        groupName: group.name,
        originalIdx,
        items: primaryItems,
      };
    });
  }, [sortedIngredients]);

  const allItems = useMemo(() => {
    return mergedGroups.flatMap((g) => g.items);
  }, [mergedGroups]);

  // Initialize selection when drawer opens, taking pantry stock & staple status into account
  useEffect(() => {
    if (isOpen) {
      const initial: Record<string, boolean> = {};
      allItems.forEach((item) => {
        const requiredAmt = (item.primaryIngredient.amount || 0) * scaleFactor;
        const stockMatch = findPantryStockMatch(
          item.primaryIngredient,
          pantryItems,
          requiredAmt,
          item.primaryIngredient.unit
        );
        // If stock is sufficient (not partial), it is in stock and deselected by default.
        // If stock is partial (too little in stock), it remains selected so the user buys more.
        const inStockAndSufficient = stockMatch ? !stockMatch.isPartial : false;
        initial[item.id] = !inStockAndSufficient && !item.primaryIngredient.isStaple;
      });
      setSelectedIds(initial);
    }
  }, [isOpen, allItems, pantryItems, scaleFactor]);

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

              {/* Body: persistent visible scrollbar and flat clean ingredient list */}
              <Drawer.Body className="overflow-y-scroll py-2 pr-1 flex-1 [scrollbar-width:thin] [scrollbar-color:rgba(156,163,175,0.4)_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-300 dark:[&::-webkit-scrollbar-thumb]:bg-gray-600 [&::-webkit-scrollbar-track]:bg-transparent">
                <div className="flex flex-col gap-1">
                  {allItems.map((item) => {
                    const requiredAmt = (item.primaryIngredient.amount || 0) * scaleFactor;
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
                        formatAmount={formatAmount}
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
