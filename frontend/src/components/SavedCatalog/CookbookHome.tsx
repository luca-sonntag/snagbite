import type { MouseEvent } from 'react';
import type { Collection, SavedRecipe, RecipeCategory } from '../../types';
import CollectionStoryHub from './CollectionStoryHub';
import CategoryLabelBar from './CategoryLabelBar';
import CookbookGreetingHeader from './CookbookGreetingHeader';
import CookbookVibeChips from './CookbookVibeChips';
import RecipeHeroCard from './RecipeHeroCard';
import RecipeBentoSection from './RecipeBentoSection';
import RecipeShowcaseCard from './RecipeShowcaseCard';
import AllRecipesShelf from './AllRecipesShelf';
import RecipeShelf from './RecipeShelf';
import PublicRecipeRecommendationsShelf from './PublicRecipeRecommendationsShelf';
import type { CatalogPreset } from './catalogRoutes';
import { useCookbookMagazine } from './useCookbookMagazine';
import { useI18n } from '../../context/I18nContext';

interface Shelf {
  items: SavedRecipe[];
  total: number;
}

interface RecommendedShelf extends Shelf {
  themeId: string;
  title: string;
  badgeEmoji?: string;
}

interface CookbookHomeProps {
  totalRecipes: number;
  items?: SavedRecipe[];
  collections: Collection[];
  jobsByCollection: Record<string, SavedRecipe[]>;
  jobsByFlag?: Record<string, SavedRecipe[]>;
  jobsByCategory?: Partial<Record<RecipeCategory, SavedRecipe[]>>;
  availableCategories?: RecipeCategory[];
  favoriteJobs?: SavedRecipe[];
  shelves: {
    recommended?: RecommendedShelf | null;
    recent: Shelf;
    favorites: Shelf;
    quick: Shelf;
    newest: Shelf;
  };
  allFlags: string[];
  formatTotalTime: (recipe: any) => string | null;
  onOpenList: (preset: CatalogPreset) => void;
  onOpenRecipe: (e: MouseEvent, job: SavedRecipe) => void;
  onAddCollection: () => void;
  onManageCollections?: () => void;
  isSelectMode?: boolean;
  onToggleSelectMode?: () => void;
  selectedIds?: Set<string>;
  bindLongPress?: (id: string, job: SavedRecipe) => any;
  onRecipeSaved?: (savedId: string) => void;
  savedRecipeIds?: Set<string>;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  activeFilterCount?: number;
  onOpenFilters?: () => void;
}

/**
 * Level 1 of the catalog: Vibrant Culinary Magazine Feed.
 * Replaces the repetitive horizontal shelves with varied editorial formats:
 * - Circular Story Hub (Collections, All Recipes shortcut, Categories)
 * - Vibe Quick Chips (Vital & Fit, Quick, High-Protein, One-Pot, Veggie, Sweet)
 * - Format A: Cinematic 16:10 Hero Card with Health Score and Macros
 * - Format B: Bento Grid (3:4 portrait card + 2 stacked compact cards)
 * - Format C: Rediscovered Gems banner
 * - Format D: All Recipes shelf using preserved RecipePosterCards
 */
