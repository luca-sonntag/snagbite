import type { Collection, SavedRecipe } from '../../types';
import { useI18n } from '../../context/I18nContext';
import CachedImage from '../CachedImage';

interface CollectionTileProps {
  collection?: Collection;
  title?: string;
  emoji?: string | null;
  /** Members of this collection, newest first — the first two provide the cover images. */
  jobs: SavedRecipe[];
  onClick: () => void;
}

/**
 * Collection tile displaying a 2-up side-by-side recipe image split cover
 * (1 row high, 2 recipes side-by-side) with real recipe images,
 * and the collection badge emoji at the bottom left.
 */
export default function CollectionTile({ collection, title, emoji, jobs, onClick }: CollectionTileProps) {
  const { t } = useI18n();
  const displayName = title || collection?.name || '';
  const collectionEmoji = emoji !== undefined ? emoji : (collection?.emoji || null);

  const validJobs = jobs.filter(j => j.recipe);
  const displayJobs = validJobs.slice(0, 2);

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-[8.5rem] shrink-0 flex flex-col gap-1.5 text-left active:scale-[0.97] transition-transform cursor-pointer group"
    >
      <div className="relative w-full aspect-[2/1] rounded-2xl overflow-hidden bg-black/5 dark:bg-white/5 shadow-[0_2px_6px_rgba(0,0,0,0.03)]">
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

        {/* Collection badge emoji in bottom-left */}
        {collectionEmoji && (
          <span className="absolute bottom-1 left-1 w-6 h-6 rounded-lg bg-black/25 dark:bg-black/40 backdrop-blur-md border border-white/20 flex items-center justify-center text-xs select-none shadow-sm z-10">
            {collectionEmoji}
          </span>
        )}
      </div>

      <div className="flex flex-col px-0.5">
        <span className="text-xs font-bold text-gray-900 dark:text-white line-clamp-2 leading-snug">
          {displayName}
        </span>
        <span className="text-[11px] text-gray-500 dark:text-gray-400">
          {jobs.length === 1 ? t('catalog.recipeCountSingle') : t('catalog.recipeCount', { count: jobs.length })}
        </span>
      </div>
    </button>
  );
}
