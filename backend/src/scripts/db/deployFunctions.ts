import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import dotenv from 'dotenv';

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

const connectionString = (
  process.env.DATABASE_URL?.includes('.railway.internal') && process.env.DATABASE_PUBLIC_URL
    ? process.env.DATABASE_PUBLIC_URL
    : (process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL)
);
if (!connectionString) {
  console.error('❌ DATABASE_URL is not set.');
  process.exit(1);
}

async function main() {
  console.log('⚡ Deploying 5 core Postgres functions to database...');
  const sqlPath = path.resolve(__dirname, '..', '..', 'db', 'functions.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  const pool = new pg.Pool({ connectionString });
  try {
    await pool.query(sql);
    console.log('✅ Successfully deployed functions:');
    console.log('  1. claim_next_job(worker_id)');
    console.log('  2. complete_job(p_job_id, p_recipe, p_llm_usage)');
    console.log('  3. bump_ingredient_mapping_hits(keys)');
    console.log('  4. weekly_xp_for_users(uids, since)');
    console.log('  5. global_weekly_xp(since, limit_count)');
  } catch (error) {
    console.error('❌ Failed to deploy functions:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
