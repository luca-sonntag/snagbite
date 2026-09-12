import type { SavedRecipe } from '../../types';

export interface RecommendedShelfLike {
  title?: string;
  items?: SavedRecipe[];
  total?: number;
}

/**
 * Returns localized hero badge text, bento title and bento subtitle
 * reacting to contextual recommendation theme or fallback.
 */
export function getMagazineTitles(
  recommendedShelf: RecommendedShelfLike | null | undefined,
  t: (key: string, params?: any) => string
): { heroBadgeText: string; bentoTitle: string; bentoSubtitle: string } {
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

