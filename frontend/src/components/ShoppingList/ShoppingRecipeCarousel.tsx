import type { Job } from '../../types';
import { useI18n } from '../../context/I18nContext';
import ShoppingRecipeCard from './ShoppingRecipeCard';

interface ActiveShoppingRecipe {
  recipeId: string;
  recipeTitle: string;
  totalItems: number;
  checkedItems: number;
}

interface ShoppingRecipeCarouselProps {
  recipes: ActiveShoppingRecipe[];
  history?: Job[];
  onSelectRecipe: (jobId: string) => void;
  onRemoveRecipe: (recipeId: string, recipeTitle: string) => void;
}

export default function ShoppingRecipeCarousel({
  recipes,
  history = [],
  onSelectRecipe,
  onRemoveRecipe,
}: ShoppingRecipeCarouselProps) {
  const { t } = useI18n();

  if (!recipes || recipes.length === 0) return null;

  // Map history jobs by id for quick lookup of images/metadata
  const historyMap = new Map<string, Job>();
  history.forEach((job) => {
    historyMap.set(job.id, job);
  });

  return (
    <section className="flex flex-col gap-2 pt-1 pb-1">
      <div className="flex items-center justify-between gap-2 px-0.5">
        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
          {t('shopping.recipesSectionTitle')}
        </h3>
        <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 tabular-nums">
          {recipes.length === 1
            ? t('shopping.recipesCountSingle')
            : t('shopping.recipesCount', { count: recipes.length })}
        </span>
      </div>

      <div className="flex gap-3 overflow-x-auto scrollbar-none -mx-4 px-4 md:-mx-6 md:px-6 py-1 scroll-smooth">
        {recipes.map((rec) => {
          const job = historyMap.get(rec.recipeId);
          return (
            <ShoppingRecipeCard
              key={rec.recipeId}
              recipeId={rec.recipeId}
              recipeTitle={rec.recipeTitle}
              totalItems={rec.totalItems}
              checkedItems={rec.checkedItems}
              job={job}
              onSelect={() => onSelectRecipe(rec.recipeId)}
              onRemove={() => onRemoveRecipe(rec.recipeId, rec.recipeTitle)}
            />
          );
        })}
      </div>
    </section>
  );
}
