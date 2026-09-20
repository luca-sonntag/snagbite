/**
 * Function-calling tool definitions and payload formats for the ingredient resolver.
 */

import { FunctionDeclarationSchemaType, type FunctionDeclaration, type Tool } from '@google/generative-ai';
import type { CanonicalIngredient } from '../data/canonicalIngredients.js';
import type { ResolverInput, ResolverResult, CatalogueAccess } from './ingredientResolver.js';
import type { EstimatedNutrients } from './mappingStore.js';

export interface FunctionCall {
  name: string;
  args: Record<string, unknown>;
}

export const RESOLVER_TOOLS: Tool[] = [
  {
    functionDeclarations: [
      {
        name: 'search_ingredients',
        description: 'Search food database (Open Food Facts DACH) by query and optional category.',
        parameters: {
          type: FunctionDeclarationSchemaType.OBJECT,
          properties: {
            query: {
              type: FunctionDeclarationSchemaType.STRING,
              description: 'German or English search query (e.g. "Kichererbsen", "Eatlean", "Mozzarella").',
            },
            category: {
              type: FunctionDeclarationSchemaType.STRING,
              description: 'Optional category (e.g. DAIRY, GRAINS_PASTA, MEAT_FISH, FRUITS_VEGETABLES).',
            },
            limit: {
              type: FunctionDeclarationSchemaType.INTEGER,
              description: 'Number of results to return (default: 12, max: 20).',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'get_ingredient',
        description: 'Fetch details for a food code / barcode from database.',
        parameters: {
          type: FunctionDeclarationSchemaType.OBJECT,
          properties: {
            product_code: {
              type: FunctionDeclarationSchemaType.STRING,
              description: 'Food code / barcode (e.g. "4006040178118", "9028457102666").',
            },
          },
          required: ['product_code'],
        },
      },
      {
        name: 'submit_match',
        description: 'Submit final matched food code, or empty string with estimated per-100g macros if absent from database.',
        parameters: {
          type: FunctionDeclarationSchemaType.OBJECT,
          properties: {
            product_code: {
              type: FunctionDeclarationSchemaType.STRING,
              description: 'Verified food code / barcode, or empty string if no accurate match exists.',
            },
            confidence: {
              type: FunctionDeclarationSchemaType.NUMBER,
              description: 'Confidence (0.0 to 1.0).',
            },
            reasoning: {
              type: FunctionDeclarationSchemaType.STRING,
              description: 'Short reason for choice or estimate.',
            },
            estimated_calories: {
              type: FunctionDeclarationSchemaType.NUMBER,
              description: 'Only if product_code is empty: kcal / 100g.',
            },
            estimated_protein: {
              type: FunctionDeclarationSchemaType.NUMBER,
              description: 'Only if product_code is empty: protein (g) / 100g.',
            },
            estimated_carbs: {
              type: FunctionDeclarationSchemaType.NUMBER,
              description: 'Only if product_code is empty: carbs (g) / 100g.',
            },
            estimated_fat: {
              type: FunctionDeclarationSchemaType.NUMBER,
              description: 'Only if product_code is empty: fat (g) / 100g.',
            },
            typical_package_amount: {
              type: FunctionDeclarationSchemaType.NUMBER,
              description: 'Standard retail package size (e.g. 500 for 500g pasta, 1000 for 1L milk, 250 for butter, 6 for eggs, 400 for can).',
            },
            typical_package_unit: {
              type: FunctionDeclarationSchemaType.STRING,
              description: 'Unit of standard retail package (e.g. "g", "ml", "Stück", "Dose", "Packung").',
            },
            shelf_life_days: {
              type: FunctionDeclarationSchemaType.INTEGER,
              description: 'Typical shelf life in days under proper storage (e.g. 7 for milk, 3 for fresh meat, 14 for eggs, 180 for dry goods).',
            },
          },
          required: ['product_code', 'confidence'],
        },
      },
    ],
  },
];

export const SYSTEM_INSTRUCTION = `You match recipe ingredients to entries of the food database (Open Food Facts DACH).

Rules:
1. Prefer plain, unprocessed foods over prepared, canned or seasoned dishes ("Kartoffel" -> raw potato). Supermarket store brands (e.g. Rewe Bio, Edeka, Ja!, K-Bio, Gut & Günstig, Dennree, Alnatura) for raw staples (potatoes, garlic, onions, eggs, butter, milk) ARE valid plain food matches.
2. Never confuse ground spices with fresh produce ("Paprikapulver" is spice, NOT bell pepper; "Knoblauchpulver" is NOT fresh garlic).
3. Match exact cut/animal (chicken breast != turkey or pork).
4. For branded or special trend foods (e.g. "Eatlean", "Reispapier", "Sriracha", "Skyr", "Buldak"), select the exact matching product entry.
5. If the database lacks an accurate match, submit empty product_code with estimated per-100g nutrients. An honest estimate is far better than a wrong match.
6. If one of the initial candidates is accurate, call submit_match directly without searching. Otherwise search with search_ingredients.`;

export function buildPrompt(input: ResolverInput, initialCandidates?: CanonicalIngredient[]): string {
  const lines = [`Ingredient: "${input.name}"`];
  if (input.baseName) lines.push(`Base name: "${input.baseName}"`);
  if (input.brand) lines.push(`Brand: "${input.brand}"`);
  if (input.modifier) lines.push(`Modifier: "${input.modifier}"`);
  if (input.category) lines.push(`Category: ${input.category}`);
  if (input.synonyms?.length) lines.push(`Synonyms: ${input.synonyms.join(', ')}`);
  if (input.isGenericGrocery === false) lines.push('Custom/Homemade mixture: true (no single commercial barcode expected)');

  if (initialCandidates && initialCandidates.length > 0) {
    lines.push('', 'Top candidates from food database:');
    for (const c of initialCandidates) {
      const code = c.product_code || c.id;
      const n = c.nutrients_per_100g;
      const macros = `${n.calories}kcal, ${n.protein}g P, ${n.carbs}g C, ${n.fat}g F`;
      lines.push(`- [${code}] ${c.name_de} (${macros})`);
    }
  }

  return lines.join('\n');
}

function withNutrients(c: CanonicalIngredient) {
  const n = c.nutrients_per_100g;
  return {
    code: c.product_code || c.id,
    name: c.name_de,
    category: c.category,
    nutrients_per_100g: {
      calories: n.calories,
      protein: n.protein,
      carbs: n.carbs,
      fat: n.fat,
    },
  };
}

export function executeTool(call: FunctionCall, catalogue: CatalogueAccess): Record<string, unknown> {
  const args = (call.args ?? {}) as Record<string, unknown>;

  switch (call.name) {
    case 'search_ingredients': {
      const query = String(args.query ?? '').trim();
      if (!query) return { error: 'query parameter is required.' };
      const category = args.category ? String(args.category).trim() : undefined;
      const limit = Math.min(Math.max(1, Number(args.limit) || 12), 20);
      const results = catalogue.search(query, category, limit);
      return {
        results: results.map(withNutrients),
        total_found: results.length,
      };
    }
    case 'get_ingredient': {
      const code = String(args.product_code ?? '').trim();
      if (!code) return { error: 'product_code parameter is required.' };
      const item = catalogue.get(code);
      return item ? withNutrients(item) : { error: `No food entry with code "${code}".` };
    }
    default:
      return { error: `Unknown tool "${call.name}".` };
  }
}

export const runTool = executeTool;
export const TOOLS = RESOLVER_TOOLS;

export function readSubmission(
  call: FunctionCall,
  catalogue: CatalogueAccess,
  model: string
): ResolverResult | { rejected: string } {
  const args = (call.args ?? {}) as Record<string, unknown>;
  const rawCode = String(args.product_code ?? '').trim();
  const confidence = typeof args.confidence === 'number' ? args.confidence : null;
  const reasoning = args.reasoning ? String(args.reasoning) : null;

  const typicalPackageAmount = typeof args.typical_package_amount === 'number' ? args.typical_package_amount : null;
  const typicalPackageUnit = typeof args.typical_package_unit === 'string' ? args.typical_package_unit : null;
  const shelfLifeDays = typeof args.shelf_life_days === 'number' ? Math.round(args.shelf_life_days) : null;

  if (!rawCode) {
    const estimate: EstimatedNutrients = {
      calories: Number(args.estimated_calories) || 0,
      protein: Number(args.estimated_protein) || 0,
      carbs: Number(args.estimated_carbs) || 0,
      fat: Number(args.estimated_fat) || 0,
    };
    return {
      productCode: null,
      estimatedNutrients: estimate.calories > 0 ? estimate : null,
      typicalPackageAmount,
      typicalPackageUnit,
      shelfLifeDays,
      confidence,
      reasoning,
      model,
      budgetExhausted: false,
    };
  }

  const item = catalogue.get(rawCode);
  if (!item) {
    return { rejected: `No food entry with code "${rawCode}". Search again and submit a code that exists.` };
  }

  const resolvedCode = item.product_code || item.id;
  return {
    productCode: resolvedCode,
    estimatedNutrients: null,
    typicalPackageAmount,
    typicalPackageUnit,
    shelfLifeDays,
    confidence,
    reasoning,
    model,
    budgetExhausted: false,
  };
}
