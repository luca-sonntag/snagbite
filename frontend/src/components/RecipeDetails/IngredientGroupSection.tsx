import type { Ingredient } from '../../types';
import IngredientItemGrid from './IngredientItemGrid';
import IngredientItemRow from './IngredientItemRow';

interface IngredientGroupSectionProps {
  title?: string;
  count?: number;
  ingredients: Ingredient[];
  viewMode: 'grid' | 'list';
  isPremium: boolean;
  scaleFactor: number;
  formatAmount: (amount: number | undefined, unit: string | undefined) => string;
  onSelectNutrition: (item: Ingredient, category?: string) => void;
  onOpenProFeature: () => void;
  itemOffset?: number;
}

export default function IngredientGroupSection({
  title,
  count,
  ingredients,
  viewMode,
  isPremium,
  scaleFactor,
  formatAmount,
  onSelectNutrition,
  onOpenProFeature,
  itemOffset = 0,
}: IngredientGroupSectionProps) {
  if (ingredients.length === 0) return null;

  return (
    <div className="flex flex-col">
      {title && (
        <div className="px-0.5 pt-3.5 pb-1.5 flex items-center justify-between gap-2 border-none">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 truncate">
              {title}
            </span>
            {count !== undefined && (
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-black/[0.04] dark:bg-white/[0.06] text-gray-500 dark:text-gray-400 shrink-0">
                {count}
              </span>
            )}
          </div>
        </div>
      )}

      {viewMode === 'grid' ? (
        <ul className="grid grid-cols-2 gap-x-2 sm:gap-x-3 gap-y-1.5 px-0 pt-1 pb-3 list-none m-0 animate-fade-in">
          {ingredients.map((ing, idx) => (
            <IngredientItemGrid
              key={`${ing.name}-${itemOffset + idx}`}
              id={itemOffset + idx === 0 ? 'tour-recipe-ingredients' : undefined}
              ingredient={ing}
              categoryName={ing.category}
              originalIdx={itemOffset + idx}
              itemIdx={itemOffset + idx}
              isPremium={isPremium}
              scaleFactor={scaleFactor}
              formatAmount={formatAmount}
              onSelectNutrition={(item, cat) => onSelectNutrition(item, cat)}
              onOpenProFeature={onOpenProFeature}
            />
          ))}
        </ul>
      ) : (
        <ul className="flex flex-col divide-y divide-black/[0.05] dark:divide-white/[0.06] list-none p-0 m-0 animate-fade-in">
          {ingredients.map((ing, idx) => (
            <IngredientItemRow
              key={`${ing.name}-${itemOffset + idx}`}
              id={itemOffset + idx === 0 ? 'tour-recipe-ingredients' : undefined}
              ingredient={ing}
              categoryName={ing.category}
              originalIdx={itemOffset + idx}
              itemIdx={itemOffset + idx}
              isPremium={isPremium}
              scaleFactor={scaleFactor}
              formatAmount={formatAmount}
              onSelectNutrition={(item, cat) => onSelectNutrition(item, cat)}
              onOpenProFeature={onOpenProFeature}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
