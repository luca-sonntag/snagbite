export interface ParentIngredientInfo {
  name: string;
  baseName: string;
  unit?: string;
  yieldFactor?: number;
}

export interface Ingredient {
  name: string;
  baseName?: string;
  synonyms?: string[];
  searchQueries?: string[];
  parentIngredient?: ParentIngredientInfo;
  replacedOriginal?: string;
  amount: number;
  unit: string;
  gramsPerUnit?: number | null;
  notes?: string;
  modifier?: string;
  category?: string;
  calories?: number | null;
  protein?: number | null;
  carbs?: number | null;
  fat?: number | null;
  isStaple?: boolean;
  canonicalId?: string | null;
  matchedName?: string | null;
  isVerified?: boolean | null;
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
  /**
   * The recipes-table primary key. Always present on a stored recipe; optional
   * only while a freshly extracted recipe is still in flight and has not been
   * persisted by complete_job() yet.
   */
  id?: string;
  /** Gemini's "this isn't actually a recipe" verdict, kept for auditing. */
  isRecipe?: boolean;
  /** Who extracted it. NULL once that account is deleted. */
  createdBy?: string | null;
  /** 'private' until sharing/publishing ships. */
  visibility?: RecipeVisibility;
  /** How the recipe came into being; mirrors the producing job's `kind`. */
  origin?: RecipeOrigin;
  /** The page/reel this was extracted from. NULL for photo imports. */
  sourceUrl?: string | null;
  /** Recipe this one was remixed from, and the instruction that produced it. */
  parentRecipeId?: string | null;
  title: string;
  description: string;
  emoji?: string | null;

