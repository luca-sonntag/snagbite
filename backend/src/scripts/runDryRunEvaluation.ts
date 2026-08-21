import fs from 'fs/promises';
import path from 'path';
import { getClient } from '../db.js';
import { getScraperForUrl } from '../scrapers/index.js';
import { extractRecipe } from '../gemini.js';
import { enrichRecipeWithCanonicalIngredients, toEnglishSingular } from '../matching/ingredientMatcher.js';
import { BASE_NAME_TO_CANONICAL_ID } from '../matching/baseNameMap.js';
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
  isBaseNameMapMatch?: boolean;
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
  baseNameMapMatchCount: number;
  baseNameMapMatchRatePercent: number;
  geminiUsage?: EvalGeminiUsageReport;
  ingredients: EvalIngredientReport[];
}

interface CliOptions {
  skip: number;
  targetRecipes: number;
  concurrency: number;
  file?: string;
}

function parseCliArgs(): CliOptions {
  const args = process.argv.slice(2);
  let skip = process.env.SKIP ? parseInt(process.env.SKIP, 10) : 0;
  let targetRecipes = process.env.LIMIT || process.env.TARGET_RECIPES
    ? parseInt(process.env.LIMIT || process.env.TARGET_RECIPES!, 10)
    : 5;
  let concurrency = process.env.CONCURRENCY ? parseInt(process.env.CONCURRENCY, 10) : 2;
  let file = process.env.FILE || process.env.URL_FILE || process.env.URLS_FILE || undefined;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--help' || arg === '-h') {
      console.log(`
Usage: npx tsx src/scripts/runDryRunEvaluation.ts [options]

Options:
  --file, -f, --urls <path> Number/list of URLs from a .txt or .json file (overrides Supabase fetch)
  --skip, -s <n>            Number of recipe URLs to skip (default: 0)
  --limit, -l, -n <n>       Number of recipes to successfully evaluate (default: 5)
  --concurrency, -c <n>     Number of parallel workers (default: 2)
  --help, -h                Show this help message

Environment variables:
  FILE=my_urls.txt SKIP=5 LIMIT=10 CONCURRENCY=2 npx tsx src/scripts/runDryRunEvaluation.ts
      `);
      process.exit(0);
    }

    if (arg === '--file' || arg === '-f' || arg === '--urls' || arg === '-u') {
      const val = args[++i];
      if (val) file = val.trim();
    } else if (arg.startsWith('--file=') || arg.startsWith('--urls=')) {
      const val = arg.split('=')[1];
      if (val) file = val.trim();
    } else if (arg.startsWith('-f=') || arg.startsWith('-u=')) {
      const val = arg.split('=')[1];
      if (val) file = val.trim();
    } else if (arg === '--skip' || arg === '-s') {
      const val = parseInt(args[++i], 10);
      if (!isNaN(val)) skip = Math.max(0, val);
    } else if (arg.startsWith('--skip=')) {
      const val = parseInt(arg.slice(7), 10);
      if (!isNaN(val)) skip = Math.max(0, val);
    } else if (arg.startsWith('-s=')) {
      const val = parseInt(arg.slice(3), 10);
      if (!isNaN(val)) skip = Math.max(0, val);
    } else if (arg === '--limit' || arg === '-l' || arg === '-n' || arg === '--target') {
      const val = parseInt(args[++i], 10);
      if (!isNaN(val)) targetRecipes = Math.max(1, val);
    } else if (arg.startsWith('--limit=') || arg.startsWith('--target=')) {
      const val = parseInt(arg.split('=')[1], 10);
      if (!isNaN(val)) targetRecipes = Math.max(1, val);
    } else if (arg === '--concurrency' || arg === '-c') {
      const val = parseInt(args[++i], 10);
      if (!isNaN(val)) concurrency = Math.max(1, val);
    } else if (arg.startsWith('--concurrency=') || arg.startsWith('-c=')) {
      const val = parseInt(arg.split('=')[1], 10);
      if (!isNaN(val)) concurrency = Math.max(1, val);
    }
  }

  if (isNaN(skip) || skip < 0) skip = 0;
  if (isNaN(targetRecipes) || targetRecipes < 1) targetRecipes = 5;
  if (isNaN(concurrency) || concurrency < 1) concurrency = 2;

  return { skip, targetRecipes, concurrency, file };
}

