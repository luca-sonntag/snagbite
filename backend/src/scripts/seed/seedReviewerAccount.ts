/**
 * Provision and seed a dedicated Google Play Reviewer / Demo account in PostgreSQL (Better-Auth).
 *
 * This script ensures the account exists, sets its tier to "premium" (so reviewers
 * can test all features without in-app purchase roadblocks), and populates realistic
 * sample recipes, shopping list items, pantry items, and gamification stats.
 *
 * Required env:
 *   DATABASE_URL
 * Optional env:
 *   REVIEWER_EMAIL    (default: reviewer@snagbite.app)
 *   REVIEWER_PASSWORD (default: SnagbiteReviewer2026!)
 *
 * Usage:
 *   cd backend && npm run seed:reviewer
 *   cd backend && npm run seed:reviewer:prod
 */
import { randomUUID } from 'node:crypto';
import { hashPassword } from 'better-auth/crypto';
import { eq, or, and, desc } from 'drizzle-orm';
import { db } from '../../db/drizzle.js';
import { user as userTable, account as accountTable } from '../../db/schema/auth.js';
import { recipes, userRecipes } from '../../db/schema/recipes.js';
import { pantryItems, shoppingList } from '../../db/schema/pantryAndShopping.js';
import { userStats, userBadges } from '../../db/schema/gamification.js';
import { initScriptEnv } from '../scriptEnv.js';

const scriptEnv = initScriptEnv();

const REVIEWER_EMAIL = (process.env.REVIEWER_EMAIL || 'reviewer@snagbite.app').trim().toLowerCase();
const REVIEWER_PASSWORD = process.env.REVIEWER_PASSWORD || 'SnagbiteReviewer2026!';

interface IngredientItem {
  name: string;
  amount?: number;
  unit?: string;
  category?: string;
}

interface RecipeSummary {
  id: string;
  title: string;
  ingredients?: IngredientItem[];
}

