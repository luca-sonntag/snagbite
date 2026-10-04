import { db, getDbPool } from '../../db/drizzle.js';
import { recipes } from '../../db/schema/recipes.js';
import { sql } from 'drizzle-orm';

async function main() {
  console.log('============================================================');
  console.log('🖼️  Rewriting Recipe Cover URLs to Streaming Endpoint');
  console.log('============================================================');

  try {
    const res = await db.execute(sql.raw(`
      UPDATE recipes
      SET image_url = REGEXP_REPLACE(image_url, '^https://[^/]+/.*?recipe-covers/', '/storage/recipe-covers/')
      WHERE image_url LIKE '%recipe-covers%'
      RETURNING id, image_url;
    `));

    console.log(`✅ Successfully rewritten ${res.rows.length} recipe cover URLs!`);
    if (res.rows.length > 0) {
      console.log('Sample URL:', res.rows[0].image_url);
    }
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    await getDbPool().end();
  }
}

main().catch(console.error);
