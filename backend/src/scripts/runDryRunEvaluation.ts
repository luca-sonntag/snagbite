import fs from 'fs/promises';
import path from 'path';
import { getClient } from '../db.js';
import { getScraperForUrl } from '../scrapers/index.js';
import { extractRecipe } from '../gemini.js';
import { enrichRecipeWithCanonicalIngredients } from '../matching/ingredientMatcher.js';
import type { Recipe, ScrapeResult } from '../types.js';

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

interface EvalRecipeReport {
  url: string;
  title: string;
  servings: number;
  nutritionalValues?: any;
  totalIngredients: number;
  verifiedCount: number;
  matchRatePercent: number;
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

  console.log(`Found ${uniqueUrls.length} real unique recipe URLs in Supabase Dev. Evaluating 5 recipes...\n`);

  const outputDir = path.resolve('eval_results');
  await fs.mkdir(outputDir, { recursive: true });

  const allReports: EvalRecipeReport[] = [];
  let globalTotalIngredients = 0;
  let globalVerifiedIngredients = 0;
  const unverifiedList: { recipeTitle: string; rawName: string; baseName?: string; unit: string }[] = [];
  const verifiedList: { recipeTitle: string; rawName: string; baseName?: string; matchedName?: string | null; canonicalId?: string | null }[] = [];

  const TARGET_RECIPES = 5;

  for (let i = 0; i < uniqueUrls.length && allReports.length < TARGET_RECIPES; i++) {
    const url = uniqueUrls[i];
    const recipeNum = allReports.length + 1;
    console.log(`[Recipe #${recipeNum}] Processing URL (${i + 1}/${uniqueUrls.length}): ${url}`);

    const runDir = path.join(outputDir, `temp_run_${i + 1}`);
    await fs.mkdir(runDir, { recursive: true });

    try {
      // 1. Scrape metadata
      const scraper = getScraperForUrl(url);
      const scrapeResult: ScrapeResult = await scraper.scrape(url, runDir);
      console.log(`  Scraped: "${scrapeResult.title || 'Untitled'}" (Platform: ${scrapeResult.platform}, Caption: ${(scrapeResult.caption || '').length} chars)`);

      // 2. Extract recipe via Gemini
      const recipe: Recipe = await extractRecipe(
        undefined, // audioFilePath
        undefined, // mimeType
        scrapeResult.caption || '',
        undefined, // gridImagePath
        runDir,
        undefined, // userPrefs
        scrapeResult.html || undefined,
        undefined // carouselImagePaths
      );

      if (recipe.isRecipe === false) {
        console.warn(`  -> Gemini flagged this URL as NOT a recipe.`);
        continue;
      }

      // 3. Canonical Ingredient Normalization & Nutrition Enrichment
      enrichRecipeWithCanonicalIngredients(recipe);

      // 4. Collect report data
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

      const report: EvalRecipeReport = {
        url,
        title: recipe.title,
        servings: recipe.servings,
        nutritionalValues: recipe.nutritionalValues,
        totalIngredients: totalIngs,
        verifiedCount,
        matchRatePercent: matchRate,
        ingredients: flatIngredients,
      };

      allReports.push(report);

      // Save individual JSON file
      const safeTitle = (recipe.title || `recipe_${i + 1}`)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .slice(0, 40);
      const jsonFileName = `recipe_${String(i + 1).padStart(2, '0')}_${safeTitle}.json`;
      const jsonPath = path.join(outputDir, jsonFileName);
      await fs.writeFile(jsonPath, JSON.stringify({ url, recipe, report }, null, 2), 'utf-8');

      console.log(`  -> Matched: ${verifiedCount}/${totalIngs} ingredients (${matchRate}%)`);
      console.log(`  -> Nutrition: ${recipe.nutritionalValues?.calories || 0} kcal | P: ${recipe.nutritionalValues?.protein || 0}g | C: ${recipe.nutritionalValues?.carbs || 0}g | F: ${recipe.nutritionalValues?.fat || 0}g`);
      console.log(`  -> Saved JSON: ${jsonFileName}\n`);
    } catch (err: any) {
      console.error(`  -> Failed for ${url}:`, err.message);
    } finally {
      // Clean up temporary run directory
      await fs.rm(runDir, { recursive: true, force: true }).catch(() => {});
    }
  }

  // Write summary report JSON
  const summary = {
    evaluatedAt: new Date().toISOString(),
    totalUrls: uniqueUrls.length,
    processedRecipes: allReports.length,
    globalTotalIngredients,
    globalVerifiedIngredients,
    globalMatchRatePercent: globalTotalIngredients > 0 ? Math.round((globalVerifiedIngredients / globalTotalIngredients) * 100) : 0,
    unverifiedIngredients: unverifiedList,
    verifiedIngredients: verifiedList,
    recipes: allReports,
  };

  const summaryPath = path.join(outputDir, '_EVALUATION_SUMMARY.json');
  await fs.writeFile(summaryPath, JSON.stringify(summary, null, 2), 'utf-8');

  console.log('====================================================');
  console.log('=== EVALUATION RUN COMPLETED ===');
  console.log(`Total Recipes Processed: ${allReports.length}`);
  console.log(`Total Ingredients: ${globalTotalIngredients}`);
  console.log(`Verified Ingredients: ${globalVerifiedIngredients} (${summary.globalMatchRatePercent}%)`);
  console.log(`Unverified Ingredients: ${unverifiedList.length}`);
  console.log(`Summary report written to: ${summaryPath}`);
  console.log('====================================================\n');
}

run();
