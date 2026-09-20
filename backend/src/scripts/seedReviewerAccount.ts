/**
 * Provision and seed a dedicated Google Play Reviewer / Demo account in Supabase.
 *
 * This script ensures the account exists, sets its tier to "premium" (so reviewers
 * can test all features without in-app purchase roadblocks), and populates realistic
 * sample recipes, shopping list items, pantry items, and gamification stats.
 *
 * Required env:
 *   SUPABASE_URL, SUPABASE_SECRET_KEY
 * Optional env:
 *   REVIEWER_EMAIL    (default: reviewer@snagbite.app)
 *   REVIEWER_PASSWORD (default: SnagbiteReviewer2026!)
 *
 * Usage:
 *   cd backend && npx tsx src/scripts/seedReviewerAccount.ts
 */
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY;
const REVIEWER_EMAIL = (process.env.REVIEWER_EMAIL || 'reviewer@snagbite.app').trim().toLowerCase();
const REVIEWER_PASSWORD = process.env.REVIEWER_PASSWORD || 'SnagbiteReviewer2026!';

if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SECRET_KEY.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

interface IngredientItem {
  name: string;
  amount?: number;
  unit?: string;
  category?: string;
}

interface IngredientGroup {
  name?: string;
  items?: IngredientItem[];
}

interface RecipeSummary {
  id: string;
  title: string;
  ingredients?: Array<IngredientGroup | IngredientItem>;
}

async function getOrCreateReviewerUser(): Promise<string> {
  const { data: created, error } = await supabase.auth.admin.createUser({
    email: REVIEWER_EMAIL,
    password: REVIEWER_PASSWORD,
    email_confirm: true,
    app_metadata: { tier: 'premium' },
    user_metadata: { preferred_temperature_unit: 'Celsius', preferred_unit_system: 'metric' },
  });

  if (!error && created.user) {
    console.log(`[Seed] Created reviewer user ${REVIEWER_EMAIL}`);
    return created.user.id;
  }

  console.log(`[Seed] Reviewer user ${REVIEWER_EMAIL} already exists, updating credentials & tier...`);
  for (let page = 1; page <= 20; page++) {
    const { data, error: listErr } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (listErr) throw new Error(`Failed to list users: ${listErr.message}`);
    const match = data.users.find((u) => u.email?.toLowerCase() === REVIEWER_EMAIL);
    if (match) {
      const { error: updateErr } = await supabase.auth.admin.updateUserById(match.id, {
        password: REVIEWER_PASSWORD,
        email_confirm: true,
        app_metadata: { ...match.app_metadata, tier: 'premium' },
      });
      if (updateErr) throw new Error(`Failed to update reviewer password: ${updateErr.message}`);
      return match.id;
    }
    if (data.users.length < 200) break;
  }
  throw new Error(`Could not create or find reviewer user ${REVIEWER_EMAIL}`);
}

async function seedRecipes(userId: string, targetCount = 8): Promise<RecipeSummary[]> {
  // 1. Fetch public recipes available in database
  const { data: publicRecipes, error: fetchErr } = await supabase
    .from('recipes')
    .select('id, title, ingredients')
    .eq('visibility', 'public')
    .eq('is_recipe', true)
    .order('created_at', { ascending: false })
    .limit(50);

  if (fetchErr) {
    throw new Error(`Failed to fetch public recipes: ${fetchErr.message}`);
  }

  if (!publicRecipes || publicRecipes.length === 0) {
    console.warn('[Seed] No public recipes found in database to link for reviewer.');
    return [];
  }

  // 2. Fetch recipes currently in the reviewer's library
  const { data: existingUserRecipes, error: userRecErr } = await supabase
    .from('user_recipes')
    .select('recipe_id')
    .eq('user_id', userId);

  if (userRecErr) {
    throw new Error(`Failed to check existing user recipes: ${userRecErr.message}`);
  }

  const existingIds = new Set((existingUserRecipes || []).map((r) => r.recipe_id));
  const available = (publicRecipes as RecipeSummary[]).filter((r) => !existingIds.has(r.id));
  const alreadySaved = (publicRecipes as RecipeSummary[]).filter((r) => existingIds.has(r.id));

  const needed = Math.max(0, targetCount - (existingUserRecipes?.length || 0));
  if (needed === 0) {
    console.log(`[Seed] Reviewer already has ${existingUserRecipes?.length} recipes in cookbook.`);
    if (alreadySaved.length > 0) return alreadySaved;
    const { data: userSaved } = await supabase
      .from('user_recipes')
      .select('recipes(id, title, ingredients)')
      .eq('user_id', userId);
    return ((userSaved || []).map((ur) => ur.recipes).filter(Boolean) as unknown as RecipeSummary[]);
  }

  // 3. Pick random public recipes from available pool
  const shuffled = [...available].sort(() => 0.5 - Math.random());
  const selected = shuffled.slice(0, needed);

  console.log(`[Seed] Adding ${selected.length} random public recipes to reviewer cookbook...`);
  for (const r of selected) {
    const { error: insertErr } = await supabase.from('user_recipes').insert({
      user_id: userId,
      recipe_id: r.id,
      source: 'share',
      is_favorite: Math.random() > 0.4,
      flags: ['reviewer_seed'],
    });

    if (insertErr) {
      console.warn(`[Seed] Could not link recipe "${r.title}": ${insertErr.message}`);
    } else {
      console.log(`   + Linked "${r.title}" (${r.id})`);
    }
  }

  return [...alreadySaved, ...selected];
}

