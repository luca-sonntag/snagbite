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

export const SWISS_CATEGORY_EXPLICIT_MAP: Record<string, { mainCategory: string; labelDe: string; labelEn: string }> = {
  // ── 1. VEGETABLES (Gemüse frisch/gekocht, Pilze, Salate, Kräuter, Sprossen) ───────
  'Gemüse/Gemüse frisch': { mainCategory: 'VEGETABLES', labelDe: 'Frisches Gemüse & Salate', labelEn: 'Fresh Vegetables & Salads' },
  'Gemüse/Gemüse gekocht (inkl. Konserven)': { mainCategory: 'VEGETABLES', labelDe: 'Gemüse (gekocht / Konserve)', labelEn: 'Cooked & Canned Vegetables' },
  'Gemüse/Gemüse getrocknet': { mainCategory: 'VEGETABLES', labelDe: 'Getrocknetes Gemüse (getr. Tomaten etc.)', labelEn: 'Dried Vegetables' },
  'Gemüse/Gemüse tiefgekühlt': { mainCategory: 'VEGETABLES', labelDe: 'Tiefkühlgemüse', labelEn: 'Frozen Vegetables' },
  'Gemüse/Pilze': { mainCategory: 'VEGETABLES', labelDe: 'Pilze (frisch & konserviert)', labelEn: 'Mushrooms' },
  'Gemüse/Kräuter': { mainCategory: 'VEGETABLES', labelDe: 'Frische Kräuter', labelEn: 'Fresh Herbs' },
  'Gemüse/Sprossen und Keimlinge': { mainCategory: 'VEGETABLES', labelDe: 'Sprossen & Keimlinge (Kresse etc.)', labelEn: 'Sprouts & Microgreens' },

  // ── 2. FRUITS (Frisches Obst, Beeren, Obstkonserven, Trockenfrüchte) ───────────────
  'Früchte/Früchte frisch': { mainCategory: 'FRUITS', labelDe: 'Frisches Obst & Beeren', labelEn: 'Fresh Fruit & Berries' },
  'Früchte/Früchte gekocht (inkl. Konserven)': { mainCategory: 'FRUITS', labelDe: 'Obstkonserven & Kompott', labelEn: 'Canned Fruit & Compote' },
  'Früchte/Früchte getrocknet': { mainCategory: 'FRUITS', labelDe: 'Trockenfrüchte & Dörrobst', labelEn: 'Dried Fruits' },

  // ── 3. DAIRY_EGGS (Milch, Käse, Joghurt, Quark, Butter, Rahm, Eier, Tofu, Pflanzendrinks) ──
  'Milch und Milchprodukte/Hartkäse': { mainCategory: 'DAIRY_EGGS', labelDe: 'Hartkäse', labelEn: 'Hard Cheese' },
  'Milch und Milchprodukte/Halbhartkäse': { mainCategory: 'DAIRY_EGGS', labelDe: 'Halbhartkäse', labelEn: 'Semi-Hard Cheese' },
  'Milch und Milchprodukte/Weichkäse': { mainCategory: 'DAIRY_EGGS', labelDe: 'Weichkäse', labelEn: 'Soft Cheese' },
  'Milch und Milchprodukte/Frischkäse und Quark': { mainCategory: 'DAIRY_EGGS', labelDe: 'Frischkäse, Quark & Hüttenkäse', labelEn: 'Cream Cheese & Quark' },
  'Milch und Milchprodukte/Joghurt': { mainCategory: 'DAIRY_EGGS', labelDe: 'Joghurt', labelEn: 'Yogurt' },
  'Milch und Milchprodukte/Joghurt und Sauermilch': { mainCategory: 'DAIRY_EGGS', labelDe: 'Joghurt & Sauermilch', labelEn: 'Yogurt & Cultured Milk' },
  'Milch und Milchprodukte/Milch': { mainCategory: 'DAIRY_EGGS', labelDe: 'Milch (Vollmilch, fettarm)', labelEn: 'Milk' },
  'Milch und Milchprodukte/Konsummilch': { mainCategory: 'DAIRY_EGGS', labelDe: 'Milch (Vollmilch, fettarm)', labelEn: 'Milk' },
  'Milch und Milchprodukte/Milchgetränke': { mainCategory: 'DAIRY_EGGS', labelDe: 'Milchgetränke', labelEn: 'Milk Drinks' },
  'Milch und Milchprodukte/Milch- und Joghurtgetränke': { mainCategory: 'DAIRY_EGGS', labelDe: 'Milch- & Joghurtgetränke', labelEn: 'Milk & Yogurt Drinks' },
  'Milch und Milchprodukte/Sauermilchprodukte': { mainCategory: 'DAIRY_EGGS', labelDe: 'Sauermilch, Kefir & Buttermilch', labelEn: 'Cultured Milk Products' },
  'Milch und Milchprodukte/Käsezubereitungen': { mainCategory: 'DAIRY_EGGS', labelDe: 'Käsezubereitungen & Schmelzkäse', labelEn: 'Processed Cheese' },
  'Milch und Milchprodukte/Käseerzeugnisse': { mainCategory: 'DAIRY_EGGS', labelDe: 'Käseerzeugnisse', labelEn: 'Cheese Products' },
  'Fette und Öle/Rahm': { mainCategory: 'DAIRY_EGGS', labelDe: 'Rahm & Sahne', labelEn: 'Cream' },
  'Fette und Öle/Butter': { mainCategory: 'DAIRY_EGGS', labelDe: 'Butter', labelEn: 'Butter' },
  'Eier': { mainCategory: 'DAIRY_EGGS', labelDe: 'Hühnereier (ganz, Eigelb, Eiweiß)', labelEn: 'Eggs' },
  'Pflanzliche Proteinlieferanten und Alternativen zu tierischen Produkten/Pflanzliche Alternativen zu Milch und Milchprodukten': { mainCategory: 'DAIRY_EGGS', labelDe: 'Pflanzliche Milch- & Joghurt-Alternativen', labelEn: 'Plant-Based Dairy Alternatives' },
  'Pflanzliche Proteinlieferanten und Alternativen zu tierischen Produkten/Alternativen zu Milchprodukten': { mainCategory: 'DAIRY_EGGS', labelDe: 'Pflanzliche Milchprodukt-Alternativen', labelEn: 'Plant-Based Dairy Alternatives' },
  'Pflanzliche Proteinlieferanten und Alternativen zu tierischen Produkten/Pflanzliche Getränke': { mainCategory: 'DAIRY_EGGS', labelDe: 'Pflanzendrinks (Haferdrink, Mandeldrink, Sojadrink)', labelEn: 'Plant-Based Milk Drinks' },
  'Pflanzliche Proteinlieferanten und Alternativen zu tierischen Produkten/Tofu und Tofuerzeugnisse': { mainCategory: 'DAIRY_EGGS', labelDe: 'Tofu & Sojaprodukte', labelEn: 'Tofu Products' },

  // ── 4. MEAT_POULTRY (Fleisch, Geflügel, Wurstwaren, Schinken, Fleischalternativen) ──
  'Fleisch und Innereien/Rind': { mainCategory: 'MEAT_POULTRY', labelDe: 'Rindfleisch & Rinderhack', labelEn: 'Beef' },
  'Fleisch und Innereien/Kalb': { mainCategory: 'MEAT_POULTRY', labelDe: 'Kalbfleisch', labelEn: 'Veal' },
  'Fleisch und Innereien/Schwein': { mainCategory: 'MEAT_POULTRY', labelDe: 'Schweinefleisch', labelEn: 'Pork' },
  'Fleisch und Innereien/Geflügel': { mainCategory: 'MEAT_POULTRY', labelDe: 'Geflügel (Hähnchen, Pute, Ente)', labelEn: 'Poultry' },
  'Fleisch und Innereien/Lamm, Schaf': { mainCategory: 'MEAT_POULTRY', labelDe: 'Lamm- & Schaffleisch', labelEn: 'Lamb & Mutton' },
  'Fleisch und Innereien/Wild': { mainCategory: 'MEAT_POULTRY', labelDe: 'Wildfleisch (Reh, Hirsch)', labelEn: 'Game Meat' },
  'Fleisch und Innereien/Sonstige Tierarten': { mainCategory: 'MEAT_POULTRY', labelDe: 'Sonstiges Fleisch (Kaninchen, Pferd)', labelEn: 'Other Meat' },
  'Fleisch und Innereien/Innereien': { mainCategory: 'MEAT_POULTRY', labelDe: 'Innereien (Leber etc.)', labelEn: 'Offal & Organ Meats' },
  'Fleisch und Innereien': { mainCategory: 'MEAT_POULTRY', labelDe: 'Fleisch (Durchschnitt & Mischungen)', labelEn: 'Mixed Meat' },
  'Fleisch- und Wurstwaren/Rohwurstware': { mainCategory: 'MEAT_POULTRY', labelDe: 'Rohwürste, Salami & Rohspeck', labelEn: 'Cured Sausages & Bacon' },
  'Fleisch- und Wurstwaren/Brühwurstware': { mainCategory: 'MEAT_POULTRY', labelDe: 'Brühwürste & Aufschnitt (Wienerli etc.)', labelEn: 'Boiled Sausages' },
  'Fleisch- und Wurstwaren/Kochwurstware': { mainCategory: 'MEAT_POULTRY', labelDe: 'Kochwürste & Hinterschinken', labelEn: 'Cooked Ham & Sausages' },
  'Fleisch- und Wurstwaren/Rohpökelware': { mainCategory: 'MEAT_POULTRY', labelDe: 'Rohschinken & Bündnerfleisch', labelEn: 'Cured Ham' },
  'Pflanzliche Proteinlieferanten und Alternativen zu tierischen Produkten/Alternativen zu Fleisch, Fleischwaren, Fisch oder Ei': { mainCategory: 'MEAT_POULTRY', labelDe: 'Vegane Fleischalternativen (Sojaschnetzel, Mykoprotein)', labelEn: 'Plant-Based Meat Substitutes' },
  'Pflanzliche Proteinlieferanten und Alternativen zu tierischen Produkten/Pflanzliche Proteinlieferanten': { mainCategory: 'MEAT_POULTRY', labelDe: 'Pflanzliche Protein-Rohstoffe (Seitan, Tempeh)', labelEn: 'Plant-Based Proteins (Seitan, Tempeh)' },

  // ── 5. SEAFOOD (Fische, Meeresfrüchte, Krustentiere) ──────────────────────────────
  'Fisch': { mainCategory: 'SEAFOOD', labelDe: 'Fisch & Fischwaren', labelEn: 'Fish' },
  'Fisch/Meeresfische': { mainCategory: 'SEAFOOD', labelDe: 'Meeresfische (Lachs, Dorsch, Thunfisch)', labelEn: 'Saltwater Fish' },
  'Fisch/Süsswasserfische': { mainCategory: 'SEAFOOD', labelDe: 'Süßwasserfische (Forelle, Zander, Felchen)', labelEn: 'Freshwater Fish' },
  'Fisch/Fischerzeugnisse': { mainCategory: 'SEAFOOD', labelDe: 'Fischerzeugnisse & Fischkonserven (Thunfischdose etc.)', labelEn: 'Fish Products' },
  'Fisch/Meeresfrüchte, Krusten- und Schalentiere': { mainCategory: 'SEAFOOD', labelDe: 'Meeresfrüchte & Krustentiere (Garnelen, Crevetten)', labelEn: 'Seafood & Shellfish' },
  'Fische und Krustentiere': { mainCategory: 'SEAFOOD', labelDe: 'Fischereierzeugnisse', labelEn: 'Fish & Shellfish' },
  'Krustentiere und Weichtiere': { mainCategory: 'SEAFOOD', labelDe: 'Krustentiere (Garnelen, Crevetten, Muscheln)', labelEn: 'Shellfish & Crustaceans' },

  // ── 6. GRAINS_PASTA (Getreide, Nudeln, Reis, Mehl, Teige, Kartoffeln, Hülsenfrüchte & Brot) ──
  'Brote, Flocken und Frühstückscerealien/Brote und Brotwaren': { mainCategory: 'GRAINS_PASTA', labelDe: 'Brot & Brotwaren', labelEn: 'Bread & Buns' },
  'Brote, Flocken und Frühstückscerealien/Kleingebäcke': { mainCategory: 'GRAINS_PASTA', labelDe: 'Kleingebäcke & Gipfeli/Croissants', labelEn: 'Small Bakery Items' },
  'Brote, Flocken und Frühstückscerealien/Knäckebrote, Zwiebäcke und Toaste': { mainCategory: 'GRAINS_PASTA', labelDe: 'Toast, Knäckebrot & Zwieback', labelEn: 'Toast & Crispbread' },
  'Brote, Flocken und Frühstückscerealien/Knäckebrote, Zwieback, Crackers und Waffeln': { mainCategory: 'GRAINS_PASTA', labelDe: 'Knäckebrot, Zwieback & Crackers', labelEn: 'Crackers & Crispbread' },
  'Brote, Flocken und Frühstückscerealien/Frühstückscerealien und Flocken': { mainCategory: 'GRAINS_PASTA', labelDe: 'Haferflocken, Müesliflocken & Cerealien', labelEn: 'Oats & Cereals' },
  'Brote, Flocken und Frühstückscerealien/Müeslimischungen und Frühstückscerealien': { mainCategory: 'GRAINS_PASTA', labelDe: 'Müslimischungen & Cornflakes', labelEn: 'Muesli & Cereals' },
  'Brote, Flocken und Frühstückscerealien/Flocken, Kleie und Keime': { mainCategory: 'GRAINS_PASTA', labelDe: 'Haferflocken, Kleie & Weizenkeime', labelEn: 'Oat Flakes, Bran & Germs' },
  'Getreideprodukte, Hülsenfrüchte und Kartoffeln/Teigwaren': { mainCategory: 'GRAINS_PASTA', labelDe: 'Pasta & Nudeln', labelEn: 'Pasta & Noodles' },
  'Getreideprodukte, Hülsenfrüchte und Kartoffeln/Reis': { mainCategory: 'GRAINS_PASTA', labelDe: 'Reis', labelEn: 'Rice' },
  'Getreideprodukte, Hülsenfrüchte und Kartoffeln/Mehle und Stärke': { mainCategory: 'GRAINS_PASTA', labelDe: 'Mehl (Weizen, Dinkel) & Stärke', labelEn: 'Flour & Starch' },
  'Getreideprodukte, Hülsenfrüchte und Kartoffeln/Teige': { mainCategory: 'GRAINS_PASTA', labelDe: 'Teige (Blätterteig, Flammkuchenteig, Pizzateig)', labelEn: 'Dough (Puff Pastry, Pizza)' },
  'Getreideprodukte, Hülsenfrüchte und Kartoffeln/Kartoffeln und andere stärkereiche Knollen': { mainCategory: 'GRAINS_PASTA', labelDe: 'Kartoffeln & Knollen', labelEn: 'Potatoes & Tubers' },
  'Getreideprodukte, Hülsenfrüchte und Kartoffeln/Hülsenfrüchte': { mainCategory: 'GRAINS_PASTA', labelDe: 'Getrocknete Hülsenfrüchte (Bohnen, Linsen, Kichererbsen)', labelEn: 'Pulses (Lentils, Beans, Chickpeas)' },
  'Getreideprodukte, Hülsenfrüchte und Kartoffeln/Mais': { mainCategory: 'GRAINS_PASTA', labelDe: 'Mais & Polenta/Maisgrieß', labelEn: 'Corn & Polenta' },
  'Getreideprodukte, Hülsenfrüchte und Kartoffeln/Sonstige Getreideprodukte': { mainCategory: 'GRAINS_PASTA', labelDe: 'Couscous, Bulgur, Gerste & Buchweizen', labelEn: 'Couscous, Bulgur & Grains' },

  // ── 7. OILS_CONDIMENTS (Öle, Fette, Essig, Salatsaucen, Saucen, Senf & Mayonnaise) ──
  'Fette und Öle/Öle': { mainCategory: 'OILS_CONDIMENTS', labelDe: 'Pflanzenöle (Olivenöl, Rapsöl, Sonnenblumenöl)', labelEn: 'Vegetable Oils' },
  'Fette und Öle/Fette': { mainCategory: 'OILS_CONDIMENTS', labelDe: 'Speisefette (Bratbutter, Pflanzenfett, Margarine)', labelEn: 'Cooking Fats & Margarine' },
  'Fette und Öle/Salatsaucen': { mainCategory: 'OILS_CONDIMENTS', labelDe: 'Salatdressings & Vinaigrettes', labelEn: 'Salad Dressings' },
  'Fette und Öle/Mayonnaisen': { mainCategory: 'OILS_CONDIMENTS', labelDe: 'Mayonnaise & Remoulade', labelEn: 'Mayonnaise' },
  'Verschiedenes/Saucen': { mainCategory: 'OILS_CONDIMENTS', labelDe: 'Saucen (Bratensauce, Grillsauce, Tomatensauce)', labelEn: 'Sauces' },
  'Verschiedenes/Essig': { mainCategory: 'OILS_CONDIMENTS', labelDe: 'Essig & Aceto Balsamico', labelEn: 'Vinegar' },
  'Verschiedenes/Aufstriche': { mainCategory: 'OILS_CONDIMENTS', labelDe: 'Pikante Brotaufstriche & Pasten', labelEn: 'Savory Spreads' },

  // ── 8. SPICES_HERBS (Trockengewürze, Salz, Pfeffer, Würzmittel) ───────────────────
  'Verschiedenes/Salz, Gewürze und Aromen': { mainCategory: 'SPICES_HERBS', labelDe: 'Salz, Pfeffer, Paprika & Gewürzmischungen', labelEn: 'Salt, Pepper & Spices' },

  // ── 9. NUTS_SEEDS (Nüsse, Samen, Kerne, Avocado, Oliven) ──────────────────────────
  'Nüsse, Samen und Ölfrüchte': { mainCategory: 'NUTS_SEEDS', labelDe: 'Nüsse, Mandeln, Chiasamen, Avocado & Kerne', labelEn: 'Nuts, Seeds & Avocado' },
  'Salzige Snacks/Gesalzene Nüsse, Samen, Kerne': { mainCategory: 'NUTS_SEEDS', labelDe: 'Gesalzene Nüsse & Kerne (Erdnüsse, Cashews)', labelEn: 'Salted Nuts & Seeds' },

  // ── 10. SWEETS_SNACKS (Kekse, Schokolade, Kuchen, Zucker, Süßungsmittel & Snacks) ──
  'Süssigkeiten/Guetzli': { mainCategory: 'SWEETS_SNACKS', labelDe: 'Kekse, Cookies & Plätzchen', labelEn: 'Cookies & Biscuits' },
  'Süssigkeiten/Schokolade und Kakaoerzeugnisse': { mainCategory: 'SWEETS_SNACKS', labelDe: 'Schokolade & Kakaopulver', labelEn: 'Chocolate & Cocoa Powder' },
  'Süssigkeiten/Kuchen, Torten und Cake': { mainCategory: 'SWEETS_SNACKS', labelDe: 'Kuchen, Torten & Cakes', labelEn: 'Cakes & Pastries' },
  'Süssigkeiten/Sonstige süsse Backwaren': { mainCategory: 'SWEETS_SNACKS', labelDe: 'Süße Hefegebäcke (Berliner, Donuts)', labelEn: 'Sweet Pastries & Donuts' },
  'Süssigkeiten/Cremen und Pudding': { mainCategory: 'SWEETS_SNACKS', labelDe: 'Pudding, Crèmes & Desserts', labelEn: 'Pudding & Creams' },
  'Süssigkeiten/Zucker und Süssstoffe': { mainCategory: 'SWEETS_SNACKS', labelDe: 'Zucker, Honig, Sirup & Süßstoffe', labelEn: 'Sugar, Honey & Sweeteners' },
  'Süssigkeiten/Konfitüren und süsse Brotaufstriche': { mainCategory: 'SWEETS_SNACKS', labelDe: 'Konfitüren, Marmeladen & Nuss-Nougat-Creme', labelEn: 'Jams & Sweet Spreads' },
  'Süssigkeiten/Glacen auf Milchbasis': { mainCategory: 'SWEETS_SNACKS', labelDe: 'Speiseeis & Rahmglace', labelEn: 'Ice Cream (Dairy)' },
  'Süssigkeiten/Glacen auf Wasserbasis': { mainCategory: 'SWEETS_SNACKS', labelDe: 'Wassereis & Sorbet', labelEn: 'Sorbet & Water Ice' },
  'Süssigkeiten/Bonbons, Frucht- und Kaugummi': { mainCategory: 'SWEETS_SNACKS', labelDe: 'Bonbons, Gummibärchen & Fruchtgummi', labelEn: 'Candy & Gummies' },
  'Süssigkeiten/Riegel': { mainCategory: 'SWEETS_SNACKS', labelDe: 'Müsliriegel & Schokoriegel', labelEn: 'Granola & Snack Bars' },
  'Süssigkeiten/Sonstige Süssigkeiten': { mainCategory: 'SWEETS_SNACKS', labelDe: 'Marzipan & sonstige Süßigkeiten', labelEn: 'Other Sweets' },
  'Verschiedenes/Salzige Snacks': { mainCategory: 'SWEETS_SNACKS', labelDe: 'Chips, Nüssli & salzige Knabbereien', labelEn: 'Salty Snacks & Chips' },
  'Salzige Snacks/Chips': { mainCategory: 'SWEETS_SNACKS', labelDe: 'Kartoffelchips & Nachos', labelEn: 'Potato Chips' },
  'Salzige Snacks/Salzsticks und Bretzel': { mainCategory: 'SWEETS_SNACKS', labelDe: 'Salzstangen & Brezeln', labelEn: 'Pretzels & Salt Sticks' },
  'Salzige Snacks/Blätterteiggebäcke': { mainCategory: 'SWEETS_SNACKS', labelDe: 'Salzige Blätterteiggebäcke (Prussiens etc.)', labelEn: 'Savory Pastries' },
  'Salzige Snacks/Sonstige salzige Snacks': { mainCategory: 'SWEETS_SNACKS', labelDe: 'Sonstige salzige Snacks', labelEn: 'Other Salty Snacks' },

  // ── 11. BEVERAGES (Säfte, Drinks, Kaffee, Tee, Bier, Wein, Spirituosen) ───────────
  'Früchte/Fruchtsäfte': { mainCategory: 'BEVERAGES', labelDe: 'Fruchtsäfte (Orangensaft, Apfelsaft etc.)', labelEn: 'Fruit Juices' },
  'Gemüse/Gemüsesäfte': { mainCategory: 'BEVERAGES', labelDe: 'Gemüsesäfte (Tomatensaft, Karottensaft)', labelEn: 'Vegetable Juices' },
  'Alkoholfreie Getränke/Frucht- und Gemüsesäfte': { mainCategory: 'BEVERAGES', labelDe: 'Frucht- & Gemüsesäfte', labelEn: 'Fruit & Vegetable Juices' },
  'Alkoholfreie Getränke/Mineralwasser': { mainCategory: 'BEVERAGES', labelDe: 'Mineralwasser & Wasser', labelEn: 'Water' },
  'Alkoholfreie Getränke/Trinkwasser': { mainCategory: 'BEVERAGES', labelDe: 'Trinkwasser / Leitungswasser', labelEn: 'Drinking Water' },
  'Alkoholfreie Getränke/Süssgetränke': { mainCategory: 'BEVERAGES', labelDe: 'Limonaden, Cola & Eistee', labelEn: 'Soft Drinks & Sodas' },
  'Alkoholfreie Getränke/Süssgetränke energievermindert': { mainCategory: 'BEVERAGES', labelDe: 'Zero- & Light-Limonaden', labelEn: 'Zero / Diet Soft Drinks' },
  'Alkoholfreie Getränke/Tee und Kaffee': { mainCategory: 'BEVERAGES', labelDe: 'Kaffee & Tee', labelEn: 'Coffee & Tea' },
  'Alkoholfreie Getränke/Kaffee': { mainCategory: 'BEVERAGES', labelDe: 'Kaffee & Espresso', labelEn: 'Coffee' },
  'Alkoholfreie Getränke/Tee': { mainCategory: 'BEVERAGES', labelDe: 'Tee (Schwarztee, Grüntee, Kräutertee)', labelEn: 'Tea' },
  'Alkoholfreie Getränke/Kakaogetränke': { mainCategory: 'BEVERAGES', labelDe: 'Kakaogetränke & Trinkschokolade', labelEn: 'Hot Chocolate & Cocoa Drinks' },
  'Alkoholfreie Getränke/Malzextrakthaltige Getränke': { mainCategory: 'BEVERAGES', labelDe: 'Malzgetränke (Ovomaltine etc.)', labelEn: 'Malted Drinks' },
  'Alkoholfreie Getränke/Sirupe': { mainCategory: 'BEVERAGES', labelDe: 'Getränkesirupe', labelEn: 'Beverage Syrups' },
  'Alkoholfreie Getränke/Sirup': { mainCategory: 'BEVERAGES', labelDe: 'Getränkesirup (Holunder, Himbeere)', labelEn: 'Syrup' },
  'Alkoholfreie Getränke/Pflanzliche Drinks': { mainCategory: 'BEVERAGES', labelDe: 'Pflanzliche Drinks (Mandeldrink, Haferdrink)', labelEn: 'Plant-Based Drinks' },
  'Alkoholfreie Getränke/Sonstige Getränke': { mainCategory: 'BEVERAGES', labelDe: 'Sonstige Getränke', labelEn: 'Other Beverages' },
  'Alkoholfreie Getränke': { mainCategory: 'BEVERAGES', labelDe: 'Alkoholfreie Getränke', labelEn: 'Non-Alcoholic Beverages' },
  'Alkoholhaltige Getränke/Bier': { mainCategory: 'BEVERAGES', labelDe: 'Bier', labelEn: 'Beer' },
  'Alkoholhaltige Getränke/Wein': { mainCategory: 'BEVERAGES', labelDe: 'Wein & Prosecco/Champagner', labelEn: 'Wine' },
  'Alkoholhaltige Getränke/Spirituosen': { mainCategory: 'BEVERAGES', labelDe: 'Spirituosen & Liköre (Rum, Kirsch, Wodka)', labelEn: 'Spirits & Liqueurs' },
  'Alkoholhaltige Getränke/Cocktails und Mischgetränke': { mainCategory: 'BEVERAGES', labelDe: 'Cocktails & Mischgetränke', labelEn: 'Cocktails' },
  'Alkoholhaltige Getränke/Sonstige alkoholische Getränke': { mainCategory: 'BEVERAGES', labelDe: 'Sonstige alkoholische Getränke (Cider, Apfelwein)', labelEn: 'Other Alcoholic Drinks' },
  'Alkoholhaltige Getränke': { mainCategory: 'BEVERAGES', labelDe: 'Alkoholische Getränke', labelEn: 'Alcoholic Beverages' },

  // ── 12. PANTRY_BAKING (Backzutaten, Hefe, Backpulver, Gelatine, Supplemente) ──────
  'Verschiedenes/Backzutaten': { mainCategory: 'PANTRY_BAKING', labelDe: 'Backzutaten (Backpulver, Natron, Vanille)', labelEn: 'Baking Ingredients' },
  'Verschiedenes/Hefe': { mainCategory: 'PANTRY_BAKING', labelDe: 'Hefe (frisch & trocken)', labelEn: 'Yeast' },
  'Verschiedenes/Bindemittel und Geliermittel': { mainCategory: 'PANTRY_BAKING', labelDe: 'Geliermittel & Gelatine', labelEn: 'Gelling Agents' },
  'Speziallebensmittel/Supplemente': { mainCategory: 'PANTRY_BAKING', labelDe: 'Supplemente & Protein-Konzentrate', labelEn: 'Supplements' },

  // ── 13. PREPARED_DISHES (Komplett fertige Gerichte, Gratins, Sandwiches, Pizza) ───
  'Gerichte/Sonstige salzige/rezente Gerichte': { mainCategory: 'PREPARED_DISHES', labelDe: 'Pfannengerichte & Salziges', labelEn: 'Savory Dishes' },
  'Gerichte/Kuchen und Gratins': { mainCategory: 'PREPARED_DISHES', labelDe: 'Aufläufe, Gratins & Wähen', labelEn: 'Casseroles & Gratins' },
  'Gerichte/Sandwiches': { mainCategory: 'PREPARED_DISHES', labelDe: 'Sandwiches & belegte Brote', labelEn: 'Sandwiches' },
  'Gerichte/Italienische Gerichte': { mainCategory: 'PREPARED_DISHES', labelDe: 'Fertige Pasta-Gerichte, Lasagne & Pizza', labelEn: 'Pizza & Pasta Dishes' },
  'Gerichte/Salate': { mainCategory: 'PREPARED_DISHES', labelDe: 'Zubereitete Fertigsalate (Coleslaw, Kartoffelsalat)', labelEn: 'Prepared Salads' },
  'Gerichte/Eintöpfe und Suppen': { mainCategory: 'PREPARED_DISHES', labelDe: 'Suppen, Eintöpfe & Bouillon', labelEn: 'Soups & Stews' },
  'Gerichte/Sonstige süsse Gerichte': { mainCategory: 'PREPARED_DISHES', labelDe: 'Süße Hauptspeisen (Crêpes, Omeletten)', labelEn: 'Sweet Dishes' },
  'Gerichte/Müesli und Brei': { mainCategory: 'PREPARED_DISHES', labelDe: 'Fertiges Birchermüesli & Breie', labelEn: 'Prepared Muesli & Porridge' },
  'Gerichte/Asiatische Gerichte': { mainCategory: 'PREPARED_DISHES', labelDe: 'Asiatische Gerichte (Bami/Nasi Goreng, Frühlingsrollen)', labelEn: 'Asian Dishes' },
  'Gerichte/Fast Food': { mainCategory: 'PREPARED_DISHES', labelDe: 'Fast Food (Burger, Hot Dogs)', labelEn: 'Fast Food' },
  'Gerichte/Orientalische Gerichte': { mainCategory: 'PREPARED_DISHES', labelDe: 'Orientalische Gerichte (Falafel etc.)', labelEn: 'Middle Eastern Dishes' },
  'Gerichte': { mainCategory: 'PREPARED_DISHES', labelDe: 'Zubereitete Speisen', labelEn: 'Prepared Dishes' },
};

function mapCategory(catDe: string, catEn: string): string {
  const cats = (catDe || '').split(';').map(c => c.trim()).filter(Boolean);
  for (const c of cats) {
    if (SWISS_CATEGORY_EXPLICIT_MAP[c]) {
      return SWISS_CATEGORY_EXPLICIT_MAP[c].mainCategory;
    }
  }
  return 'PANTRY_BAKING';
}

function cleanAlias(text: string): string {
  return text
    .toLowerCase()
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\b(mit|with)\s+[a-zäöüß0-9\s]+/gi, ' ')
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
  if (combined.includes('mandel') && (combined.includes('drink') || combined.includes('getränk') || combined.includes('almond'))) {
    add('mandelmilch');
    add('almond milk');
  }
  if (combined.includes('hafer') && (combined.includes('drink') || combined.includes('getränk') || combined.includes('oat'))) {
    add('hafermilch');
    add('oat milk');
  }
  if (combined.includes('soja') && (combined.includes('drink') || combined.includes('getränk') || combined.includes('soy'))) {
    add('sojamilch');
    add('soy milk');
  }
  if (combined.includes('teigwaren mit ei, trocken') || combined.includes('pasta with egg, dry')) {
    add('pasta');
    add('nudeln');
    add('teigwaren');
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
