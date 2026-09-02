import { config } from '../config.js';
import { auditRecipe, applyRecipeAuditPatch } from '../matching/recipeAuditor.js';
import type { Recipe } from '../types.js';

async function main() {
  console.log('🧪 [testRecipeAuditor] Starting recipe auditor live diagnostic test...\n');

  if (!config.GEMINI_API_KEY || config.GEMINI_API_KEY === 'your_gemini_api_key_here') {
    console.error('❌ GEMINI_API_KEY is not configured in backend/.env!');
    process.exit(1);
  }

  // Sample recipe intentionally containing common AI extraction flaws:
  // 1. Mozzarella collapsed to generic "cheese"
  // 2. Pfeffer spice mapped to ambiguous "pepper" with wrong category
  // 3. Olivenöl used in instructions step 2 but omitted from ingredients list
  const sampleRecipe: Recipe = {
    id: 'test-audit-sample',
    title: 'Knusprige Mozzarella-Pfeffer-Fladen',
    description: 'Schnelle vegetarische Fladen mit geschmolzenem Mozzarella und frischem Pfeffer.',
    servings: 2,
    prepTime: 10,
    cookTime: 15,
    equipment: ['Backofen', 'Backblech'],
    ingredients: [
      {
        name: 'DAIRY_EGGS',
        items: [
          {
            name: 'Mozzarella (gerieben)',
            amount: 150,
            unit: 'g',
            baseName: 'cheese', // Flaw: collapsed variety
            category: 'DAIRY',
            synonyms: ['grated cheese'],
          },
        ],
      },
      {
        name: 'SPICES_SEASONINGS',
        items: [
          {
            name: 'Pfeffer',
            amount: 0.5,
            unit: 'TL',
            baseName: 'pepper', // Flaw: ambiguous spice
            category: 'FRUITS_VEGETABLES', // Flaw: wrong category
            synonyms: [],
          },
        ],
      },
    ],
    instructions: [
      {
        step: 1,
        description: 'Den Teig ausrollen und den [Mozzarella](ing:cheese) gleichmäßig darauf verteilen.',
      },
      {
        step: 2,
        description: 'Mit [Pfeffer](ing:pepper) würzen, mit einem Schuss [Olivenöl](ing:olive oil) beträufeln und im Ofen ca. [15 Minuten](timer:900) backen.',
      },
    ],
  };

  console.log('📋 Input Recipe:');
  console.log(`- Title: "${sampleRecipe.title}"`);
  console.log(`- Ingredients: ${sampleRecipe.ingredients.flatMap(g => g.items).map(i => `${i.name} (baseName: "${i.baseName}", cat: ${i.category})`).join(', ')}`);
  console.log(`- Instructions:`);
  sampleRecipe.instructions.forEach(s => console.log(`  ${s.step}. ${s.description}`));

  console.log('\n🚀 Invoking auditRecipe (Gemini 2.5 Flash-Lite)...');
  const result = await auditRecipe(sampleRecipe);

  if (!result.patch) {
    console.log('⚠️ No patch returned.');
    return;
  }

  const patchedRecipe = applyRecipeAuditPatch(sampleRecipe, result.patch);

  console.log('✨ Patched Recipe Result:');
  console.log(`- Patched Ingredients:`);
  for (const group of patchedRecipe.ingredients) {
    console.log(`  [${group.name}]:`);
    for (const item of group.items) {
      console.log(`    • ${item.name} -> baseName: "${item.baseName}", category: "${item.category}"`);
    }
  }
  console.log(`- Patched Instructions:`);
  for (const step of patchedRecipe.instructions) {
    console.log(`  ${step.step}. ${step.description}`);
  }

  console.log('\n✅ Live diagnostic test completed successfully!');
}

main().catch(err => {
  console.error('❌ Error during testRecipeAuditor:', err);
  process.exit(1);
});
