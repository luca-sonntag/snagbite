export interface ParentIngredientInfo {
  name: string;
  baseName: string;
  unit?: string;
  yieldFactor?: number;
}

export interface Ingredient {
  name: string;
  baseName?: string;
  parentIngredient?: ParentIngredientInfo;
  replacedOriginal?: string;
  amount: number;
  unit: string;
  notes?: string;
  modifier?: string;
  category?: string;
  calories?: number | null;
  protein?: number | null;
  carbs?: number | null;
  fat?: number | null;
  isStaple?: boolean;
}

export interface IngredientGroup {
  name: string;
  items: Ingredient[];
}

export interface InstructionStep {
  step: number;
  description: string;
}

export interface AlternativeIngredient {
  original: string;
  substitute: string;
  notes?: string;
}

export interface NutritionalValues {
  calories?: number | null;
  protein?: number | null;
  carbs?: number | null;
  fat?: number | null;
}

export interface Recipe {
  id?: string;
  title: string;
  description: string;
  emoji?: string | null;
  prepTime: number | null;
  cookTime: number | null;
  servings: number;
  ingredients: IngredientGroup[];
  instructions: InstructionStep[];
  equipment: string[];
  nutritionalValues?: NutritionalValues;
  tips?: string[];
  alternativeIngredients?: AlternativeIngredient[];
  transcript?: string | null;
  imageUrl?: string | null;
  imageUrls?: string[];
  tags?: string[];
  instagramHandle?: string | null;
  parentJobId?: string | null;
  parentRecipeTitle?: string | null;
  remixPrompt?: string | null;
}

export type ProgressStage = 'queued' | 'scraping' | 'downloading_media' | 'extracting_frames' | 'reading_photos' | 'extracting_recipe' | 'finalizing';

export interface ProgressData {
  isProgress: true;
  percent: number;
  stage: ProgressStage;
}

export interface Job {
  id: string;
  url: string;
  status: 'pending' | 'scraping' | 'processing' | 'completed' | 'failed';
  recipe?: Recipe;
  progress?: ProgressData;
  error?: string;
  parentJobId?: string | null;
  prompt?: string | null;
  createdAt: string;
  updatedAt: string;
  isFavorite?: boolean;
  flags?: string[];
  collectionIds?: string[];
}

export interface Collection {
  id: string;
  userId: string;
  name: string;
  emoji?: string | null;
  position: number;
  createdAt: string;
  updatedAt: string;
}

export interface ShoppingListItem {
  id: string;
  name: string;
  baseName?: string;
  parentIngredient?: ParentIngredientInfo;
  amount: number;
  unit: string;
  recipeId?: string;
  recipeTitle?: string;
  checked: boolean;
  notes?: string;
  modifier?: string;
  createdAt: string;
  category?: string;
}

export interface AggregatedShoppingItem {
  name: string;
  baseName?: string;
  parentIngredient?: ParentIngredientInfo;
  unit: string;
  amount: number;
  checked: boolean;
  category?: string;
  modifier?: string;
  itemIds: string[];
  sources: { recipeId?: string; recipeTitle?: string; amount: number; unit: string }[];
  subItems?: {
    name: string;
    rawName?: string;
    baseName?: string;
    modifier?: string;
    amount: number;
    unit: string;
    recipeTitle?: string;
  }[];
}

// ── Gamification ─────────────────────────────────────────────────────────────
// Mirror of the backend shapes returned by the gamification endpoints
// (POST /api/jobs/:id/cooked, GET /api/me/gamification).

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
  earnedAt: string;
}

export interface EarnedReward {
  xp: number;
  coins: number;
  reasons: string[];
}

/** Result of recording a cook — everything the reward overlay needs to animate. */
export interface CookedResult {
  stats: UserStats;
  earned: EarnedReward;
  newBadges: string[];
  previousXp: number;
  previousLevel: number;
  leveledUp: boolean;
  /** True when the tap was ignored as a rapid duplicate (no reward). */
  duplicate?: boolean;
}

export interface CookPhotoItem {
  id: string;
  jobId: string;
  photoUrl: string;
  cookedAt: string;
  recipeTitle?: string;
}

/** Snapshot for the progress tab. */
export interface GamificationSnapshot {
  stats: UserStats;
  badges: BadgeInfo[];
  levelThresholds: number[];
  recentPhotos?: CookPhotoItem[];
}

// ── Social (profiles, friends, leaderboard) ─────────────────────────────────
// Mirror of the backend shapes returned by the social endpoints.

export interface Profile {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  friendCode: string;
}

export interface FriendSummary {
  friendshipId: string;
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  level: number;
  currentStreak: number;
}

export interface FriendRequest {
  friendshipId: string;
  userId: string;
  displayName: string;
  avatarUrl: string | null;
}

export type LeaderboardWindow = 'weekly' | 'all';

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  level: number;
  value: number;
  isMe: boolean;
}


