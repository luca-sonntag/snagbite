import fs from 'fs';
import path from 'path';

interface RawFoodItem {
  id: string;
  name_en: string;
  name_de: string;
  category_en: string;
  category_de: string;
  density?: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  aliases: string[];
}

function parseNumber(val?: string): number {
  if (!val) return 0;
  const clean = val.trim().replace(',', '.');
  if (clean === 'n.d.' || clean === 'k.A.' || clean === '-' || clean === 'tr.') return 0;
  if (clean.startsWith('<')) {
    const num = parseFloat(clean.substring(1));
    return isNaN(num) ? 0 : num;
  }
  const num = parseFloat(clean);
  return isNaN(num) ? 0 : Math.round(num * 10) / 10;
}

/**
 * Splits a CSV line taking into account quoted fields with embedded semicolons.
 */
function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ';' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

function mapCategory(catDe: string, catEn: string): string {
  const c = (catDe + ' ' + catEn).toLowerCase();
  if (c.includes('gemüse') || c.includes('vegetable') || c.includes('früchte') || c.includes('fruit') || c.includes('salat') || c.includes('obst') || c.includes('pilze') || c.includes('mushroom')) {
    return 'PRODUCE';
  }
  if (c.includes('fleisch') || c.includes('meat') || c.includes('geflügel') || c.includes('poultry') || c.includes('wurst') || c.includes('sausage')) {
    return 'MEAT_POULTRY';
  }
  if (c.includes('fisch') || c.includes('fish') || c.includes('seafood') || c.includes('meeresfrüchte') || c.includes('crustaceans')) {
    return 'SEAFOOD';
  }
  if (c.includes('milch') || c.includes('dairy') || c.includes('käse') || c.includes('cheese') || c.includes('eier') || c.includes('egg') || c.includes('joghurt') || c.includes('quark')) {
    return 'DAIRY_EGGS';
  }
  if (c.includes('getreide') || c.includes('cereal') || c.includes('pasta') || c.includes('teigwaren') || c.includes('reis') || c.includes('rice') || c.includes('kartoffel') || c.includes('potato') || c.includes('hülsenfrüchte') || c.includes('pulse')) {
    return 'GRAINS_PASTA';
  }
  if (c.includes('brot') || c.includes('bread') || c.includes('backwaren') || c.includes('bakery') || c.includes('biscuit') || c.includes('keks')) {
    return 'BAKERY';
  }
  if (c.includes('öle') || c.includes('oil') || c.includes('fett') || c.includes('sauce') || c.includes('essig') || c.includes('vinegar') || c.includes('senf') || c.includes('mustard')) {
    return 'CONDIMENTS_OILS';
  }
  if (c.includes('gewürz') || c.includes('spice') || c.includes('herb') || c.includes('kraut') || c.includes('salz') || c.includes('salt')) {
    return 'SPICES_HERBS';
  }
  if (c.includes('mehl') || c.includes('flour') || c.includes('zucker') || c.includes('sugar') || c.includes('hefe') || c.includes('yeast') || c.includes('backen') || c.includes('baking')) {
    return 'BAKING';
  }
  if (c.includes('getränk') || c.includes('beverage') || c.includes('drink') || c.includes('saft') || c.includes('juice')) {
    return 'BEVERAGES';
  }
  if (c.includes('nüsse') || c.includes('nut') || c.includes('samen') || c.includes('seed') || c.includes('ölsaat')) {
    return 'PANTRY';
  }
  return 'PANTRY';
}

