import { GoogleGenerativeAI } from '@google/generative-ai';
import type { ResolverInput } from './ingredientResolver.js';

export interface AiIngredientGenOptions {
  prompt?: string;
  category?: string;
  count?: number;
}

export function parseManualIngredientList(raw: string): ResolverInput[] {
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((name) => ({
      name,
      baseName: name.toLowerCase(),
      category: 'OTHER',
      isGenericGrocery: true,
    }));
}

export async function generateIngredientsWithAi(
  options: AiIngredientGenOptions = {}
): Promise<ResolverInput[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is missing.');
  }

  const client = new GoogleGenerativeAI(apiKey);
  const count = Math.max(1, options.count ?? 50);
  const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

  const model = client.getGenerativeModel({
    model: modelName,
    generationConfig: {
      temperature: 0.3,
      responseMimeType: 'application/json',
    },
    systemInstruction:
      'You are an expert culinary database architect and chef. ' +
      'Generate a realistic, diverse list of culinary grocery ingredients. ' +
      'Output a valid JSON array of objects following this schema: ' +
      '[{"name": string (German ingredient name), "baseName": string (canonical English base name), "category": string (e.g. DAIRY, PRODUCE, MEAT_FISH, GRAINS_PASTA, SPICES_HERBS, BAKING, OILS_CONDIMENTS, OTHER), "synonyms": string[] (optional synonyms)}]. ' +
      'Ensure names are natural and representative.',
  });

  let userInstruction = `Generate exactly ${count} distinct culinary grocery ingredients.`;
  if (options.category) {
    userInstruction += ` Focus exclusively on the category: "${options.category}".`;
  }
  if (options.prompt) {
    userInstruction += ` Additional user guidance: "${options.prompt}".`;
  }

  const res = await model.generateContent(userInstruction);
  const text = res.response.text().trim();
  const rawList = JSON.parse(text);

  if (!Array.isArray(rawList)) {
    throw new Error('Gemini response is not a valid JSON array.');
  }

  return rawList.map((item) => ({
    name: item.name || 'Unknown',
    baseName: item.baseName || item.name,
    category: item.category || options.category || 'OTHER',
    synonyms: Array.isArray(item.synonyms) ? item.synonyms : [],
    isGenericGrocery: true,
  }));
}
