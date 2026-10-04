import { defineConfig } from 'drizzle-kit';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Auto-load .env.development or .env for local Drizzle CLI operations
if (!process.env.DATABASE_URL) {
  dotenv.config({ path: path.resolve(__dirname, '.env.development') });
  if (!process.env.DATABASE_URL) {
    dotenv.config({ path: path.resolve(__dirname, '.env') });
  }
}

export default defineConfig({
  schema: './src/db/schema/index.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL || '',
  },
});
