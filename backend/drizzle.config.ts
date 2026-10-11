import { defineConfig } from 'drizzle-kit';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Auto-load .env.production, .env.development or .env for local Drizzle CLI operations
if (!process.env.DATABASE_URL) {
  const isProd = process.argv.includes('--prod') || process.env.NODE_ENV === 'production';
  const envFile = isProd ? '.env.production' : '.env.development';
  dotenv.config({ path: path.resolve(__dirname, envFile) });
  if (!process.env.DATABASE_URL) {
    dotenv.config({ path: path.resolve(__dirname, '.env') });
  }
}

const rawUrl = process.env.DATABASE_URL || '';
const dbUrl = rawUrl.includes('.railway.internal') && process.env.DATABASE_PUBLIC_URL
  ? process.env.DATABASE_PUBLIC_URL
  : rawUrl;

export default defineConfig({
  schema: './src/db/schema/index.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: dbUrl,
  },
});
