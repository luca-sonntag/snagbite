/**
 * Database Backup Script (Native PostgreSQL, no pg_dump or Docker required)
 *
 * Exports all data from public tables into a timestamped JSON file.
 * Connects directly to the PostgreSQL database (Railway) via pg Pool.
 *
 * Usage:
 *   npx tsx src/scripts/db/backupDatabase.ts --prod
 *   npx tsx src/scripts/db/backupDatabase.ts --dev
 */

import fs from 'fs';
import path from 'path';
import { getDbPool } from '../../db/drizzle.js';
import { initScriptEnv } from '../scriptEnv.js';

const scriptEnv = initScriptEnv();
const isProd = scriptEnv.isProd;

async function discoverPublicTables(pool: ReturnType<typeof getDbPool>): Promise<string[]> {
  const result = await pool.query<{ table_name: string }>(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      AND table_name NOT LIKE 'pg_%'
    ORDER BY table_name;
  `);

  return result.rows.map((r) => r.table_name);
}

async function fetchAllRows(pool: ReturnType<typeof getDbPool>, tableName: string): Promise<unknown[] | null> {
  try {
    // Sanitized table name identifier
    const safeName = tableName.replace(/[^a-zA-Z0-9_]/g, '');
    const result = await pool.query(`SELECT * FROM "${safeName}"`);
    return result.rows;
  } catch (err: any) {
    console.warn(`  ⚠️ Warning fetching ${tableName}: ${err?.message || err}`);
    return null;
  }
}

async function run(): Promise<void> {
  const pool = getDbPool();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const targetName = isProd ? 'prod' : 'dev';

  console.log(`============================================================`);
  console.log(`PostgreSQL Database Backup`);
  console.log(`Target:      ${isProd ? 'PRODUCTION' : 'DEVELOPMENT'}`);
  console.log(`Timestamp:   ${timestamp}`);
  console.log(`============================================================\n`);

  console.log(`Discovering public tables via information_schema...`);
  const tables = await discoverPublicTables(pool);
  console.log(`Found ${tables.length} table(s): ${tables.join(', ')}\n`);

  const backupData: Record<string, unknown[]> = {};
  const stats: Record<string, number> = {};

  for (const table of tables) {
    process.stdout.write(`Exporting ${table.padEnd(25)}... `);
    const rows = await fetchAllRows(pool, table);

    if (rows === null) {
      console.log('(failed to read or table inaccessible)');
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

  const outFileName = `backup_${targetName}_${timestamp}.json`;
  const outPath = path.join(outDir, outFileName);

  fs.writeFileSync(
    outPath,
    JSON.stringify(
      {
        metadata: {
          target: isProd ? 'production' : 'development',
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
    console.log(`  - ${t.padEnd(25)}: ${count} rows`);
  }
  console.log(`============================================================`);
}

run().catch((err) => {
  console.error('Fatal backup error:', err);
  process.exit(1);
});
