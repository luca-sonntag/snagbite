import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface CanonicalNutrients {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
}

export interface CanonicalIngredient {
  id: string;
  bls_code: string;
  name_en: string;
  name_de: string;
  category: string;
  nutrients_per_100g: CanonicalNutrients;
  standard_units?: Record<string, number>;
  aliases: string[];
}

function parseCSVLine(text: string): string[] {
  const result: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (inQuotes && text[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === ',' && !inQuotes) {
      result.push(cur.trim());
      cur = '';
    } else {
      cur += c;
    }
  }
  result.push(cur.trim());
  return result;
}

function parseGermanNumber(val: string | undefined): number {
  if (!val || val === '-' || val === '') return 0;
  const cleaned = val.replace(',', '.').replace(/[^0-9.]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : Math.round(num * 10) / 10;
}

function mapBLSToCategory(code: string, nameDe: string): string {
  const p1 = code.charAt(0);
  const p2 = code.substring(0, 2);
  const lower = nameDe.toLowerCase();

  // Specific overrides based on keywords
  if (lower.includes('konserve') || lower.includes('dose')) return 'CANNED_PRESERVED';
  if (lower.includes('tiefkühl') || lower.includes('tiefgefroren') || lower.includes(' gefrostet')) return 'FROZEN';
  if (lower.includes('mehl') || lower.includes('stärke') || lower.includes('backpulver') || lower.includes('hefe')) return 'BAKING_COOKING';

  switch (p1) {
    case 'B': return 'BREAD_BAKERY';
    case 'C':
      if (lower.includes('mehl') || lower.includes('stärke') || lower.includes('grieß')) return 'BAKING_COOKING';
      return 'GRAINS_PASTA';
    case 'D': return 'SWEETS_SNACKS';
    case 'E':
      if (code.startsWith('E1')) return 'DAIRY'; // Eier, Eigelb, Eiklar
      return 'GRAINS_PASTA'; // Teigwaren / Nudeln
    case 'F': return 'FRUITS_VEGETABLES';
    case 'G': return 'FRUITS_VEGETABLES';
    case 'H':
      if (lower.includes('tofu') || lower.includes('tempeh')) return 'REFRIGERATED_CONVENIENCE';
      if (lower.includes('nuss') || lower.includes('mandel') || lower.includes('erdnuss') || lower.includes('cashew') || lower.includes('pistazie')) return 'SWEETS_SNACKS';
      return 'GRAINS_PASTA'; // Hülsenfrüchte / Bohnen / Linsen / Samen
    case 'K':
      if (lower.includes('stärke') || lower.includes('mehl') || lower.includes('pulver')) return 'BAKING_COOKING';
      return 'FRUITS_VEGETABLES';
    case 'M': return 'DAIRY';
    case 'N': return 'BEVERAGES';
    case 'P': return 'BEVERAGES';
    case 'Q':
      if (lower.includes('butter') || lower.includes('schmalz')) return 'DAIRY';
      return 'SPICES_OILS';
    case 'R':
      if (lower.includes('torte') || lower.includes('creme') || lower.includes('guss') || lower.includes('pudding')) return 'SWEETS_SNACKS';
      if (lower.includes('soße') || lower.includes('sauce')) return 'READY_MEALS';
      if (lower.includes('backhefe') || lower.includes('backpulver') || lower.includes('vanille') || lower.includes('puddingpulver')) return 'BAKING_COOKING';
      return 'SPICES_OILS';
    case 'S':
      if (lower.includes('zucker') || lower.includes('sirup') || lower.includes('honig') || lower.includes('kuvertüre') || lower.includes('kakao')) return 'BAKING_COOKING';
      return 'SWEETS_SNACKS';
    case 'T':
    case 'U':
    case 'V':
    case 'W': return 'MEAT_FISH';
    case 'X':
    case 'Y':
      if (lower.includes('sauce') || lower.includes('soße') || lower.includes('pesto') || lower.includes('dressing')) return 'SPICES_OILS';
      if (lower.includes('teig') && (lower.includes('blätterteig') || lower.includes('pizzateig') || lower.includes('flammkuchenteig'))) return 'REFRIGERATED_CONVENIENCE';
      return 'READY_MEALS';
    default: return 'OTHER';
  }
}

function cleanText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[,\(\)\[\]"']/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function generateAliases(nameDe: string, nameEn: string, code: string, category?: string): string[] {
  const aliases = new Set<string>();

  const addAlias = (str: string) => {
    const cleaned = cleanText(str);
    if (cleaned.length >= 2) {
      aliases.add(cleaned);
      // Also add without spaces if multiple tokens (e.g. "hafer flocken" -> "haferflocken")
      const noSpaces = cleaned.replace(/\s+/g, '');
      if (noSpaces.length >= 3 && noSpaces !== cleaned) {
        aliases.add(noSpaces);
      }
    }
  };

  // Add base raw names
  addAlias(nameDe);
  if (nameEn) addAlias(nameEn);

  // Split on "/" (common in BLS: e.g. "Wiener Würstchen/Frankfurter")
  const deParts = nameDe.split('/');
  for (const part of deParts) {
    addAlias(part);
  }

  // Remove common administrative BLS suffixes and qualifiers (only for base foods)
  const lowerDe = nameDe.toLowerCase();
  const isCompositeMeal = code.startsWith('X') || code.startsWith('Y') || category === 'READY_MEALS';

  if (!isCompositeMeal) {
    const strippedDe = nameDe
      .replace(/mind\.\s*\d+\s*%\s*Fett\s*i\.\s*Tr\./gi, '')
      .replace(/max\.\s*\d+\s*%\s*Fett\s*i\.\s*Tr\./gi, '')
      .replace(/\d+\s*%\s*Fett\s*i\.\s*Tr\./gi, '')
      .replace(/\b(ohne Schwartenzug|ohne Haut|mit Haut|ohne Knochen|mit Knochen)\b/gi, '')
      .replace(/\b(roh|gekocht|gebraten|gedünstet|gebacken|frittiert|getrocknet|konserve|tiefgekühlt)\b/gi, '')
      .replace(/\([^\)]*\)/g, '')
      .trim();

    addAlias(strippedDe);

    if (lowerDe.includes('trinkwasser') || lowerDe.includes('mineralwasser') || code === 'N111000') {
      aliases.add('wasser');
      aliases.add('trinkwasser');
      aliases.add('water');
    }
    if (lowerDe.includes('zitronensaft') || (lowerDe.includes('zitrone') && lowerDe.includes('saft'))) {
      aliases.add('zitronensaft');
      aliases.add('lemon juice');
    }
    if (lowerDe.includes('speisesalz') || lowerDe.includes('siedesalz')) {
      aliases.add('salz');
      aliases.add('speisesalz');
      aliases.add('meersalz');
      aliases.add('jodsalz');
      aliases.add('salt');
    }
    if (lowerDe.includes('schwarzer pfeffer') || code === 'R131000') {
      aliases.add('pfeffer');
      aliases.add('schwarzer pfeffer');
      aliases.add('pfeffer schwarz');
      aliases.add('pepper');
    }
    if (lowerDe.includes('hühnervollei') || (lowerDe.includes('hühnerei') && !lowerDe.includes('eigelb') && !lowerDe.includes('eiweiß'))) {
      aliases.add('ei');
      aliases.add('eier');
      aliases.add('hühnerei');
      aliases.add('egg');
      aliases.add('eggs');
    }
    if (lowerDe.includes('hühnereigelb') || lowerDe.includes('eigelb')) {
      aliases.add('eigelb');
      aliases.add('egg yolk');
    }
    if (lowerDe.includes('hühnereiweiß') || lowerDe.includes('eiklar') || lowerDe.includes('eiweiß')) {
      aliases.add('eiweiß');
      aliases.add('eiklar');
      aliases.add('egg white');
    }
    if (lowerDe.includes('kakaopulver') || (lowerDe.includes('kakao') && code.startsWith('S211'))) {
      aliases.add('backkakao');
      aliases.add('kakaopulver');
      aliases.add('kakao');
      aliases.add('cocoa powder');
    }
    if (lowerDe.includes('tomate') && code.startsWith('G501')) {
      aliases.add('tomate');
      aliases.add('tomaten');
      aliases.add('kirschtomaten');
      aliases.add('cocktailtomaten');
      aliases.add('cherrytomaten');
    }
    if (lowerDe.includes('speisequark') && lowerDe.includes('mager')) {
      aliases.add('magerquark');
      aliases.add('quark mager');
      aliases.add('speisequark mager');
    }
    if (lowerDe.includes('hähnchen') && (lowerDe.includes('brust') || lowerDe.includes('filet'))) {
      aliases.add('hähnchenbrustfilet');
      aliases.add('hähnchenbrust');
      aliases.add('hühnerbrust');
      aliases.add('hühnerbrustfilet');
    }
    if (lowerDe.includes('rind') && lowerDe.includes('hackfleisch')) {
      aliases.add('rinderhackfleisch');
      aliases.add('rinderhack');
    }
    if (lowerDe.includes('speisezwiebel') || (lowerDe.includes('zwiebel') && code.startsWith('G480'))) {
      aliases.add('zwiebel');
      aliases.add('zwiebeln');
      aliases.add('rote zwiebel');
      aliases.add('onion');
      aliases.add('onions');
    }
    if (lowerDe.includes('knoblauch') && code.startsWith('K111')) {
      aliases.add('knoblauch');
      aliases.add('knoblauchzehe');
      aliases.add('knoblauchzehen');
      aliases.add('garlic');
    }
    if (lowerDe.includes('butter') && (code.startsWith('Q651') || lowerDe.includes('markenbutter') || lowerDe === 'butter')) {
      aliases.add('butter');
    }
    if (lowerDe.includes('dinkel') && lowerDe.includes('mehl')) {
      aliases.add('dinkelmehl');
      aliases.add('dinkel mehl');
      aliases.add('spelt flour');
    }
    if (lowerDe.includes('weizen') && lowerDe.includes('mehl') && code.startsWith('C211')) {
      aliases.add('mehl');
      aliases.add('weizenmehl');
      aliases.add('wheat flour');
      aliases.add('flour');
    }
    if (lowerDe.includes('paprikapulver') || (lowerDe.includes('paprika') && code.startsWith('R211'))) {
      aliases.add('paprikapulver');
      aliases.add('paprikapulver edelsüß');
      aliases.add('paprika edelsüß');
      aliases.add('paprika powder');
    }
    if (lowerDe.includes('cayennepfeffer') || code === 'R213100' || (lowerDe.includes('chili') && lowerDe.includes('pulver'))) {
      aliases.add('cayennepfeffer');
      aliases.add('chilipulver');
      aliases.add('cayenne pepper');
    }
    if ((lowerDe.includes('schlagsahne') || lowerDe.includes('sahne')) && code.startsWith('M173')) {
      aliases.add('sahne');
      aliases.add('schlagsahne');
      aliases.add('heavy cream');
      aliases.add('cream');
    }
    if (lowerDe.includes('mozzarella') && code.startsWith('M032')) {
      aliases.add('mozzarella');
      aliases.add('mozzarellakugeln');
    }
    if (lowerDe.includes('parmesan') && code.startsWith('M306')) {
      aliases.add('parmesan');
      aliases.add('parmesankäse');
    }
    if (lowerDe.includes('joghurt') && code.startsWith('M210')) {
      aliases.add('joghurt');
      aliases.add('naturjoghurt');
      aliases.add('yogurt');
    }
    if (lowerDe.includes('hafer') && lowerDe.includes('flocken')) {
      aliases.add('haferflocken');
      aliases.add('zarte haferflocken');
      aliases.add('rolled oats');
      aliases.add('oats');
    }
    if ((lowerDe.includes('teigwaren') || lowerDe.includes('pasta') || lowerDe.includes('nudeln')) && code.startsWith('E432')) {
      aliases.add('nudeln');
      aliases.add('pasta');
      aliases.add('bandnudeln');
    }
    if (lowerDe.includes('vollkornteigwaren')) {
      aliases.add('vollkornnudeln');
      aliases.add('vollkornpasta');
      aliases.add('vollkornspaghetti');
    }
    if (lowerDe.includes('olivenöl')) {
      aliases.add('olivenöl');
      aliases.add('natives olivenöl');
      aliases.add('olive oil');
    }
    if (lowerDe.includes('gouda')) {
      aliases.add('gouda');
      aliases.add('gouda gerieben');
    }
    if (lowerDe.includes('kochschinken') && code.startsWith('W424')) {
      aliases.add('kochschinken');
      aliases.add('schinken');
      aliases.add('cooked ham');
      aliases.add('ham');
    }
    if (code === 'G543100' || (code.startsWith('G543') && lowerDe.includes('rot') && lowerDe.includes('roh'))) {
      aliases.add('paprika');
      aliases.add('rote paprika');
      aliases.add('paprikaschote');
      aliases.add('bell pepper');
      aliases.add('red bell pepper');
    }
    if (code === 'G541100' || (code.startsWith('G541') && lowerDe.includes('grün') && lowerDe.includes('roh'))) {
      aliases.add('grüne paprika');
      aliases.add('paprika grün');
      aliases.add('green bell pepper');
    }
    if (code === 'G542100' || (code.startsWith('G542') && lowerDe.includes('gelb') && lowerDe.includes('roh'))) {
      aliases.add('gelbe paprika');
      aliases.add('paprika gelb');
      aliases.add('yellow bell pepper');
    }
  }

  return Array.from(aliases).filter(a => a.length >= 2);
}

