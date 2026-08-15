import fs from 'fs/promises';
import path from 'path';
import { getClient } from '../db.js';
import { getScraperForUrl } from '../scrapers/index.js';
import { extractRecipe } from '../gemini.js';
import { enrichRecipeWithCanonicalIngredients } from '../matching/ingredientMatcher.js';
import { config } from '../config.js';
import type { Recipe } from '../types.js';

interface EvalIngredientReport {
  rawName: string;
  baseName?: string;
  amount: number;
  unit: string;
  canonicalId?: string | null;
  matchedName?: string | null;
  isVerified: boolean;
  calories?: number | null;
  protein?: number | null;
  carbs?: number | null;
  fat?: number | null;
}

interface EvalGeminiUsageReport {
  durationMs?: number;
  model?: string;
  promptTokens?: number;
  candidateTokens?: number;
  totalTokens?: number;
  inputCostUsd?: number;
  outputCostUsd?: number;
  totalCostUsd?: number;
  totalCostFormatted?: string;
}

interface EvalRecipeReport {
  url: string;
  title: string;
  servings: number;
  nutritionalValues?: any;
  totalIngredients: number;
  verifiedCount: number;
  matchRatePercent: number;
  geminiUsage?: EvalGeminiUsageReport;
  ingredients: EvalIngredientReport[];
}

