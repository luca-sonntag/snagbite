import React from 'react';
import { Clock, Check, Tag, Star, Sparkles } from 'lucide-react';
import type { SavedRecipe } from '../../types';
import CachedImage from '../CachedImage';
import { hapticLight } from '../../utils/haptics';

interface RecipeListItemProps {
  job: SavedRecipe;
  isSelected: boolean;
  isSelectMode: boolean;
  /** Pre-formatted total time, e.g. "35 Min." — null hides the badge. */
  totalTime: string | null;
  recipeTags: string[];
  bindLongPress: any;
  onClick: (e: React.MouseEvent) => void;
}

/**
 * Dense list row — the alternative to the poster grid. One line of title,
 * one line of meta. Like the poster card it no longer carries direct buttons;
 * actions happen in multi-select mode or from the detail view.
 */
export default function RecipeListItem({
  job,
  isSelected,
  isSelectMode,
  totalTime,
  recipeTags,
  bindLongPress,
  onClick,
}: RecipeListItemProps) {
  const r = job.recipe!;
  const firstTag = recipeTags[0];
  const firstFlag = job.flags?.[0];
  const remixCount = job.remixCount ?? job.recipe?.remixCount ?? 0;

  return (
    <div
      className={`rounded-2xl cursor-pointer active:scale-[0.99] transition-all p-2.5 flex flex-row items-center gap-3 overflow-hidden select-none bg-white dark:bg-gray-900 shadow-[0_2px_6px_rgba(0,0,0,0.03)] border-none ${isSelected ? 'ring-2 ring-emerald-500 bg-emerald-500/5 dark:bg-emerald-500/10' : ''
        }`}
      onClick={(e) => {
        hapticLight();
        onClick(e);
      }}
      {...bindLongPress}
    >
      {/* Select mode checkbox */}
      {isSelectMode && (
        <div className={`w-6 h-6 rounded-xl border-none flex items-center justify-center flex-shrink-0 transition-all ${isSelected ? 'bg-emerald-500 text-white shadow-xs' : 'bg-black/5 dark:bg-white/10'
          }`}>
          {isSelected && <Check className="w-3.5 h-3.5 text-white stroke-[3px]" />}
        </div>
      )}

      {/* Thumbnail (Mobile UX rule: 72x72px min) */}
      <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-2xl overflow-hidden bg-black/5 dark:bg-white/5 shrink-0 border-none">
        <CachedImage
          src={r.imageUrl}
          emoji={r.emoji}
          alt={r.title}
          className="w-full h-full object-cover object-center pointer-events-none select-none"
        />
      </div>

      {/* Metadata */}
      <div className="flex-1 min-w-0 flex flex-col justify-center gap-0.5">
        <div className="flex items-center gap-1.5 min-w-0">
          <h4 className="text-sm font-bold text-gray-900 dark:text-white line-clamp-1 flex-1 min-w-0">
            {r.title}
          </h4>
          {remixCount > 0 && (
            <div
              className="w-6 h-6 rounded-lg bg-purple-500/15 dark:bg-purple-500/25 flex items-center justify-center shrink-0"
              title={`${remixCount} Remix(es)`}
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-500 fill-purple-500/30" />
            </div>
          )}
          {job.isFavorite && (
            <div className="w-6 h-6 rounded-lg bg-amber-500/15 dark:bg-amber-500/25 flex items-center justify-center shrink-0">
              <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5 min-w-0 text-xs text-gray-500 dark:text-gray-400">
          {totalTime && (
            <span className="flex items-center gap-1 shrink-0 font-medium">
              <Clock className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> {totalTime}
            </span>
          )}
          {firstTag && (
            <>
              {totalTime && <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-700 shrink-0" />}
              <span className="truncate">{firstTag}</span>
            </>
          )}
          {firstFlag && (
            <span className="shrink-0 flex items-center gap-0.5 text-amber-600 dark:text-amber-400 font-semibold">
              <Tag className="w-2.5 h-2.5" />
              <span className="truncate max-w-[6rem]">{firstFlag}</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
