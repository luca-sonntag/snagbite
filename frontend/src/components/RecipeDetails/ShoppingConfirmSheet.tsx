import { useEffect, useState } from 'react';
import { Button, Drawer } from '@heroui/react';
import { Check, Salad } from 'lucide-react';
import { useI18n } from '../../context/I18nContext';
import { getCategoryTheme } from '../../i18n';
import type { Ingredient, Recipe } from '../../types';

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
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});

  // Initialize selection when drawer opens
  useEffect(() => {
    if (isOpen) {
      const initial: Record<string, boolean> = {};
      sortedIngredients.forEach(({ group, originalIdx }) => {
        group.items.forEach((ing, idx) => {
          const uniqueId = `${ing.name}-${originalIdx}-${idx}`;
          // Voreinstellung: Normale Zutaten ausgewählt (true), Vorratszutaten abgewählt (false)
          initial[uniqueId] = !ing.isStaple;
        });
      });
      setSelectedIds(initial);
    }
  }, [isOpen, sortedIngredients]);

  const toggleItem = (id: string) => {
    setSelectedIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleConfirm = () => {
    const itemsToAdd: Ingredient[] = [];
    sortedIngredients.forEach(({ group, originalIdx }) => {
      group.items.forEach((ing, idx) => {
        const uniqueId = `${ing.name}-${originalIdx}-${idx}`;
        if (selectedIds[uniqueId]) {
          const baseAmount = ing.amount || 0;
          const scaledAmount = baseAmount * scaleFactor;
          itemsToAdd.push({
            name: ing.name,
            amount: scaledAmount,
            unit: ing.unit || '',
            notes: ing.notes,
            modifier: ing.modifier,
            category: group.name,
          });
        }
      });
    });
    onConfirm(itemsToAdd);
    onClose();
  };

  // Count how many are selected
  const selectedCount = Object.values(selectedIds).filter(Boolean).length;

  return (
    <div onClick={(e) => e.stopPropagation()}>
      <Drawer>
        <Drawer.Backdrop isOpen={isOpen} onOpenChange={(open) => { if (!open) onClose(); }} className="!z-[100]">
          <Drawer.Content placement="bottom" className="!z-[100]">
            <Drawer.Dialog className="relative !bg-white dark:!bg-gray-900 max-h-[85vh] flex flex-col pb-[calc(1.5rem_+_var(--safe-area-inset-bottom))]">
              <Drawer.Handle />

              {/* Header */}
              <Drawer.Header className="border-b border-black/5 dark:border-white/5 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full bg-emerald-500/5 flex items-center justify-center">
                    <Salad className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <Drawer.Heading className="text-base font-bold">
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
              <Drawer.Body className="overflow-y-auto py-4 flex-1 flex flex-col gap-4">
                <div className="flex flex-col gap-4">
                  {sortedIngredients.map(({ group, originalIdx }, sortedIdx) => {
                    // Check if any items in this group are displayed
                    if (group.items.length === 0) return null;
                    const theme = getCategoryTheme(group.name);

                    return (
                      <div key={sortedIdx} className="flex flex-col gap-1.5">
                        {recipe.ingredients.length > 1 && (
                          <h4 className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest flex items-center gap-2 mt-2">
                            <span className={`w-1 h-3.5 rounded-full ${theme.barClass} shrink-0`} />
                            <span>{translateCategory(group.name)}</span>
                          </h4>
                        )}
                        <div className="flex flex-col gap-1">
                          {group.items.map((ing, idx) => {
                            const scaledAmount = formatAmount(ing.amount, ing.unit);
                            const amountStr = scaledAmount ? `${scaledAmount} ` : '';
                            const unitStr = ing.unit ? `${ing.unit} ` : '';
                            const name = ing.name;
                            const uniqueId = `${name}-${originalIdx}-${idx}`;
                            const isChecked = !!selectedIds[uniqueId];

                            return (
                              <div
                                key={uniqueId}
                                onClick={() => toggleItem(uniqueId)}
                                className="flex items-center gap-3.5 py-2 px-2.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer transition-colors"
                              >
                                <div className={`w-5.5 h-5.5 rounded-md border flex items-center justify-center flex-shrink-0 transition-all ${isChecked ? 'bg-emerald-500 border-emerald-500' : 'border-black/20 dark:border-white/20'
                                  }`}>
                                  {isChecked && <Check className="w-3.5 h-3.5 text-white" />}
                                </div>
                                <div className={`flex-1 text-sm select-none transition-all flex flex-wrap items-center gap-1.5 ${isChecked ? 'text-gray-800 dark:text-gray-200' : 'text-gray-400 dark:text-gray-500'
                                  }`}>
                                  <span className="font-semibold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                                    {amountStr}{unitStr}
                                  </span>
                                  <span>{name}</span>
                                  {ing.isStaple && (
                                    <span className="inline-flex items-center ml-1.5 text-[9px] font-bold text-gray-400 dark:text-gray-500 bg-black/5 dark:bg-white/5 px-2 py-0.5 rounded-full uppercase tracking-wider select-none align-middle whitespace-nowrap no-underline">
                                      {t('recipe.staplePillLabel')}
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Drawer.Body>

              {/* Footer */}
              <Drawer.Footer className="border-t border-black/5 dark:border-white/5 pt-3 flex gap-2">
                <Button
                  variant="tertiary"
                  onPress={onClose}
                  className="w-full h-12 rounded-xl text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                >
                  {t('recipe.shoppingConfirmCancel')}
                </Button>
                <Button
                  className="w-full bg-gradient-to-b from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-semibold shadow-md transition-all h-12 rounded-xl"
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