  prepTime: number | null; // prep time in minutes
  cookTime: number | null; // cook time in minutes
  servings: number;
  ingredients: IngredientGroup[];
  instructions: InstructionStep[];
  equipment: string[];
  /**
   * Per-serving nutrition. Always derived from the ingredient list by
   * `enrichRecipeWithCanonicalIngredients` — never taken from the model and never
   * written by a client. Treat it as a cache of `Σ ingredients / servings`.
   */
  nutritionalValues?: NutritionalValues;
  /** Per-serving nutrition as literally stated by the source, when it stated any. */
  sourceNutritionalValues?: NutritionalValues | null;
  /** Whether the source itself stated recipe-level nutrition. */
  hasExplicitNutritionalValues?: boolean;
  /**
   * Share (0..1) of `nutritionalValues.calories` contributed by ingredients matched
   * against the BLS database. The remainder comes from Gemini estimates for
   * ingredients the matcher could not resolve.
   */
  nutritionCoverage?: number;
  tips?: string[];
  alternativeIngredients?: AlternativeIngredient[];
  transcript?: string | null;
  imageUrl?: string | null;
  imageUrls?: string[];
  /** Detailed food photography prompt used for FLUX.1 [schnell] cover generation. */
  imagePrompt?: string | null;
  /** True when imageUrl is an AI-generated cover image rather than a scraped video thumbnail. */
  isAiCover?: boolean;
  tags?: string[];
  /** e.g. the Instagram creator the recipe came from. */
  sourceHandle?: string | null;
  /** The remix instruction that produced this recipe. */
  remixPrompt?: string | null;
  /** Title of `parentRecipeId`, resolved on read for the lineage banner. */
  parentRecipeTitle?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export type RecipeVisibility = 'private' | 'unlisted' | 'public';
export type RecipeOrigin = 'url' | 'photo' | 'remix';

/**
 * A recipe as it appears in one user's cookbook: the shared content plus that
 * user's own metadata. `user_recipes.id` stays server-side — the recipe id is
 * the client-facing handle, resolved back to the library row via the unique
 * (user_id, recipe_id).
 */
export interface SavedRecipe {
  recipeId: string;
  recipe: Recipe;
  source: UserRecipeSource;
  isFavorite: boolean;
  flags: string[];
  collectionIds: string[];
  addedAt: string;
  updatedAt: string;
}

export type UserRecipeSource = 'extraction' | 'photo' | 'remix' | 'share';

export interface GeminiTokenUsage {
  promptTokens: number;
  candidateTokens: number;
  totalTokens: number;
}

export interface GeminiCostEstimate {
  inputCostUsd: number;
  outputCostUsd: number;
  totalCostUsd: number;
  totalCostFormatted: string;
  pricingTier?: string;
  pricingKnown?: boolean;
}

export interface GeminiUsageInfo {
  tokenUsage?: GeminiTokenUsage;
  costEstimate?: GeminiCostEstimate;
  durationMs?: number;
  model?: string;
}

export interface FluxUsageInfo {
  model: string;
  durationMs?: number;
  costUsd?: number;
  costFormatted?: string;
  inferenceSteps?: number;
  imageSize?: string;
}

export interface LlmUsage {
  gemini?: GeminiUsageInfo;
  flux?: FluxUsageInfo;
  [key: string]: any;
}

/**
 * `cancelled` replaces the former soft-delete-as-cancel: job rows are never
 * deleted (they are the audit trail and back the rolling rate limit), so
 * aborting an in-flight extraction is a status, not a deletion.
 */
export type JobStatus = 'pending' | 'scraping' | 'processing' | 'awaiting_frames' | 'completed' | 'failed' | 'cancelled';

/** What produced this job. Replaces sniffing `photo://` URLs and parent ids. */
export type JobKind = 'url' | 'photo' | 'remix';

export type ProgressStage = 'queued' | 'scraping' | 'downloading_media' | 'extracting_frames' | 'reading_photos' | 'awaiting_frames' | 'extracting_recipe' | 'generating_cover' | 'finalizing';

/**
 * Lives in its own `jobs.progress` column. It used to be smuggled through the
 * recipe column as `{isProgress:true, …}`, which is why the discriminator is
 * gone: a progress payload can no longer be mistaken for a recipe.
 */
export interface ProgressData {
  percent: number;
  stage: ProgressStage;
}

/** Ephemeral client media hand-off: thumbnail + keyframes received from client. */
export interface ClientFramesPayload {
  thumbnailBase64?: string;
  framesBase64: string[];
}

/** An extraction task. Owns no recipe content — only a pointer to its result. */
export interface Job {
  id: string;
  userId: string;
  kind: JobKind;
  status: JobStatus;
  /** 'photo://<uploadId>' when kind === 'photo'. */
  sourceUrl: string;
  sourceUrlNormalized?: string | null;
  error?: string | null;
  progress?: ProgressData | null;
  /** Ephemeral client frames payload received while status was 'awaiting_frames'. Nulled on claim. */
  clientFrames?: ClientFramesPayload | null;
  /** Cached scraping result preserved while job is parked in awaiting_frames. */
  scrapeMeta?: any | null;
  /** The produced recipe. NULL until the job completes. */
  recipeId?: string | null;
  /** Remix input: the recipe being remixed and the instruction to apply. */
  parentRecipeId?: string | null;
  remixPrompt?: string | null;
  /**
   * Token/inference cost of THIS run. Deliberately not on the recipe: a shared
   * or published recipe must not carry the extractor's bill.
   */
  llmUsage?: LlmUsage | null;
  /** Total bytes of media (audio + video) downloaded by the worker for this job. */
  mediaBytes?: number;
  createdAt: string;
  updatedAt: string;
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

// ── Gamification ─────────────────────────────────────────────────────────────

export interface StreakTier {
  /** Minimum consecutive-day streak length for this multiplier to apply. */
  minDays: number;
  /** Multiplier applied to the whole cook's XP. */
  mult: number;
}

export interface DailySoftcap {
  /** Number of cooks per day that score at full value. */
  fullCount: number;
  /** Factor for cooks beyond fullCount up to reducedUntilCount. */
  reducedFactor: number;
  /** Cook index (1-based) up to which reducedFactor applies. */
  reducedUntilCount: number;
  /** Factor for every cook beyond reducedUntilCount. */
  tailFactor: number;
}

/**
 * The tunable point formula. Persisted as a JSON row in `global_settings`
 * (key `gamification_config`) so balancing changes need no redeploy; the backend
 * falls back to {@link DEFAULT_GAMIFICATION_CONFIG} when the row is absent.
 */
export interface GamificationConfig {
  baseXp: number;
  /** Multiplier per difficulty tier keyed "1"|"2"|"3". Flat (all 1) at launch. */
  difficultyMultipliers: Record<string, number>;
  /** Diminishing factors indexed by how often this recipe was cooked before
   *  (within `repetitionWindowDays`). The last entry is a floor, not a penalty. */
  repetitionFactors: number[];
  /** Days within which a prior cook of the same recipe counts as a repeat.
   *  Cooks older than this window reset to full value — so a weekly favorite
   *  is rewarded, not punished. 0/negative disables the window (count all). */
  repetitionWindowDays: number;
  noveltyRecipeBonus: number;
  /** Reserved: applied once a cuisine signal exists on recipes. */
  noveltyCuisineBonus: number;
  /** Reserved: a finished-dish photo is now mandatory (verified before a cook
   *  is accepted), so there is no photo *bonus* — every cook already has one.
   *  Kept out of the config on purpose; see docs/OBSOLETE.md. */
  streakTiers: StreakTier[];
  dailySoftcap: DailySoftcap;
  coinsPerXp: number;
  /** Minimum seconds between two *different* recipes counting as cooked. */
  velocityMinSeconds: number;
  /** Cumulative XP required to reach level index+1 (levelThresholds[0] = L1). */
  levelThresholds: number[];
  /** One-off XP awarded the first time a badge is earned (server-authoritative;
   *  the frontend only mirrors this for display). Keyed by badge key; missing
   *  keys fall back to {@link DEFAULT_BADGE_XP}. */
  badgeXp: Record<string, number>;
}

/** One-off XP awarded the first time each badge is earned. Mirrors the
 *  frontend's `BADGE_XP` so the overlay and progress tab stay in sync. */
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

/** Code-side defaults; mirror of the seeded `gamification_config` row. */
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
  /** ISO date (YYYY-MM-DD) of the most recent counted cook, or null. */
  lastCookDate: string | null;
  totalCooks: number;
}

/** Signals passed in when a user marks a recipe cooked. */
export interface CookSignals {
  hasPhoto?: boolean;
  photoPath?: string | null;
  viaCookingMode?: boolean;
  timerElapsed?: boolean;
}

export interface EarnedReward {
  xp: number;
  coins: number;
  /** Human-readable ledger reasons, e.g. "base", "photo_bonus", "streak_x1.25". */
  reasons: string[];
}

/** Full result of recording a cook — everything the reward overlay needs. */
export interface CookedResult {
  stats: UserStats;
  earned: EarnedReward;
  newBadges: string[];
  previousXp: number;
  previousLevel: number;
  leveledUp: boolean;
  /** True when the tap was ignored as a duplicate (rapid re-tap of same recipe). */
  duplicate?: boolean;
}

// ── Social (profiles, friends, leaderboard) ─────────────────────────────────

export interface Profile {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  friendCode: string;
}

/** A friend in the accepted list, with light gamification stats for display. */
export interface FriendSummary {
  friendshipId: string;
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  level: number;
  xp?: number;
  currentStreak: number;
  totalCooks?: number;
}

/** An incoming pending friend request (the requester's identity). */
export interface FriendRequest {
  friendshipId: string;
  userId: string;
  displayName: string;
  avatarUrl: string | null;
}

export type LeaderboardWindow = 'monthly' | 'all';
export type LeaderboardScope = 'friends' | 'global';

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  level: number;
  /** Weekly XP or all-time XP, depending on the window. */
  value: number;
  isMe: boolean;
  friendshipStatus?: 'none' | 'pending_sent' | 'pending_received' | 'friends' | 'self';
  friendshipId?: string;
}


