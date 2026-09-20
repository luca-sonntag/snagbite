export interface UserStatsRow {
  user_id: string;
  xp: number | string;
  level: number;
  coins: number | string;
  current_streak: number;
  longest_streak: number;
  last_cook_date: string | null;
  total_cooks: number;
}

export interface InsertCookEventArgs {
  userId: string;
  recipeId: string;
  xp: number;
  coins: number;
  hasPhoto: boolean;
  photoPath: string | null;
  verified: boolean;
  leaderboardEligible: boolean;
  trustScore: number;
  viaCookingMode: boolean;
  timerElapsed: boolean;
}

export interface CookPhotoItem {
  id: string;
  recipeId: string | null;
  photoUrl: string;
  cookedAt: string;
  recipeTitle?: string;
}

export interface CookHistoryItem {
  id: string;
  cookedAt: string;
  xpAwarded: number;
  coinsAwarded: number;
  hasPhoto: boolean;
  photoUrl: string | null;
  verified: boolean;
  viaCookingMode: boolean;
  timerElapsed: boolean;
}

export interface CookHistory {
  count: number;
  firstCookedAt: string | null;
  lastCookedAt: string | null;
  items: CookHistoryItem[];
}

export interface LedgerRow {
  deltaXp: number;
  deltaCoins: number;
  reason: string;
}
