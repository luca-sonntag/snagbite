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
      <div className="flex flex-col justify-between w-full h-[52px] overflow-hidden">
        <div className="flex items-center gap-2 text-xs font-medium text-gray-400 dark:text-gray-500 h-4">
          <Utensils className="w-3.5 h-3.5" />
          <span>{t('job.preview.ingredientsSkeleton')}</span>
        </div>
        <div className="flex items-center gap-2 h-6 overflow-hidden flex-nowrap">
          <div className="w-24 h-6 rounded-full bg-gray-100 dark:bg-gray-800/80 animate-pulse shrink-0" />
          <div className="w-28 h-6 rounded-full bg-gray-100 dark:bg-gray-800/80 animate-pulse shrink-0" />
          <div className="w-20 h-6 rounded-full bg-gray-100 dark:bg-gray-800/80 animate-pulse shrink-0" />
        </div>
      </div>
    );
  }

  const maxVisible = compact ? 3 : 5;
  const visibleSamples = samples.slice(0, maxVisible);
  const remainingCount = Math.max(0, count - visibleSamples.length);

  return (
    <div className="flex flex-col justify-between w-full h-[52px] overflow-hidden">
      <div className="flex items-center text-xs font-semibold text-gray-600 dark:text-gray-300 h-4">
        <div className="flex items-center gap-1.5">
          <Utensils className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>{t('job.preview.ingredientsFound', { count })}</span>
        </div>
      </div>

      <div className="flex items-center gap-1.5 h-6 overflow-hidden flex-nowrap">
        {visibleSamples.map((ing, idx) => (
          <span
            key={ing + idx}
            style={{ animationDelay: `${idx * 60}ms` }}
            className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 animate-scale-pop shadow-2xs shrink-0 whitespace-nowrap max-w-[120px] truncate"
          >
            {ing}
          </span>
        ))}
        {remainingCount > 0 && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold text-gray-400 dark:text-gray-500 shrink-0">
            +{remainingCount}
          </span>
        )}
      </div>
    </div>
  );
}
