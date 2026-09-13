import { BookOpen, Star, UtensilsCrossed, Folder } from 'lucide-react';
import type { Collection, SavedRecipe, RecipeCategory } from '../../types';
import { useI18n } from '../../context/I18nContext';
import { getRecipeCategoryLabel } from '../../i18n';
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
 * Horizontal Clean Flat Squircle Hub for collections.
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
        {/* 1. All Recipes Clean Flat Tile */}
        <CollectionStoryBubble
          title={t('catalog.storyHub.all')}
          count={totalRecipes}
          icon={<BookOpen className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />}
          imageUrl={allRecipesThumbnail}
          onClick={() => onOpenList({ kind: 'all' })}
        />

        {/* 2. Favorites Clean Flat Tile */}
        {favoriteJobs.length > 0 && (
          <CollectionStoryBubble
            title={t('catalog.favoritesFilter')}
            count={favoriteJobs.length}
            icon={<Star className="w-6 h-6 text-amber-500 fill-amber-500" />}
            imageUrl={getCollectionImage(favoriteJobs)}
            onClick={() => onOpenList({ kind: 'favorites' })}
          />
        )}

        {/* 3. Categories Clean Flat Tiles */}
        {availableCategories.map(cat => {
          const jobs = jobsByCategory[cat] ?? [];
          if (jobs.length === 0) return null;
          return (
            <CollectionStoryBubble
              key={cat}
              title={getRecipeCategoryLabel(cat, language)}
              count={jobs.length}
              icon={<UtensilsCrossed className="w-6 h-6 text-teal-600 dark:text-teal-400" />}
              imageUrl={getCollectionImage(jobs)}
              onClick={() => onOpenList({ kind: 'category', category: cat })}
            />
          );
        })}

        {/* 4. User Collections Clean Flat Tiles */}
        {collections.map(col => {
          const jobs = jobsByCollection[col.id] ?? [];
          return (
            <CollectionStoryBubble
              key={col.id}
              title={col.name}
              count={jobs.length}
              icon={<Folder className="w-6 h-6 text-rose-500 dark:text-rose-400" />}
              imageUrl={getCollectionImage(jobs)}
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
