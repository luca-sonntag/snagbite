import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { fetchFluxImageBuffer } from '../ingredientImageService.js';

interface CategoryIconDefinition {
  id: string;
  nameDe: string;
  filename: string;
  threeIngredients: string;
  prompt: string;
}

const CATEGORY_DEFINITIONS: CategoryIconDefinition[] = [
  {
    id: 'VEGETABLES',
    nameDe: 'Gemüse',
    filename: 'vegetables.webp',
    threeIngredients: 'Brokkoli, Karotte, Tomate',
    prompt:
      'Neat harmonious trio cluster of fresh raw garden vegetables: a fresh vibrant green broccoli floret, a crisp whole orange carrot with fresh green carrot top, and a whole ripe red vine tomato, placed together in the center, isolated on pure solid white background, 45-degree three-quarter perspective view, generous 20% white padding on all sides, complete objects fully contained in frame without edge clipping, professional commercial culinary studio lighting, soft symmetrical fill light, crisp sharp focus, rich fresh green and red garden colors, subtle soft natural contact shadow underneath, no harsh dark cast shadows, not cropped, no text, no watermark',
  },
  {
    id: 'FRUITS',
    nameDe: 'Obst & Früchte',
    filename: 'fruits.webp',
    threeIngredients: 'Apfel, Banane, Erdbeere',
    prompt:
      'Neat harmonious trio cluster of exactly three fresh raw fruits: one crisp whole red apple with stem, one ripe yellow banana, and one vibrant fresh red strawberry with green leaves, tightly arranged together in the center, isolated on pure solid white background, 45-degree three-quarter perspective view, generous 20% white padding on all sides, complete objects fully contained in frame without edge clipping, professional commercial culinary studio lighting, soft symmetrical fill light, crisp sharp focus, vibrant natural fruit colors, subtle soft natural contact shadow underneath, no harsh dark cast shadows, not cropped, no text, no watermark',
  },
  {
    id: 'DAIRY_EGGS',
    nameDe: 'Milchprodukte & Eier',
    filename: 'dairy_eggs.webp',
    threeIngredients: 'Käse, Ei, Butter',
    prompt:
      'Neat harmonious trio cluster of fresh farm dairy essentials: an artisanal gourmet cheese wedge with rustic rind, a pristine single raw brown egg, and a clean geometric block of golden butter, placed together in the center, isolated on pure solid white background, 45-degree three-quarter perspective view, generous 20% white padding on all sides, complete objects fully contained in frame without edge clipping, professional commercial culinary studio lighting, soft symmetrical fill light, crisp sharp focus, velvety dairy textures, subtle soft natural contact shadow underneath, no harsh dark cast shadows, not cropped, no text, no watermark',
  },
  {
    id: 'MEAT_POULTRY',
    nameDe: 'Fleisch & Geflügel',
    filename: 'meat_poultry.webp',
    threeIngredients: 'Hähnchenbrust, Steak, Schinken',
    prompt:
      'Neat harmonious trio cluster of prime raw butcher meats: a fresh raw chicken breast fillet, a succulent marbled raw beef steak cut, and a neat rolled slice of cured ham, placed together in the center without plate or tray, isolated on pure solid white background, 45-degree three-quarter perspective view, generous 20% white padding on all sides, complete objects fully contained in frame without edge clipping, professional commercial culinary studio lighting, soft symmetrical fill light, crisp sharp focus, fresh butcher sheen, vibrant red and coral tones, subtle soft natural contact shadow underneath, no harsh dark cast shadows, not cropped, no text, no watermark',
  },
  {
    id: 'SEAFOOD',
    nameDe: 'Fisch & Meeresfrüchte',
    filename: 'seafood.webp',
    threeIngredients: 'Lachs, Garnele, Zitrone',
    prompt:
      'Neat harmonious trio cluster of prime ocean seafood: a fresh raw salmon fillet cut with delicate marbling, a succulent curved pink king prawn, and a fresh juicy yellow lemon wedge, placed together in the center without plate or ice, isolated on pure solid white background, 45-degree three-quarter perspective view, generous 20% white padding on all sides, complete objects fully contained in frame without edge clipping, professional commercial culinary studio lighting, soft symmetrical fill light, crisp sharp focus, fresh ocean sheen, vibrant coral-pink colors, subtle soft natural contact shadow underneath, no harsh dark cast shadows, not cropped, no text, no watermark',
  },
  {
    id: 'GRAINS_PASTA',
    nameDe: 'Getreide, Nudeln & Backwaren',
    filename: 'grains_pasta.webp',
    threeIngredients: 'Pasta, Reis, Sauerteigbrot',
    prompt:
      'Neat harmonious trio cluster of pantry grains and bakery staples: raw golden durum semolina pasta shapes, a neat compact mound of raw white rice grains, and a rustic slice of crusty artisan sourdough bread, placed together in the center, isolated on pure solid white background, 45-degree three-quarter perspective view, generous 20% white padding on all sides, complete objects fully contained in frame without edge clipping, professional commercial culinary studio lighting, soft symmetrical fill light, crisp sharp focus, golden toasted and durum textures, subtle soft natural contact shadow underneath, no harsh dark cast shadows, not cropped, no text, no watermark',
  },
  {
    id: 'OILS_CONDIMENTS',
    nameDe: 'Öle, Saucen & Dressings',
    filename: 'oils_condiments.webp',
    threeIngredients: 'Olivenöl, Tomatensauce/Dip, Balsamico',
    prompt:
      'Neat harmonious trio cluster of exactly three gourmet culinary condiment items: one minimalist clear cylindrical glass cruet bottle of glowing golden olive oil with cork stopper, one small minimalist matte-white ceramic dipping bowl filled with glossy red sauce in the center, and one small dark glass bottle of balsamic vinegar, placed together, isolated on pure solid white background, 45-degree three-quarter perspective view, generous 20% white padding on all sides, complete objects fully contained in frame without edge clipping, professional commercial culinary studio lighting, soft symmetrical fill light, crisp sharp focus, glowing translucent oil and glossy sauce, subtle soft natural contact shadow underneath, no harsh dark cast shadows, not cropped, no text, no watermark',
  },
  {
    id: 'SPICES_HERBS',
    nameDe: 'Gewürze & Kräuter',
    filename: 'spices_herbs.webp',
    threeIngredients: 'Paprikapulver, Pfefferkörner/Salz, Basilikum',
    prompt:
      'Neat harmonious trio cluster of aromatic kitchen seasonings: a tiny minimalist shallow white porcelain pinch bowl filled with vibrant red paprika spice powder, a small neat mound of whole black peppercorns and coarse sea salt crystals, and a fresh crisp green basil sprig with aromatic leaves, placed together in the center, isolated on pure solid white background, 45-degree three-quarter perspective view, generous 20% white padding on all sides, complete objects fully contained in frame without edge clipping, professional commercial culinary studio lighting, soft symmetrical fill light, crisp sharp focus, rich deep red spice and dewy green leaves, subtle soft natural contact shadow underneath, no harsh dark cast shadows, not cropped, no text, no watermark',
  },
  {
    id: 'NUTS_SEEDS',
    nameDe: 'Nüsse & Samen',
    filename: 'nuts_seeds.webp',
    threeIngredients: 'Walnuss, Mandel, Kürbiskerne',
    prompt:
      'Neat harmonious trio cluster of raw gourmet nuts and seeds: two whole natural walnut halves showing distinct authentic walnut kernel ridges, a neat cluster of whole smooth raw golden almonds, and a neat compact mound of green pumpkin seeds, grouped together in the center, isolated on pure solid white background, 45-degree three-quarter perspective view, generous 20% white padding on all sides, complete objects fully contained in frame without edge clipping, professional commercial culinary studio lighting, soft symmetrical fill light, crisp sharp focus, warm earthy organic nut textures and natural colors, subtle soft natural contact shadow underneath, no harsh dark cast shadows, not cropped, no text, no watermark',
  },
  {
    id: 'SWEETS_SNACKS',
    nameDe: 'Süßes & Snacks',
    filename: 'sweets_snacks.webp',
    threeIngredients: 'Dunkle Schokolade, Honig, Keks',
    prompt:
      'Neat harmonious trio cluster of sweet culinary treats: a neat rectangular block of rich dark chocolate bars with snap grooves, a small minimalist clear glass jar of glowing golden honey, and one crisp round baked artisan cookie, tightly grouped together in the center, isolated on pure solid white background, 45-degree three-quarter perspective view, generous 20% white padding on all sides, complete objects fully contained in frame without edge clipping, professional commercial culinary studio lighting, soft symmetrical fill light, crisp sharp focus, rich dark cocoa and golden amber tones, subtle soft natural contact shadow underneath, no harsh dark cast shadows, not cropped, no text, no watermark',
  },
  {
    id: 'BEVERAGES',
    nameDe: 'Getränke',
    filename: 'beverages.webp',
    threeIngredients: 'Eiswasser, Kaffeetasse, Orangenscheibe',
    prompt:
      'Neat harmonious trio cluster of beverage favorites: a crystal-clear straight glass tumbler filled with chilled sparkling water and clean ice cubes, a small minimalist white ceramic espresso cup with rich dark coffee, and a fresh round orange citrus wheel slice, neatly grouped together in the center, isolated on pure solid white background, 45-degree three-quarter perspective view, generous 20% white padding on all sides, complete objects fully contained in frame without edge clipping, professional commercial culinary studio lighting, soft symmetrical fill light, crisp sharp focus, sparkling liquid reflections and rich coffee tones, subtle soft natural contact shadow underneath, no harsh dark cast shadows, not cropped, no text, no watermark',
  },
  {
    id: 'PANTRY_BAKING',
    nameDe: 'Backen & Vorrat',
    filename: 'pantry_baking.webp',
    threeIngredients: 'Mehl, Backpulver, Hefe',
    prompt:
      'Neat harmonious trio cluster of essential home baking ingredients: a neat compact mound of silky white wheat flour, a tiny minimalist white porcelain pinch bowl of baking powder, and a fresh compact block of baker\'s yeast, placed together in the center, isolated on pure solid white background, 45-degree three-quarter perspective view, generous 20% white padding on all sides, complete objects fully contained in frame without edge clipping, professional commercial culinary studio lighting, soft symmetrical fill light, crisp sharp focus, pure powdery textures, subtle soft natural contact shadow underneath, no harsh dark cast shadows, not cropped, no text, no watermark',
  },
  {
    id: 'PREPARED_DISHES',
    nameDe: 'Fertiggerichte & Snacks',
    filename: 'prepared_dishes.webp',
    threeIngredients: 'Pizza-Stück, Wrap, Suppenschale',
    prompt:
      'Neat harmonious trio cluster of prepared meal favorites: a small triangular slice of artisan cheese pizza, a freshly folded tortilla wrap half showing delicious colorful filling, and a small minimalist white ceramic bowl of soup, placed together in the center, isolated on pure solid white background, 45-degree three-quarter perspective view, generous 20% white padding on all sides, complete objects fully contained in frame without edge clipping, professional commercial culinary studio lighting, soft symmetrical fill light, crisp sharp focus, appetizing golden-brown crusts and fresh fillings, subtle soft natural contact shadow underneath, no harsh dark cast shadows, not cropped, no text, no watermark',
  },
  {
    id: 'FROZEN',
    nameDe: 'Tiefkühlware',
    filename: 'frozen.webp',
    threeIngredients: 'Stieleis, TK-Beeren, TK-Erbsen',
    prompt:
      'Neat harmonious trio cluster of frozen food favorites: a colorful fruit ice cream popsicle on a natural wooden stick, a neat cluster of frosty frozen mixed berries with glistening delicate ice crystals, and a small cluster of bright green frozen peas, grouped together in the center, isolated on pure solid white background, 45-degree three-quarter perspective view, generous 20% white padding on all sides, complete objects fully contained in frame without edge clipping, professional commercial culinary studio lighting, soft symmetrical fill light, crisp sharp focus, cold frosty textures and vibrant colorful freshness, subtle soft natural contact shadow underneath, no harsh dark cast shadows, not cropped, no text, no watermark',
  },
  {
    id: 'OTHER',
    nameDe: 'Allgemein / Sonstiges',
    filename: 'other.webp',
    threeIngredients: 'Apfel, Olivenöl, Basilikum',
    prompt:
      'Neat harmonious signature trio cluster of universal cooking ingredients: a crisp fresh red apple with stem, a minimalist clear glass cruet bottle of glowing golden olive oil with cork stopper, and a fresh vibrant green basil sprig with aromatic leaves, placed together in the center, isolated on pure solid white background, 45-degree three-quarter perspective view, generous 20% white padding on all sides, complete objects fully contained in frame without edge clipping, professional commercial culinary studio lighting, soft symmetrical fill light, crisp sharp focus, farm-fresh vibrancy and radiant colors, subtle soft natural contact shadow underneath, no harsh dark cast shadows, not cropped, no text, no watermark',
  },
];

