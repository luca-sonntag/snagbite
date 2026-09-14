import { Star, UtensilsCrossed } from 'lucide-react';
import type { Collection, SavedRecipe, Recipe, RecipeCategory } from '../../types';
import { useI18n } from '../../context/I18nContext';
import { getRecipeCategoryLabel } from '../../i18n';
import CollectionStoryBubble from './CollectionStoryBubble';
import type { CatalogPreset } from './catalogRoutes';

interface CollectionStoryHubProps {
  totalRecipes?: number;
  allRecipesThumbnail?: string | null;
  favoriteJobs?: SavedRecipe[];
  availableCategories?: RecipeCategory[];
  jobsByCategory?: Partial<Record<RecipeCategory, SavedRecipe[]>>;
  collections: Collection[];
  jobsByCollection: Record<string, SavedRecipe[]>;
  communityRecipes?: Recipe[];
  onOpenCommunityCategory?: (category: RecipeCategory, label: string) => void;
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
  totalRecipes = 0,
  allRecipesThumbnail: _allRecipesThumbnail,
  favoriteJobs = [],
  availableCategories = [],
  jobsByCategory = {},
  collections,
  jobsByCollection,
  communityRecipes = [],
  onOpenCommunityCategory,
  onOpenList,
  onAddCollection,
  onManageCollections,
}: CollectionStoryHubProps) {
  const { language, t } = useI18n();

  const isColdStart = totalRecipes === 0 || (!favoriteJobs.length && !availableCategories.length && !collections.length);

  const getCollectionImage = (jobs: SavedRecipe[] | undefined): string | null => {
    if (!jobs || jobs.length === 0) return null;
    const withImage = jobs.find(j => j.recipe?.imageUrl);
    return withImage?.recipe?.imageUrl || null;
  };

  const communityCategories = communityRecipes.reduce<Array<{ category: RecipeCategory; count: number; image: string | null }>>(
    (acc, rec) => {
      const cat = rec.category || 'OTHER';
      const existing = acc.find(item => item.category === cat);
      if (!existing) {
        acc.push({ category: cat, count: 1, image: rec.imageUrl || null });
      } else {
        existing.count += 1;
        if (!existing.image && rec.imageUrl) existing.image = rec.imageUrl;
      }
      return acc;
    },
    []
  );

  return (
    <section className="flex flex-col gap-2 select-none">
      {/* Subtle Header */}
      <div className="flex items-center justify-between px-0.5">
        <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
          {isColdStart ? t('catalog.quickStart.discoverTitle') : t('catalog.storyHub.title')}
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
        {/* Cold Start: Curated Community Category Bubbles */}
        {isColdStart &&
          communityCategories.map(({ category, count, image }) => {
            const label = getRecipeCategoryLabel(category, language);
            return (
              <CollectionStoryBubble
                key={`comm-cat-${category}`}
                title={label}
                count={count}
                icon={<UtensilsCrossed className="w-6 h-6 text-teal-600 dark:text-teal-400" />}
                imageUrl={image}
                onClick={() => onOpenCommunityCategory?.(category, label)}
              />
            );
          })}

        {/* 1. Favorites Clean Flat Tile */}
        {!isColdStart && favoriteJobs.length > 0 && (
          <CollectionStoryBubble
            title={t('catalog.favoritesFilter')}
            count={favoriteJobs.length}
            icon={<Star className="w-6 h-6 text-amber-500 fill-amber-500" />}
            imageUrl={getCollectionImage(favoriteJobs)}
            onClick={() => onOpenList({ kind: 'favorites' })}
          />
        )}

        {/* 2. Categories Clean Flat Tiles */}
        {!isColdStart &&
          availableCategories.map(cat => {
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

        {/* 3. User Collections Clean Flat Tiles (empty collections show as clean empty cards) */}
        {collections.map(col => {
          const jobs = jobsByCollection[col.id] ?? [];
          return (
            <CollectionStoryBubble
              key={col.id}
              title={col.name}
              count={jobs.length}
              imageUrl={getCollectionImage(jobs)}
              onClick={() => onOpenList({ kind: 'collection', id: col.id })}
            />
          );
        })}

        {/* ➕ 4. Add Collection Button */}
        <CollectionStoryBubble
          title={t('catalog.storyHub.new')}
          isAddButton
          onClick={onAddCollection}
        />
      </div>
    </section>
  );
}
