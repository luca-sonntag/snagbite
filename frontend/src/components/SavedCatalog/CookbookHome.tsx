import { useState, useEffect, type MouseEvent } from 'react';
import type { Collection, SavedRecipe, Recipe, RecipeCategory } from '../../types';
import CollectionStoryHub from './CollectionStoryHub';
import CategoryLabelBar from './CategoryLabelBar';
import CookbookGreetingHeader from './CookbookGreetingHeader';
import RecipeHeroCarousel, { type HeroSlideItem } from './RecipeHeroCarousel';
import RecipeBentoSection from './RecipeBentoSection';
import RecipeShowcaseCard from './RecipeShowcaseCard';
import AllRecipesShelf from './AllRecipesShelf';
import PublicRecipeRecommendationsShelf from './PublicRecipeRecommendationsShelf';
import PublicRecipePreviewModal from '../PublicRecipe/PublicRecipePreviewModal';
import HeroThemeSheet from './HeroThemeSheet';
import { useAuth } from '../../context/AuthContext';
import { useI18n } from '../../context/I18nContext';
import { fetchPublicRecipeRecommendations, savePublicRecipeToCookbook } from '../../api/publicRecipesApi';
import type { CatalogPreset } from './catalogRoutes';
import { useCookbookMagazine } from './useCookbookMagazine';

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
  const { getAccessToken } = useAuth();
  const { t } = useI18n();
  const [communityRecommendations, setCommunityRecommendations] = useState<Recipe[]>([]);
  const [selectedPreviewRecipe, setSelectedPreviewRecipe] = useState<Recipe | null>(null);
  const [activeHeroSheet, setActiveHeroSheet] = useState<'theme' | 'vital' | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const items = await fetchPublicRecipeRecommendations(getAccessToken, 6);
        if (!cancelled && items.length > 0) {
          setCommunityRecommendations(items);
        }
      } catch (err) {
        console.warn('[CookbookHome] Error loading community recommendations:', err);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [getAccessToken]);

  const allCompletedJobs = items ?? shelves.newest?.items ?? [];
  const favJobs = favoriteJobs.length > 0 ? favoriteJobs : (shelves.favorites?.items ?? []);

  const {
    heroSlides,
    themeRecipes,
    themeTitle,
    vitalRecipes,
    bentoRecipes,
    bentoTitle,
    bentoSubtitle,
    rediscoveredRecipe,
    allRecipes,
  } = useCookbookMagazine({
    items: allCompletedJobs,
    recommendedShelf: shelves.recommended,
    communityRecipes: communityRecommendations,
    savedRecipeIds,
    formatTotalTime,
    onOpenTheme: () => setActiveHeroSheet('theme'),
    onOpenVital: () => setActiveHeroSheet('vital'),
  });

  const handleOpenSlide = (e: MouseEvent, slide: HeroSlideItem) => {
    if (slide.isCommunity) {
      if (slide.recipe.id && savedRecipeIds?.has(slide.recipe.id)) {
        window.location.hash = `/recipe/${slide.recipe.id}`;
      } else {
        setSelectedPreviewRecipe(slide.recipe);
      }
    } else if (slide.job) {
      onOpenRecipe(e, slide.job);
    }
  };

  const handleSaveCommunityFromHero = async (_e: MouseEvent, recipe: Recipe) => {
    if (!recipe.id || !onRecipeSaved) return;
    try {
      await savePublicRecipeToCookbook(recipe.id, getAccessToken);
      onRecipeSaved(recipe.id);
    } catch (err) {
      console.error('[CookbookHome] Failed to save community recipe from hero:', err);
    }
  };

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

      {/* 3. COVER STORY Part 1: Modern 3-Slide Hero Carousel */}
      {heroSlides.length > 0 && (
        <RecipeHeroCarousel
          slides={heroSlides}
          onOpenSlide={handleOpenSlide}
          onSaveCommunity={handleSaveCommunityFromHero}
        />
      )}

      {/* 4. COVER STORY Part 2: Bento Grid for Fast & Nutrient-Dense Dishes (only when at least 3 recipes are available) */}
      {bentoRecipes.length >= 3 && (
        <RecipeBentoSection
          recipes={bentoRecipes}
          title={bentoTitle}
          subtitle={bentoSubtitle}
          formatTotalTime={formatTotalTime}
          onOpenRecipe={onOpenRecipe}
          onSeeAll={() => onOpenList({ kind: 'quick' })}
        />
      )}

      {/* 5. NEUER INPUT: Community Discoveries (if active) */}
      {onRecipeSaved && (
        <PublicRecipeRecommendationsShelf
          recommendations={communityRecommendations}
          onRecipeSaved={onRecipeSaved}
          savedRecipeIds={savedRecipeIds}
        />
      )}

      {/* 6. NOSTALGIE-SPOTLIGHT: Format C: Rediscovered Gems */}
      {rediscoveredRecipe && (
        <RecipeShowcaseCard
          job={rediscoveredRecipe}
          totalTime={rediscoveredRecipe.recipe ? formatTotalTime(rediscoveredRecipe.recipe) : null}
          onOpenRecipe={onOpenRecipe}
        />
      )}

      {/* 7. VOLLSTÄNDIGE BIBLIOTHEK: Dedicated "Alle deine Rezepte" Shelf at Bottom */}
      <AllRecipesShelf
        items={allRecipes}
        totalCount={totalRecipes}
        formatTotalTime={formatTotalTime}
        onOpenRecipe={onOpenRecipe}
        onViewAll={() => onOpenList({ kind: 'all' })}
        isSelectMode={isSelectMode}
        selectedIds={selectedIds}
        bindLongPress={bindLongPress}
      />

      {/* Community Recipe Preview Modal */}
      {selectedPreviewRecipe && (
        <PublicRecipePreviewModal
          isOpen={Boolean(selectedPreviewRecipe)}
          onClose={() => setSelectedPreviewRecipe(null)}
          recipe={selectedPreviewRecipe}
          isSaved={selectedPreviewRecipe.id ? savedRecipeIds?.has(selectedPreviewRecipe.id) : false}
          onSave={async (rec) => {
            if (!rec.id || !onRecipeSaved) return;
            await savePublicRecipeToCookbook(rec.id, getAccessToken);
            onRecipeSaved(rec.id);
            window.location.hash = `/recipe/${rec.id}`;
          }}
        />
      )}

      {/* Hero Theme & Vital Stars Drawer */}
      <HeroThemeSheet
        isOpen={activeHeroSheet !== null}
        onClose={() => setActiveHeroSheet(null)}
        themeTitle={activeHeroSheet === 'vital' ? t('catalog.magazine.vitalSheetTitle') : themeTitle}
        themeSubtitle={activeHeroSheet === 'vital' ? t('catalog.magazine.vitalSheetSubtitle', { count: vitalRecipes.length }) : undefined}
        badgeVariant={activeHeroSheet === 'vital' ? 'emerald' : 'amber'}
        recipes={activeHeroSheet === 'vital' ? vitalRecipes : themeRecipes}
        formatTotalTime={formatTotalTime}
        onOpenRecipe={onOpenRecipe}
        onOpenCatalog={() => onOpenList({ kind: activeHeroSheet === 'vital' ? 'vital' : 'recommended' })}
      />
    </div>
  );
}
