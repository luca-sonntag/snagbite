import { useMemo, type MouseEvent } from 'react';
import type { SavedRecipe, Recipe } from '../../types';
import { getTotalTime } from '../../hooks/useSavedCatalog';
import { useI18n } from '../../context/I18nContext';
import type { HeroSlideItem } from './RecipeHeroCarousel';
import { getMagazineTitles, type RecommendedShelfLike } from './magazineCuratorUtils';

interface UseCookbookMagazineOptions {
  items: SavedRecipe[];
  recommendedShelf?: RecommendedShelfLike | null;
  communityRecipes?: Recipe[];
  savedRecipeIds?: Set<string>;
  formatTotalTime: (recipe: any) => string | null;
  onOpenTheme?: (e: MouseEvent) => void;
}

/**
 * Editorial feed curation hook for the Cookbook Magazine home.
 * Derives 3-slide hero carousel, daily rotated bento fast-track, and rediscovered gems
 * using structured tags, categories, duration, health scores, and community recipes.
 */
export function useCookbookMagazine({
  items,
  recommendedShelf,
  communityRecipes = [],
  savedRecipeIds,
  formatTotalTime,
  onOpenTheme,
}: UseCookbookMagazineOptions) {
  const { t } = useI18n();

  // Day-of-year integer for smooth, deterministic daily rotation
  const dayOfYear = Math.floor(Date.now() / 86400000);

  // Dynamic titles and badges reacting to recommendation theme
  const { heroBadgeText, bentoTitle, bentoSubtitle } = useMemo(() => {
    return getMagazineTitles(recommendedShelf, t);
  }, [recommendedShelf, t]);

  // 1. 3-Slide Hero Carousel (Daily Spotlight, Vital Star, Community Inspiration)
  const heroSlides = useMemo((): HeroSlideItem[] => {
    if (items.length === 0 && communityRecipes.length === 0) return [];

    const slides: HeroSlideItem[] = [];
    const usedRecipeIds = new Set<string>();

    // Slide 1: Primary Spotlight (Own recipe, or Community recipe if 0 own recipes)
    if (items.length > 0) {
      let candidate: SavedRecipe;
      const hasTheme = Boolean(recommendedShelf && recommendedShelf.items && recommendedShelf.items.length >= 2);
      if (hasTheme) {
        const recWithImage = recommendedShelf!.items!.filter((j) => j.recipe?.imageUrl);
        candidate = recWithImage.length > 0 ? recWithImage[dayOfYear % recWithImage.length] : items[0];
      } else {
        const withImage = items.filter((j) => j.recipe?.imageUrl);
        const highScores = withImage.filter((j) => (j.recipe?.healthScore ?? 0) >= 70);
        const candidateSet = highScores.length > 0 ? highScores : (withImage.length > 0 ? withImage : items);
        candidate = candidateSet[dayOfYear % candidateSet.length];
      }

      if (candidate?.recipe) {
        usedRecipeIds.add(candidate.recipeId);
        slides.push({
          id: `hero-1-${candidate.recipeId}`,
          job: candidate,
          recipe: candidate.recipe,
          totalTime: formatTotalTime(candidate.recipe),
          badgeText: heroBadgeText,
          badgeVariant: 'amber',
          themeRecipeCount: hasTheme ? recommendedShelf!.items!.length : undefined,
          onOpenTheme: hasTheme ? onOpenTheme : undefined,
          isCommunity: false,
          isSaved: true,
        });
      }
    } else if (communityRecipes.length > 0) {
      const firstComm = communityRecipes[0];
      if (firstComm.id) {
        usedRecipeIds.add(firstComm.id);
        slides.push({
          id: `hero-1-comm-${firstComm.id}`,
          recipe: firstComm,
          totalTime: formatTotalTime(firstComm),
          badgeText: t('catalog.magazine.heroCommunityBadge'),
          badgeVariant: 'amber',
          isCommunity: true,
          isSaved: savedRecipeIds?.has(firstComm.id) || false,
        });
      }
    }

    // Slide 2: Vital Star / High Health Score (Score >= 70 from own items, distinct from Slide 1)
    if (items.length > 1) {
      const remainingPool = items.filter((j) => !usedRecipeIds.has(j.recipeId));
      const vitalPool = remainingPool.filter((j) => (j.recipe?.healthScore ?? 0) >= 70 && j.recipe?.imageUrl);
      const candidates = vitalPool.length > 0 ? vitalPool : remainingPool;
      const vitalCandidate = candidates[(dayOfYear + 1) % candidates.length];

      if (vitalCandidate?.recipe) {
        usedRecipeIds.add(vitalCandidate.recipeId);
        slides.push({
          id: `hero-2-${vitalCandidate.recipeId}`,
          job: vitalCandidate,
          recipe: vitalCandidate.recipe,
          totalTime: formatTotalTime(vitalCandidate.recipe),
          badgeText: t('catalog.magazine.heroVitalBadge'),
          badgeVariant: 'emerald',
          isCommunity: false,
          isSaved: true,
        });
      }
    }

    // Slide 3: Fresh Community Inspiration (or distinct own recipe if no community)
    if (communityRecipes.length > 0) {
      const availableComm = communityRecipes.filter((c) => c.id && !usedRecipeIds.has(c.id));
      if (availableComm.length > 0) {
        const commCandidate = availableComm[dayOfYear % availableComm.length];
        if (commCandidate?.id) {
          usedRecipeIds.add(commCandidate.id);
          slides.push({
            id: `hero-3-${commCandidate.id}`,
            recipe: commCandidate,
            totalTime: formatTotalTime(commCandidate),
            badgeText: t('catalog.magazine.heroCommunityBadge'),
            badgeVariant: 'indigo',
            isCommunity: true,
            isSaved: savedRecipeIds?.has(commCandidate.id) || false,
          });
        }
      }
    } else if (items.length > 2) {
      const remainingPool = items.filter((j) => !usedRecipeIds.has(j.recipeId));
      if (remainingPool.length > 0) {
        const thirdCandidate = remainingPool[(dayOfYear + 2) % remainingPool.length];
        if (thirdCandidate?.recipe) {
          usedRecipeIds.add(thirdCandidate.recipeId);
          slides.push({
            id: `hero-3-${thirdCandidate.recipeId}`,
            job: thirdCandidate,
            recipe: thirdCandidate.recipe,
            totalTime: formatTotalTime(thirdCandidate.recipe),
            badgeText: t('catalog.magazine.rediscoveredTitle'),
            badgeVariant: 'blue',
            isCommunity: false,
            isSaved: true,
          });
        }
      }
    }

    return slides;
  }, [items, communityRecipes, savedRecipeIds, recommendedShelf, heroBadgeText, onOpenTheme, dayOfYear, formatTotalTime, t]);

  // Primary hero recipe (for convenience/fallback)
  const heroRecipe = heroSlides[0]?.job ?? null;

  // 2. Bento Grid Recipes (Quick & nutrient-dense, strictly distinct from ALL hero slides)
  const bentoRecipes = useMemo(() => {
    const heroRecipeIds = new Set(
      heroSlides.map((s) => s.job?.recipeId || s.recipe.id).filter(Boolean) as string[]
    );
    const withoutHero = items.filter((j) => !heroRecipeIds.has(j.recipeId));
    if (withoutHero.length === 0) return [];

    // Daily rotated quick candidates (<= 25 min)
    const quickCandidates = withoutHero.filter((j) => {
      const t = getTotalTime(j.recipe);
      return t > 0 && t <= 25;
    });

    if (quickCandidates.length >= 3) {
      const offset = dayOfYear % quickCandidates.length;
      const rotated = [...quickCandidates.slice(offset), ...quickCandidates.slice(0, offset)];
      return rotated.slice(0, 3);
    }

    // Blend quick candidates with highest health-score recipes
    const remainder = withoutHero.filter((j) => !quickCandidates.includes(j));
    remainder.sort((a, b) => (b.recipe?.healthScore ?? 0) - (a.recipe?.healthScore ?? 0));
    return [...quickCandidates, ...remainder].slice(0, 3);
  }, [items, heroSlides, dayOfYear]);

  // 3. Rediscovered Recipe (Older saved recipe, distinct from hero slides & bento)
  const rediscoveredRecipe = useMemo(() => {
    const usedIds = new Set<string>();
    for (const s of heroSlides) {
      if (s.job?.recipeId) usedIds.add(s.job.recipeId);
      if (s.recipe?.id) usedIds.add(s.recipe.id);
    }
    for (const b of bentoRecipes) usedIds.add(b.recipeId);

    const candidates = items.filter((j) => !usedIds.has(j.recipeId) && j.recipe?.imageUrl);
    if (candidates.length === 0) return null;

    const fourteenDaysMs = 14 * 24 * 60 * 60 * 1000;
    const now = Date.now();
    const older = candidates.filter((j) => {
      const added = j.addedAt ? new Date(j.addedAt).getTime() : 0;
      return now - added >= fourteenDaysMs;
    });

    if (older.length > 0) {
      return older[dayOfYear % older.length];
    }

    return null;
  }, [items, heroSlides, bentoRecipes, dayOfYear]);

  const heroTotalTime = useMemo(() => {
    const primary = heroSlides[0]?.recipe;
    return primary ? formatTotalTime(primary) : null;
  }, [heroSlides, formatTotalTime]);

  const themeRecipes = useMemo(() => {
    return (recommendedShelf?.items && recommendedShelf.items.length >= 2) ? recommendedShelf.items : [];
  }, [recommendedShelf]);

  return {
    heroSlides,
    heroRecipe,
    heroBadgeText,
    themeRecipes,
    themeTitle: heroBadgeText,
    bentoRecipes,
    bentoTitle,
    bentoSubtitle,
    rediscoveredRecipe,
    allRecipes: items,
    heroTotalTime,
  };
}
