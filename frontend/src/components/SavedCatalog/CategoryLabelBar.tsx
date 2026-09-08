import { Tag } from 'lucide-react';
import type { SavedRecipe } from '../../types';
import { hapticLight } from '../../utils/haptics';
import type { CatalogPreset } from './catalogRoutes';

interface CategoryLabelBarProps {
  allFlags: string[];
  jobsByFlag?: Record<string, SavedRecipe[]>;
  onOpenList: (preset: CatalogPreset) => void;
}

/**
 * Horizontal scroll bar rendering user label pills
 * in a row under collections if any exist.
 */
export default function CategoryLabelBar({
  allFlags = [],
  jobsByFlag = {},
  onOpenList,
}: CategoryLabelBarProps) {
  if (allFlags.length === 0) {
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
    </div>
  );
}

