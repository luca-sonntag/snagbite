export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

export interface HolidayEvent {
  id: string;
  label: string;
  keywords: string[];
  titleKey: string;
  defaultTitle: string;
  badgeEmoji?: string;
}

export interface SharedIngredientItem {
  name: string;
  amount?: number | string | null;
  unit?: string | null;
  baseName?: string | null;
}

export interface SharedIngredientGroup {
  name?: string | null;
  items: SharedIngredientItem[];
}

export interface SharedRecipe {
  title: string;
  description?: string | null;
  prepTime?: number | string | null;
  cookTime?: number | string | null;
  totalTime?: number | string | null;
  servings?: number | string | null;
  tags?: string[];
  emoji?: string | null;
  imageUrl?: string | null;
  ingredients?: SharedIngredientGroup[];
}

export interface SharedJob {
  id: string;
  url?: string;
  createdAt: string;
  updatedAt?: string;
  status?: string;
  recipe?: SharedRecipe | null;
  isFavorite?: boolean;
  flags?: string[];
  collectionIds?: string[];
}

export interface RecommendationTheme {
  id: string;
  titleKey: string;
  defaultTitle: string;
  badgeEmoji?: string;
  score: number;
}

export interface RecommendationResult<T = SharedJob> {
  themeId: string;
  titleKey: string;
  defaultTitle: string;
  badgeEmoji?: string;
  jobs: T[];
  allJobs: T[];
  totalCount: number;
}