async function generateSingleCategory(def: CategoryIconDefinition, backendDir: string, frontendDir: string) {
  console.log(`\n🎨 [${def.id}] Generating 3-ingredient fallback icon: ${def.nameDe} (${def.threeIngredients})...`);
  const startTime = Date.now();

  const rawJpeg = await fetchFluxImageBuffer(def.prompt, 'square_hd', 4);
  const webpBuffer = await sharp(rawJpeg)
    .resize(512, 512, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .webp({ quality: 90, effort: 6 })
    .toBuffer();

  const backendTarget = path.join(backendDir, def.filename);
  const frontendTarget = path.join(frontendDir, def.filename);

  fs.writeFileSync(backendTarget, webpBuffer);
  fs.writeFileSync(frontendTarget, webpBuffer);
  console.log(`   ✅ Saved ${def.filename} (${(webpBuffer.length / 1024).toFixed(1)} KB) in ${(Date.now() - startTime)}ms`);
}

async function main() {
  console.log('====================================================');
  console.log('🌟 Category Fallback Icon Generator (3 Ingredients Trio)');
  console.log('====================================================');

  const cwd = process.cwd();
  const rootDir = path.basename(cwd).toLowerCase() === 'backend' ? path.resolve(cwd, '..') : cwd;
  const backendDir = path.resolve(rootDir, 'backend', 'public', 'category-icons');
  const frontendDir = path.resolve(rootDir, 'frontend', 'public', 'category-icons');

  fs.mkdirSync(backendDir, { recursive: true });
  fs.mkdirSync(frontendDir, { recursive: true });

  const targetCategory = process.argv[2]?.toUpperCase();
  const defs = targetCategory
    ? CATEGORY_DEFINITIONS.filter(d => d.id === targetCategory || d.filename.toLowerCase().includes(targetCategory.toLowerCase()))
    : CATEGORY_DEFINITIONS;

  if (defs.length === 0) {
    console.error(`❌ No category matched for "${process.argv[2]}". Available: ${CATEGORY_DEFINITIONS.map(d => d.id).join(', ')}`);
    process.exit(1);
  }

  console.log(`🚀 Processing ${defs.length} category icons via FLUX.1 [schnell]...`);

  for (let i = 0; i < defs.length; i++) {
    const def = defs[i];
    try {
      console.log(`\n[${i + 1}/${defs.length}]`);
      await generateSingleCategory(def, backendDir, frontendDir);
    } catch (err: any) {
      console.error(`❌ Failed generating ${def.id}:`, err.message);
    }
  }

  console.log('\n====================================================');
  console.log('✨ All Category Fallback Icons successfully generated!');
  console.log('====================================================\n');
}

main().catch(err => {
  console.error('Fatal generator error:', err);
  process.exit(1);
});
