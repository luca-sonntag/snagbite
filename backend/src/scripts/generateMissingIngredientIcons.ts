import path from 'path';
import { getClient } from '../db.js';
import {
  generateIngredientIcon,
  findExistingIngredientImage,
  getIngredientImagesDir,
  getGenerationCostsSummary,
} from '../ingredientImageService.js';
import { packIngredientIcons } from '../ingredientIconPacker.js';
import type { CanonicalIngredient } from '../data/canonicalIngredients.js';

interface CliOptions {
  concurrency: number;
  dryRun: boolean;
  autoZip: boolean;
  limit?: number;
  outDir: string;
}

function parseArgs(): CliOptions {
  const args = process.argv.slice(2);
  const options: CliOptions = {
    concurrency: 4,
    dryRun: false,
    autoZip: true,
    outDir: getIngredientImagesDir(),
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--dry-run') {
      options.dryRun = true;
    } else if ((arg === '--concurrency' || arg === '-c') && args[i + 1]) {
      options.concurrency = Math.max(1, Math.min(10, parseInt(args[++i], 10) || 4));
    } else if ((arg === '--limit' || arg === '-l') && args[i + 1]) {
      options.limit = parseInt(args[++i], 10);
    } else if (arg === '--no-zip') {
      options.autoZip = false;
    } else if (arg === '--zip') {
      options.autoZip = true;
    } else if ((arg === '--out-dir' || arg === '-o') && args[i + 1]) {
      options.outDir = path.resolve(process.cwd(), args[++i]);
    }
  }

  return options;
}

async function main() {
  const options = parseArgs();
  console.log(`\n==================================================`);
  console.log(`🍳 Demand-Driven Missing Ingredient Icon Generator`);
  console.log(`==================================================`);
  console.log(`📂 Zielverzeichnis: ${options.outDir}`);
  console.log(`⚡ Parallelität:    ${options.concurrency} Worker`);
  if (options.dryRun) console.log(`✨ Dry-Run Modus:   Aktiv (keine API-Aufrufe)`);
  if (options.limit) console.log(`🔢 Limit:           Maximal ${options.limit} Einträge`);
  console.log(`--------------------------------------------------`);

  // 1. Query all mappings from database
  console.log(`📡 Frage ingredient_mappings aus Supabase ab...`);
  const { data: mappings, error } = await getClient()
    .from('ingredient_mappings')
    .select('mapping_key, category, reasoning, product_code')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Fehler beim Laden von ingredient_mappings: ${error.message}`);
  }

  if (!mappings || mappings.length === 0) {
    console.log(`ℹ️  Keine Einträge in ingredient_mappings gefunden.`);
    return;
  }

  // 2. Group & Deduplicate by mapping_key
  const keyMap = new Map<string, { category: string; reasoning: string; product_code: string }>();
  for (const row of mappings) {
    const key = (row.mapping_key || '').trim().toLowerCase();
    if (!key || keyMap.has(key)) continue;
    keyMap.set(key, {
      category: row.category || 'OTHER',
      reasoning: row.reasoning || key,
      product_code: row.product_code || '',
    });
  }

  console.log(`📊 Gefundene eindeutige Zutaten-Keys: ${keyMap.size}`);

  // 3. Find missing icons
  const missingKeys: Array<{ key: string; category: string; reasoning: string; product_code: string }> = [];
  for (const [key, info] of keyMap.entries()) {
    const existingFile = findExistingIngredientImage(key, options.outDir);
    if (!existingFile) {
      missingKeys.push({ key, ...info });
    }
  }

  const existingCount = keyMap.size - missingKeys.length;
  console.log(`📦 Status: ${existingCount}/${keyMap.size} Icons vorhanden. Zu generieren: ${missingKeys.length}\n`);

  if (missingKeys.length === 0) {
    console.log('✅ Alle in der Datenbank vorkommenden Zutaten besitzen bereits ein Icon! Nichts zu tun.');
    return;
  }

  let queue = missingKeys;
  if (options.limit && options.limit > 0) {
    queue = queue.slice(0, options.limit);
  }

  if (options.dryRun) {
    console.log('✨ [DRY RUN] Folgende fehlende Icons würden generiert werden:');
    queue.forEach((item, idx) => {
      console.log(`  ${idx + 1}. [${item.key}] (${item.reasoning}) [${item.category}]`);
    });
    const estCost = (queue.length * 0.00352).toFixed(4);
    console.log(`\n💰 Geschätzte Gesamtkosten: ~$${estCost} USD (${queue.length} Bilder)`);
    return;
  }

  // 4. Concurrency Worker Pool
  let completed = 0;
  let succeeded = 0;
  let failed = 0;
  let queueIndex = 0;
  const total = queue.length;
  const startTime = Date.now();

  const worker = async (workerId: number) => {
    while (true) {
      const currentIndex = queueIndex++;
      if (currentIndex >= total) break;

      const item = queue[currentIndex];
      const prefix = `[Worker ${workerId}][${currentIndex + 1}/${total}]`;

      try {
        console.log(`${prefix} 🎨 Generiere Icon für: ${item.key} (${item.reasoning})...`);

        const slugId = item.key.toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
        const canonicalPseudoItem: CanonicalIngredient = {
          id: slugId,
          product_code: item.product_code || slugId,
          name_de: item.reasoning || item.key,
          name_en: item.key,
          category: item.category,
          nutrients_per_100g: {
            calories: 0,
            protein: 0,
            fat: 0,
            carbs: 0,
            fiber: 0,
          },
          aliases: [item.key],
        };

        const result = await generateIngredientIcon(canonicalPseudoItem, { outDir: options.outDir });
        succeeded++;
        completed++;
        console.log(
          `${prefix} ✅ ${item.key} -> ${result.filename} (${result.durationMs}ms, ${result.sizeKb} KB, $${result.costs.totalCostUsd.toFixed(5)})`
        );
      } catch (err: any) {
        failed++;
        completed++;
        console.error(`${prefix} ❌ Fehler bei ${item.key}: ${err.message}`);
      }
    }
  };

  const pool = Array.from({ length: options.concurrency }, (_, i) => worker(i + 1));
  await Promise.all(pool);

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(1);
  const costSummary = getGenerationCostsSummary(options.outDir);

  console.log(`\n==================================================`);
  console.log(`🎉 Batch-Generierung abgeschlossen in ${durationSec}s`);
  console.log(`==================================================`);
  console.log(`✅ Erfolgreich: ${succeeded}`);
  console.log(`❌ Fehlgeschlagen: ${failed}`);
  console.log(`💰 Gesamtkosten-Historie: $${costSummary.totalCostUsd.toFixed(4)} (~${costSummary.approxEur.toFixed(2)} €)`);
  console.log(`📂 Gespeichert in: ${options.outDir}`);

  if (succeeded > 0 && options.autoZip) {
    console.log(`\n🗜️  Aktualisiere ingredient-icons.zip Archiv...`);
    try {
      const zipRes = packIngredientIcons({ verbose: true });
      console.log(`📦 Zip-Archiv erfolgreich aktualisiert (${zipRes.fileCount} Dateien, ${zipRes.zipSizeMb} MB).`);
    } catch (err: any) {
      console.warn(`⚠️  Warnung beim Packen des Zip-Archivs: ${err.message}`);
    }
  }
}

main().catch((err) => {
  console.error('Fataler Fehler:', err);
  process.exit(1);
});
