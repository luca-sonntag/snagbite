import { GoogleGenerativeAI } from '@google/generative-ai';
import { canonicalizeBaseName } from './baseNameCanonical.js';
import type { ResolverInput } from './ingredientResolver.js';

export const CULINARY_CATEGORIES = [
  'PRODUCE',
  'DAIRY',
  'MEAT_FISH',
  'GRAINS_PASTA',
  'SPICES_HERBS',
  'BAKING',
  'OILS_CONDIMENTS',
  'OTHER',
] as const;

export const CULINARY_THEMES = [
  'everyday supermarket staples and common home cooking basics',
  'international, regional, and ethnic staples (e.g. Mediterranean, Asian, Middle Eastern, Latin American)',
  'artisan, specialty, deli, cured, smoked, fermented, pickled or aged variants',
  'heirloom varieties, specific cultivars, specialty grains, pulses, and craft cooking essentials',
] as const;

export interface AiIngredientGenOptions {
  prompt?: string;
  category?: string;
  count?: number;
  existingKeys?: Set<string> | string[];
  existingByCategory?: Record<string, string[]>;
}

export function parseManualIngredientList(
  raw: string,
  existingKeys?: Set<string> | string[]
): { inputs: ResolverInput[]; skippedCount: number } {
  const existingSet = new Set(
    (existingKeys ? Array.from(existingKeys) : []).map((k) => k.toLowerCase().trim())
  );
  const seen = new Set<string>();
  const inputs: ResolverInput[] = [];
  let skippedCount = 0;

  for (const rawName of raw.split(',')) {
    const name = rawName.trim();
    if (!name) continue;
    const baseName = canonicalizeBaseName(name) || name.toLowerCase();
    const nameLower = name.toLowerCase();

    if (
      existingSet.has(baseName) ||
      existingSet.has(nameLower) ||
      seen.has(baseName) ||
      seen.has(nameLower)
    ) {
      skippedCount++;
      continue;
    }

    seen.add(baseName);
    seen.add(nameLower);
    inputs.push({
      name,
      baseName,
      category: 'OTHER',
      isGenericGrocery: true,
    });
  }

  return { inputs, skippedCount };
}

async function generateSingleBatch(params: {
  model: any;
  count: number;
  category: string;
  batchNum: number;
  prompt?: string;
  existingInCat?: string[];
}): Promise<any[]> {
  const requestedCount = Math.max(35, Math.ceil(params.count * 1.25));
  const themeIndex = Math.floor((params.batchNum - 1) / CULINARY_CATEGORIES.length);
  const theme = CULINARY_THEMES[themeIndex % CULINARY_THEMES.length];

  let userInstruction = `Generate exactly ${requestedCount} distinct culinary grocery ingredients commonly found in supermarkets, markets, and recipes.`;
  userInstruction += ` Focus exclusively on the category: "${params.category}".`;
  userInstruction += ` Thematic focus for this batch: ${theme}.`;

  if (params.existingInCat && params.existingInCat.length > 0) {
    const compactList = params.existingInCat.slice(-180).join(', ');
    userInstruction += `\nAlready present in category "${params.category}" (do NOT repeat any of these): [${compactList}].`;
  }

  if (params.prompt) {
    userInstruction += ` Additional user guidance: "${params.prompt}".`;
  }

  const res = await params.model.generateContent(userInstruction);
  const text = res.response.text().trim();
  const rawList = JSON.parse(text);

  if (!Array.isArray(rawList)) {
    throw new Error('Gemini response is not a valid JSON array.');
  }

  return rawList;
}

