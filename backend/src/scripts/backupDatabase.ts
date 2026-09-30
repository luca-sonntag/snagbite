/**
 * Database Backup Script (API-based, no pg_dump or Docker required)
 *
 * Exports all data from public tables into a timestamped JSON file.
 * Works on any Supabase plan (including Free) using the service role key.
 *
 * Usage:
 *   npx tsx src/scripts/backupDatabase.ts --prod
 *   npx tsx src/scripts/backupDatabase.ts --dev
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

const isProd = process.argv.includes('--prod');
const envFile = isProd ? '.env.production' : '.env';
const envPath = path.resolve(process.cwd(), envFile);

if (!fs.existsSync(envPath)) {
  console.error(`❌ Environment file not found: ${envFile}`);
  process.exit(1);
}

const envConfig = dotenv.parse(fs.readFileSync(envPath, 'utf8'));
const supabaseUrl = envConfig.SUPABASE_URL;
const supabaseKey = envConfig.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error(`❌ SUPABASE_URL or SUPABASE_SECRET_KEY missing in ${envFile}`);
  process.exit(1);
}

const client = createClient(supabaseUrl, supabaseKey);

// Candidate tables to export if they exist
const CANDIDATE_TABLES = [
  'jobs',
  'jobs_legacy',
  'recipes',
  'user_recipes',
  'collections',
  'recipe_collections',
  'cook_events',
  'point_ledger',
  'user_stats',
  'user_badges',
  'profiles',
  'friendships',
  'pantry_items',
  'shopping_list',
  'meal_plans',
  'ingredient_mappings',
  'global_settings',
  'feedback',
  'user_push_tokens',
  'notification_log',
];

async function fetchAllRows(tableName: string): Promise<unknown[] | null> {
  let allRows: unknown[] = [];
  let from = 0;
  const pageSize = 1000;

  for (;;) {
    const { data, error } = await client
      .from(tableName)
      .select('*')
      .range(from, from + pageSize - 1);

    if (error) {
      // Table doesn't exist yet in this schema version
      if (error.code === '42P01' || error.message.includes('does not exist')) {
        return null;
      }
      console.warn(`  ⚠️ Warning fetching ${tableName}: ${error.message}`);
      return null;
    }

    if (!data || data.length === 0) break;
    allRows = allRows.concat(data);

    if (data.length < pageSize) break;
    from += pageSize;
  }

  return allRows;
}

async function run(): Promise<void> {
  const host = new URL(supabaseUrl).host;
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  console.log(`============================================================`);
  console.log(`Supabase Database Backup`);
  console.log(`Target:      ${isProd ? 'PRODUCTION' : 'DEVELOPMENT'} (${host})`);
  console.log(`Timestamp:   ${timestamp}`);
  console.log(`============================================================\n`);

  const backupData: Record<string, unknown[]> = {};
  const stats: Record<string, number> = {};

  for (const table of CANDIDATE_TABLES) {
    process.stdout.write(`Exporting ${table.padEnd(22)}... `);
    const rows = await fetchAllRows(table);

    if (rows === null) {
      console.log('(table does not exist in schema)');
    } else {
      backupData[table] = rows;
      stats[table] = rows.length;
      console.log(`✓ ${rows.length} row(s)`);
    }
  }

  const outDir = path.resolve(process.cwd(), 'backups');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const targetName = isProd ? 'prod' : 'dev';
  const outFileName = `backup_${targetName}_${host.split('.')[0]}_${timestamp}.json`;
  const outPath = path.join(outDir, outFileName);

  fs.writeFileSync(
    outPath,
    JSON.stringify(
      {
        metadata: {
          target: isProd ? 'production' : 'development',
          supabaseUrl,
          host,
          timestamp,
          stats,
        },
        data: backupData,
      },
      null,
      2
    ),
    'utf8'
  );

  const fileSizeMb = (fs.statSync(outPath).size / (1024 * 1024)).toFixed(2);
  console.log(`\n============================================================`);
  console.log(`✅ Backup successfully saved!`);
  console.log(`File: ${outPath} (${fileSizeMb} MB)`);
  console.log(`Summary:`);
  for (const [t, count] of Object.entries(stats)) {
    console.log(`  - ${t.padEnd(20)}: ${count} rows`);
  }
  console.log(`============================================================`);
}

// Direct execution check
const isDirectExecution =
  process.argv[1] &&
  (process.argv[1].endsWith('backupDatabase.ts') ||
    process.argv[1].endsWith('backupDatabase.js'));

if (isDirectExecution) {
  run().catch(err => {
    console.error('Fatal backup error:', err);
    process.exit(1);
  });
}
