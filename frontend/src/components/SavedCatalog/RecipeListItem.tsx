import React from 'react';
import { Clock, Check, Tag, Star } from 'lucide-react';
import type { SavedRecipe } from '../../types';
import CachedImage from '../CachedImage';

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

  return (
    <div
      className={`rounded-2xl cursor-pointer active:scale-[0.99] transition-all p-2.5 flex flex-row items-center gap-3 overflow-hidden select-none bg-white dark:bg-gray-900 shadow-[0_2px_6px_rgba(0,0,0,0.03)] ${isSelected ? 'ring-2 ring-emerald-500 bg-emerald-500/5 dark:bg-emerald-500/10' : ''
        }`}
      onClick={onClick}
      {...bindLongPress}
    >
      {/* Select mode checkbox */}
      {isSelectMode && (
        <div className={`w-5 h-5 rounded-md border flex items-center justify-center flex-shrink-0 transition-all ${isSelected ? 'bg-emerald-500 border-emerald-500' : 'border-black/20 dark:border-white/20'
          }`}>
          {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
        </div>
      )}

      {/* Thumbnail */}
      <div className="w-14 h-14 rounded-xl overflow-hidden bg-black/5 dark:bg-white/5 shrink-0">
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
          {job.isFavorite && (
            <Star className="w-4 h-4 text-amber-500 shrink-0" strokeWidth={1.75} />
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