export async function generateIngredientsWithAi(
  options: AiIngredientGenOptions = {}
): Promise<ResolverInput[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is missing.');
  }

  const client = new GoogleGenerativeAI(apiKey);
  const targetCount = Math.max(1, options.count ?? 50);
  const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  const BATCH_SIZE = 45;

  const existingArray = options.existingKeys ? Array.from(options.existingKeys) : [];
  const existingSet = new Set(existingArray.map((k) => k.toLowerCase().trim()));
  const existingByCategory: Record<string, string[]> = {};
  if (options.existingByCategory) {
    for (const [cat, keys] of Object.entries(options.existingByCategory)) {
      existingByCategory[cat] = [...keys];
    }
  }

  const seenBatch = new Set<string>();
  const result: ResolverInput[] = [];

  const model = client.getGenerativeModel({
    model: modelName,
    generationConfig: {
      temperature: 0.85,
      responseMimeType: 'application/json',
    },
    systemInstruction:
      'You are an expert culinary database architect and chef. ' +
      'Generate a realistic, diverse list of essential culinary grocery ingredients. ' +
      'Output a valid JSON array of objects following this schema: ' +
      '[{"name": string (German ingredient name), "baseName": string (canonical English base name), "category": string, "synonyms": string[] (optional synonyms)}]. ' +
      'RULES FOR baseName: MUST ALWAYS be the pure, singular, unadorned English culinary head noun without any adjectives. NEVER include freshness ("fresh"), size ("large", "small"), quality ("organic"), state ("raw", "cooked"), or cut/handling ("chopped", "diced", "sliced", "minced"). Example: use "cilantro" NOT "fresh cilantro", "avocado" NOT "ripe avocado", "rosemary" NOT "fresh rosemary sprigs", "bacon" NOT "diced bacon". ' +
      'Explore deep culinary variety beyond the most basic items.',
  });

  const categories = options.category ? [options.category] : CULINARY_CATEGORIES;
  let categoryIndex = 0;
  let batchNum = 1;
  let consecutiveEmptyBatches = 0;
  const MAX_CONSECUTIVE_EMPTY = Math.max(15, categories.length * 3);

  while (result.length < targetCount && consecutiveEmptyBatches < MAX_CONSECUTIVE_EMPTY) {
    const remaining = targetCount - result.length;
    const currentBatchSize = Math.max(35, Math.min(BATCH_SIZE, remaining));
    const currentCategory = categories[categoryIndex % categories.length];
    categoryIndex++;

    const existingInCat = existingByCategory[currentCategory] || [];
    console.log(
      `  📦 [AI Batch ${batchNum}] Requesting ${currentBatchSize} ingredients (Category: ${currentCategory}, known in cat: ${existingInCat.length}, Progress: ${result.length}/${targetCount})...`
    );

    try {
      const rawList = await generateSingleBatch({
        model,
        count: currentBatchSize,
        category: currentCategory,
        batchNum,
        prompt: options.prompt,
        existingInCat,
      });

      let addedInBatch = 0;
      for (const item of rawList) {
        const name = (item.name || '').trim();
        const rawBaseName = (item.baseName || name).trim();
        const baseName = canonicalizeBaseName(rawBaseName) || rawBaseName.toLowerCase();
        const nameLower = name.toLowerCase();

        if (!name || !baseName) continue;

        // Remember ANY returned candidate in this category to prevent repeating it
        if (!existingByCategory[currentCategory]) existingByCategory[currentCategory] = [];
        if (!existingByCategory[currentCategory].includes(baseName)) {
          existingByCategory[currentCategory].push(baseName);
        }

        if (existingSet.has(baseName) || existingSet.has(nameLower)) continue;
        if (seenBatch.has(baseName) || seenBatch.has(nameLower)) continue;

        seenBatch.add(baseName);
        seenBatch.add(nameLower);

        result.push({
          name,
          baseName,
          category: item.category || currentCategory,
          synonyms: Array.isArray(item.synonyms) ? item.synonyms : [],
          isGenericGrocery: true,
        });

        addedInBatch++;
        if (result.length >= targetCount) break;
      }

      console.log(`     ↳ +${addedInBatch} neue Zutaten übernommen (Stand: ${result.length}/${targetCount})`);

      if (addedInBatch === 0) {
        consecutiveEmptyBatches++;
      } else {
        consecutiveEmptyBatches = 0;
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`  ⚠️ Batch ${batchNum} Fehler: ${msg}`);
      consecutiveEmptyBatches++;
    }

    batchNum++;
  }

  return result.slice(0, targetCount);
}