function generateStandardUnits(nameDe: string, category: string): Record<string, number> {
  const units: Record<string, number> = {};
  const lower = nameDe.toLowerCase();

  // Volume-to-gram standard conversions
  units.teaspoon = 5;
  units.tablespoon = 15;
  units.pinch = 0.5;

  if (category === 'SPICES_OILS') {
    units.tablespoon = 12;
    units.teaspoon = 4;
  } else if (category === 'FRUITS_VEGETABLES') {
    if (lower.includes('apfel') || lower.includes('birne') || lower.includes('orange')) units.piece = 150;
    else if (lower.includes('banane')) units.piece = 120;
    else if (lower.includes('zwiebel')) units.piece = 80;
    else if (lower.includes('knoblauch')) { units.clove = 3; units.piece = 3; }
    else if (lower.includes('tomate') && !lower.includes('cherry')) units.piece = 100;
    else if (lower.includes('cherry') || lower.includes('kirschtomate')) units.piece = 20;
    else if (lower.includes('zitrone') || lower.includes('limette')) units.piece = 60;
    else if (lower.includes('avocado')) units.piece = 180;
    else if (lower.includes('paprika')) units.piece = 150;
    else if (lower.includes('gurke')) units.piece = 300;
    else units.piece = 100;
  } else if (category === 'DAIRY') {
    if (lower.includes('ei') && (lower.includes('hühnerei') || lower.includes('vollei'))) units.piece = 55;
    else if (lower.includes('becher')) units.cup = 200;
    else if (lower.includes('scheibe')) units.slice = 30;
  } else if (category === 'BREAD_BAKERY') {
    if (lower.includes('toast') || lower.includes('brot')) units.slice = 40;
    else if (lower.includes('brötchen')) units.piece = 60;
    else if (lower.includes('wrap') || lower.includes('tortilla')) units.piece = 65;
  }

  return units;
}

