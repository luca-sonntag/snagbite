import React from 'react';
import { Clock, Check, Star } from 'lucide-react';
import type { SavedRecipe } from '../../types';
import CachedImage from '../CachedImage';
import { detectPlatform, PlatformIcon, PLATFORM_ICON_COLOR } from './PlatformIcon';

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
 * Compact recipe poster: image, title, total time. Deliberately omits the
 * description and tag pills that the old card carried — those belong in the
 * detail view, and dropping them roughly triples how many recipes fit on a
 * screen. Delete moved to the multi-select bar / detail view.
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
  const platform = detectPlatform(job.recipe?.sourceUrl ?? undefined);
  const iconColor = PLATFORM_ICON_COLOR[platform];
  const isShelf = variant === 'shelf';

  return (
    <div
      className={`rounded-2xl overflow-hidden cursor-pointer active:scale-[0.98] transition-all select-none flex flex-col bg-white dark:bg-gray-900 shadow-[0_2px_6px_rgba(0,0,0,0.03)] ${isShelf ? 'w-[9.5rem] shrink-0' : 'w-full'
        } ${isSelected ? 'ring-2 ring-emerald-500 bg-emerald-500/5 dark:bg-emerald-500/10' : ''}`}
      onClick={onClick}
      {...(bindLongPress ?? {})}
    >
      {/* Cover */}
      <div className="relative w-full aspect-[4/3] bg-black/5 dark:bg-white/5 overflow-hidden">
        <CachedImage
          src={r.imageUrl}
          emoji={r.emoji}
          alt={r.title}
          className="w-full h-full object-cover object-center pointer-events-none select-none"
        />

        {/* Select-mode checkbox */}
        {isSelectMode && (
          <div
            className={`absolute top-2 left-2 z-10 w-7 h-7 rounded-full flex items-center justify-center transition-all border ${isSelected
              ? 'bg-emerald-500 border-emerald-500 text-white shadow-md'
              : 'bg-black/40 backdrop-blur-sm border-white/30 text-white'
              }`}
          >
            {isSelected && <Check className="w-4 h-4 text-white stroke-[3px]" />}
          </div>
        )}

        {/* Favorite badge in top right */}
        {job.isFavorite && (
          <div className="absolute top-2 right-2 z-10 w-6 h-6 rounded-full bg-black/40 dark:bg-black/60 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-xs">
            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
          </div>
        )}
      </div>

      {/* Meta */}
      <div className="flex flex-col gap-1 px-3 py-2.5 flex-1">
        <h4 className="text-sm font-bold text-gray-900 dark:text-white leading-snug line-clamp-2">
          {r.title}
        </h4>
        {/* Bottom row: total time (left) and source platform icon (right, no background) */}
        <div className="mt-auto flex items-center justify-between gap-2">
          {totalTime ? (
            <span className="flex items-center gap-1 text-xs font-medium text-gray-500 dark:text-gray-400">
              <Clock className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              {totalTime}
            </span>
          ) : (
            <span />
          )}
          <PlatformIcon platform={platform} className={`w-4 h-4 shrink-0 ${iconColor}`} />
        </div>
      </div>
    </div>
  );
}