async function run() {
  console.log('=== Starting Dry-Run Recipe & Ingredient Matching Evaluation ===\n');

  const supabase = getClient();
  const { data: jobs, error } = await supabase
    .from('jobs')
    .select('id, url, status, error, recipe')
    .eq('status', 'completed')
    .is('error', null)
    .not('url', 'like', 'photo://%')
    .order('created_at', { ascending: false });

  if (error || !jobs) {
    console.error('Failed to fetch completed jobs from Supabase:', error);
    process.exit(1);
  }

  const uniqueUrls: string[] = [];
  const seen = new Set<string>();
  for (const j of jobs) {
    if (j.url && !seen.has(j.url) && !j.url.includes('seed-')) {
      seen.add(j.url);
      uniqueUrls.push(j.url);
    }
  }

  const TARGET_RECIPES = 5;
  const CONCURRENCY = 2;

  // Create unique timestamped run directory inside eval_results
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const runFolderName = `run_${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
  const baseOutputDir = path.resolve('eval_results');
  const runOutputDir = path.join(baseOutputDir, runFolderName);
  await fs.mkdir(runOutputDir, { recursive: true });

  console.log(`Found ${uniqueUrls.length} real unique recipe URLs in Supabase Dev.`);
  console.log(`Target: ${TARGET_RECIPES} recipes | Concurrency: ${CONCURRENCY}`);
  console.log(`Run Output Directory: ${runOutputDir}\n`);

  const allReports: EvalRecipeReport[] = [];
  let globalTotalIngredients = 0;
  let globalVerifiedIngredients = 0;
  let totalPromptTokens = 0;
  let totalCandidateTokens = 0;
  let totalGeminiTokens = 0;
  let totalInputCostUsd = 0;
  let totalOutputCostUsd = 0;
  let totalGeminiCostUsd = 0;
  let totalGeminiDurationMs = 0;

  const unverifiedList: { recipeTitle: string; rawName: string; baseName?: string; unit: string }[] = [];
  const verifiedList: { recipeTitle: string; rawName: string; baseName?: string; matchedName?: string | null; canonicalId?: string | null }[] = [];

  const tempBaseDir = path.join(baseOutputDir, '.eval_temp');
  await fs.mkdir(tempBaseDir, { recursive: true });

  let nextUrlIndex = 0;

  async function worker(workerId: number) {
    while (nextUrlIndex < uniqueUrls.length && allReports.length < TARGET_RECIPES) {
      const idx = nextUrlIndex++;
      const url = uniqueUrls[idx];
      const runDir = path.join(tempBaseDir, `w${workerId}_${idx + 1}`);
      await fs.mkdir(runDir, { recursive: true });

      try {
        console.log(`[Worker ${workerId}] Processing URL (${idx + 1}/${uniqueUrls.length}): ${url}`);
        const scraper = getScraperForUrl(url);
        const scrapeResult = await scraper.scrape(url, runDir);
        console.log(`  [Worker ${workerId}] Scraped: Caption ${(scrapeResult.caption || '').length} chars`);

        const recipe: Recipe = await extractRecipe(
          undefined,
          undefined,
          scrapeResult.caption || '',
          undefined,
          runDir,
          undefined,
          scrapeResult.htmlContent || undefined,
          undefined
        );

        if (recipe.isRecipe === false) {
          console.warn(`  [Worker ${workerId}] -> Gemini flagged URL as NOT a recipe.`);
          continue;
        }

        enrichRecipeWithCanonicalIngredients(recipe);

        const flatIngredients: EvalIngredientReport[] = [];
        let verifiedCount = 0;

        for (const group of recipe.ingredients || []) {
          for (const ing of group.items || []) {
            const isVer = !!ing.isVerified;
            if (isVer) {
              verifiedCount++;
              verifiedList.push({
                recipeTitle: recipe.title,
                rawName: ing.name,
                baseName: ing.baseName,
                matchedName: ing.matchedName,
                canonicalId: ing.canonicalId,
              });
            } else {
              unverifiedList.push({
                recipeTitle: recipe.title,
                rawName: ing.name,
                baseName: ing.baseName,
                unit: ing.unit,
              });
            }

            flatIngredients.push({
              rawName: ing.name,
              baseName: ing.baseName,
              amount: ing.amount,
              unit: ing.unit,
              canonicalId: ing.canonicalId,
              matchedName: ing.matchedName,
              isVerified: isVer,
              calories: ing.calories,
              protein: ing.protein,
              carbs: ing.carbs,
              fat: ing.fat,
            });
          }
        }

        const totalIngs = flatIngredients.length;
        const matchRate = totalIngs > 0 ? Math.round((verifiedCount / totalIngs) * 100) : 0;
        globalTotalIngredients += totalIngs;
        globalVerifiedIngredients += verifiedCount;

        // Aggregate Gemini token usage & cost
        const usage = recipe.geminiUsage;
        const promptTokens = usage?.tokenUsage?.promptTokens ?? 0;
        const candidateTokens = usage?.tokenUsage?.candidateTokens ?? 0;
        const tokens = usage?.tokenUsage?.totalTokens ?? 0;
        const inputCost = usage?.costEstimate?.inputCostUsd ?? 0;
        const outputCost = usage?.costEstimate?.outputCostUsd ?? 0;
        const cost = usage?.costEstimate?.totalCostUsd ?? 0;
        const costFormatted = usage?.costEstimate?.totalCostFormatted ?? `$${cost.toFixed(4)}`;
        const duration = usage?.durationMs ?? 0;

        totalPromptTokens += promptTokens;
        totalCandidateTokens += candidateTokens;
        totalGeminiTokens += tokens;
        totalInputCostUsd += inputCost;
        totalOutputCostUsd += outputCost;
        totalGeminiCostUsd += cost;
        totalGeminiDurationMs += duration;

        const geminiUsageReport: EvalGeminiUsageReport = {
          durationMs: duration,
          model: usage?.model ?? config.GEMINI_MODEL,
          promptTokens,
          candidateTokens,
          totalTokens: tokens,
          inputCostUsd: inputCost,
          outputCostUsd: outputCost,
          totalCostUsd: cost,
          totalCostFormatted: costFormatted,
        };

        const report: EvalRecipeReport = {
          url,
          title: recipe.title,
          servings: recipe.servings,
          nutritionalValues: recipe.nutritionalValues,
          totalIngredients: totalIngs,
          verifiedCount,
          matchRatePercent: matchRate,
          geminiUsage: geminiUsageReport,
          ingredients: flatIngredients,
        };

        allReports.push(report);
        const reportIndex = allReports.length;

        const safeTitle = (recipe.title || `recipe_${idx + 1}`)
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '_')
          .slice(0, 40);
        const jsonFileName = `recipe_${String(reportIndex).padStart(2, '0')}_${safeTitle}.json`;
        const jsonPath = path.join(runOutputDir, jsonFileName);
        await fs.writeFile(jsonPath, JSON.stringify({ url, recipe, report }, null, 2), 'utf-8');

        console.log(`  [Worker ${workerId}] -> Matched: ${verifiedCount}/${totalIngs} ingredients (${matchRate}%) for "${recipe.title}"`);
        console.log(`  [Worker ${workerId}] -> Nutrition: ${recipe.nutritionalValues?.calories || 0} kcal | P: ${recipe.nutritionalValues?.protein || 0}g | C: ${recipe.nutritionalValues?.carbs || 0}g | F: ${recipe.nutritionalValues?.fat || 0}g`);
        console.log(`  [Worker ${workerId}] -> Gemini: ${tokens.toLocaleString()} tokens (in ${promptTokens.toLocaleString()} / out ${candidateTokens.toLocaleString()}) | Cost: ${costFormatted} | ${(duration / 1000).toFixed(1)}s`);
        console.log(`  [Worker ${workerId}] -> Saved JSON: ${jsonFileName}\n`);
      } catch (err: any) {
        console.error(`  [Worker ${workerId}] -> Failed for ${url}:`, err.message);
      } finally {
        await fs.rm(runDir, { recursive: true, force: true }).catch(() => { });
      }
    }
  }

  // Run workers in parallel
  console.log(`Launching ${CONCURRENCY} parallel workers...\n`);
  const workerPromises = Array.from({ length: CONCURRENCY }, (_, i) => worker(i + 1));
  await Promise.all(workerPromises);

  // Cleanup temporary base scraping directory
  await fs.rm(tempBaseDir, { recursive: true, force: true }).catch(() => { });

  // Gemini cost analytics summary
  const avgCostPerRecipe = allReports.length > 0 ? totalGeminiCostUsd / allReports.length : 0;
  const avgDurationPerRecipe = allReports.length > 0 ? Math.round(totalGeminiDurationMs / allReports.length) : 0;

  const geminiCosts = {
    model: config.GEMINI_MODEL,
    totalRecipesEvaluated: allReports.length,
    totalPromptTokens,
    totalCandidateTokens,
    totalTokens: totalGeminiTokens,
    totalInputCostUsd: parseFloat(totalInputCostUsd.toFixed(6)),
    totalOutputCostUsd: parseFloat(totalOutputCostUsd.toFixed(6)),
    totalCostUsd: parseFloat(totalGeminiCostUsd.toFixed(6)),
    totalCostFormatted: `$${totalGeminiCostUsd.toFixed(4)}`,
    avgCostPerRecipeUsd: parseFloat(avgCostPerRecipe.toFixed(6)),
    avgCostPerRecipeFormatted: `$${avgCostPerRecipe.toFixed(4)}`,
    totalDurationMs: totalGeminiDurationMs,
    avgDurationMsPerRecipe: avgDurationPerRecipe,
  };

  // Write summary report JSON
  const summary = {
    runFolder: runFolderName,
    evaluatedAt: new Date().toISOString(),
    totalUrlsAvailable: uniqueUrls.length,
    processedRecipes: allReports.length,
    globalTotalIngredients,
    globalVerifiedIngredients,
    globalMatchRatePercent: globalTotalIngredients > 0 ? Math.round((globalVerifiedIngredients / globalTotalIngredients) * 100) : 0,
    geminiCosts,
    unverifiedIngredients: unverifiedList,
    verifiedIngredients: verifiedList,
    recipes: allReports,
  };

  const summaryPath = path.join(runOutputDir, '_EVALUATION_SUMMARY.json');
  await fs.writeFile(summaryPath, JSON.stringify(summary, null, 2), 'utf-8');

  // Also write to base eval_results/_EVALUATION_SUMMARY.json as latest pointer
  const latestSummaryPath = path.join(baseOutputDir, '_EVALUATION_SUMMARY.json');
  await fs.writeFile(latestSummaryPath, JSON.stringify(summary, null, 2), 'utf-8');

  console.log('====================================================');
  console.log('=== EVALUATION RUN COMPLETED ===');
  console.log(`Run Directory: ${runOutputDir}`);
  console.log(`Total Recipes Processed: ${allReports.length}`);
  console.log(`Total Ingredients: ${globalTotalIngredients}`);
  console.log(`Verified Ingredients: ${globalVerifiedIngredients} (${summary.globalMatchRatePercent}%)`);
  console.log(`Unverified Ingredients: ${unverifiedList.length}`);
  console.log('\n=== GEMINI COST & TOKEN SUMMARY ===');
  console.log(`Model: ${geminiCosts.model}`);
  console.log(`Total Tokens: ${geminiCosts.totalTokens.toLocaleString()} (in ${geminiCosts.totalPromptTokens.toLocaleString()} / out ${geminiCosts.totalCandidateTokens.toLocaleString()})`);
  console.log(`Total Cost: ${geminiCosts.totalCostFormatted} (Avg ${geminiCosts.avgCostPerRecipeFormatted} per recipe)`);
  console.log(`Total Duration: ${(geminiCosts.totalDurationMs / 1000).toFixed(1)}s (Avg ${(geminiCosts.avgDurationMsPerRecipe / 1000).toFixed(1)}s per recipe)`);
  console.log(`Summary report written to: ${summaryPath}`);
  console.log('====================================================\n');
}

run();
