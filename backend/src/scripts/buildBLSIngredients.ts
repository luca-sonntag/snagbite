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

    // Produce & Vegetables
    if (lowerDe.includes('speisekartoffel') || (lowerDe.includes('kartoffel') && code.startsWith('K110'))) {
      aliases.add('kartoffel');
      aliases.add('kartoffeln');
      aliases.add('speisekartoffel');
      aliases.add('speisekartoffeln');
      aliases.add('potato');
      aliases.add('potatoes');
    }
    if (lowerDe.includes('süßkartoffel') && code.startsWith('K13')) {
      aliases.add('süßkartoffel');
      aliases.add('süßkartoffeln');
      aliases.add('sweet potato');
    }
    if (lowerDe.includes('gewürzgurke') || lowerDe.includes('essiggurke') || code.startsWith('G5218')) {
      aliases.add('gewürzgurke');
      aliases.add('gewürzgurken');
      aliases.add('essiggurke');
      aliases.add('essiggurken');
      aliases.add('pickles');
      aliases.add('gherkins');
    }
    if (lowerDe.includes('salatgurke') || (lowerDe.includes('gurke') && code.startsWith('G5201'))) {
      aliases.add('gurke');
      aliases.add('gurken');
      aliases.add('salatgurke');
      aliases.add('cucumber');
    }
    if (lowerDe.includes('speisezwiebel') || (lowerDe.includes('zwiebel') && code.startsWith('G480'))) {
      aliases.add('zwiebel');
      aliases.add('zwiebeln');
      aliases.add('rote zwiebel');
      aliases.add('onion');
      aliases.add('onions');
    }
    if (lowerDe.includes('frühlingszwiebel') || lowerDe.includes('lauchzwiebel') || code.startsWith('G482')) {
      aliases.add('frühlingszwiebel');
      aliases.add('frühlingszwiebeln');
      aliases.add('lauchzwiebel');
      aliases.add('lauchzwiebeln');
      aliases.add('frühlingslauch');
      aliases.add('spring onion');
      aliases.add('green onion');
      aliases.add('scallions');
    }
    if (lowerDe.includes('knoblauch') && code.startsWith('K111')) {
      aliases.add('knoblauch');
      aliases.add('knoblauchzehe');
      aliases.add('knoblauchzehen');
      aliases.add('garlic');
      aliases.add('garlic clove');
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
    if (lowerDe.includes('tomate') && code.startsWith('G501')) {
      aliases.add('tomate');
      aliases.add('tomaten');
      aliases.add('cherrytomate');
      aliases.add('cherrytomaten');
      aliases.add('kirschtomaten');
      aliases.add('cocktailtomaten');
      aliases.add('tomato');
      aliases.add('tomatoes');
    }
    if (lowerDe.includes('brokkoli') || lowerDe.includes('broccoli')) {
      aliases.add('brokkoli');
      aliases.add('broccoli');
    }
    if (lowerDe.includes('blumenkohl')) {
      aliases.add('blumenkohl');
      aliases.add('cauliflower');
    }
    if (lowerDe.includes('zucchini')) {
      aliases.add('zucchini');
      aliases.add('courgette');
    }
    if (lowerDe.includes('aubergine')) {
      aliases.add('aubergine');
      aliases.add('eggplant');
    }
    if (lowerDe.includes('möhre') || lowerDe.includes('karotte') || code.startsWith('K211')) {
      aliases.add('karotte');
      aliases.add('karotten');
      aliases.add('möhre');
      aliases.add('möhren');
      aliases.add('carrot');
      aliases.add('carrots');
    }
    if (lowerDe.includes('champignon') || code.startsWith('K711')) {
      aliases.add('champignon');
      aliases.add('champignons');
      aliases.add('pilze');
      aliases.add('mushrooms');
    }
    if (lowerDe.includes('spinat') && code.startsWith('G211')) {
      aliases.add('spinat');
      aliases.add('blattspinat');
      aliases.add('babyspinat');
      aliases.add('spinach');
    }
    if (lowerDe.includes('avocado') && code.startsWith('F501')) {
      aliases.add('avocado');
    }
    if (lowerDe.includes('banane') && code.startsWith('F503')) {
      aliases.add('banane');
      aliases.add('bananen');
      aliases.add('banana');
    }
    if (lowerDe.includes('apfel') && code.startsWith('F111')) {
      aliases.add('apfel');
      aliases.add('äpfel');
      aliases.add('apple');
    }
    if (lowerDe.includes('zitrone') && code.startsWith('F601')) {
      aliases.add('zitrone');
      aliases.add('zitronen');
      aliases.add('lemon');
    }
    if (lowerDe.includes('limette') && code.startsWith('F602')) {
      aliases.add('limette');
      aliases.add('limetten');
      aliases.add('lime');
    }
    if (lowerDe.includes('erdbeere') && code.startsWith('F311')) {
      aliases.add('erdbeere');
      aliases.add('erdbeeren');
      aliases.add('strawberry');
      aliases.add('strawberries');
    }
    if ((lowerDe.includes('heidelbeere') || lowerDe.includes('blaubeere')) && code.startsWith('F312')) {
      aliases.add('heidelbeeren');
      aliases.add('blaubeeren');
      aliases.add('blueberries');
    }
    if (lowerDe.includes('himbeere') && code.startsWith('F313')) {
      aliases.add('himbeeren');
      aliases.add('himbeere');
      aliases.add('raspberries');
    }

    // Dairy & Eggs
    if (lowerDe.includes('kuhmilch') || (lowerDe.includes('vollmilch') && code.startsWith('M111'))) {
      aliases.add('milch');
      aliases.add('kuhmilch');
      aliases.add('vollmilch');
      aliases.add('milk');
    }
    if ((lowerDe.includes('schlagsahne') || lowerDe.includes('sahne')) && code.startsWith('M173')) {
      aliases.add('sahne');
      aliases.add('schlagsahne');
      aliases.add('heavy cream');
      aliases.add('cream');
    }
    if (lowerDe.includes('sauerrahm') || (lowerDe.includes('saure sahne') && code.startsWith('M176'))) {
      aliases.add('saure sahne');
      aliases.add('sauerrahm');
      aliases.add('sour cream');
    }
    if (lowerDe.includes('creme fraiche') || lowerDe.includes('crème fraîche') || lowerDe.includes('schmand')) {
      aliases.add('creme fraiche');
      aliases.add('crème fraîche');
      aliases.add('schmand');
    }
    if (lowerDe.includes('speisequark') && lowerDe.includes('mager')) {
      aliases.add('magerquark');
      aliases.add('quark mager');
      aliases.add('speisequark mager');
    }
    if (lowerDe.includes('skyr') || (lowerDe.includes('frischkäse') && code.startsWith('M710'))) {
      aliases.add('skyr');
      aliases.add('frischkäse');
    }
    if (lowerDe.includes('körniger frischkäse') || lowerDe.includes('hüttenkäse')) {
      aliases.add('hüttenkäse');
      aliases.add('körniger frischkäse');
      aliases.add('cottage cheese');
    }
    if (lowerDe.includes('joghurt') && code.startsWith('M210')) {
      aliases.add('joghurt');
      aliases.add('naturjoghurt');
      aliases.add('yogurt');
    }
    if (lowerDe.includes('butter') && (code.startsWith('Q651') || lowerDe.includes('markenbutter') || lowerDe === 'butter')) {
      aliases.add('butter');
    }
    if (code === 'M402600' || (lowerDe.includes('gouda') && code.startsWith('M402'))) {
      aliases.add('gouda');
      aliases.add('gouda gerieben');
      aliases.add('streukäse');
      aliases.add('geriebener käse');
      aliases.add('käse');
      aliases.add('cheese');
      aliases.add('shredded cheese');
    }
    if (code === 'B783012' || lowerDe.includes('weizentortilla')) {
      aliases.add('weizentortilla');
      aliases.add('tortilla');
      aliases.add('tortilla wrap');
      aliases.add('tortilla wraps');
      aliases.add('wrap');
      aliases.add('wraps');
    }
    if (lowerDe.includes('mozzarella') && code.startsWith('M032')) {
      aliases.add('mozzarella');
      aliases.add('mozzarellakugeln');
    }
    if (lowerDe.includes('parmesan') && code.startsWith('M306')) {
      aliases.add('parmesan');
      aliases.add('parmesankäse');
    }
    if (lowerDe.includes('schafskäse') || lowerDe.includes('feta')) {
      aliases.add('feta');
      aliases.add('schafskäse');
      aliases.add('hirtenkäse');
      aliases.add('feta cheese');
    }
    if (lowerDe.includes('cheddar') || lowerDe.includes('chester')) {
      aliases.add('cheddar');
      aliases.add('cheddarkäse');
      aliases.add('cheddar cheese');
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

    // Meat & Fish
    if (lowerDe.includes('hähnchen') && (lowerDe.includes('brust') || lowerDe.includes('filet'))) {
      aliases.add('hähnchenbrustfilet');
      aliases.add('hähnchenbrust');
      aliases.add('hühnerbrust');
      aliases.add('hühnerbrustfilet');
      aliases.add('chicken breast');
    }
    if (lowerDe.includes('rind') && lowerDe.includes('hackfleisch')) {
      aliases.add('rinderhackfleisch');
      aliases.add('rinderhack');
      aliases.add('hackfleisch rind');
      aliases.add('ground beef');
    }
    if (lowerDe.includes('gemischtes hackfleisch') || (lowerDe.includes('hackfleisch') && lowerDe.includes('gemischt'))) {
      aliases.add('hackfleisch gemischt');
      aliases.add('hackfleisch');
    }
    if (lowerDe.includes('kochschinken') && code.startsWith('W424')) {
      aliases.add('kochschinken');
      aliases.add('schinken');
      aliases.add('cooked ham');
      aliases.add('ham');
    }
    if ((lowerDe.includes('schinkenspeck') || lowerDe.includes('speck')) && code.startsWith('W410')) {
      aliases.add('speck');
      aliases.add('bacon');
      aliases.add('speckwürfel');
      aliases.add('frühstücksspeck');
    }
    if (lowerDe.includes('salami') && code.startsWith('W140')) {
      aliases.add('salami');
      aliases.add('pepperoni');
      aliases.add('mini-pepperoni');
    }
    if (lowerDe.includes('geflügel') && lowerDe.includes('wiener') && code.startsWith('W212')) {
      aliases.add('geflügelwiener');
      aliases.add('geflügelwürstchen');
      aliases.add('wiener würstchen');
    }
    if (lowerDe.includes('thunfisch') && code.startsWith('T121')) {
      aliases.add('thunfisch');
      aliases.add('tuna');
    }
    if (lowerDe.includes('lachs') && code.startsWith('T131')) {
      aliases.add('lachs');
      aliases.add('lachsfilet');
      aliases.add('salmon');
    }
    if ((lowerDe.includes('garnele') || lowerDe.includes('shrimp') || lowerDe.includes('crevette')) && code.startsWith('T411')) {
      aliases.add('garnelen');
      aliases.add('shrimps');
      aliases.add('prawns');
    }

    // Grains, Flours & Baking
    if (lowerDe.includes('hafer') && lowerDe.includes('flocken')) {
      aliases.add('haferflocken');
      aliases.add('zarte haferflocken');
      aliases.add('kernige haferflocken');
      aliases.add('rolled oats');
      aliases.add('oats');
    }
    if (lowerDe.includes('weizen') && lowerDe.includes('mehl') && code.startsWith('C211')) {
      aliases.add('mehl');
      aliases.add('weizenmehl');
      aliases.add('wheat flour');
      aliases.add('flour');
    }
    if (lowerDe.includes('dinkel') && lowerDe.includes('mehl')) {
      aliases.add('dinkelmehl');
      aliases.add('dinkel mehl');
      aliases.add('spelt flour');
    }
    if ((lowerDe.includes('teigwaren') || lowerDe.includes('pasta') || lowerDe.includes('nudeln')) && code.startsWith('E432')) {
      aliases.add('nudeln');
      aliases.add('pasta');
      aliases.add('spaghetti');
      aliases.add('penne');
      aliases.add('fussili');
      aliases.add('bandnudeln');
      aliases.add('linguine');
    }
    if (lowerDe.includes('vollkornteigwaren')) {
      aliases.add('vollkornnudeln');
      aliases.add('vollkornpasta');
      aliases.add('vollkornspaghetti');
      aliases.add('whole wheat pasta');
    }
    if (lowerDe.includes('reis') && code.startsWith('C311')) {
      aliases.add('reis');
      aliases.add('basmatireis');
      aliases.add('jasminreis');
      aliases.add('rice');
    }
    if (lowerDe.includes('backpulver') && code.startsWith('R4211')) {
      aliases.add('backpulver');
      aliases.add('baking powder');
    }
    if (lowerDe.includes('natron') && code.startsWith('R4212')) {
      aliases.add('natron');
      aliases.add('speisenatron');
      aliases.add('baking soda');
    }
    if (lowerDe.includes('backhefe') || lowerDe.includes('trockenhefe')) {
      aliases.add('trockenhefe');
      aliases.add('backhefe');
      aliases.add('dry yeast');
    }
    if (lowerDe.includes('kakaopulver') || (lowerDe.includes('kakao') && code.startsWith('S211'))) {
      aliases.add('backkakao');
      aliases.add('kakaopulver');
      aliases.add('kakao');
      aliases.add('cocoa powder');
    }
    if (lowerDe.includes('kristallzucker') || lowerDe.includes('haushaltszucker') || (lowerDe === 'zucker' && code.startsWith('S111'))) {
      aliases.add('zucker');
      aliases.add('haushaltszucker');
      aliases.add('sugar');
    }
    if (lowerDe.includes('puderzucker') && code.startsWith('S112')) {
      aliases.add('puderzucker');
      aliases.add('powdered sugar');
    }
    if (lowerDe.includes('bienenhonig') || (lowerDe.includes('honig') && code.startsWith('S12'))) {
      aliases.add('honig');
      aliases.add('bienenhonig');
      aliases.add('honey');
      aliases.add('hot honey');
      aliases.add('scharfer honig');
    }
    if (lowerDe.includes('ahornsirup') && code.startsWith('S151')) {
      aliases.add('ahornsirup');
      aliases.add('maple syrup');
    }
    if (code === 'S500000' || (lowerDe.includes('schokolade') && code.startsWith('S500'))) {
      aliases.add('schokolade');
      aliases.add('schoki');
      aliases.add('chocolate');
      aliases.add('chocolate chips');
      aliases.add('schokodrops');
    }

    // Spices, Herbs & Oils
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
    if (lowerDe.includes('schwarzer pfeffer') || code === 'R131000' || code.startsWith('R258')) {
      aliases.add('pfeffer');
      aliases.add('schwarzer pfeffer');
      aliases.add('pfeffer schwarz');
      aliases.add('pepper');
      aliases.add('black pepper');
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
      aliases.add('chili powder');
    }
    if (lowerDe.includes('knoblauch') && lowerDe.includes('pulver')) {
      aliases.add('knoblauchpulver');
      aliases.add('knoblauch pulver');
      aliases.add('garlic powder');
    }
    if (lowerDe.includes('speisezwiebel') && lowerDe.includes('pulver')) {
      aliases.add('zwiebelpulver');
      aliases.add('zwiebel pulver');
      aliases.add('onion powder');
    }
    if (lowerDe.includes('zimt') && code.startsWith('R261')) {
      aliases.add('zimt');
      aliases.add('zimtpulver');
      aliases.add('cinnamon');
    }
    if (lowerDe.includes('muskat') && code.startsWith('R255')) {
      aliases.add('muskat');
      aliases.add('muskatnuss');
      aliases.add('nutmeg');
    }
    if (lowerDe.includes('oregano') && code.startsWith('R241')) {
      aliases.add('oregano');
    }
    if (lowerDe.includes('basilikum') && (code.startsWith('G061') || code.startsWith('R231'))) {
      aliases.add('basilikum');
      aliases.add('basil');
    }
    if (lowerDe.includes('rosmarin') && code.startsWith('R245')) {
      aliases.add('rosmarin');
      aliases.add('rosemary');
    }
    if (lowerDe.includes('thymian') && code.startsWith('R248')) {
      aliases.add('thymian');
      aliases.add('thyme');
    }
    if (lowerDe.includes('petersilie') && code.startsWith('G250')) {
      aliases.add('petersilie');
      aliases.add('krause petersilie');
      aliases.add('glatte petersilie');
      aliases.add('parsley');
    }
    if (lowerDe.includes('schnittlauch') && code.startsWith('G081')) {
      aliases.add('schnittlauch');
      aliases.add('chives');
    }
    if (lowerDe.includes('olivenöl') && code.startsWith('Q120')) {
      aliases.add('olivenöl');
      aliases.add('natives olivenöl');
      aliases.add('olive oil');
    }
    if (lowerDe.includes('rapsöl') && code.startsWith('Q230')) {
      aliases.add('rapsöl');
      aliases.add('pflanzenöl');
      aliases.add('speiseöl');
      aliases.add('öl');
      aliases.add('canola oil');
      aliases.add('cooking oil');
      aliases.add('vegetable oil');
    }
    if (lowerDe.includes('sonnenblumenöl') && code.startsWith('Q280')) {
      aliases.add('sonnenblumenöl');
      aliases.add('sunflower oil');
    }
    if (lowerDe.includes('sesamöl') && code.startsWith('Q260')) {
      aliases.add('sesamöl');
      aliases.add('sesame oil');
    }
    if (lowerDe.includes('balsamico') && code.startsWith('R121')) {
      aliases.add('balsamico');
      aliases.add('balsamico essig');
      aliases.add('aceto balsamico');
    }
    if (lowerDe.includes('apfelessig') && code.startsWith('R123')) {
      aliases.add('apfelessig');
      aliases.add('apple cider vinegar');
    }
    if (lowerDe.includes('sojasauce') || lowerDe.includes('sojasoße') || code.startsWith('R143')) {
      aliases.add('sojasauce');
      aliases.add('sojasoße');
      aliases.add('soy sauce');
    }
    if (lowerDe.includes('senf') && code.startsWith('R142')) {
      aliases.add('senf');
      aliases.add('mittelscharfer senf');
      aliases.add('mustard');
    }
    if (lowerDe.includes('tomatenmark') && code.startsWith('R160')) {
      aliases.add('tomatenmark');
      aliases.add('tomato paste');
    }
    if ((lowerDe.includes('tomaten passiert') || lowerDe.includes('passierte tomaten') || lowerDe.includes('tomatenpüree')) && code.startsWith('R161')) {
      aliases.add('passierte tomaten');
      aliases.add('tomaten passiert');
      aliases.add('tomatenpüree');
      aliases.add('strained tomatoes');
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
