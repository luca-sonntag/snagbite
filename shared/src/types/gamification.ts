export interface StreakTier {
  minDays: number;
  mult: number;
}

export interface DailySoftcap {
  fullCount: number;
  reducedFactor: number;
  reducedUntilCount: number;
  tailFactor: number;
}

export interface GamificationConfig {
  baseXp: number;
  difficultyMultipliers: Record<string, number>;
  repetitionFactors: number[];
  repetitionWindowDays: number;
  noveltyRecipeBonus: number;
  noveltyCuisineBonus: number;
  streakTiers: StreakTier[];
  dailySoftcap: DailySoftcap;
  coinsPerXp: number;
  velocityMinSeconds: number;
  levelThresholds: number[];
  badgeXp: Record<string, number>;
}

export const DEFAULT_BADGE_XP: Record<string, number> = {
  first_cook: 50,
  cook_10: 150,
  cook_25: 300,
  cook_50: 500,
  cook_100: 1000,
  streak_3: 100,
  streak_7: 250,
  streak_30: 1000,
  first_photo: 75,
  distinct_5: 100,
  distinct_10: 250,
  distinct_25: 500,
  night_owl: 75,
  weekend_chef: 150,
  timer_first: 50,
  timer_10: 200,
  same_recipe_3: 100,
};

export const DEFAULT_GAMIFICATION_CONFIG: GamificationConfig = {
  baseXp: 100,
  difficultyMultipliers: { '1': 1, '2': 1.5, '3': 2 },
  repetitionFactors: [1, 0.833, 0.667, 0.5],
  repetitionWindowDays: 7,
  noveltyRecipeBonus: 20,
  noveltyCuisineBonus: 50,
  streakTiers: [
    { minDays: 3, mult: 1.1 },
    { minDays: 7, mult: 1.25 },
    { minDays: 30, mult: 1.5 },
  ],
  dailySoftcap: { fullCount: 3, reducedFactor: 0.5, reducedUntilCount: 5, tailFactor: 0.25 },
  coinsPerXp: 0.1,
  velocityMinSeconds: 120,
  levelThresholds: [0, 500, 1200, 2200, 3500, 5100, 7000, 9300, 12000, 15100],
  badgeXp: DEFAULT_BADGE_XP,
};

export interface UserStats {
  userId: string;
  xp: number;
  level: number;
  coins: number;
  currentStreak: number;
  longestStreak: number;
  lastCookDate: string | null;
  totalCooks: number;
  distinctRecipes?: number;
}

export interface BadgeInfo {
  key: string;
  earned?: boolean;
  earnedAt?: string;
}

export interface CookSignals {
  hasPhoto?: boolean;
  photoPath?: string | null;
  viaCookingMode?: boolean;
  timerElapsed?: boolean;
}

export interface EarnedReward {
  xp: number;
  coins: number;
  reasons: string[];
}

export interface CookedResult {
  stats: UserStats;
  earned: EarnedReward;
  newBadges: string[];
  previousXp: number;
  previousLevel: number;
  leveledUp: boolean;
  duplicate?: boolean;
}

export interface CookPhotoItem {
  id: string;
  jobId?: string;
  recipeId?: string | null;
  photoUrl: string;
  cookedAt: string;
  recipeTitle?: string;
}

export interface GamificationSnapshot {
  stats: UserStats;
  badges: BadgeInfo[];
  levelThresholds?: number[];
  recentCooks?: CookPhotoItem[];
  recentPhotos?: CookPhotoItem[];
}
