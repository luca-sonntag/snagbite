import path from 'path';
import type { CanonicalIngredient } from '../data/canonicalIngredients.js';
import { openFoodFactsAccess } from '../matching/openFoodFactsIndex.js';
import {
  generateIngredientIcon,
  findExistingIngredientImage,
  buildIngredientPrompt,
  getIngredientImagesDir,
} from '../ingredientImageService.js';

interface CliOptions {
  id?: string;
  search?: string;
  category?: string;
  batch?: number;
  concurrency: number;
  missingOnly: boolean;
  outDir: string;
  steps: number;
  promptOverride?: string;
  dryRun: boolean;
}

function parseArgs(): CliOptions {
  const args = process.argv.slice(2);
  const options: CliOptions = {
    concurrency: 3,
    missingOnly: false,
    outDir: getIngredientImagesDir(),
    steps: 4,
    dryRun: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--missing') {
      options.missingOnly = true;
    } else if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--batch') {
      options.batch = parseInt(args[++i], 10) || 10;
    } else if (arg === '--category' && args[i + 1]) {
      options.category = args[++i].toUpperCase().trim();
    } else if (arg === '--concurrency' && args[i + 1]) {
      options.concurrency = parseInt(args[++i], 10) || 3;
    } else if (arg === '--out-dir' && args[i + 1]) {
      options.outDir = path.resolve(process.cwd(), args[++i]);
    } else if (arg === '--steps' && args[i + 1]) {
      options.steps = parseInt(args[++i], 10) || 4;
    } else if (arg === '--prompt' && args[i + 1]) {
      options.promptOverride = args[++i];
    } else if (!arg.startsWith('-') && !options.id) {
      if (arg.startsWith('off_') || /^\d+$/.test(arg)) {
        options.id = arg;
      } else {
        options.search = arg;
      }
    }
  }

  return options;
}

