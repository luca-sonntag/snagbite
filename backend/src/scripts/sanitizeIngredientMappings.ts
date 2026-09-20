import { getClient } from '../db/client.js';

async function main() {
  const client = getClient();
  console.log('Sanitizing Supabase ingredient_mappings...');

  // 1. Delete old pepper PRODUCE row if present
  const delRes = await client.from('ingredient_mappings').delete().eq('mapping_key', 'pepper').eq('category', 'PRODUCE');
  if (delRes.error) {
    console.warn('Warning on delete pepper::PRODUCE:', delRes.error.message);
  }

  // 2. Upsert bell pepper PRODUCE
  const bellRes = await client.from('ingredient_mappings').upsert([{
    mapping_key: 'bell pepper',
    mapping_key_de: 'gemüsepaprika',
    aliases: ['paprika', 'sweet pepper', 'capsicum', 'paprikaschote'],
    category: 'PRODUCE',
    product_code: '4388844031814',
    resolution: 'matched',
    source: 'agent',
    confidence: 1.0,
    model: 'gemini-2.5-flash',
    reasoning: 'Confirmed existing OFF match: Paprika [REWE Bio, REWE Bio Naturland]',
    updated_at: new Date().toISOString(),
  }], { onConflict: 'mapping_key,category' });
  if (bellRes.error) {
    console.error('Error upserting bell pepper::PRODUCE:', bellRes.error.message);
  }

  // 3. Upsert black pepper SPICES_SEASONINGS
  const pepperRes = await client.from('ingredient_mappings').upsert([{
    mapping_key: 'black pepper',
    mapping_key_de: 'schwarzer pfeffer',
    aliases: ['pfeffer', 'pepper', 'peppercorn', 'gemahlener pfeffer'],
    category: 'SPICES_SEASONINGS',
    product_code: '3379140028173',
    resolution: 'matched',
    source: 'agent',
    confidence: 1.0,
    model: 'gemini-2.5-flash',
    reasoning: 'Confirmed canonical black pepper spice match in OFF index.',
    updated_at: new Date().toISOString(),
  }], { onConflict: 'mapping_key,category' });
  if (pepperRes.error) {
    console.error('Error upserting black pepper::SPICES_SEASONINGS:', pepperRes.error.message);
  }

  // 4. Upsert mozzarella DAIRY
  const mozzRes = await client.from('ingredient_mappings').upsert([{
    mapping_key: 'mozzarella',
    mapping_key_de: 'mozzarella',
    aliases: ['geriebener mozzarella', 'mozzarella gerieben', 'mozzarella di bufala', 'büffelmozzarella'],
    category: 'DAIRY',
    product_code: '4002156480510',
    resolution: 'matched',
    source: 'agent',
    confidence: 1.0,
    model: 'gemini-2.5-flash',
    reasoning: 'Confirmed canonical mozzarella cheese match in OFF index.',
    updated_at: new Date().toISOString(),
  }], { onConflict: 'mapping_key,category' });
  if (mozzRes.error) {
    console.error('Error upserting mozzarella::DAIRY:', mozzRes.error.message);
  }

  console.log('Sanitized Supabase ingredient_mappings successfully!');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
