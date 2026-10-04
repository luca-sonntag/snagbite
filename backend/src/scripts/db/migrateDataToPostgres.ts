/**
 * Database Data Migration Script
 *
 * Copies all live rows from Supabase PostgreSQL to Railway Native PostgreSQL.
 * Uses batch streaming with replica role to preserve foreign key integrity.
 *
 * Usage:
 *   npx tsx src/scripts/db/migrateDataToPostgres.ts --dev
 *   npx tsx src/scripts/db/migrateDataToPostgres.ts --prod
 *   npx tsx src/scripts/db/migrateDataToPostgres.ts --dev --dry-run
 */
import pg from 'pg';
import { initScriptEnv } from '../scriptEnv.js';

const scriptEnv = initScriptEnv();
const isDryRun = process.argv.includes('--dry-run');
const supabaseClient = scriptEnv.client;

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('❌ DATABASE_URL is not set.');
  process.exit(1);
}

const TABLES_TO_MIGRATE = [
  'global_settings',
  'profiles',
  'friendships',
  'recipes',
  'user_recipes',
  'jobs',
  'collections',
  'recipe_collections',
  'meal_plans',
  'pantry_items',
  'shopping_list',
  'ingredient_mappings',
  'cook_events',
  'point_ledger',
  'user_stats',
  'user_badges',
  'app_bundles',
  'push_tokens',
  'notification_log',
  'feedback',
  'gemini_logs',
];

const JSONB_COLUMNS = new Set([
  'ingredients',
  'instructions',
  'alternative_ingredients',
  'nutritional_values',
  'source_nutritional_values',
  'health_score_breakdown',
  'progress',
  'client_frames',
  'scrape_meta',
  'llm_usage',
  'parent_ingredient',
  'estimated_nutrients',
  'context',
  'input_data',
]);

async function migrateTable(
  pool: pg.Pool,
  tableName: string
): Promise<{ total: number; inserted: number }> {
  // 1. Get total row count from Supabase
  const { count, error: countErr } = await supabaseClient
    .from(tableName)
    .select('*', { count: 'exact', head: true });

  if (countErr) {
    console.warn(`  ⚠️ Could not query ${tableName} in Supabase: ${countErr.message}`);
    return { total: 0, inserted: 0 };
  }

  const total = count ?? 0;
  console.log(`\n📋 Table '${tableName}': ${total} row(s) found in Supabase`);
  if (total === 0 || isDryRun) {
    return { total, inserted: isDryRun ? total : 0 };
  }

  // Introspect valid columns in the target Railway Postgres table
  const colRes = await pool.query(
    `SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1;`,
    [tableName]
  );
  const targetColumns = new Set(colRes.rows.map((r: { column_name: string }) => r.column_name));

  const pageSize = 200;
  let from = 0;
  let inserted = 0;

  while (from < total) {
    const to = Math.min(from + pageSize - 1, total - 1);
    const { data, error } = await supabaseClient
      .from(tableName)
      .select('*')
      .range(from, to);

    if (error || !data || data.length === 0) {
      if (error) console.error(`  ❌ Error fetching range ${from}-${to}:`, error.message);
      break;
    }

    let rows = data as Record<string, unknown>[];
    if (tableName === 'meal_plans') {
      rows = rows.filter((r) => r.recipe_id != null && r.plan_date != null);
    }
    if (rows.length === 0) {
      from += pageSize;
      continue;
    }

    const rawColumns = Object.keys(rows[0]);
    const columns = rawColumns.filter((col) => targetColumns.has(col));
    if (columns.length === 0) break;

    const values: unknown[] = [];
    const rowPlaceholders: string[] = [];

    rows.forEach((row, rIdx) => {
      const phs = columns.map((col, cIdx) => {
        const val = row[col];
        const isJsonb = JSONB_COLUMNS.has(col);
        const paramIdx = rIdx * columns.length + cIdx + 1;

        if (isJsonb && val !== null && val !== undefined) {
          values.push(typeof val === 'string' ? val : JSON.stringify(val));
          return `$${paramIdx}::jsonb`;
        }
        values.push(val);
        return `$${paramIdx}`;
      });
      rowPlaceholders.push(`(${phs.join(', ')})`);
    });

    const quotedCols = columns.map((c) => `"${c}"`).join(', ');
    const query = `INSERT INTO "${tableName}" (${quotedCols}) VALUES ${rowPlaceholders.join(', ')} ON CONFLICT DO NOTHING;`;

    await pool.query(query, values);
    inserted += rows.length;
    process.stdout.write(`  ↳ Progress: ${inserted}/${total} rows inserted\r`);
    from += pageSize;
  }

  console.log(`  ✓ Inserted ${inserted}/${total} rows into '${tableName}'`);
  return { total, inserted };
}

async function main() {
  console.log('============================================================');
  console.log(`🚀 Supabase -> Railway Postgres Data Migration (${scriptEnv.target.toUpperCase()})`);
  console.log(`Dry Run: ${isDryRun ? 'YES (no writes)' : 'NO'}`);
  console.log('============================================================');

  const pool = new pg.Pool({ connectionString });
  const client = await pool.connect();
  const summary: Record<string, { total: number; inserted: number }> = {};

  try {
    if (!isDryRun) {
      // Temporarily bypass foreign key constraints while streaming in parallel chunks
      await client.query("SET session_replication_role = 'replica';");
    }

    for (const table of TABLES_TO_MIGRATE) {
      summary[table] = await migrateTable(pool, table);
    }
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  } finally {
    if (!isDryRun) {
      await client.query("SET session_replication_role = 'origin';");
    }
    client.release();
    await pool.end();
  }

  console.log('\n============================================================');
  console.log('✅ Data Migration Summary:');
  let totalRows = 0;
  for (const [table, stats] of Object.entries(summary)) {
    if (stats.total > 0) {
      console.log(`  - ${table.padEnd(24)}: ${stats.inserted}/${stats.total} rows`);
      totalRows += stats.inserted;
    }
  }
  console.log(`Total rows transferred: ${totalRows}`);
  console.log('============================================================\n');
}

main();
