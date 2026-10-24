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

export interface GrowthAndRetentionAnalytics {
  tiers: TierDistributionMetrics;
  activeUsers: ActiveUserMetrics;
  cohorts: CohortRetentionRow[];
  notifications: NotificationAnalyticsMetrics;
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

export interface PipelineAndCatalogAnalytics {
  platforms: PlatformSourceMixItem[];
  reuseAndQuality: ReuseAndSourceQualityMetrics;
  speed: ExtractionSpeedMetrics;
  errorRanking: ErrorReasonRankingItem[];
  topCreators: TopCreatorItem[];
  ingredientCatalog: IngredientCatalogMetrics;
}