function cleanAlias(text: string): string {
  return text
    .toLowerCase()
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[()[\]{},;:"'!?]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}



const STANDARD_UNIT_WEIGHTS_BY_KEYWORD: Record<string, { piece?: number; clove?: number; tablespoon?: number; teaspoon?: number; cup?: number; pinch?: number; slice?: number; can?: number; bunch?: number }> = {
  egg: { piece: 55, tablespoon: 15 },
  ei: { piece: 55, tablespoon: 15 },
  garlic: { clove: 4, piece: 35, teaspoon: 3, tablespoon: 10 },
  knoblauch: { clove: 4, piece: 35, teaspoon: 3, tablespoon: 10 },
  onion: { piece: 110, tablespoon: 15, teaspoon: 5, cup: 160 },
  zwiebel: { piece: 110, tablespoon: 15, teaspoon: 5, cup: 160 },
  potato: { piece: 150, cup: 150 },
  kartoffel: { piece: 150, cup: 150 },
  carrot: { piece: 100, cup: 130 },
  karotte: { piece: 100, cup: 130 },
  moehre: { piece: 100, cup: 130 },
  tomato: { piece: 120, cup: 180, slice: 25 },
  tomate: { piece: 120, cup: 180, slice: 25 },
  apple: { piece: 180 },
  apfel: { piece: 180 },
  banana: { piece: 120 },
  banane: { piece: 120 },
  lemon: { piece: 100, tablespoon: 15, teaspoon: 5 },
  zitrone: { piece: 100, tablespoon: 15, teaspoon: 5 },
  lime: { piece: 60, tablespoon: 15, teaspoon: 5 },
  limette: { piece: 60, tablespoon: 15, teaspoon: 5 },
  orange: { piece: 150, tablespoon: 15 },
  avocado: { piece: 170, tablespoon: 15 },
  cucumber: { piece: 350, cup: 130, slice: 10 },
  gurke: { piece: 350, cup: 130, slice: 10 },
  zucchini: { piece: 200, cup: 130 },
  pepper: { piece: 160, cup: 150 },
  paprika: { piece: 160, cup: 150 },
  butter: { tablespoon: 14, teaspoon: 5, piece: 250 },
  oil: { tablespoon: 14, teaspoon: 5 },
  oel: { tablespoon: 14, teaspoon: 5 },
  öl: { tablespoon: 14, teaspoon: 5 },
  sugar: { tablespoon: 15, teaspoon: 5, cup: 200 },
  zucker: { tablespoon: 15, teaspoon: 5, cup: 200 },
  flour: { tablespoon: 12, teaspoon: 4, cup: 120 },
  mehl: { tablespoon: 12, teaspoon: 4, cup: 120 },
  milk: { cup: 240, tablespoon: 15, teaspoon: 5 },
  milch: { cup: 240, tablespoon: 15, teaspoon: 5 },
  cream: { cup: 240, tablespoon: 15, teaspoon: 5 },
  sahne: { cup: 240, tablespoon: 15, teaspoon: 5 },
  quark: { tablespoon: 20, cup: 250, piece: 250 },
  yogurt: { tablespoon: 18, cup: 200 },
  joghurt: { tablespoon: 18, cup: 200 },
  cheese: { slice: 25, tablespoon: 10, cup: 115 },
  kaese: { slice: 25, tablespoon: 10, cup: 115 },
  käse: { slice: 25, tablespoon: 10, cup: 115 },
  bread: { slice: 40, piece: 50 },
  brot: { slice: 40, piece: 50 },
  salt: { pinch: 0.5, teaspoon: 5, tablespoon: 15 },
  salz: { pinch: 0.5, teaspoon: 5, tablespoon: 15 },
  pfeffer: { pinch: 0.3, teaspoon: 3, tablespoon: 8 },
  mustard: { tablespoon: 15, teaspoon: 5 },
  senf: { tablespoon: 15, teaspoon: 5 },
  honey: { tablespoon: 21, teaspoon: 7 },
  honig: { tablespoon: 21, teaspoon: 7 },
  pasta: { cup: 100 },
  nudeln: { cup: 100 },
  rice: { cup: 185, tablespoon: 15 },
  reis: { cup: 185, tablespoon: 15 },
  oats: { cup: 90, tablespoon: 10 },
  haferflocken: { cup: 90, tablespoon: 10 },
};

function getStandardUnits(nameEn: string, nameDe: string): any {
  const combined = (nameEn + ' ' + nameDe).toLowerCase();
  for (const [kw, units] of Object.entries(STANDARD_UNIT_WEIGHTS_BY_KEYWORD)) {
    const regex = new RegExp(`\\b${kw}\\b`, 'i');
    if (regex.test(combined)) {
      return units;
    }
  }
  return undefined;
}

function generateAliases(nameEn: string, nameDe: string, synEn?: string, synDe?: string): string[] {
  const aliases = new Set<string>();

  const add = (t?: string) => {
    if (!t) return;
    const cleaned = cleanAlias(t);
    if (cleaned.length >= 2) aliases.add(cleaned);

    const parts = t.split(',').map(p => cleanAlias(p)).filter(p => p.length >= 2);
    if (parts.length > 1) {
      // Add first part (main noun): "Butter, gesalzen" -> "butter", "Poulet, Brust" -> "poulet"
      aliases.add(parts[0]);
      // Add first two parts: "Poulet, Brust, roh" -> "poulet brust"
      if (parts.length >= 2) {
        aliases.add(`${parts[0]} ${parts[1]}`);
      }
    }
  };

  add(nameEn);
  add(nameDe);

  if (synEn) {
    synEn.split(/[;,]/).forEach(s => add(s));
  }
  if (synDe) {
    synDe.split(/[;,]/).forEach(s => add(s));
  }

  const combined = (nameEn + ' ' + nameDe).toLowerCase();

  // Natural culinary variations
  if (combined.includes('poulet') && combined.includes('brust')) {
    add('hähnchenbrust');
    add('haehnchenbrust');
    add('hühnerbrust');
    add('chicken breast');
    add('pouletbrust');
    add('hähnchenbrustfilet');
  }
  if (combined.includes('quark') && (combined.includes('mager') || combined.includes('lean') || combined.includes('0.2%') || combined.includes('low fat'))) {
    add('magerquark');
    add('speisequark mager');
    add('speisequark');
    add('topfen');
    add('magerstufe');
  }
  if (combined.includes('haferflocken') || combined.includes('oat flakes')) {
    add('haferflocken');
    add('oats');
    add('rolled oats');
    add('oatmeal');
  }
  if (combined.includes('knoblauch') || combined.includes('garlic')) {
    add('knoblauch');
    add('knoblauchzehe');
    add('knoblauchzehen');
    add('garlic');
    add('garlic clove');
  }
  if (combined.includes('zwiebel') || combined.includes('onion')) {
    add('zwiebel');
    add('zwiebeln');
    add('onion');
    add('onions');
  }
  if (combined.includes('hühnerei') || (combined.includes('egg') && combined.includes('whole'))) {
    add('ei');
    add('eier');
    add('egg');
    add('eggs');
    add('hühnerei');
  }
  if (combined.includes('olivenöl') || combined.includes('olive oil')) {
    add('olivenöl');
    add('olivenoel');
    add('olive oil');
  }
  if (nameDe.startsWith('Butter,') || nameEn.startsWith('Butter,')) {
    add('butter');
  }

  return Array.from(aliases);
}

function createCanonicalSlug(nameEn: string, id: string): string {
  const slug = nameEn
    .toLowerCase()
    .replace(/\([^)]*\)/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return slug || `item_${id}`;
}

async function main() {
  const enCsvPath = path.resolve('backend/src/data/swiss_food_composition.csv');
  const deCsvPath = path.resolve('backend/src/data/swiss_food_composition_de.csv');
  const outputPath = path.resolve('backend/src/data/canonicalIngredientsData.json');
  const tsOutputPath = path.resolve('backend/src/data/canonicalIngredients.ts');

  console.log('Reading Swiss Food Composition CSVs...');
  const enLines = fs.readFileSync(enCsvPath, 'utf-8').split(/\r?\n/).filter(l => l.trim().length > 0);
  const deLines = fs.readFileSync(deCsvPath, 'utf-8').split(/\r?\n/).filter(l => l.trim().length > 0);

  // Map German rows by ID
  const deMap = new Map<string, { name: string; synonyms: string; category: string }>();
  for (let i = 3; i < deLines.length; i++) {
    const cols = parseCsvLine(deLines[i]);
    const id = cols[0];
    if (id) {
      deMap.set(id, {
        name: cols[3] || '',
        synonyms: cols[4] || '',
        category: cols[5] || '',
      });
    }
  }

  const items: any[] = [];
  const seenIds = new Set<string>();

  for (let i = 3; i < enLines.length; i++) {
    const cols = parseCsvLine(enLines[i]);
    const id = cols[0];
    if (!id || seenIds.has(id)) continue;
    seenIds.add(id);

    const nameEn = cols[3] || '';
    const synEn = cols[4] || '';
    const catEn = cols[5] || '';
    const density = parseNumber(cols[6]);
    const kcal = Math.round(parseNumber(cols[11]));
    const fat = parseNumber(cols[14]);
    const carbs = parseNumber(cols[41]);
    const fiber = parseNumber(cols[50]);
    const protein = parseNumber(cols[53]);

    const deData = deMap.get(id);
    const nameDe = deData?.name || nameEn;
    const synDe = deData?.synonyms || '';
    const catDe = deData?.category || '';

    const category = mapCategory(catDe, catEn);
    const aliases = generateAliases(nameEn, nameDe, synEn, synDe);
    const canonicalKey = createCanonicalSlug(nameEn, id);

    const standardUnits = getStandardUnits(nameEn, nameDe);

    items.push({
      id: canonicalKey,
      swiss_id: id,
      name_en: nameEn,
      name_de: nameDe,
      category,
      density: density > 0 ? density : undefined,
      nutrients_per_100g: {
        calories: kcal,
        protein,
        carbs,
        fat,
        fiber: fiber > 0 ? fiber : undefined,
      },
      standard_units: standardUnits,
      aliases,
    });
  }

  console.log(`Parsed and merged ${items.length} canonical food items!`);

  // Write JSON artifact
  fs.writeFileSync(outputPath, JSON.stringify(items, null, 2), 'utf-8');
  console.log(`Saved JSON to: ${outputPath}`);

  // Write TS file
  const tsContent = `// Auto-generated bilingual food database from Swiss Food Composition Database V7.1 (Generic Foods)
// Contains ${items.length} laboratory-tested generic base ingredients with EN/DE names, nutrients per 100g and aliases.

export interface CanonicalIngredient {
  id: string;
  swiss_id?: string;
  name_en: string;
  name_de: string;
  category:
    | 'PRODUCE'
    | 'MEAT_POULTRY'
    | 'SEAFOOD'
    | 'DAIRY_EGGS'
    | 'PANTRY'
    | 'GRAINS_PASTA'
    | 'SPICES_HERBS'
    | 'BAKING'
    | 'CONDIMENTS_OILS'
    | 'FROZEN'
    | 'BEVERAGES'
    | 'BAKERY'
    | 'OTHER';
  density?: number;
  nutrients_per_100g: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber?: number;
  };
  standard_units?: {
    piece?: number;
    tablespoon?: number;
    teaspoon?: number;
    cup?: number;
    clove?: number;
    pinch?: number;
    slice?: number;
    can?: number;
    bunch?: number;
  };
  aliases: string[];
}

export const CANONICAL_INGREDIENTS: CanonicalIngredient[] = ${JSON.stringify(items, null, 2)};
`;

  fs.writeFileSync(tsOutputPath, tsContent, 'utf-8');
  console.log(`Saved TS module to: ${tsOutputPath}`);
}

main().catch(console.error);
