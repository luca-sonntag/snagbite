import { Tag } from 'lucide-react';
import type { RecipeCategory, SavedRecipe } from '../../types';
import { useI18n } from '../../context/I18nContext';
import { getRecipeCategoryLabel, getRecipeCategoryEmoji } from '../../i18n';
import { hapticLight } from '../../utils/haptics';
import type { CatalogPreset } from './catalogRoutes';

interface CategoryLabelBarProps {
  availableCategories?: RecipeCategory[];
  jobsByCategory?: Partial<Record<RecipeCategory, SavedRecipe[]>>;
  allFlags: string[];
  jobsByFlag?: Record<string, SavedRecipe[]>;
  onOpenList: (preset: CatalogPreset) => void;
}

/**
 * Combined horizontal scroll bar rendering both category pills and user label pills
 * side-by-side in a single row under collections.
 */
export default function CategoryLabelBar({
  availableCategories = [],
  jobsByCategory = {},
  allFlags = [],
  jobsByFlag = {},
  onOpenList,
}: CategoryLabelBarProps) {
  const { language } = useI18n();

  if (availableCategories.length === 0 && allFlags.length === 0) {
    return null;
  }

  return (
    <div className="flex gap-2 overflow-x-auto scrollbar-none -mx-4 px-4 md:-mx-6 md:px-6 pt-0.5 pb-0.5 scroll-smooth">
      {/* 🏷️ Labels */}
      {allFlags.map(flag => {
        const count = jobsByFlag[flag]?.length ?? 0;
        return (
          <button
            key={flag}
            type="button"
            onClick={() => {
              hapticLight();
              onOpenList({ kind: 'flag', name: flag });
            }}
            className="min-h-[44px] px-3.5 py-2 text-xs font-semibold rounded-2xl border-none bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.04)] dark:shadow-none hover:bg-gray-50 dark:hover:bg-gray-800 active:scale-95 transition-all duration-200 ease-out whitespace-nowrap cursor-pointer flex items-center gap-2 shrink-0 select-none"
          >
            <Tag className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span>{flag}</span>
            {count > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                {count}
              </span>
            )}
          </button>
        );
      })}

      {/* 🍲 Categories */}
      {availableCategories.map(cat => {
        const count = jobsByCategory[cat]?.length ?? 0;
        return (
          <button
            key={cat}
            type="button"
            onClick={() => {
              hapticLight();
              onOpenList({ kind: 'category', category: cat });
            }}
            className="min-h-[44px] px-3.5 py-2 text-xs font-semibold rounded-2xl border-none bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.04)] dark:shadow-none hover:bg-gray-50 dark:hover:bg-gray-800 active:scale-95 transition-all duration-200 ease-out whitespace-nowrap cursor-pointer flex items-center gap-2 shrink-0 select-none"
          >
            <span className="text-base leading-none shrink-0">{getRecipeCategoryEmoji(cat)}</span>
            <span>{getRecipeCategoryLabel(cat, language)}</span>
            {count > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