async function loadUrlsFromFile(filePath: string): Promise<string[]> {
  const resolvedPath = path.resolve(process.cwd(), filePath);
  console.log(`Loading recipe URLs from file: ${resolvedPath}`);
  
  const content = await fs.readFile(resolvedPath, 'utf-8');
  const urls: string[] = [];
  const seen = new Set<string>();

  const trimmed = content.trim();
  if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed);
      const rawList: any[] = Array.isArray(parsed)
        ? parsed
        : Array.isArray(parsed.urls)
        ? parsed.urls
        : Array.isArray(parsed.jobs)
        ? parsed.jobs
        : [];

      for (const item of rawList) {
        const u = typeof item === 'string' ? item.trim() : item?.url?.trim();
        if (u && (u.startsWith('http://') || u.startsWith('https://')) && !seen.has(u)) {
          seen.add(u);
          urls.push(u);
        }
      }
      return urls;
    } catch {
      // If JSON parsing fails, fall back to line-by-line parsing
    }
  }

  // Line-by-line parsing for .txt or plaintext lists
  const lines = content.split(/\r?\n/);
  for (let line of lines) {
    line = line.trim();
    if (!line || line.startsWith('#') || line.startsWith('//')) {
      continue;
    }
    if ((line.startsWith('http://') || line.startsWith('https://')) && !seen.has(line)) {
      seen.add(line);
      urls.push(line);
    }
  }

  return urls;
}

