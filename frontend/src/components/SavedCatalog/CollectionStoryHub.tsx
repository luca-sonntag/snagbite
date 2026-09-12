import type { Collection, SavedRecipe, RecipeCategory } from '../../types';
import { useI18n } from '../../context/I18nContext';
import { getRecipeCategoryLabel, getRecipeCategoryEmoji } from '../../i18n';
import CollectionStoryBubble from './CollectionStoryBubble';
import type { CatalogPreset } from './catalogRoutes';

interface CollectionStoryHubProps {
  totalRecipes: number;
  allRecipesThumbnail?: string | null;
  favoriteJobs?: SavedRecipe[];
  availableCategories?: RecipeCategory[];
  jobsByCategory?: Partial<Record<RecipeCategory, SavedRecipe[]>>;
  collections: Collection[];
  jobsByCollection: Record<string, SavedRecipe[]>;
  onOpenList: (preset: CatalogPreset) => void;
  onAddCollection: () => void;
  onManageCollections?: () => void;
}

/**
 * Horizontal Instagram-style Story Highlight Hub for collections.
 * Positioned right below the search bar to give instant 1-tap access to
 * "All Recipes", Favorites, Categories, and User Collections above the fold.
 */
export default function CollectionStoryHub({
  totalRecipes,
  allRecipesThumbnail,
  favoriteJobs = [],
  availableCategories = [],
  jobsByCategory = {},
  collections,
  jobsByCollection,
  onOpenList,
  onAddCollection,
  onManageCollections,
}: CollectionStoryHubProps) {
  const { language, t } = useI18n();

  const getCollectionImage = (jobs: SavedRecipe[] | undefined): string | null => {
    if (!jobs || jobs.length === 0) return null;
    const withImage = jobs.find(j => j.recipe?.imageUrl);
    return withImage?.recipe?.imageUrl || null;
  };

  return (
    <section className="flex flex-col gap-2 select-none">
      {/* Subtle Header */}
      <div className="flex items-center justify-between px-0.5">
        <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
          {t('catalog.storyHub.title')}
        </span>
        {onManageCollections && collections.length > 0 && (
          <button
            type="button"
            onClick={onManageCollections}
            className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer border-none bg-transparent"
          >
            {t('catalog.storyHub.manage')}
          </button>
        )}
      </div>

      {/* Horizontal Carousel */}
      <div className="flex items-start gap-3 overflow-x-auto no-scrollbar scrollbar-none -mx-4 px-4 md:-mx-6 md:px-6 py-1 scroll-smooth">
        {/* 📚 1. All Recipes Smart Story Bubble */}
        <CollectionStoryBubble
          title={t('catalog.storyHub.all')}
          count={totalRecipes}
          emoji="📚"
          imageUrl={allRecipesThumbnail}
          ringGradient="from-emerald-400 via-teal-500 to-indigo-500"
          onClick={() => onOpenList({ kind: 'all' })}
        />

        {/* ⭐ 2. Favorites Smart Story Bubble */}
        {favoriteJobs.length > 0 && (
          <CollectionStoryBubble
            title={t('catalog.favoritesFilter')}
            count={favoriteJobs.length}
            emoji="⭐"
            imageUrl={getCollectionImage(favoriteJobs)}
            ringGradient="from-amber-500 via-orange-400 to-yellow-300"
            onClick={() => onOpenList({ kind: 'favorites' })}
          />
        )}

        {/* 🍲 3. Categories Story Bubbles */}
        {availableCategories.map(cat => {
          const jobs = jobsByCategory[cat] ?? [];
          if (jobs.length === 0) return null;
          return (
            <CollectionStoryBubble
              key={cat}
              title={getRecipeCategoryLabel(cat, language)}
              count={jobs.length}
              emoji={getRecipeCategoryEmoji(cat)}
              imageUrl={getCollectionImage(jobs)}
              ringGradient="from-teal-400 via-emerald-500 to-cyan-500"
              onClick={() => onOpenList({ kind: 'category', category: cat })}
            />
          );
        })}

        {/* 📁 4. User Collections Story Bubbles */}
        {collections.map(col => {
          const jobs = jobsByCollection[col.id] ?? [];
          return (
            <CollectionStoryBubble
              key={col.id}
              title={col.name}
              count={jobs.length}
              emoji={col.emoji}
              imageUrl={getCollectionImage(jobs)}
              ringGradient="from-rose-500 via-pink-400 to-orange-400"
              onClick={() => onOpenList({ kind: 'collection', id: col.id })}
            />
          );
        })}

        {/* ➕ 5. Add Collection Button */}
        <CollectionStoryBubble
          title={t('catalog.storyHub.new')}
          isAddButton
          onClick={onAddCollection}
        />
      </div>
    </section>
  );
}
