import { Star } from 'lucide-react';
import type { Collection, SavedRecipe } from '../../types';
import { useI18n } from '../../context/I18nContext';
import CachedImage from '../CachedImage';
import { hapticLight } from '../../utils/haptics';

interface CollectionTileProps {
  collection?: Collection;
  title?: string;
  emoji?: string | null;
  isFavorite?: boolean;
  /** Members of this collection, newest first — the first two provide the cover images. */
  jobs: SavedRecipe[];
  onClick: () => void;
}

/**
 * Collection tile displaying a 2-up side-by-side recipe image split cover
 * (1 row high, 2 recipes side-by-side) with real recipe images,
 * and the collection title with emoji.
 */
export default function CollectionTile({
  collection,
  title,
  emoji,
  isFavorite = false,
  jobs,
  onClick,
}: CollectionTileProps) {
  const { t } = useI18n();
  const displayName = title || collection?.name || '';
  const collectionEmoji = emoji !== undefined ? emoji : (collection?.emoji || null);

  const validJobs = jobs.filter(j => j.recipe);
  const displayJobs = validJobs.slice(0, 2);

  return (
    <button
      type="button"
      onClick={() => {
        hapticLight();
        onClick();
      }}
      className="w-[8.5rem] shrink-0 flex flex-col gap-1.5 text-left active:scale-[0.97] transition-transform cursor-pointer group border-none bg-transparent"
    >
      <div className="relative w-full aspect-[2/1] rounded-2xl overflow-hidden bg-black/5 dark:bg-white/5 shadow-[0_8px_20px_-4px_rgba(0,0,0,0.18)] ring-2 ring-white dark:ring-gray-800/80 border-none transition-shadow group-hover:shadow-[0_12px_24px_-4px_rgba(0,0,0,0.22)]">
        {displayJobs.length === 0 ? (
          <div className="w-full h-full bg-gradient-to-br from-emerald-500/10 via-transparent to-indigo-500/10" />
        ) : displayJobs.length === 1 ? (
          <CachedImage
            src={displayJobs[0].recipe?.imageUrl}
            emoji={displayJobs[0].recipe?.emoji}
            alt={displayJobs[0].recipe?.title}
            className="w-full h-full object-cover object-center pointer-events-none select-none group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="grid grid-cols-2 w-full h-full divide-x divide-white/20 dark:divide-black/20">
            {displayJobs.map((job) => (
              <div key={job.recipeId} className="relative w-full h-full overflow-hidden">
                <CachedImage
                  src={job.recipe?.imageUrl}
                  emoji={job.recipe?.emoji}
                  alt={job.recipe?.title}
                  className="w-full h-full object-cover object-center pointer-events-none select-none group-hover:scale-105 transition-transform duration-300"
                />
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col px-0.5">
        <span className="text-xs font-bold text-gray-900 dark:text-white line-clamp-2 leading-snug">
          {isFavorite ? (
            <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500 inline mr-1 -translate-y-px" />
          ) : collectionEmoji ? (
            <span className="mr-1">{collectionEmoji}</span>
          ) : null}
          {displayName}
        </span>
        <span className="text-[11px] text-gray-500 dark:text-gray-400">
          {jobs.length === 1 ? t('catalog.recipeCountSingle') : t('catalog.recipeCount', { count: jobs.length })}
        </span>
      </div>
    </button>
  );
}
