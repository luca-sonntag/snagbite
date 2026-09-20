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

const SEED_RECIPES = [
  {
    title: 'Cremige One-Pot Zitronen-Pasta',
    description: 'Frische Pasta mit cremiger Zitronen-Ricotta-Soße, Babyspinat und gerösteten Pinienkernen.',
    emoji: '🍋',
    category: 'MAIN_COURSE',
    prep_time: 10,
    cook_time: 15,
    servings: 2,
    tags: ['Vegetarisch', 'Schnell', 'One-Pot', 'Pasta'],
    equipment: ['Großer Topf', 'Zestenreibe', 'Schneidebrett'],
    tips: ['Etwas Nudelwasser auffangen, um die Soße perfekt sämig zu binden.'],
    ingredients: [
      { name: 'Spaghetti oder Tagliatelle', amount: 250, unit: 'g', category: 'Grains, Pasta & Bread' },
      { name: 'Bio-Zitrone (Abrieb & Saft)', amount: 1, unit: 'Stück', category: 'Fruits & Berries' },
      { name: 'Ricotta', amount: 150, unit: 'g', category: 'Dairy & Eggs' },
      { name: 'Babyspinat', amount: 100, unit: 'g', category: 'Vegetables & Mushrooms' },
      { name: 'Knoblauch', amount: 2, unit: 'Zehen', category: 'Vegetables & Mushrooms' },
      { name: 'Olivenöl extra vergine', amount: 2, unit: 'EL', category: 'Oils, Sauces & Vinegar' },
      { name: 'Pinienkerne', amount: 25, unit: 'g', category: 'Nuts & Seeds' },
      { name: 'Parmesan gerieben', amount: 30, unit: 'g', category: 'Dairy & Eggs' },
    ],
    instructions: [
      { stepNumber: 1, instruction: 'Pinienkerne in einer trockenen Pfanne goldbraun anrösten und beiseitestellen.', timerSeconds: 180 },
      { stepNumber: 2, instruction: 'Knoblauch fein hacken und die Schale der Bio-Zitrone abreiben.', timerSeconds: 120 },
      { stepNumber: 3, instruction: 'Pasta in reichlich gesalzenem Wasser al dente kochen. 1 Kelle Nudelwasser abschöpfen.', timerSeconds: 540 },
      { stepNumber: 4, instruction: 'Knoblauch in Olivenöl anschwitzen, Ricotta, Zitronensaft & Abrieb unterrühren.', timerSeconds: 120 },
      { stepNumber: 5, instruction: 'Pasta und Babyspinat mit dem Nudelwasser zur Soße geben, durchschwenken und mit Parmesan servieren.', timerSeconds: 60 },
    ],
    nutritional_values: { calories: 580, protein: 22, carbs: 76, fat: 20, fiber: 5, sugar: 4 },
    health_score: 8.4,
  },
  {
    title: 'High-Protein Teriyaki Chicken Bowl',
    description: 'Zartes Hähnchenbrustfilet in hausgemachter Teriyaki-Glasur mit Duftreis, Edamame und Sesam.',
    emoji: '🍗',
    category: 'MAIN_COURSE',
    prep_time: 15,
    cook_time: 20,
    servings: 2,
    tags: ['High Protein', 'Meal Prep', 'Fitness', 'Asiatisch'],
    equipment: ['Wok oder Pfanne', 'Reiskocher oder Topf'],
    tips: ['Doppelte Portion kochen für perfektes Meal-Prep am Folgetag.'],
    ingredients: [
      { name: 'Hähnchenbrustfilet', amount: 350, unit: 'g', category: 'Meat & Poultry' },
      { name: 'Basmatireis', amount: 160, unit: 'g', category: 'Grains, Pasta & Bread' },
      { name: 'Edamame (geschält)', amount: 120, unit: 'g', category: 'Vegetables & Mushrooms' },
      { name: 'Brokkoliröschen', amount: 150, unit: 'g', category: 'Vegetables & Mushrooms' },
      { name: 'Sojasauce', amount: 3, unit: 'EL', category: 'Oils, Sauces & Vinegar' },
      { name: 'Honig oder Ahornsirup', amount: 1.5, unit: 'EL', category: 'Sweets & Snacks' },
      { name: 'Sesamöl', amount: 1, unit: 'TL', category: 'Oils, Sauces & Vinegar' },
      { name: 'Sesamsamen geröstet', amount: 1, unit: 'EL', category: 'Nuts & Seeds' },
    ],
    instructions: [
      { stepNumber: 1, instruction: 'Basmatireis gründlich waschen und nach Packungsanleitung gar kochen.', timerSeconds: 720 },
      { stepNumber: 2, instruction: 'Hähnchenbrust in mundgerechte Stücke schneiden. Sojasauce, Honig und Sesamöl zur Teriyaki-Sauce verrühren.', timerSeconds: 240 },
      { stepNumber: 3, instruction: 'Brokkoli und Edamame für 4 Minuten dampfgaren oder kurz blanchieren.', timerSeconds: 240 },
      { stepNumber: 4, instruction: 'Hähnchen in einer heißen Pfanne scharf anbraten, bis es durchgegart ist.', timerSeconds: 360 },
      { stepNumber: 5, instruction: 'Sauce über das Fleisch geben und 1-2 Minuten einkochen lassen, bis sie glänzt. In Bowls mit Reis, Gemüse und Sesam anrichten.', timerSeconds: 120 },
    ],
    nutritional_values: { calories: 610, protein: 48, carbs: 68, fat: 12, fiber: 7, sugar: 9 },
    health_score: 9.1,
  },
  {
    title: 'Avocado-Kichererbsen-Crunch Salat',
    description: 'Knackiger Salat mit gerösteten Gewürz-Kichererbsen, cremiger Avocado und Limetten-Tahini-Dressing.',
    emoji: '🥗',
    category: 'SALAD',
    prep_time: 12,
    cook_time: 15,
    servings: 2,
    tags: ['Vegan', 'Glutenfrei', 'Ballaststoffreich', 'Sommer'],
    equipment: ['Backblech oder Heißluftfritteuse', 'Große Salatschüssel'],
    tips: ['Kichererbsen vor dem Rösten trocken tupfen – so werden sie besonders knusprig.'],
    ingredients: [
      { name: 'Kichererbsen (Dose)', amount: 240, unit: 'g', category: 'Vegetables & Mushrooms' },
      { name: 'Reife Avocado', amount: 1, unit: 'Stück', category: 'Fruits & Berries' },
      { name: 'Gurke', amount: 1, unit: 'Stück', category: 'Vegetables & Mushrooms' },
      { name: 'Kirschtomaten', amount: 150, unit: 'g', category: 'Vegetables & Mushrooms' },
      { name: 'Tahini (Sesampaste)', amount: 2, unit: 'EL', category: 'Oils, Sauces & Vinegar' },
      { name: 'Limettensaft', amount: 2, unit: 'EL', category: 'Fruits & Berries' },
      { name: 'Kreuzkümmel & Paprikapulver', amount: 1, unit: 'TL', category: 'Spices & Herbs' },
    ],
    instructions: [
      { stepNumber: 1, instruction: 'Kichererbsen abspülen, abtrocknen, mit Olivenöl, Kreuzkümmel und Paprika im Ofen knusprig backen.', timerSeconds: 900 },
      { stepNumber: 2, instruction: 'Gurke und Avocado würfeln, Kirschtomaten halbieren.', timerSeconds: 240 },
      { stepNumber: 3, instruction: 'Tahini mit Limettensaft, 2 EL warmem Wasser, Salz und Pfeffer cremig rühren.', timerSeconds: 120 },
      { stepNumber: 4, instruction: 'Alles in einer Schüssel mischen und mit den warmen, knusprigen Kichererbsen toppen.', timerSeconds: 60 },
    ],
    nutritional_values: { calories: 440, protein: 14, carbs: 38, fat: 24, fiber: 13, sugar: 5 },
    health_score: 9.4,
  },
  {
    title: 'Fluffige Blaubeer-Pancakes',
    description: 'Goldbraun gebackene, extra luftige Pancakes gefüllt mit frischen Heidelbeeren.',
    emoji: '🥞',
    category: 'BREAKFAST',
    prep_time: 10,
    cook_time: 10,
    servings: 2,
    tags: ['Frühstück', 'Süß', 'Vegetarisch', 'Wochenende'],
    equipment: ['Flache Pfanne', 'Rührschüssel', 'Schneebesen'],
    tips: ['Den Teig nach dem Verrühren 5 Minuten ruhen lassen für maximale Fluffigkeit.'],
    ingredients: [
      { name: 'Dinkelmehl oder Weizenmehl', amount: 150, unit: 'g', category: 'Baking & Pantry' },
      { name: 'Backpulver', amount: 1.5, unit: 'TL', category: 'Baking & Pantry' },
      { name: 'Hafermilch oder Kuhmilch', amount: 180, unit: 'ml', category: 'Dairy & Eggs' },
      { name: 'Ei', amount: 1, unit: 'Stück', category: 'Dairy & Eggs' },
      { name: 'Frische Blaubeeren', amount: 100, unit: 'g', category: 'Fruits & Berries' },
      { name: 'Ahornsirup', amount: 2, unit: 'EL', category: 'Sweets & Snacks' },
      { name: 'Butter zum Ausbacken', amount: 10, unit: 'g', category: 'Dairy & Eggs' },
    ],
    instructions: [
      { stepNumber: 1, instruction: 'Mehl und Backpulver vermengen. Milch und Ei verquirlen und kurz unterrühren.', timerSeconds: 180 },
      { stepNumber: 2, instruction: 'Teig 5 Minuten quellen lassen. Eine Pfanne auf mittlerer Hitze erwärmen.', timerSeconds: 300 },
      { stepNumber: 3, instruction: 'Etwas Butter zerlassen. Je 2 EL Teig pro Pancake hineingeben, mit Blaubeeren belegen.', timerSeconds: 120 },
      { stepNumber: 4, instruction: 'Wenden, sobald sich kleine Bläschen bilden, und von der anderen Seite goldbraun backen.', timerSeconds: 120 },
      { stepNumber: 5, instruction: 'Mit warmem Ahornsirup und frischen Beeren servieren.', timerSeconds: 60 },
    ],
    nutritional_values: { calories: 390, protein: 12, carbs: 64, fat: 9, fiber: 4, sugar: 18 },
    health_score: 7.8,
  },
  {
    title: 'Aromatisches Rotes Thai-Curry',
    description: 'Cremiges Curry mit Kokosmilch, knackigem Gemüse, Koriander und Duftreis.',
    emoji: '🍛',
    category: 'MAIN_COURSE',
    prep_time: 15,
    cook_time: 20,
    servings: 3,
    tags: ['Vegan', 'Wärmend', 'Asiatisch', 'Glutenfrei'],
    equipment: ['Wok oder großer Schmortopf'],
    tips: ['Currypaste zuerst in etwas Kokosmilch-Fett anrösten, um die Aromen freizusetzen.'],
    ingredients: [
      { name: 'Rote Thai-Currypaste', amount: 2, unit: 'EL', category: 'Spices & Herbs' },
      { name: 'Kokosmilch (Vollfett)', amount: 400, unit: 'ml', category: 'Baking & Pantry' },
      { name: 'Zucchini', amount: 1, unit: 'Stück', category: 'Vegetables & Mushrooms' },
      { name: 'Rote Paprika', amount: 1, unit: 'Stück', category: 'Vegetables & Mushrooms' },
      { name: 'Tofu natur oder Hähnchen', amount: 200, unit: 'g', category: 'Meat & Poultry' },
      { name: 'Frischer Koriander', amount: 1, unit: 'Bund', category: 'Spices & Herbs' },
    ],
    instructions: [
      { stepNumber: 1, instruction: 'Gemüse und Tofu in mundgerechte Stücke schneiden.', timerSeconds: 300 },
      { stepNumber: 2, instruction: '2 EL der festen Kokoscreme erhitzen, Currypaste darin 2 Minuten anbraten.', timerSeconds: 120 },
      { stepNumber: 3, instruction: 'Restliche Kokosmilch angießen, Gemüse und Tofu hinzugeben.', timerSeconds: 180 },
      { stepNumber: 4, instruction: 'Bei mittlerer Hitze sanft köcheln lassen, bis das Gemüse bissfest ist.', timerSeconds: 600 },
      { stepNumber: 5, instruction: 'Mit Limettensaft abschmecken und mit frischem Koriander garnieren.', timerSeconds: 60 },
    ],
    nutritional_values: { calories: 480, protein: 16, carbs: 22, fat: 34, fiber: 6, sugar: 5 },
    health_score: 8.7,
  },
  {
    title: 'Knuspriger Lachs auf Ofengemüse',
    description: 'Zartes Lachsfilet aus dem Ofen auf bunten Paprika, Zucchini und roten Zwiebeln mit Rosmarin.',
    emoji: '🐟',
    category: 'MAIN_COURSE',
    prep_time: 15,
    cook_time: 25,
    servings: 2,
    tags: ['Low Carb', 'Omega-3', 'High Protein', 'Ofengericht'],
    equipment: ['Backblech mit Backpapier'],
    tips: ['Zitronenscheiben direkt auf den Lachs legen, damit er saftig bleibt.'],
    ingredients: [
      { name: 'Lachsfilet ohne Haut', amount: 300, unit: 'g', category: 'Fish & Seafood' },
      { name: 'Zucchini', amount: 1, unit: 'Stück', category: 'Vegetables & Mushrooms' },
      { name: 'Rote Zwiebel', amount: 1, unit: 'Stück', category: 'Vegetables & Mushrooms' },
      { name: 'Paprika bunt', amount: 2, unit: 'Stück', category: 'Vegetables & Mushrooms' },
      { name: 'Olivenöl', amount: 2, unit: 'EL', category: 'Oils, Sauces & Vinegar' },
      { name: 'Rosmarin frisch', amount: 2, unit: 'Zweige', category: 'Spices & Herbs' },
    ],
    instructions: [
      { stepNumber: 1, instruction: 'Backofen auf 200°C Ober-/Unterhitze vorheizen. Gemüse in grobe Stücke schneiden.', timerSeconds: 300 },
      { stepNumber: 2, instruction: 'Gemüse mit Olivenöl, Salz, Pfeffer und Rosmarin vermengen und auf dem Blech verteilen.', timerSeconds: 180 },
      { stepNumber: 3, instruction: 'Gemüse für 15 Minuten vorbacken.', timerSeconds: 900 },
      { stepNumber: 4, instruction: 'Lachsfilets würzen, auf das Gemüsebett setzen und weitere 10 Minuten mitgaren.', timerSeconds: 600 },
    ],
    nutritional_values: { calories: 510, protein: 38, carbs: 14, fat: 32, fiber: 5, sugar: 6 },
    health_score: 9.3,
  },
  {
    title: 'Saftiger Smash Burger',
    description: 'Zwei krosse Rinder-Patties, geschmolzener Cheddar, karamellisierte Zwiebeln und Brioche-Bun.',
    emoji: '🍔',
    category: 'MAIN_COURSE',
    prep_time: 10,
    cook_time: 10,
    servings: 2,
    tags: ['Comfort Food', 'Schnell', 'High Protein'],
    equipment: ['Gusseiserne Pfanne', 'Pfannenwender / Smasher'],
    tips: ['Die Pfanne muss rauchig heiß sein, damit die charakteristische braune Kruste entsteht.'],
    ingredients: [
      { name: 'Rinderhackfleisch (20% Fett)', amount: 250, unit: 'g', category: 'Meat & Poultry' },
      { name: 'Brioche Burger Buns', amount: 2, unit: 'Stück', category: 'Grains, Pasta & Bread' },
      { name: 'Cheddar-Käse Scheiben', amount: 4, unit: 'Scheiben', category: 'Dairy & Eggs' },
      { name: 'Rote Zwiebel', amount: 1, unit: 'Stück', category: 'Vegetables & Mushrooms' },
      { name: 'Essiggurken', amount: 4, unit: 'Scheiben', category: 'Oils, Sauces & Vinegar' },
    ],
    instructions: [
      { stepNumber: 1, instruction: 'Hackfleisch zu 4 lockeren Bällchen formen. Buns auf den Schnittflächen anrösten.', timerSeconds: 180 },
      { stepNumber: 2, instruction: 'Gusseiserne Pfanne sehr heiß erhitzen. Fleischbällchen hineinlegen und flach pressen.', timerSeconds: 60 },
      { stepNumber: 3, instruction: '2 Minuten scharf braten, wenden, sofort mit Cheddar belegen und schmelzen lassen.', timerSeconds: 120 },
      { stepNumber: 4, instruction: 'Buns mit Sauce, Zwiebeln, Gurken und doppelten Patties belegen.', timerSeconds: 60 },
    ],
    nutritional_values: { calories: 650, protein: 39, carbs: 42, fat: 36, fiber: 2, sugar: 6 },
    health_score: 6.2,
  },
  {
    title: 'Grüner Detox Power Smoothie',
    description: 'Erfrischender Vitaminkick mit jungem Blattspinat, grünem Apfel, Ingwer und Chiasamen.',
    emoji: '🥤',
    category: 'BEVERAGE',
    prep_time: 5,
    cook_time: 0,
    servings: 1,
    tags: ['Vegan', 'Raw', 'Vitamine', 'Quick'],
    equipment: ['Standmixer'],
    tips: ['Ein Stück frischer Ingwer sorgt für angenehme Schärfe und regt den Stoffwechsel an.'],
    ingredients: [
      { name: 'Frischer Babyspinat', amount: 60, unit: 'g', category: 'Vegetables & Mushrooms' },
      { name: 'Grüner Apfel', amount: 1, unit: 'Stück', category: 'Fruits & Berries' },
      { name: 'Banane gefroren', amount: 1, unit: 'Stück', category: 'Fruits & Berries' },
      { name: 'Ingwer frisch', amount: 1, unit: 'cm', category: 'Vegetables & Mushrooms' },
      { name: 'Chiasamen', amount: 1, unit: 'EL', category: 'Nuts & Seeds' },
      { name: 'Wasser oder Kokoswasser', amount: 200, unit: 'ml', category: 'Beverages' },
    ],
    instructions: [
      { stepNumber: 1, instruction: 'Apfel entkernen und grob würfeln, Ingwer schälen.', timerSeconds: 120 },
      { stepNumber: 2, instruction: 'Alle Zutaten in den Standmixer geben.', timerSeconds: 60 },
      { stepNumber: 3, instruction: 'Auf höchster Stufe für 60 Sekunden cremig pürieren.', timerSeconds: 60 },
    ],
    nutritional_values: { calories: 230, protein: 5, carbs: 46, fat: 4, fiber: 9, sugar: 28 },
    health_score: 9.6,
  },
];

