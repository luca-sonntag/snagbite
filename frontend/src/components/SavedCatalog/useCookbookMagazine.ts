import { useState, useMemo } from 'react';
import type { SavedRecipe } from '../../types';
import { getTotalTime } from '../../hooks/useSavedCatalog';
import type { VibeId } from './CookbookVibeChips';

interface UseCookbookMagazineOptions {
  items: SavedRecipe[];
  formatTotalTime: (recipe: any) => string | null;
}

/**
 * Editorial feed curation hook for the Cookbook Magazine home.
 * Derives hero spotlight, bento fast-track, and rediscovered gems
 * using structured tags, categories, duration and health scores.
 */
export function useCookbookMagazine({
  items,
  formatTotalTime,
}: UseCookbookMagazineOptions) {
  const [activeVibe, setActiveVibe] = useState<VibeId | null>(null);

  // Structured vibe matcher
  const matchesVibe = (job: SavedRecipe, vibe: VibeId): boolean => {
    const r = job.recipe;
    if (!r) return false;
    switch (vibe) {
      case 'vital':
        return (r.healthScore ?? 0) >= 70;
      case 'quick25': {
        const time = getTotalTime(r);
        return time > 0 && time <= 25;
      }
      case 'highProtein':
        return (r.nutritionalValues?.protein ?? 0) >= 25;
      case 'onePot':
        return Boolean(
          r.tags?.some((t) => {
            const l = t.toLowerCase();
            return l === 'one-pot' || l === 'one pot' || l === 'onepot';
          })
        );
      case 'veggie':
        return Boolean(
          r.tags?.some((t) => {
            const l = t.toLowerCase();
            return l === 'veggie' || l === 'vegetarian' || l === 'vegan' || l === 'vegetarisch';
          })
        );
      case 'sweet':
        return (
          r.category === 'DESSERT' ||
          r.category === 'BAKING' ||
          Boolean(
            r.tags?.some((t) => {
              const l = t.toLowerCase();
              return l === 'dessert' || l === 'sweet' || l === 'süß';
            })
          )
        );
      default:
        return true;
    }
  };

  // Filtered pool based on active vibe
  const pool = useMemo(() => {
    if (!activeVibe) return items;
    const filtered = items.filter((j) => matchesVibe(j, activeVibe));
    return filtered.length > 0 ? filtered : items;
  }, [items, activeVibe]);

  // 1. Hero Recipe (Today's Curated Spotlight)
  const heroRecipe = useMemo(() => {
    if (pool.length === 0) return null;
    if (activeVibe) return pool[0];

    const withImage = pool.filter((j) => j.recipe?.imageUrl);
    if (withImage.length === 0) return pool[0];

    // Prefer high-healthscore recipes (score >= 75)
    const highScores = withImage.filter((j) => (j.recipe?.healthScore ?? 0) >= 75);
    const candidateSet = highScores.length > 0 ? highScores : withImage;

    // Day-of-year rotation for fresh daily feeling
    const dayOfYear = Math.floor(Date.now() / (1000 * 60 * 60 * 24));
    return candidateSet[dayOfYear % candidateSet.length];
  }, [pool, activeVibe]);

  // 2. Bento Grid Recipes (Quick & nutrient-dense, distinct from hero)
  const bentoRecipes = useMemo(() => {
    const withoutHero = pool.filter((j) => j.recipeId !== heroRecipe?.recipeId);
    if (withoutHero.length === 0) return [];

    const quickCandidates = withoutHero.filter((j) => {
      const t = getTotalTime(j.recipe);
      return t > 0 && t <= 25;
    });

    if (quickCandidates.length >= 3) {
      return quickCandidates.slice(0, 3);
    }

    // Blend quick candidates with highest health-score recipes
    const remainder = withoutHero.filter((j) => !quickCandidates.includes(j));
    remainder.sort((a, b) => (b.recipe?.healthScore ?? 0) - (a.recipe?.healthScore ?? 0));
    return [...quickCandidates, ...remainder].slice(0, 3);
  }, [pool, heroRecipe]);

  // 3. Rediscovered Recipe (Older saved recipe, distinct from hero & bento)
  const rediscoveredRecipe = useMemo(() => {
    const usedIds = new Set<string>();
    if (heroRecipe) usedIds.add(heroRecipe.recipeId);
    for (const b of bentoRecipes) usedIds.add(b.recipeId);

    const candidates = pool.filter((j) => !usedIds.has(j.recipeId) && j.recipe?.imageUrl);
    if (candidates.length === 0) return null;

    const fourteenDaysMs = 14 * 24 * 60 * 60 * 1000;
    const now = Date.now();
    const older = candidates.filter((j) => {
      const added = j.addedAt ? new Date(j.addedAt).getTime() : 0;
      return now - added >= fourteenDaysMs;
    });

    if (older.length > 0) {
      const day = Math.floor(now / (1000 * 60 * 60 * 24));
      return older[day % older.length];
    }

    return candidates[candidates.length - 1];
  }, [pool, heroRecipe, bentoRecipes]);

  const heroTotalTime = useMemo(() => {
    return heroRecipe?.recipe ? formatTotalTime(heroRecipe.recipe) : null;
  }, [heroRecipe, formatTotalTime]);

  return {
    activeVibe,
    setActiveVibe,
    heroRecipe,
    bentoRecipes,
    rediscoveredRecipe,
    allRecipes: pool,
    heroTotalTime,
  };
}