function findIngredient(options: CliOptions): CanonicalIngredient | null {
  if (options.id) {
    const targetId = options.id.toLowerCase().trim();
    const found = openFoodFactsAccess.get(targetId);
    if (found) return found;

    // Fallback pseudo-item
    const slugId = targetId.replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    const nameEn = slugId.replace(/_/g, ' ');
    return {
      id: slugId,
      product_code: slugId,
      name_de: nameEn,
      name_en: nameEn,
      category: options.category || 'OTHER',
      nutrients_per_100g: { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
      aliases: [nameEn],
    };
  }

  if (options.search) {
    const hits = openFoodFactsAccess.search(options.search, options.category, 1);
    if (hits.length > 0) return hits[0];
  }

  return null;
}

async function runBatch(targets: CanonicalIngredient[], options: CliOptions): Promise<void> {
  console.log(`\n🚀 Starte Batch-Generierung für ${targets.length} Zutaten (${options.concurrency} parallel)...`);
  if (options.dryRun) {
    console.log('✨ [DRY RUN] Keine API-Anfragen gesendet.');
    for (const t of targets) {
      console.log(`  - [${t.id}] ${t.name_de} (${t.name_en}) [${t.category}]`);
    }
    return;
  }

  let queueIndex = 0;
  let completed = 0;
  let successCount = 0;
  let errorCount = 0;
  const startTime = Date.now();

  async function worker(workerId: number) {
    while (queueIndex < targets.length) {
      const item = targets[queueIndex++];
      const currentNum = ++completed;
      console.log(`[Worker ${workerId}] [${currentNum}/${targets.length}] Starte: ${item.name_de} (${item.id})...`);
      try {
        if (options.missingOnly && findExistingIngredientImage(item.id, options.outDir)) {
          console.log(`[Worker ${workerId}] ⏩ Übersprungen (bereits vorhanden): ${item.name_de}`);
          continue;
        }

        const result = await generateIngredientIcon(item, {
          outDir: options.outDir,
          steps: options.steps,
          promptOverride: options.promptOverride,
        });

        console.log(`[Worker ${workerId}] ✅ Gespeichert: ${result.filename} (${result.durationMs}ms)`);
        successCount++;
      } catch (err: any) {
        console.error(`[Worker ${workerId}] ❌ Fehler bei ${item.name_de}:`, err?.message || err);
        errorCount++;
      }
    }
  }

  const workers = Array.from({ length: Math.min(options.concurrency, targets.length) }, (_, i) =>
    worker(i + 1)
  );
  await Promise.all(workers);

  const durationSec = Math.round((Date.now() - startTime) / 1000);
  console.log('\n======================================================');
  console.log(`🏁 Batch-Generierung abgeschlossen in ${durationSec}s:`);
  console.log(`  ✅ Erfolgreich generiert: ${successCount}`);
  console.log(`  ❌ Fehler:               ${errorCount}`);
  console.log(`  📂 Zielordner:  ${options.outDir}`);
  console.log(`======================================================\n`);
}

async function main(): Promise<void> {
  const options = parseArgs();

  // Batch mode
  if (options.batch || options.missingOnly || (options.category && !options.id && !options.search)) {
    let targets = options.category
      ? openFoodFactsAccess.listCategory(options.category, options.batch || 50)
      : [];

    if (options.missingOnly) {
      targets = targets.filter((i) => !findExistingIngredientImage(i.id, options.outDir));
    }

    if (options.batch && options.batch > 0) {
      targets = targets.slice(0, options.batch);
    }

    if (targets.length === 0) {
      console.log('ℹ️ Keine passenden Zutaten für Batch gefunden.');
      return;
    }

    await runBatch(targets, options);
    return;
  }

  if (!options.id && !options.search) {
    console.error('❌ Fehler: Bitte gib eine Zutat-ID oder einen Suchbegriff an (oder nutze --batch).');
    console.log('\nVerwendung:');
    console.log('  npx tsx src/scripts/generateIngredientImage.ts --search "Haferflocken"');
    console.log('  npx tsx src/scripts/generateIngredientImage.ts --batch 10 --missing --concurrency 5');
    console.log('  npx tsx src/scripts/generateIngredientImage.ts --category VEGETABLES --batch 5');
    process.exit(1);
  }

  const ingredient = findIngredient(options);
  if (!ingredient) {
    console.error(`❌ Zutat nicht gefunden für ID="${options.id || ''}" / Suchbegriff="${options.search || ''}"`);
    process.exit(1);
  }

  const prompt = await buildIngredientPrompt(ingredient, { promptOverride: options.promptOverride });
  const existing = findExistingIngredientImage(ingredient.id, options.outDir);

  console.log('\n======================================================');
  console.log(`🥑 Zutat:       ${ingredient.name_de} (${ingredient.name_en})`);
  console.log(`🆔 ID:          ${ingredient.id} (Code: ${ingredient.product_code || '-'})`);
  console.log(`📁 Kategorie:   ${ingredient.category}`);
  console.log(`🎯 Prompt:      "${prompt}"`);
  console.log(`📂 Zielordner:  ${options.outDir}`);
  if (existing) {
    console.log(`ℹ️  Vorhandenes Bild: ${existing} (wird überschrieben)`);
  }
  console.log('======================================================\n');

  if (options.dryRun) {
    console.log('✨ [DRY RUN] Keine API-Anfrage gesendet.');
    return;
  }

  const result = await generateIngredientIcon(ingredient, {
    outDir: options.outDir,
    promptOverride: options.promptOverride,
    steps: options.steps,
  });

  console.log(`\n🎉 Erfolgreich generiert in ${result.durationMs}ms (~$0.0035 USD):`);
  console.log(`  💾 ${result.filePath} (${result.sizeKb} KB)`);
  console.log('');
}

main().catch((err) => {
  console.error('❌ Fehler bei der Generierung:', err);
  process.exit(1);
});