async function seedRecipes(userId: string) {
  // Check if user already has recipes
  const { data: existingUserRecipes } = await supabase
    .from('user_recipes')
    .select('recipe_id')
    .eq('user_id', userId);

  if (existingUserRecipes && existingUserRecipes.length >= 5) {
    console.log(`[Seed] Reviewer already has ${existingUserRecipes.length} recipes in cookbook. Skipping recipe insert.`);
    return;
  }

  console.log(`[Seed] Inserting ${SEED_RECIPES.length} sample recipes for reviewer...`);
  for (const r of SEED_RECIPES) {
    const { data: insertedRecipe, error: recipeErr } = await supabase
      .from('recipes')
      .insert({
        created_by: userId,
        visibility: 'private',
        origin: 'url',
        title: r.title,
        description: r.description,
        emoji: r.emoji,
        category: r.category,
        prep_time: r.prep_time,
        cook_time: r.cook_time,
        servings: r.servings,
        tags: r.tags,
        equipment: r.equipment,
        tips: r.tips,
        ingredients: r.ingredients,
        instructions: r.instructions,
        nutritional_values: r.nutritional_values,
        health_score: r.health_score,
        is_recipe: true,
      })
      .select('id')
      .single();

    if (recipeErr || !insertedRecipe) {
      console.warn(`[Seed] Failed to insert recipe "${r.title}":`, recipeErr?.message);
      continue;
    }

    await supabase.from('user_recipes').insert({
      user_id: userId,
      recipe_id: insertedRecipe.id,
      source: 'extraction',
      is_favorite: true,
      flags: ['demo', 'reviewer_seed'],
    });
  }
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

async function seedShoppingList(userId: string) {
  const sampleItems = [
    { name: 'Ricotta', amount: 150, unit: 'g', checked: false },
    { name: 'Babyspinat', amount: 100, unit: 'g', checked: false },
    { name: 'Bio-Zitrone', amount: 2, unit: 'Stück', checked: true },
    { name: 'Frische Blaubeeren', amount: 125, unit: 'g', checked: false },
    { name: 'Hähnchenbrustfilet', amount: 400, unit: 'g', checked: false },
  ];

  const { data: existing } = await supabase.from('shopping_list').select('id').eq('user_id', userId);
  if (!existing || existing.length === 0) {
    console.log('[Seed] Populating shopping list...');
    for (const item of sampleItems) {
      await supabase.from('shopping_list').insert({
        user_id: userId,
        name: item.name,
        amount: item.amount,
        unit: item.unit,
        checked: item.checked,
      });
    }
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

  await seedRecipes(userId);
  await seedPantry(userId);
  await seedShoppingList(userId);
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
