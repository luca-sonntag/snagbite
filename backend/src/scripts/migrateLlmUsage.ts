/**
 * Migration script: Extract `geminiUsage` from `recipe` JSON into dedicated `llm_usage` JSONB column,
 * backfill FLUX cover usage for AI-generated recipe covers, and strip `geminiUsage` from `recipe`.
 *
 * Idempotent. Run with DRY_RUN=1 to preview without writing.
 *
 * Usage:
 *   npx tsx src/scripts/migrateLlmUsage.ts
 *   DRY_RUN=1 npx tsx src/scripts/migrateLlmUsage.ts
 */
import { getClient } from '../db.js';
import type { LlmUsage } from '../types.js';

const DRY_RUN = process.env.DRY_RUN === '1' || process.env.DRY_RUN === 'true' || process.argv.includes('--dry-run');
const PAGE_SIZE = 200;

async function main(): Promise<void> {
  console.log(`Starting llm_usage migration${DRY_RUN ? ' (DRY RUN)' : ''}...`);
  const client = getClient();

  let from = 0;
  let scanned = 0;
  let updated = 0;
  let alreadyClean = 0;
  let errors = 0;

  for (;;) {
    const { data, error } = await client
      .from('jobs')
      .select('id, recipe')
      .not('recipe', 'is', null)
      .order('created_at', { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      throw new Error(`Failed to page jobs: ${error.message}`);
    }
    if (!data || data.length === 0) break;

    for (const row of data) {
      scanned++;
      const recipe = row.recipe as any;

      if (!recipe || typeof recipe !== 'object' || recipe.isProgress) {
        alreadyClean++;
        continue;
      }

      const hadGeminiUsage = !!recipe.geminiUsage;
      const isAiCover = recipe.isAiCover === true || (typeof recipe.imageUrl === 'string' && recipe.imageUrl.includes('recipe-covers'));

      let existingUsage: LlmUsage = (row.llm_usage && typeof row.llm_usage === 'object') ? { ...row.llm_usage } : {};
      let changed = false;

      if (hadGeminiUsage) {
        existingUsage.gemini = recipe.geminiUsage;
        delete recipe.geminiUsage;
        changed = true;
      }

      if (isAiCover && !existingUsage.flux) {
        existingUsage.flux = {
          model: 'flux-1-schnell',
          costUsd: 0.0035,
          costFormatted: '$0.0035',
          inferenceSteps: 4,
          imageSize: 'landscape_4_3',
        };
        changed = true;
      }

      if (!changed) {
        alreadyClean++;
        continue;
      }

      updated++;
      const targetLlmUsage = Object.keys(existingUsage).length > 0 ? existingUsage : null;

      if (DRY_RUN) {
        console.log(
          `[dry-run] job ${row.id}: extracted gemini=${hadGeminiUsage}, flux=${isAiCover}`
        );
        continue;
      }

      const { error: updateError } = await client
        .from('jobs')
        .update({
          recipe,
          llm_usage: targetLlmUsage,
        })
        .eq('id', row.id);

      if (updateError) {
        errors++;
        console.error(`Failed to update job ${row.id}: ${updateError.message}`);
        if (updateError.message.includes("Could not find the 'llm_usage' column") || updateError.message.includes('column "llm_usage" of relation "jobs" does not exist')) {
          console.error(
            `\n⚠️  HINWEIS: Die Spalte 'llm_usage' existiert noch nicht in der Supabase-Datenbank.\n` +
            `Bitte führe vorher diesen SQL-Befehl im Supabase Dashboard (SQL Editor) aus:\n\n` +
            `  ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS llm_usage jsonb;\n\n`
          );
          process.exit(1);
        }
      }
    }

    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  console.log(
    `\nMigration finished${DRY_RUN ? ' (DRY RUN)' : ''}:\n` +
    `  Scanned: ${scanned}\n` +
    `  Updated: ${updated}\n` +
    `  Already clean / unchanged: ${alreadyClean}\n` +
    `  Errors: ${errors}`
  );
}

main().catch((err) => {
  console.error('Fatal error during migration:', err);
  process.exit(1);
});