async function run() {
  const { skip, targetRecipes, concurrency, file } = parseCliArgs();

  console.log('=== Starting Dry-Run Recipe & Ingredient Matching Evaluation ===\n');

  let uniqueUrls: string[] = [];

  if (file) {
    try {
      uniqueUrls = await loadUrlsFromFile(file);
      console.log(`Loaded ${uniqueUrls.length} unique URLs from ${file}.`);
    } catch (err: any) {
      console.error(`Failed to read URLs from file "${file}":`, err.message);
      process.exit(1);
    }
  } else {
    const supabase = getClient();
    const { data: jobs, error } = await supabase
      .from('jobs')
      .select('id, source_url, status, error')
      .eq('status', 'completed')
      .is('error', null)
      .neq('kind', 'photo')
      .order('created_at', { ascending: false });

    if (error || !jobs) {
      console.error('Failed to fetch completed jobs from Supabase:', error);
      process.exit(1);
    }

    const seen = new Set<string>();
    for (const j of jobs as any[]) {
      const url = j.source_url;
      if (url && !seen.has(url) && !url.includes('seed-')) {
        seen.add(url);
        uniqueUrls.push(url);
      }
    }
    console.log(`Found ${uniqueUrls.length} real unique recipe URLs in Supabase Dev.`);
  }

  // Create unique timestamped run directory inside eval_results
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const runFolderName = `run_${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
  const baseOutputDir = path.resolve('eval_results');
  const runOutputDir = path.join(baseOutputDir, runFolderName);
  await fs.mkdir(runOutputDir, { recursive: true });

  console.log(`Found ${uniqueUrls.length} real unique recipe URLs in Supabase Dev.`);
  if (skip > 0) {
    console.log(`Skipping first ${skip} recipes (starting at index ${skip + 1}).`);
  }
  console.log(`Target: ${targetRecipes} recipes | Concurrency: ${concurrency}`);
  console.log(`Run Output Directory: ${runOutputDir}\n`);

  if (skip >= uniqueUrls.length) {
    console.warn(`[Warning] Skip offset (${skip}) is >= total available URLs (${uniqueUrls.length}). Nothing to process.`);
    return;
  }

  const candidateUrls = uniqueUrls.slice(skip);

  const allReports: EvalRecipeReport[] = [];
  let globalTotalIngredients = 0;
  let globalVerifiedIngredients = 0;
  let globalBaseNameMapMatches = 0;
  let totalPromptTokens = 0;
  let totalCandidateTokens = 0;
  let totalGeminiTokens = 0;
  let totalInputCostUsd = 0;
  let totalOutputCostUsd = 0;
  let totalGeminiCostUsd = 0;
  let totalGeminiDurationMs = 0;

  const unverifiedList: { recipeTitle: string; rawName: string; baseName?: string; unit: string }[] = [];
  const verifiedList: { recipeTitle: string; rawName: string; baseName?: string; matchedName?: string | null; canonicalId?: string | null; isBaseNameMapMatch?: boolean }[] = [];

  const tempBaseDir = path.join(baseOutputDir, '.eval_temp');
  await fs.mkdir(tempBaseDir, { recursive: true });

  let nextCandidateIndex = 0;

  async function worker(workerId: number) {
    while (nextCandidateIndex < candidateUrls.length && allReports.length < targetRecipes) {
      const candidateIdx = nextCandidateIndex++;
      const globalIdx = skip + candidateIdx;
      const url = candidateUrls[candidateIdx];
      const runDir = path.join(tempBaseDir, `w${workerId}_${globalIdx + 1}`);
      await fs.mkdir(runDir, { recursive: true });

      try {
        console.log(`[Worker ${workerId}] Processing URL (${globalIdx + 1}/${uniqueUrls.length}): ${url}`);
        const scraper = getScraperForUrl(url);
        const scrapeResult = await scraper.scrape(url, runDir);
        console.log(`  [Worker ${workerId}] Scraped: Caption ${(scrapeResult.caption || '').length} chars`);

        const { recipe, usage } = await extractRecipe(
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

        await enrichRecipeWithCanonicalIngredients(recipe);

        const flatIngredients: EvalIngredientReport[] = [];
        let verifiedCount = 0;
        let baseNameMapMatchCount = 0;

        for (const group of recipe.ingredients || []) {
          for (const ing of group.items || []) {
            const isVer = !!ing.isVerified;
            let isBaseNameMapMatch = false;

            if (isVer && ing.canonicalId && ing.baseName) {
              const normBase = ing.baseName.toLowerCase().trim();
              const singular = toEnglishSingular(normBase);
              const mappedCode = BASE_NAME_TO_CANONICAL_ID[normBase] || BASE_NAME_TO_CANONICAL_ID[singular];
              const cleanCanonicalId = ing.canonicalId.replace(/^bls_/i, '').toUpperCase();
              if (mappedCode && cleanCanonicalId === mappedCode.toUpperCase()) {
                isBaseNameMapMatch = true;
              }
            }

            if (isVer) {
              verifiedCount++;
              if (isBaseNameMapMatch) {
                baseNameMapMatchCount++;
                globalBaseNameMapMatches++;
              }
              verifiedList.push({
                recipeTitle: recipe.title,
                rawName: ing.name,
                baseName: ing.baseName,
                matchedName: ing.matchedName,
                canonicalId: ing.canonicalId,
                isBaseNameMapMatch,
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
              isBaseNameMapMatch,
              calories: ing.calories,
              protein: ing.protein,
              carbs: ing.carbs,
              fat: ing.fat,
            });
          }
        }

        const totalIngs = flatIngredients.length;
        const matchRate = totalIngs > 0 ? Math.round((verifiedCount / totalIngs) * 100) : 0;
        const baseNameMapRate = totalIngs > 0 ? Math.round((baseNameMapMatchCount / totalIngs) * 100) : 0;
        globalTotalIngredients += totalIngs;
        globalVerifiedIngredients += verifiedCount;

        // Aggregate Gemini token usage & cost
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
          baseNameMapMatchCount,
          baseNameMapMatchRatePercent: baseNameMapRate,
          geminiUsage: geminiUsageReport,
          ingredients: flatIngredients,
        };

        allReports.push(report);
        const reportIndex = allReports.length;

        const safeTitle = (recipe.title || `recipe_${globalIdx + 1}`)
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '_')
          .slice(0, 40);
        const jsonFileName = `recipe_${String(reportIndex).padStart(2, '0')}_${safeTitle}.json`;
        const jsonPath = path.join(runOutputDir, jsonFileName);
        await fs.writeFile(jsonPath, JSON.stringify({ url, recipe, report }, null, 2), 'utf-8');

        console.log(`  [Worker ${workerId}] -> Matched: ${verifiedCount}/${totalIngs} ingredients (${matchRate}%) [BaseNameMap: ${baseNameMapMatchCount}/${totalIngs} (${baseNameMapRate}%)] for "${recipe.title}"`);
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
  console.log(`Launching ${concurrency} parallel workers...\n`);
  const workerPromises = Array.from({ length: concurrency }, (_, i) => worker(i + 1));
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
    skip,
    targetRecipes,
    concurrency,
    processedRecipes: allReports.length,
    globalTotalIngredients,
    globalVerifiedIngredients,
    globalMatchRatePercent: globalTotalIngredients > 0 ? Math.round((globalVerifiedIngredients / globalTotalIngredients) * 100) : 0,
    globalBaseNameMapMatches,
    globalBaseNameMapMatchRatePercent: globalTotalIngredients > 0 ? Math.round((globalBaseNameMapMatches / globalTotalIngredients) * 100) : 0,
    baseNameMapCoveragePercent: globalVerifiedIngredients > 0 ? Math.round((globalBaseNameMapMatches / globalVerifiedIngredients) * 100) : 0,
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
  console.log(`└─ Matched via BaseNameMap: ${globalBaseNameMapMatches} (${summary.globalBaseNameMapMatchRatePercent}% of total, ${summary.baseNameMapCoveragePercent}% of all matched)`);
  console.log(`└─ Matched via Aliases/Hybrid: ${globalVerifiedIngredients - globalBaseNameMapMatches} (${globalTotalIngredients > 0 ? Math.round(((globalVerifiedIngredients - globalBaseNameMapMatches) / globalTotalIngredients) * 100) : 0}%)`);
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
