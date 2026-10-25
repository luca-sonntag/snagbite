import { db } from './drizzle.js';
import {
  jobs,
  recipes,
  userRecipes,
  ingredientMappings,
} from './schema/index.js';
import { gte, desc } from 'drizzle-orm';
import type {
  SourcePlatformKey,
  PlatformSourceMixItem,
  PipelineAndCatalogAnalytics,
} from './adminAnalyticsTypes.js';
import {
  classifyPlatform,
  parseErrorCode,
  computeSpeedBucket,
  toIconSlug,
} from './adminAnalyticsHelpers.js';
import { getRecentExtractedRecipes } from './adminRecentRecipesDb.js';

export async function getPipelineAndCatalogAnalytics(
  since: Date | null = null,
  avgExtractionCostUsd = 0.008,
): Promise<PipelineAndCatalogAnalytics> {
  const [jobRows, recipeRows, userRecipeRows, mappingRows, topMappings, recentRecipes] = await Promise.all([
    db
      .select({
        kind: jobs.kind,
        status: jobs.status,
        sourceUrl: jobs.sourceUrl,
        error: jobs.error,
        hasClientFrames: jobs.clientFrames,
        createdAt: jobs.createdAt,
        updatedAt: jobs.updatedAt,
      })
      .from(jobs)
      .where(since ? gte(jobs.createdAt, since) : undefined),
    db
      .select({
        id: recipes.id,
        origin: recipes.origin,
        sourceUrl: recipes.sourceUrl,
        sourceHandle: recipes.sourceHandle,
        isAiCover: recipes.isAiCover,
        hasIncompleteSourceInfo: recipes.hasIncompleteSourceInfo,
        hasExplicitNutritionalValues: recipes.hasExplicitNutritionalValues,
        nutritionCoverage: recipes.nutritionCoverage,
        isDemo: recipes.isDemo,
        createdAt: recipes.createdAt,
      })
      .from(recipes)
      .where(since ? gte(recipes.createdAt, since) : undefined),
    db
      .select({
        source: userRecipes.source,
        sourceJobId: userRecipes.sourceJobId,
        addedAt: userRecipes.addedAt,
      })
      .from(userRecipes)
      .where(since ? gte(userRecipes.addedAt, since) : undefined),
    db
      .select({
        resolution: ingredientMappings.resolution,
      })
      .from(ingredientMappings),
    db
      .select({
        mappingKey: ingredientMappings.mappingKey,
        mappingKeyDe: ingredientMappings.mappingKeyDe,
        category: ingredientMappings.category,
        hitCount: ingredientMappings.hitCount,
        resolution: ingredientMappings.resolution,
        confidence: ingredientMappings.confidence,
      })
      .from(ingredientMappings)
      .orderBy(desc(ingredientMappings.hitCount))
      .limit(20),
    getRecentExtractedRecipes(since, 50),
  ]);

  const pct = (part: number, total: number): number =>
    total > 0 ? parseFloat(((part / total) * 100).toFixed(1)) : 0;

  // 1. Platform Mix & Speed & Error Ranking
  const platformStats: Record<
    SourcePlatformKey,
    { total: number; completed: number; failed: number }
  > = {
    instagram: { total: 0, completed: 0, failed: 0 },
    tiktok: { total: 0, completed: 0, failed: 0 },
    youtube: { total: 0, completed: 0, failed: 0 },
    website: { total: 0, completed: 0, failed: 0 },
    photo: { total: 0, completed: 0, failed: 0 },
    remix: { total: 0, completed: 0, failed: 0 },
  };

  const durationsAll: number[] = [];
  const durationsUrl: number[] = [];
  const durationsPhoto: number[] = [];
  const durationsRemix: number[] = [];
  let completedUrlCount = 0;
  let clientFrameCount = 0;
  const errorCounts: Record<string, number> = {};
  let totalFailed = 0;

  for (const j of jobRows) {
    const plat = classifyPlatform(j.kind, j.sourceUrl);
    platformStats[plat].total++;
    if (j.status === 'completed') {
      platformStats[plat].completed++;
      if ((j.kind || 'url') === 'url') {
        completedUrlCount++;
        if (j.hasClientFrames !== null && j.hasClientFrames !== undefined) {
          clientFrameCount++;
        }
      }
      if (j.createdAt && j.updatedAt) {
        const diffSec = (j.updatedAt.getTime() - j.createdAt.getTime()) / 1000;
        if (diffSec > 0.5 && diffSec <= 900) {
          durationsAll.push(diffSec);
          if (j.kind === 'photo') durationsPhoto.push(diffSec);
          else if (j.kind === 'remix') durationsRemix.push(diffSec);
          else durationsUrl.push(diffSec);
        }
      }
    } else if (j.status === 'failed') {
      platformStats[plat].failed++;
      totalFailed++;
      const code = parseErrorCode(j.error);
      errorCounts[code] = (errorCounts[code] || 0) + 1;
    }
  }

  const totalJobs = jobRows.length;
  const platforms: PlatformSourceMixItem[] = (
    Object.keys(platformStats) as SourcePlatformKey[]
  )
    .map((platform) => {
      const s = platformStats[platform];
      const finished = s.completed + s.failed;
      return {
        platform,
        total: s.total,
        completed: s.completed,
        failed: s.failed,
        sharePct: pct(s.total, totalJobs),
        successRatePct: pct(s.completed, finished),
      };
    })
    .sort((a, b) => b.total - a.total);

  const errorRanking = Object.entries(errorCounts)
    .map(([code, count]) => ({
      code,
      count,
      sharePct: pct(count, totalFailed),
    }))
    .sort((a, b) => b.count - a.count);

  // 2. 0-Quota Recipe Reuse & Source Quality
  let reusedCount = 0;
  for (const ur of userRecipeRows) {
    if (ur.source === 'extraction' && !ur.sourceJobId) {
      reusedCount++;
    }
  }
  const totalUrlAcquisition = completedUrlCount + reusedCount;
  const reuseRatePct = pct(reusedCount, totalUrlAcquisition);
  const estimatedSavedUsd = parseFloat((reusedCount * avgExtractionCostUsd).toFixed(4));

  const nonDemoRecipes = recipeRows.filter((r) => !r.isDemo);
  const totalRecipesInRange = nonDemoRecipes.length;
  let incompleteCaptionCount = 0;
  let aiCoverCount = 0;
  let explicitNutritionCount = 0;
  let coverageSum = 0;
  let coverageCount = 0;
  const creatorMap = new Map<string, { platform: SourcePlatformKey; count: number }>();

  for (const r of nonDemoRecipes) {
    if (r.hasIncompleteSourceInfo) incompleteCaptionCount++;
    if (r.isAiCover) aiCoverCount++;
    if (r.hasExplicitNutritionalValues) explicitNutritionCount++;
    if (r.nutritionCoverage !== null && r.nutritionCoverage !== undefined) {
      const cov = Number(r.nutritionCoverage);
      if (!Number.isNaN(cov)) {
        coverageSum += cov <= 1 ? cov * 100 : cov;
        coverageCount++;
      }
    }
    const rawHandle = (r.sourceHandle || '').trim().replace(/^@+/, '').toLowerCase();
    if (rawHandle && rawHandle.length >= 2) {
      const plat = classifyPlatform(r.origin, r.sourceUrl);
      const existing = creatorMap.get(rawHandle);
      if (existing) {
        existing.count++;
      } else {
        creatorMap.set(rawHandle, { platform: plat, count: 1 });
      }
    }
  }

  const topCreators = Array.from(creatorMap.entries())
    .map(([handle, info]) => ({
      handle: `@${handle}`,
      platform: info.platform,
      count: info.count,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // 3. Ingredient Catalog & OpenFoodFacts Coverage
  const totalMappings = mappingRows.length;
  let offMatchCount = 0;
  let aiEstimateCount = 0;
  let noMatchCount = 0;
  for (const m of mappingRows) {
    const res = (m.resolution || '').toLowerCase();
    if (res === 'no_match' || res === 'none') noMatchCount++;
    else if (res.includes('ai') || res.includes('estimate')) aiEstimateCount++;
    else offMatchCount++;
  }

  return {
    platforms,
    reuseAndQuality: {
      reusedCount,
      freshUrlExtractions: completedUrlCount,
      reuseRatePct,
      estimatedSavedUsd,
      totalRecipesInRange,
      incompleteCaptionCount,
      incompleteCaptionPct: pct(incompleteCaptionCount, totalRecipesInRange),
      aiCoverCount,
      aiCoverPct: pct(aiCoverCount, totalRecipesInRange),
      explicitNutritionCount,
      explicitNutritionPct: pct(explicitNutritionCount, totalRecipesInRange),
    },
    speed: {
      overall: computeSpeedBucket(durationsAll),
      url: computeSpeedBucket(durationsUrl),
      photo: computeSpeedBucket(durationsPhoto),
      remix: computeSpeedBucket(durationsRemix),
      clientFrameRatePct: pct(clientFrameCount, completedUrlCount),
      clientFrameCount,
    },
    errorRanking,
    topCreators,
    ingredientCatalog: {
      totalMappings,
      offMatchCount,
      offMatchPct: pct(offMatchCount, totalMappings),
      aiEstimateCount,
      aiEstimatePct: pct(aiEstimateCount, totalMappings),
      noMatchCount,
      noMatchPct: pct(noMatchCount, totalMappings),
      avgRecipeNutritionCoveragePct:
        coverageCount > 0 ? parseFloat((coverageSum / coverageCount).toFixed(1)) : 0,
      topIngredients: topMappings.map((item) => ({
        mappingKey: item.mappingKey,
        mappingKeyDe: item.mappingKeyDe ?? null,
        category: item.category || 'other',
        hitCount: item.hitCount ?? 0,
        resolution: item.resolution,
        confidence: item.confidence !== null ? Number(item.confidence) : null,
        iconSlug: toIconSlug(item.mappingKey),
      })),
    },
    recentRecipes,
  };
}
