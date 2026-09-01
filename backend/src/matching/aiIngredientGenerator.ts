import { GoogleGenerativeAI } from '@google/generative-ai';
import type { ResolverInput } from './ingredientResolver.js';

export interface AiIngredientGenOptions {
  prompt?: string;
  category?: string;
  count?: number;
  existingKeys?: Set<string> | string[];
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
    const key = name.toLowerCase();

    if (existingSet.has(key) || seen.has(key)) {
      skippedCount++;
      continue;
    }

    seen.add(key);
    inputs.push({
      name,
      baseName: key,
      category: 'OTHER',
      isGenericGrocery: true,
    });
  }

  return { inputs, skippedCount };
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

  // Request 25% buffer so after strict deduplication we still meet the target count
  const requestedCount = Math.ceil(targetCount * 1.25);

  const existingArray = options.existingKeys ? Array.from(options.existingKeys) : [];
  const existingSet = new Set(existingArray.map((k) => k.toLowerCase().trim()));

  const model = client.getGenerativeModel({
    model: modelName,
    generationConfig: {
      temperature: 0.4,
      responseMimeType: 'application/json',
    },
    systemInstruction:
      'You are an expert culinary database architect and chef. ' +
      'Generate a realistic, diverse list of culinary grocery ingredients. ' +
      'Output a valid JSON array of objects following this schema: ' +
      '[{"name": string (German ingredient name), "baseName": string (canonical English base name), "category": string (e.g. DAIRY, PRODUCE, MEAT_FISH, GRAINS_PASTA, SPICES_HERBS, BAKING, OILS_CONDIMENTS, OTHER), "synonyms": string[] (optional synonyms)}]. ' +
      'Ensure names are natural and representative. Do NOT repeat any ingredients.',
  });

  let userInstruction = `Generate exactly ${requestedCount} distinct, unique culinary grocery ingredients.`;
  if (options.category) {
    userInstruction += ` Focus exclusively on the category: "${options.category}".`;
  }
  if (options.prompt) {
    userInstruction += ` Additional user guidance: "${options.prompt}".`;
  }
  if (existingArray.length > 0) {
    // Pass up to 250 known existing keys so Gemini knows what to avoid
    const sampleExisting = existingArray.slice(0, 250).join(', ');
    userInstruction += ` IMPORTANT: Do NOT generate or include any of these already mapped ingredients: [${sampleExisting}].`;
  }

  const res = await model.generateContent(userInstruction);
  const text = res.response.text().trim();
  const rawList = JSON.parse(text);

  if (!Array.isArray(rawList)) {
    throw new Error('Gemini response is not a valid JSON array.');
  }

  const seenBatch = new Set<string>();
  const result: ResolverInput[] = [];

  for (const item of rawList) {
    const name = (item.name || '').trim();
    const baseName = (item.baseName || name).toLowerCase().trim();
    const nameLower = name.toLowerCase();

    if (!name || !baseName) continue;

    // Reject if already in existing DB mappings
    if (existingSet.has(baseName) || existingSet.has(nameLower)) {
      continue;
    }

    // Reject intra-batch duplicates
    if (seenBatch.has(baseName) || seenBatch.has(nameLower)) {
      continue;
    }

    seenBatch.add(baseName);
    seenBatch.add(nameLower);

    result.push({
      name,
      baseName,
      category: item.category || options.category || 'OTHER',
      synonyms: Array.isArray(item.synonyms) ? item.synonyms : [],
      isGenericGrocery: true,
    });

    if (result.length >= targetCount) break;
  }

  return result;
}
