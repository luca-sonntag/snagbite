import type { SavedRecipe } from '../types.js';

/** The five user-facing opt-in groups shown as toggles in Settings. */
export type NotificationCategory =
  | 'seasonal'
  | 'reminders'
  | 'timing'
  | 'taste'
  | 'motivation';

/** The individual candidate generators. Several map onto one opt-in category. */
export type NotificationType =
  | 'seasonal'
  | 'holiday_event'
  | 'saved_reminder'
  | 'dormant_rediscovery'
  | 'collection_nudge'
  | 'anniversary'
  | 'weekday_suggestion'
  | 'quick_win'
  | 'occasion_servings'
  | 'taste_affinity'
  | 'nutrition_goal'
  | 'ingredient_spotlight'
  | 'creator_affinity'
  | 'remix_nudge'
  | 'milestone'
  | 'reactivation';

export const ALL_CATEGORIES: NotificationCategory[] = [
  'seasonal',
  'reminders',
  'timing',
  'taste',
  'motivation',
];

/** Central type -> opt-in-group mapping. Adjust here to re-group a type. */
export const TYPE_CATEGORY: Record<NotificationType, NotificationCategory> = {
  seasonal: 'seasonal',
  holiday_event: 'seasonal',
  saved_reminder: 'reminders',
  dormant_rediscovery: 'reminders',
  collection_nudge: 'reminders',
  anniversary: 'reminders',
  weekday_suggestion: 'timing',
  quick_win: 'timing',
  occasion_servings: 'timing',
  taste_affinity: 'taste',
  nutrition_goal: 'taste',
  ingredient_spotlight: 'taste',
  creator_affinity: 'taste',
  remix_nudge: 'taste',
  milestone: 'motivation',
  reactivation: 'motivation',
};

export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

export interface HolidayEvent {
  id: string;
  /** Human label handed to Gemini as context (not shown verbatim). */
  label: string;
  keywords: string[];
}

/** A ranked notification candidate. `slots` are the raw facts Gemini phrases. */
export interface Candidate {
  type: NotificationType;
  category: NotificationCategory;
  score: number;
  /** Target recipe the tap should open; null for reactivation-style nudges. */
  recipeId: string | null;
  slots: Record<string, unknown>;
}

/** Everything a candidate generator needs. Assembled by the worker per user. */
export interface NotificationContext {
  userId: string;
  /** Current instant (UTC). */
  now: Date;
  /** User-local hour 0-23. */
  localHour: number;
  /** User-local weekday, 0=Sunday .. 6=Saturday. */
  localWeekday: number;
  season: Season;
  holidays: HolidayEvent[];
  /** The user's cookbook, newest first. */
  recipes: SavedRecipe[];
  /** Collections keyed by id -> { name, recipeIds }. */
  collections: Map<string, { name: string; recipeIds: string[] }>;
  /** Opted-in groups. */
  categories: Set<NotificationCategory>;
  /** Notification types sent to this user recently (anti-repeat). */
  recentTypes: Set<string>;
  /** Recipe ids notified about recently (anti-repeat). */
  recentRecipeIds: Set<string>;
  /** Days since the user's most recent extraction (Infinity if none). */
  daysSinceLastSave: number;
}
