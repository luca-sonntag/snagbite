import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import dotenv from 'dotenv';
import { normalizeUrl } from '../../db/jobsDb.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendDir = path.resolve(__dirname, '..', '..', '..');

// Load environment
if (!process.env.DATABASE_URL) {
  const isProd = process.argv.includes('--prod');
  const envFile = isProd ? '.env.production' : '.env.development';
  const envPath = path.resolve(backendDir, envFile);
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
  }
  if (!process.env.DATABASE_URL) {
    dotenv.config({ path: path.resolve(backendDir, '.env') });
  }
}

const connectionString =
  process.env.DATABASE_URL?.includes('.railway.internal') && process.env.DATABASE_PUBLIC_URL
    ? process.env.DATABASE_PUBLIC_URL
    : process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ DATABASE_URL is not set.');
  process.exit(1);
}

async function main() {
  console.log('🔄 Backfilling source_url_normalized and language on recipes table...');
  const pool = new pg.Pool({ connectionString });

  try {
    const { rows } = await pool.query<{ id: string; source_url: string; language: string | null }>(
      `SELECT id, source_url, language FROM recipes WHERE source_url IS NOT NULL AND (source_url_normalized IS NULL OR language IS NULL)`
    );

    console.log(`Found ${rows.length} recipes requiring backfill.`);

    let updated = 0;
    for (const row of rows) {
      const normalized = normalizeUrl(row.source_url);
      const lang = row.language || 'de';

      await pool.query(
        `UPDATE recipes SET source_url_normalized = $1, language = $2 WHERE id = $3`,
        [normalized, lang, row.id]
      );
      updated++;
    }

    console.log(`✅ Successfully backfilled ${updated} recipes.`);
  } catch (error) {
    console.error('❌ Failed to backfill recipes:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