export default function CookbookHome({
  totalRecipes,
  items,
  collections,
  jobsByCollection,
  jobsByFlag = {},
  jobsByCategory = {},
  availableCategories = [],
  favoriteJobs = [],
  shelves,
  allFlags,
  formatTotalTime,
  onOpenList,
  onOpenRecipe,
  onAddCollection,
  isSelectMode = false,
  onToggleSelectMode,
  selectedIds = new Set(),
  bindLongPress,
  onRecipeSaved,
  savedRecipeIds,
  searchQuery = '',
  onSearchChange,
  activeFilterCount = 0,
  onOpenFilters,
}: CookbookHomeProps) {
  const { t } = useI18n();
  const allCompletedJobs = items ?? shelves.newest?.items ?? [];
  const favJobs = favoriteJobs.length > 0 ? favoriteJobs : (shelves.favorites?.items ?? []);

  const {
    activeVibe,
    setActiveVibe,
    heroRecipe,
    bentoRecipes,
    rediscoveredRecipe,
    allRecipes,
    heroTotalTime,
  } = useCookbookMagazine({
    items: allCompletedJobs,
    formatTotalTime,
  });

  // First recipe image for the "Alle Rezepte" story bubble thumbnail
  const firstRecipeThumbnail = allCompletedJobs[0]?.recipe?.imageUrl ?? null;

  return (
    <div className="flex flex-col gap-6 pb-6 animate-fade-in select-none">
      {/* 1. Contextual Greeting Header */}
      <CookbookGreetingHeader
        isSelectMode={isSelectMode}
        onToggleSelectMode={onToggleSelectMode}
        searchQuery={searchQuery}
        onSearchChange={onSearchChange}
        activeFilterCount={activeFilterCount}
        onOpenFilters={onOpenFilters}
      />

      {/* 2. Clean Flat Squircle Collection Hub */}
      <section className="space-y-3">
        <CollectionStoryHub
          totalRecipes={totalRecipes}
          allRecipesThumbnail={firstRecipeThumbnail}
          favoriteJobs={favJobs}
          availableCategories={availableCategories}
          jobsByCategory={jobsByCategory}
          collections={collections}
          jobsByCollection={jobsByCollection}
          onOpenList={onOpenList}
          onAddCollection={onAddCollection}
        />

        {/* Custom Labels / Tags if user created any */}
        {allFlags.length > 0 && (
          <CategoryLabelBar
            allFlags={allFlags}
            jobsByFlag={jobsByFlag}
            onOpenList={onOpenList}
          />
        )}
      </section>

      {/* 3. Vibe Quick Chips */}
      <CookbookVibeChips
        activeVibe={activeVibe}
        onSelectVibe={setActiveVibe}
      />

      {/* 4. Format A: Cinematic 16:10 Spotlight Dish */}
      {heroRecipe && (
        <RecipeHeroCard
          job={heroRecipe}
          totalTime={heroTotalTime}
          onOpenRecipe={onOpenRecipe}
        />
      )}

      {/* 5. Format B: Bento Grid for Fast & Nutrient-Dense Dishes (only when at least 3 recipes are available) */}
      {bentoRecipes.length >= 3 && (
        <RecipeBentoSection
          recipes={bentoRecipes}
          formatTotalTime={formatTotalTime}
          onOpenRecipe={onOpenRecipe}
          onSeeAll={() => onOpenList({ kind: 'quick' })}
        />
      )}

      {/* Recommended Shelf (if context recommendation matches) */}
      {shelves.recommended && shelves.recommended.items.length >= 2 && (
        <RecipeShelf
          title={shelves.recommended.title}
          subtitle={t('catalog.recommendations.subtitle')}
          jobs={shelves.recommended.items}
          totalCount={shelves.recommended.total}
          formatTotalTime={formatTotalTime}
          onOpenAll={() => onOpenList({ kind: 'recommended' })}
          onOpenRecipe={onOpenRecipe}
          isSelectMode={isSelectMode}
          selectedIds={selectedIds}
          bindLongPress={bindLongPress}
        />
      )}

      {/* 6. Format C: Rediscovered Gems */}
      {rediscoveredRecipe && (
        <RecipeShowcaseCard
          job={rediscoveredRecipe}
          totalTime={rediscoveredRecipe.recipe ? formatTotalTime(rediscoveredRecipe.recipe) : null}
          onOpenRecipe={onOpenRecipe}
        />
      )}

      {/* 🌟 Community Discoveries (if active) */}
      {onRecipeSaved && (
        <PublicRecipeRecommendationsShelf
          onRecipeSaved={onRecipeSaved}
          savedRecipeIds={savedRecipeIds}
        />
      )}

      {/* 7. Format D: Dedicated "Alle deine Rezepte" Shelf at Bottom */}
      <AllRecipesShelf
        items={allRecipes}
        totalCount={totalRecipes}
        formatTotalTime={formatTotalTime}
        onOpenRecipe={onOpenRecipe}
        onViewAll={() => onOpenList({ kind: 'all' })}
      />
    </div>
  );
}
