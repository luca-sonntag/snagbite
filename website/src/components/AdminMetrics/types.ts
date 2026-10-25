export type MetricsRange = 'all' | 'today' | '3d' | '7d' | '30d';
export type MetricsSubTab = 'growth' | 'pipeline' | 'ai';

export interface GlobalSetting {
  key: string;
  value: string;
  description: string | null;
  updated_at: string;
}

export interface FeedbackLogItem {
  level: string;
  text: string;
}

export interface FeedbackContextData {
  email?: string;
  platform?: string;
  isNative?: boolean;
  appVersion?: string;
  appBuild?: string;
  language?: string;
  tier?: string;
  viewport?: string;
  route?: string;
  userAgent?: string;
  logs?: FeedbackLogItem[];
}

export interface FeedbackItem {
  id: string;
  type: 'bug' | 'idea';
  message: string;
  context: FeedbackContextData | null;
  screenshot_urls: string[] | null;
  created_at: string;
}

export interface AdminUserItem {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string;
  tier: string;
  custom_limit: number | null;
  extractions_count: number;
}

export interface FailedJobItem {
  id: string;
  url: string;
  error: string | null;
  errorCode?: string;
  userId: string;
  email: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LlmFunctionBreakdown {
  count: number;
  cost: number;
  tokens: number;
  avgCostUsd?: number;
  avgDurationMs?: number;
  errorCount?: number;
  errorRatePct?: number;
  sharePct?: number;
}

export interface TierDistributionMetrics {
  totalUsers: number;
  freeCount: number;
  premiumCount: number;
  alphaCount: number;
  freePct: number;
  premiumPct: number;
  alphaPct: number;
  usersWithBonusCredits: number;
  totalBonusCredits: number;
  customLimitUsers: number;
}

export interface ActiveUserMetrics {
  dau: number;
  wau: number;
  mau: number;
  stickinessPct: number;
}

export interface CohortRetentionRow {
  cohortWeekStart: string;
  cohortLabel: string;
  size: number;
  d1Pct: number | null;
  d7Pct: number | null;
  d14Pct: number | null;
  d30Pct: number | null;
}

export interface NotificationAnalyticsMetrics {
  totalUsers: number;
  notificationsEnabledUsers: number;
  activePushUsers: number;
  optInRatePct: number;
  activeTokens: number;
  disabledTokens: number;
  deliveredInRange: number;
  byCategory: { category: string; count: number }[];
}

export type SourcePlatformKey =
  | 'instagram'
  | 'tiktok'
  | 'youtube'
  | 'website'
  | 'photo'
  | 'remix';

export interface PlatformSourceMixItem {
  platform: SourcePlatformKey;
  total: number;
  completed: number;
  failed: number;
  sharePct: number;
  successRatePct: number;
}

export interface ReuseAndSourceQualityMetrics {
  reusedCount: number;
  freshUrlExtractions: number;
  reuseRatePct: number;
  estimatedSavedUsd: number;
  totalRecipesInRange: number;
  incompleteCaptionCount: number;
  incompleteCaptionPct: number;
  aiCoverCount: number;
  aiCoverPct: number;
  explicitNutritionCount: number;
  explicitNutritionPct: number;
}

export interface SpeedBucketMetrics {
  count: number;
  p50Seconds: number;
  p90Seconds: number;
  avgSeconds: number;
}

export interface ExtractionSpeedMetrics {
  overall: SpeedBucketMetrics;
  url: SpeedBucketMetrics;
  photo: SpeedBucketMetrics;
  remix: SpeedBucketMetrics;
  clientFrameRatePct: number;
  clientFrameCount: number;
}

export interface ErrorReasonRankingItem {
  code: string;
  count: number;
  sharePct: number;
}

export interface TopCreatorItem {
  handle: string;
  platform: SourcePlatformKey;
  count: number;
}

export interface TopIngredientItem {
  mappingKey: string;
  mappingKeyDe: string | null;
  category: string;
  hitCount: number;
  resolution: string;
  confidence: number | null;
  iconSlug: string;
}

export interface IngredientCatalogMetrics {
  totalMappings: number;
  offMatchCount: number;
  offMatchPct: number;
  aiEstimateCount: number;
  aiEstimatePct: number;
  noMatchCount: number;
  noMatchPct: number;
  avgRecipeNutritionCoveragePct: number;
  topIngredients: TopIngredientItem[];
}

export interface RecipeIngredientSummary {
  name: string;
  amount?: string | number | null;
  unit?: string | null;
}

export interface RecentExtractedRecipeItem {
  id: string;
  title: string;
  emoji: string | null;
  imageUrl: string | null;
  sourceUrl: string | null;
  sourceHandle: string | null;
  origin: SourcePlatformKey;
  platform: SourcePlatformKey;
  prepTime: number | null;
  cookTime: number | null;
  servings: number | null;
  calories: number | null;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
  ingredientsCount: number;
  instructionsCount: number;
  ingredients: RecipeIngredientSummary[];
  instructions: string[];
  createdAt: string;
  user: {
    id: string;
    email: string | null;
    name: string | null;
    tier: string;
  } | null;
  savedCount: number;
}

export interface AdminMetricsData {
  range: MetricsRange;
  users: {
    total: number;
    newInRange: number;
  };
  jobs: {
    total: number;
    completed: number;
    failed: number;
    pending: number;
    processing: number;
    mediaBytes: number;
    mediaMb: number;
    dailyStats: { date: string; count: number }[];
    failedJobs: FailedJobItem[];
  };
  llm: {
    totalTokens: number;
    promptTokens: number;
    candidateTokens: number;
    totalCostUsd: number;
    count: number;
    breakdown: Record<string, LlmFunctionBreakdown>;
    dailyCost: { date: string; cost: number }[];
    dailyStats: { date: string; cost: number }[];
  };
  extractionsPerUser: {
    userId: string;
    email: string | null;
    count: number;
  }[];
  growth?: {
    tiers: TierDistributionMetrics;
    activeUsers: ActiveUserMetrics;
    cohorts: CohortRetentionRow[];
    notifications: NotificationAnalyticsMetrics;
  };
  pipeline?: {
    platforms: PlatformSourceMixItem[];
    reuseAndQuality: ReuseAndSourceQualityMetrics;
    speed: ExtractionSpeedMetrics;
    errorRanking: ErrorReasonRankingItem[];
    topCreators: TopCreatorItem[];
    ingredientCatalog: IngredientCatalogMetrics;
    recentRecipes?: RecentExtractedRecipeItem[];
  };
}
