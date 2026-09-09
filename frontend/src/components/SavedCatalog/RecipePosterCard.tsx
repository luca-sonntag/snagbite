import React from 'react';
import { Clock, Check, Star, Layers } from 'lucide-react';
import type { SavedRecipe } from '../../types';
import CachedImage from '../CachedImage';
import { hapticLight } from '../../utils/haptics';

interface RecipePosterCardProps {
  job: SavedRecipe;
  /** Pre-formatted total time, e.g. "35 Min." — null hides the badge. */
  totalTime: string | null;
  onClick: (e: React.MouseEvent) => void;
  /**
   * `grid` fills its column (2-up catalog grid), `shelf` is a fixed-width
   * card for the horizontally scrolling rows on the cookbook home.
   */
  variant?: 'grid' | 'shelf';
  isSelected?: boolean;
  isSelectMode?: boolean;
  bindLongPress?: any;
}

/**
 * Compact recipe poster: clean food photo, title and unified duration/calories meta below.
 */
export default function RecipePosterCard({
  job,
  totalTime,
  onClick,
  variant = 'grid',
  isSelected = false,
  isSelectMode = false,
  bindLongPress,
}: RecipePosterCardProps) {
  const r = job.recipe!;
  const isShelf = variant === 'shelf';
  const remixCount = job.remixCount ?? job.recipe?.remixCount ?? 0;
  const rawCalories = r.nutritionalValues?.calories ?? r.sourceNutritionalValues?.calories;
  const calories = rawCalories && rawCalories > 0 ? Math.round(rawCalories) : null;
  const caloriesFormatted = calories ? calories.toLocaleString('de-DE') + ' kcal' : null;

  return (
    <div className={`relative isolate ${isShelf ? 'w-[9.5rem] shrink-0' : 'w-full'} h-full flex flex-col`}>
      {/* Real Stacked Card Deck Effect (clean flat minimal) */}
      {remixCount > 0 && (
        <>
          {remixCount > 1 && (
            <div className="absolute -top-2 inset-x-3.5 h-full rounded-2xl bg-gray-100 dark:bg-gray-800 border-none shadow-[0_1px_3px_rgba(0,0,0,0.02)] -z-20 pointer-events-none transition-transform" />
          )}
          <div className="absolute -top-1 inset-x-2 h-full rounded-2xl bg-gray-50 dark:bg-gray-800/80 border-none shadow-[0_2px_6px_rgba(0,0,0,0.03)] -z-10 pointer-events-none transition-transform" />
        </>
      )}

      <div
        className={`w-full h-full rounded-2xl overflow-hidden cursor-pointer active:scale-[0.96] transition-transform duration-150 ease-out select-none flex flex-col bg-white dark:bg-gray-900 shadow-[0_2px_8px_rgba(0,0,0,0.03),0_1px_2px_rgba(0,0,0,0.02)] border-none ${
          isSelected ? 'ring-2 ring-emerald-500 bg-emerald-500/5 dark:bg-emerald-500/10' : ''
        }`}
        onClick={(e) => {
          hapticLight();
          onClick(e);
        }}
        {...(bindLongPress ?? {})}
      >
        {/* Cover - 100% clean pristine photo presentation */}
        <div className="relative w-full aspect-[4/3] bg-black/5 dark:bg-white/5 overflow-hidden shrink-0">
          <CachedImage
            src={r.imageUrl}
            emoji={r.emoji}
            alt={r.title}
            className="w-full h-full object-cover object-center pointer-events-none select-none"
          />

          {/* Select-mode checkbox */}
          {isSelectMode && (
            <div
              className={`absolute top-2 left-2 z-10 w-7 h-7 rounded-full flex items-center justify-center transition-all border-none ${
                isSelected
                  ? 'bg-emerald-500 text-white shadow-md'
                  : 'bg-black/40 backdrop-blur-sm text-white shadow-xs'
              }`}
            >
              {isSelected && <Check className="w-4 h-4 text-white stroke-[3px]" />}
            </div>
          )}

          {/* Remix badge (Glassmorphic Emerald) */}
          {remixCount > 0 && (
            <div
              className={`absolute ${isSelectMode ? 'bottom-2 right-2' : 'top-2 left-2'} z-10 px-2 py-1 rounded-xl bg-emerald-600/75 dark:bg-emerald-600/65 backdrop-blur-md flex items-center gap-1.5 text-white shadow-md border-none`}
              title={`${remixCount} Remix(es)`}
            >
              <Layers className="w-3.5 h-3.5 text-emerald-100 drop-shadow-[0_1px_2px_rgba(0,0,0,0.4)]" />
              <span className="text-[11px] font-bold tracking-tight text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">
                {remixCount}
              </span>
            </div>
          )}

          {/* Favorite badge in top right */}
          {job.isFavorite && (
            <div className="absolute top-2 right-2 z-10 w-7 h-7 rounded-xl bg-amber-500/30 dark:bg-amber-500/30 flex items-center justify-center shadow-lg">
              <Star className="w-4 h-4 fill-amber-500 text-amber-500 drop-shadow-[0_2px_5px_rgba(0,0,0,0.65)]" />
            </div>
          )}
        </div>

        {/* Meta: Title & coupled subtle info */}
        <div className="flex flex-col p-3 flex-1 justify-start gap-1">
          <h4 className="text-sm font-bold text-gray-900 dark:text-white leading-snug line-clamp-2">
            {r.title}
          </h4>
          {(totalTime || caloriesFormatted || (r.servings && r.servings > 0)) && (
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-gray-400 dark:text-gray-500 truncate mt-0.5">
              {totalTime && (
                <span className="flex items-center gap-1 shrink-0">
                  <Clock className="w-3 h-3 text-emerald-500 shrink-0" />
                  <span>{totalTime}</span>
                </span>
              )}
              {totalTime && (caloriesFormatted || (r.servings && r.servings > 0)) && (
                <span className="text-gray-300 dark:text-gray-600 shrink-0">·</span>
              )}
              {caloriesFormatted ? (
                <span className="truncate">{caloriesFormatted}</span>
              ) : r.servings && r.servings > 0 ? (
                <span className="shrink-0">{r.servings} Port.</span>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
