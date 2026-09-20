import { Drawer } from '@heroui/react';
import { useModalOverlay } from '../../context/OverlayStackContext';
import type { Ingredient } from '../../types';
import IngredientNutritionDetails from './IngredientNutritionDetails';

interface IngredientNutritionSheetProps {
  isOpen: boolean;
  onClose: () => void;
  ingredient: Ingredient | null;
  category?: string;
  scaleFactor?: number;
  servings?: number;
}

export default function IngredientNutritionSheet({
  isOpen,
  onClose,
  ingredient,
  category,
  scaleFactor = 1,
  servings = 1,
}: IngredientNutritionSheetProps) {
  useModalOverlay(isOpen, onClose);

  if (!ingredient) return null;

  return (
    <div onClick={(e) => e.stopPropagation()}>
      <Drawer>
        <Drawer.Backdrop
          isOpen={isOpen}
          onOpenChange={(open) => {
            if (!open) onClose();
          }}
          className="!z-[100]"
        >
          <Drawer.Content placement="bottom" className="!z-[100]">
            <Drawer.Dialog className="relative !bg-gray-50 dark:!bg-gray-950 !p-0 pb-[calc(1.5rem_+_var(--safe-area-inset-bottom))] rounded-t-3xl border-none shadow-[0_-4px_30px_rgba(0,0,0,0.12)]">
              <Drawer.Handle />
              <div className="p-5 sm:p-6 max-w-lg mx-auto w-full">
                <IngredientNutritionDetails
                  ingredient={ingredient}
                  category={category}
                  scaleFactor={scaleFactor}
                  servings={servings}
                  onClose={onClose}
                />
              </div>
            </Drawer.Dialog>
          </Drawer.Content>
        </Drawer.Backdrop>
      </Drawer>
    </div>
  );
}
