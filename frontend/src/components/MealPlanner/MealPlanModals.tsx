import type { SavedRecipe, MealPlanEntry, Ingredient, MealType } from '../../types';
import type { BulkShoppingItem } from './types';
import { RecipePickerModal } from './RecipePickerModal';
import { MealPlanShoppingSheets } from './MealPlanShoppingSheets';
import CookedModal from '../CookedModal';
import { HouseholdSheet } from '../Household';
import PremiumModal from '../PremiumModal';

export interface CookedModalTargetState {
  id: string;
  title: string;
  entry: MealPlanEntry;
  pullToToday?: boolean;
}

export interface MealPlanSlotState {
  date: string;
  mealType?: MealType;
}

interface MealPlanModalsProps {
  pickerSlot: MealPlanSlotState | null;
  selectedDate: string | null;
  todayStr: string;
  history?: SavedRecipe[];
  onClosePicker: () => void;
  onSelectRecipe: (saved: SavedRecipe, targetDate?: string) => void;
  currentBulkItem: BulkShoppingItem | null;
  onConfirmBulkShopping: (items: Ingredient[]) => Promise<void> | void;
  onCloseBulkShopping: () => void;
  cookedModalTarget: CookedModalTargetState | null;
  onSuccessCooked: () => void;
  onCloseCooked: () => void;
  isHouseholdOpen: boolean;
  onOpenHouseholdChange: (open: boolean) => void;
  onOpenUpgrade: () => void;
  isPremiumModalOpen: boolean;
  onOpenPremiumModalChange: (open: boolean) => void;
}

export function MealPlanModals({
  pickerSlot,
  selectedDate,
  todayStr,
  history = [],
  onClosePicker,
  onSelectRecipe,
  currentBulkItem,
  onConfirmBulkShopping,
  onCloseBulkShopping,
  cookedModalTarget,
  onSuccessCooked,
  onCloseCooked,
  isHouseholdOpen,
  onOpenHouseholdChange,
  onOpenUpgrade,
  isPremiumModalOpen,
  onOpenPremiumModalChange,
}: MealPlanModalsProps) {
  return (
    <>
      <RecipePickerModal
        isOpen={!!pickerSlot}
        mealType={pickerSlot?.mealType ?? null}
        dateStr={pickerSlot?.date ?? selectedDate ?? todayStr}
        history={history}
        onClose={onClosePicker}
        onSelectRecipe={onSelectRecipe}
      />

      <MealPlanShoppingSheets
        currentBulkItem={currentBulkItem}
        onConfirm={onConfirmBulkShopping}
        onClose={onCloseBulkShopping}
      />

      {cookedModalTarget && (
        <CookedModal
          isOpen={!!cookedModalTarget}
          recipeId={cookedModalTarget.id}
          recipeTitle={cookedModalTarget.title}
          onSuccess={onSuccessCooked}
          onClose={onCloseCooked}
        />
      )}

      <HouseholdSheet
        isOpen={isHouseholdOpen}
        onOpenChange={onOpenHouseholdChange}
        onOpenUpgrade={onOpenUpgrade}
      />
      <PremiumModal
        isOpen={isPremiumModalOpen}
        onOpenChange={onOpenPremiumModalChange}
      />
    </>
  );
}
