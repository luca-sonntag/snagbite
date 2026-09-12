import type { SavedRecipe } from '../../types';
import { getTotalTime } from '../../hooks/useSavedCatalog';
import type { VibeId } from './CookbookVibeChips';

export interface RecommendedShelfLike {
  title?: string;
  items?: SavedRecipe[];
  total?: number;
}

/**
 * Matches a recipe against the selected editorial vibe chip.
 */
export function matchesVibe(job: SavedRecipe, vibe: VibeId): boolean {
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
}

/**
 * Returns localized hero badge text, bento title and bento subtitle
 * reacting to the active vibe or contextual recommendation theme.
 */
export function getMagazineTitles(
  activeVibe: VibeId | null,
  recommendedShelf: RecommendedShelfLike | null | undefined,
  t: (key: string, params?: any) => string
): { heroBadgeText: string; bentoTitle: string; bentoSubtitle: string } {
  if (activeVibe) {
    switch (activeVibe) {
      case 'vital':
        return {
          heroBadgeText: t('catalog.magazine.vibes.vitalHeroBadge'),
          bentoTitle: t('catalog.magazine.vibes.vitalBentoTitle'),
          bentoSubtitle: t('catalog.magazine.vibes.vitalBentoSubtitle'),
        };
      case 'quick25':
        return {
          heroBadgeText: t('catalog.magazine.vibes.quickHeroBadge'),
          bentoTitle: t('catalog.magazine.vibes.quickBentoTitle'),
          bentoSubtitle: t('catalog.magazine.vibes.quickBentoSubtitle'),
        };
      case 'highProtein':
        return {
          heroBadgeText: t('catalog.magazine.vibes.highProteinHeroBadge'),
          bentoTitle: t('catalog.magazine.vibes.highProteinBentoTitle'),
          bentoSubtitle: t('catalog.magazine.vibes.highProteinBentoSubtitle'),
        };
      case 'onePot':
        return {
          heroBadgeText: t('catalog.magazine.vibes.onePotHeroBadge'),
          bentoTitle: t('catalog.magazine.vibes.onePotBentoTitle'),
          bentoSubtitle: t('catalog.magazine.vibes.onePotBentoSubtitle'),
        };
      case 'veggie':
        return {
          heroBadgeText: t('catalog.magazine.vibes.veggieHeroBadge'),
          bentoTitle: t('catalog.magazine.vibes.veggieBentoTitle'),
          bentoSubtitle: t('catalog.magazine.vibes.veggieBentoSubtitle'),
        };
      case 'sweet':
        return {
          heroBadgeText: t('catalog.magazine.vibes.sweetHeroBadge'),
          bentoTitle: t('catalog.magazine.vibes.sweetBentoTitle'),
          bentoSubtitle: t('catalog.magazine.vibes.sweetBentoSubtitle'),
        };
    }
  }

  const heroBadge =
    recommendedShelf?.items && recommendedShelf.items.length >= 2 && recommendedShelf.title
      ? recommendedShelf.title
      : t('catalog.magazine.heroHighlight');

  return {
    heroBadgeText: heroBadge,
    bentoTitle: t('catalog.magazine.bentoDefaultTitle'),
    bentoSubtitle: t('catalog.magazine.bentoDefaultSubtitle'),
  };
}