async function seedPantry(userId: string) {
  const samplePantry = [
    { name: 'Olivenöl extra vergine', amount: 500, unit: 'ml', category: 'Oils, Sauces & Vinegar' },
    { name: 'Basmatireis', amount: 1000, unit: 'g', category: 'Grains, Pasta & Bread' },
    { name: 'Dinkelmehl Type 630', amount: 800, unit: 'g', category: 'Baking & Pantry' },
    { name: 'Bio-Eier', amount: 6, unit: 'Stück', category: 'Dairy & Eggs' },
    { name: 'Sojasauce Kikkoman', amount: 250, unit: 'ml', category: 'Oils, Sauces & Vinegar' },
    { name: 'Chiasamen', amount: 200, unit: 'g', category: 'Nuts & Seeds' },
  ];

  const { data: existing } = await supabase.from('pantry_items').select('id').eq('user_id', userId);
  if (!existing || existing.length === 0) {
    console.log('[Seed] Populating pantry items...');
    for (const item of samplePantry) {
      await supabase.from('pantry_items').insert({
        user_id: userId,
        name: item.name,
        amount: item.amount,
        unit: item.unit,
        category: item.category,
      });
    }
  }
}

async function seedShoppingList(userId: string, savedRecipes: RecipeSummary[]) {
  const { data: existing } = await supabase.from('shopping_list').select('id').eq('user_id', userId);
  if (existing && existing.length > 0) {
    console.log(`[Seed] Reviewer already has ${existing.length} shopping list items.`);
    return;
  }

  // Extract authentic ingredients from the reviewer's saved recipes
  const candidateItems: Array<{ name: string; amount?: number; unit?: string }> = [];
  for (const r of savedRecipes) {
    if (Array.isArray(r.ingredients)) {
      for (const entry of r.ingredients) {
        const items = Array.isArray((entry as IngredientGroup)?.items)
          ? (entry as IngredientGroup).items!
          : [(entry as IngredientItem)];
        for (const ing of items) {
          if (ing?.name && typeof ing.name === 'string') {
            candidateItems.push({
              name: ing.name,
              amount: typeof ing.amount === 'number' ? ing.amount : undefined,
              unit: typeof ing.unit === 'string' ? ing.unit : undefined,
            });
          }
        }
      }
    }
  }

  const itemsToInsert = candidateItems.slice(0, 5);
  if (itemsToInsert.length === 0) {
    itemsToInsert.push(
      { name: 'Bio-Zitrone', amount: 2, unit: 'Stück' },
      { name: 'Olivenöl', amount: 500, unit: 'ml' },
      { name: 'Basmatireis', amount: 500, unit: 'g' }
    );
  }

  console.log(`[Seed] Populating ${itemsToInsert.length} shopping list items from saved recipes...`);
  for (let i = 0; i < itemsToInsert.length; i++) {
    const item = itemsToInsert[i];
    await supabase.from('shopping_list').insert({
      user_id: userId,
      name: item.name,
      amount: item.amount ?? null,
      unit: item.unit ?? null,
      checked: i === 0,
    });
  }
}

async function seedGamification(userId: string) {
  const { data: stats } = await supabase.from('user_stats').select('user_id').eq('user_id', userId).maybeSingle();
  if (!stats) {
    console.log('[Seed] Setting up gamification user_stats (Level 4, 380 XP)...');
    await supabase.from('user_stats').insert({
      user_id: userId,
      xp: 380,
      level: 4,
      total_cooks: 7,
      current_streak: 3,
      longest_streak: 3,
      last_cook_date: new Date().toISOString(),
      badges: ['first_cook', 'first_photo', 'timer_first', 'distinct_5'],
    });
  }
}

async function main() {
  console.log('--- Snagbite Reviewer Seed ---');
  const userId = await getOrCreateReviewerUser();
  console.log(`Reviewer user ID: ${userId}`);

  const savedRecipes = await seedRecipes(userId);
  await seedPantry(userId);
  await seedShoppingList(userId, savedRecipes);
  await seedGamification(userId);

  console.log('\n✅ Reviewer account is fully provisioned and ready for Google Play Review!');
  console.log(`   E-Mail:    ${REVIEWER_EMAIL}`);
  console.log(`   Password:  ${REVIEWER_PASSWORD}`);
  console.log('   Tier:      premium');
}

main().catch((err) => {
  console.error('Failed to seed reviewer account:', err);
  process.exit(1);
});
