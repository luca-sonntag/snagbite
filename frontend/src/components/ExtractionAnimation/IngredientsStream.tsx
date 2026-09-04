import { Utensils } from 'lucide-react';
import { useI18n } from '../../context/I18nContext';
import type { RecipePreviewData } from '../../types';

interface IngredientsStreamProps {
  preview: RecipePreviewData | null;
  compact?: boolean;
}

export default function IngredientsStream({ preview, compact = false }: IngredientsStreamProps) {
  const { t } = useI18n();

  const samples = preview?.ingredientsSample ?? [];
  const count = preview?.ingredientCount ?? samples.length;
  const hasIngredients = count > 0;

  if (!hasIngredients) {
    return (
      <div className="flex flex-col justify-between w-full h-[78px] overflow-hidden">
        <div className="flex items-center gap-1.5 text-xs font-medium text-gray-400 dark:text-gray-500 h-4">
          <Utensils className="w-3.5 h-3.5" />
          <span>{t('job.preview.ingredientsSkeleton')}</span>
        </div>
        <div className="flex-1 flex flex-wrap content-center gap-1.5 overflow-hidden max-h-[56px]">
          <div className="w-24 h-6 rounded-xl bg-gray-100 dark:bg-gray-800/80 animate-pulse shrink-0" />
          <div className="w-28 h-6 rounded-xl bg-gray-100 dark:bg-gray-800/80 animate-pulse shrink-0" />
          <div className="w-20 h-6 rounded-xl bg-gray-100 dark:bg-gray-800/80 animate-pulse shrink-0" />
          <div className="w-18 h-6 rounded-xl bg-gray-100 dark:bg-gray-800/80 animate-pulse shrink-0" />
          <div className="w-32 h-6 rounded-xl bg-gray-100 dark:bg-gray-800/80 animate-pulse shrink-0" />
        </div>
      </div>
    );
  }

  const maxVisible = compact ? 6 : 8;
  const visibleSamples = samples.slice(0, maxVisible);
  const remainingCount = Math.max(0, count - visibleSamples.length);

  return (
    <div className="flex flex-col justify-between w-full h-[78px] overflow-hidden">
      <div className="flex items-center text-xs font-medium text-gray-500 dark:text-gray-400 h-4">
        <div className="flex items-center gap-1.5">
          <Utensils className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
          <span>{t('job.preview.ingredientsFound', { count })}</span>
        </div>
      </div>

      <div className="flex-1 flex flex-wrap content-center gap-1.5 overflow-hidden max-h-[56px]">
        {visibleSamples.map((ing, idx) => (
          <span
            key={ing + idx}
            style={{ animationDelay: `${idx * 50}ms` }}
            className="inline-flex items-center px-2.5 py-1 rounded-xl text-xs font-medium bg-gray-50 dark:bg-gray-800/80 text-gray-700 dark:text-gray-300 border border-gray-100 dark:border-gray-800 animate-scale-pop shrink-0 whitespace-nowrap max-w-[150px] truncate"
          >
            {ing}
          </span>
        ))}
        {remainingCount > 0 && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-xl text-[11px] font-medium text-gray-400 dark:text-gray-500 shrink-0">
            +{remainingCount}
          </span>
        )}
      </div>
    </div>
  );
}
