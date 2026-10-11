import { initScriptEnv } from '../scriptEnv.js';

const scriptEnv = initScriptEnv();

import { db, getDbPool } from '../../db/drizzle.js';
import { recipes } from '../../db/schema/recipes.js';
import { sql } from 'drizzle-orm';

async function main() {
  console.log('============================================================');
  console.log(`🖼️  Rewriting Recipe Cover URLs to Streaming Endpoint (${scriptEnv.target.toUpperCase()})`);
  console.log('============================================================');

  try {
    // 1. Rewrite single image_url column
    const resUrl = await db.execute(sql.raw(`
      UPDATE recipes
      SET image_url = REGEXP_REPLACE(image_url, '^https://[^/]+/.*?recipe-covers/', '/storage/recipe-covers/')
      WHERE image_url LIKE '%recipe-covers%' AND image_url LIKE 'https://%'
      RETURNING id, image_url;
    `));
    console.log(`✅ Rewritten ${resUrl.rows.length} single image_url entries.`);

    // 2. Rewrite array image_urls column
    const resUrls = await db.execute(sql.raw(`
      UPDATE recipes
      SET image_urls = ARRAY(
        SELECT REGEXP_REPLACE(u, '^https://[^/]+/.*?recipe-covers/', '/storage/recipe-covers/')
        FROM unnest(image_urls) WITH ORDINALITY AS t(u, ord)
        ORDER BY ord
      )
      WHERE EXISTS (
        SELECT 1 FROM unnest(image_urls) AS u WHERE u LIKE '%recipe-covers%' AND u LIKE 'https://%'
      )
      RETURNING id, image_urls;
    `));
    console.log(`✅ Rewritten ${resUrls.rows.length} recipes with image_urls arrays.`);

    // 3. Verification check
    const [check] = await db.select({
      supabaseInUrls: sql<number>`count(*) filter (where image_urls::text like '%supabase%')`,
      supabaseInUrl: sql<number>`count(*) filter (where image_url like '%supabase%')`,
      storageInUrls: sql<number>`count(*) filter (where image_urls::text like '%/storage/%')`,
      storageInUrl: sql<number>`count(*) filter (where image_url like '%/storage/%')`,
    }).from(recipes);

    console.log('📊 Verification stats:', check);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    await getDbPool().end();
  }
}

main().catch(console.error);