async function build() {
  const csvPath = path.resolve(__dirname, '../data/bls_4_0_daten_2025_de.csv');
  console.log(`Reading BLS 4.0 CSV from: ${csvPath}`);

  if (!fs.existsSync(csvPath)) {
    throw new Error(`BLS CSV file not found at ${csvPath}`);
  }

  const rl = readline.createInterface({
    input: fs.createReadStream(csvPath),
    crlfDelay: Infinity
  });

  let header: string[] | null = null;
  const ingredients: CanonicalIngredient[] = [];
  let rowCount = 0;

  for await (const line of rl) {
    if (!line.trim()) continue;
    if (!header) {
      header = parseCSVLine(line);
      continue;
    }

    const cols = parseCSVLine(line);
    const code = cols[0] || '';
    const nameDe = cols[1] || '';
    const nameEn = cols[2] || '';
    if (!code || !nameDe) continue;

    const kcal = parseGermanNumber(cols[6]);
    const protein = parseGermanNumber(cols[12]);
    const fat = parseGermanNumber(cols[15]);
    const carbs = parseGermanNumber(cols[18]);
    const fiber = parseGermanNumber(cols[21]);

    const category = mapBLSToCategory(code, nameDe);
    const aliases = generateAliases(nameDe, nameEn, code, category);
    const standardUnits = generateStandardUnits(nameDe, category);

    const id = `bls_${code.toLowerCase()}`;

    ingredients.push({
      id,
      bls_code: code,
      name_en: nameEn || nameDe,
      name_de: nameDe,
      category,
      nutrients_per_100g: {
        calories: kcal,
        protein,
        carbs,
        fat,
        fiber
      },
      standard_units: standardUnits,
      aliases
    });

    rowCount++;
  }

  console.log(`Successfully parsed ${ingredients.length} ingredients from BLS 4.0 dataset.`);

  // Write JSON
  const jsonPath = path.resolve(__dirname, '../data/canonicalIngredientsData.json');
  fs.writeFileSync(jsonPath, JSON.stringify(ingredients, null, 2), 'utf-8');
  console.log(`Wrote JSON to: ${jsonPath} (${(fs.statSync(jsonPath).size / 1024 / 1024).toFixed(2)} MB)`);

  // Write TypeScript wrapper
  const tsPath = path.resolve(__dirname, '../data/canonicalIngredients.ts');
  const tsContent = `import canonicalIngredientsData from './canonicalIngredientsData.json' with { type: 'json' };

export interface CanonicalNutrients {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
}

export interface CanonicalIngredient {
  id: string;
  bls_code: string;
  name_en: string;
  name_de: string;
  category: string;
  nutrients_per_100g: CanonicalNutrients;
  standard_units?: Record<string, number>;
  aliases: string[];
}

export const CANONICAL_INGREDIENTS: CanonicalIngredient[] = (canonicalIngredientsData as unknown) as CanonicalIngredient[];
`;

  fs.writeFileSync(tsPath, tsContent, 'utf-8');
  console.log(`Wrote TypeScript data file to: ${tsPath}`);
}

build().catch(err => {
  console.error('Error building BLS ingredients:', err);
  process.exit(1);
});