async function getOrCreateReviewerUser(): Promise<string> {
  const hashedPassword = await hashPassword(REVIEWER_PASSWORD);

  const [existingUser] = await db
    .select()
    .from(userTable)
    .where(eq(userTable.email, REVIEWER_EMAIL))
    .limit(1);

  if (existingUser) {
    console.log(`[Seed] Reviewer user ${REVIEWER_EMAIL} already exists, updating credentials & tier...`);
    const [existingAccount] = await db
      .select()
      .from(accountTable)
      .where(
        or(
          eq(accountTable.userId, existingUser.id),
          eq(accountTable.accountId, REVIEWER_EMAIL)
        )
      )
      .limit(1);

    if (existingAccount) {
      await db
        .update(accountTable)
        .set({
          password: hashedPassword,
          updatedAt: new Date(),
        })
        .where(eq(accountTable.id, existingAccount.id));
    } else {
      await db.insert(accountTable).values({
        id: randomUUID(),
        accountId: REVIEWER_EMAIL,
        providerId: 'credential',
        userId: existingUser.id,
        password: hashedPassword,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    await db
      .update(userTable)
      .set({
        emailVerified: true,
        tier: 'premium',
        metadata: {
          preferred_temperature_unit: 'Celsius',
          preferred_unit_system: 'metric',
        },
        updatedAt: new Date(),
      })
      .where(eq(userTable.id, existingUser.id));

    return existingUser.id;
  }

  const userId = randomUUID();
  console.log(`[Seed] Creating reviewer user ${REVIEWER_EMAIL} with id ${userId}...`);

  await db.insert(userTable).values({
    id: userId,
    name: 'Play Store Reviewer',
    email: REVIEWER_EMAIL,
    emailVerified: true,
    tier: 'premium',
    metadata: {
      preferred_temperature_unit: 'Celsius',
      preferred_unit_system: 'metric',
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  await db.insert(accountTable).values({
    id: randomUUID(),
    accountId: REVIEWER_EMAIL,
    providerId: 'credential',
    userId,
    password: hashedPassword,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  return userId;
}

async function seedRecipes(userId: string, targetCount = 8): Promise<RecipeSummary[]> {
  // 1. Fetch public recipes available in database
  const publicRecipes = await db
    .select({
      id: recipes.id,
      title: recipes.title,
      ingredients: recipes.ingredients,
    })
    .from(recipes)
    .where(and(eq(recipes.visibility, 'public'), eq(recipes.isRecipe, true)))
    .orderBy(desc(recipes.createdAt))
    .limit(50);

  if (!publicRecipes || publicRecipes.length === 0) {
    console.warn('[Seed] No public recipes found in database to link for reviewer.');
    return [];
  }

  // 2. Fetch recipes currently in the reviewer's library
  const existingUserRecipes = await db
    .select({ recipeId: userRecipes.recipeId })
    .from(userRecipes)
    .where(eq(userRecipes.userId, userId));

  const existingIds = new Set((existingUserRecipes || []).map((r) => r.recipeId));
  const available = (publicRecipes as RecipeSummary[]).filter((r) => !existingIds.has(r.id));
  const alreadySaved = (publicRecipes as RecipeSummary[]).filter((r) => existingIds.has(r.id));

  const needed = Math.max(0, targetCount - (existingUserRecipes?.length || 0));
  if (needed === 0) {
    console.log(`[Seed] Reviewer already has ${existingUserRecipes?.length} recipes in cookbook.`);
    return alreadySaved;
  }

  // 3. Pick random public recipes from available pool
  const shuffled = [...available].sort(() => 0.5 - Math.random());
  const selected = shuffled.slice(0, needed);

  console.log(`[Seed] Adding ${selected.length} random public recipes to reviewer cookbook...`);
  for (const r of selected) {
    try {
      await db.insert(userRecipes).values({
        userId,
        recipeId: r.id,
        source: 'share',
        isFavorite: Math.random() > 0.4,
        flags: ['reviewer_seed'],
      });
      console.log(`   + Linked "${r.title}" (${r.id})`);
    } catch (insertErr: any) {
      console.warn(`[Seed] Could not link recipe "${r.title}": ${insertErr?.message || insertErr}`);
    }
  }

  return [...alreadySaved, ...selected];
}

async function seedPantry(userId: string) {
  const samplePantry = [
    { name: 'Olivenöl extra vergine', amount: '500', unit: 'ml', category: 'Oils, Sauces & Vinegar' },
    { name: 'Basmatireis', amount: '1000', unit: 'g', category: 'Grains, Pasta & Bread' },
    { name: 'Dinkelmehl Type 630', amount: '800', unit: 'g', category: 'Baking & Pantry' },
    { name: 'Bio-Eier', amount: '6', unit: 'Stück', category: 'Dairy & Eggs' },
    { name: 'Sojasauce Kikkoman', amount: '250', unit: 'ml', category: 'Oils, Sauces & Vinegar' },
    { name: 'Chiasamen', amount: '200', unit: 'g', category: 'Nuts & Seeds' },
  ];

  const existing = await db
    .select({ id: pantryItems.id })
    .from(pantryItems)
    .where(eq(pantryItems.userId, userId));

  if (!existing || existing.length === 0) {
    console.log('[Seed] Populating pantry items...');
    for (const item of samplePantry) {
      await db.insert(pantryItems).values({
        userId,
        name: item.name,
        amount: item.amount,
        unit: item.unit,
        category: item.category,
      });
    }
  }
}

async function seedShoppingList(userId: string, savedRecipes: RecipeSummary[]) {
  const existing = await db
    .select({ id: shoppingList.id })
    .from(shoppingList)
    .where(eq(shoppingList.userId, userId));

  if (existing && existing.length > 0) {
    console.log(`[Seed] Reviewer already has ${existing.length} shopping list items.`);
    return;
  }

  const candidateItems: Array<{ name: string; amount?: number; unit?: string }> = [];
  for (const r of savedRecipes) {
    if (Array.isArray(r.ingredients)) {
      for (const ing of r.ingredients) {
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
    await db.insert(shoppingList).values({
      userId,
      name: item.name,
      amount: item.amount != null ? String(item.amount) : null,
      unit: item.unit ?? null,
      checked: i === 0,
    });
  }
}

async function seedGamification(userId: string) {
  const [stats] = await db
    .select({ userId: userStats.userId })
    .from(userStats)
    .where(eq(userStats.userId, userId))
    .limit(1);

  if (!stats) {
    console.log('[Seed] Setting up gamification user_stats (Level 4, 380 XP)...');
    await db.insert(userStats).values({
      userId,
      xp: 380,
      level: 4,
      coins: 50,
      totalCooks: 7,
      currentStreak: 3,
      longestStreak: 3,
      lastCookDate: new Date().toISOString().split('T')[0],
    });

    const badges = ['first_cook', 'first_photo', 'timer_first', 'distinct_5'];
    for (const badgeKey of badges) {
      await db
        .insert(userBadges)
        .values({
          userId,
          badgeKey,
        })
        .onConflictDoNothing();
    }
  }
}

async function main() {
  console.log(`--- Snagbite Reviewer Seed [Target: ${scriptEnv.target.toUpperCase()}] ---`);
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
