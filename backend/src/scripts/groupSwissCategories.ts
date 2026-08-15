import fs from 'fs/promises';
import path from 'path';

interface CategoryItem {
  category: string;
  itemCount: number;
  sampleFoods: string[];
}

interface GroupingProposal {
  mainCategory: string;
  mainCategoryLabel: string;
  totalItems: number;
  swissSubcategories: {
    category: string;
    itemCount: number;
    sampleFoods: string[];
  }[];
}

function assignMainCategory(swissCat: string): { key: string; label: string } {
  const cat = swissCat.toLowerCase();

  // 1. MEAT & POULTRY (including plant-based meat substitutes)
  if (
    cat.startsWith('fleisch') ||
    cat.includes('/rind') ||
    cat.includes('/kalb') ||
    cat.includes('/schwein') ||
    cat.includes('/geflügel') ||
    cat.includes('/wild') ||
    cat.includes('/lamm') ||
    cat.includes('/pferd') ||
    cat.includes('wurstwaren') ||
    cat.includes('alternativen zu fleisch')
  ) {
    return { key: 'MEAT_POULTRY', label: 'Fleisch, Geflügel & Fleischalternativen' };
  }

  // 2. SEAFOOD
  if (
    cat.startsWith('fische') ||
    cat.startsWith('krustentiere') ||
    cat.includes('seafood')
  ) {
    return { key: 'SEAFOOD', label: 'Fisch & Meeresfrüchte' };
  }

  // 3. DAIRY & EGGS (including plant-based dairy substitutes & tofu)
  if (
    cat.startsWith('milch und milchprodukte') ||
    cat.startsWith('eier') ||
    cat.includes('käse') ||
    cat.includes('quark') ||
    cat.includes('joghurt') ||
    cat.includes('butter') ||
    cat.includes('tofu') ||
    cat.includes('pflanzliche alternativen zu milch')
  ) {
    return { key: 'DAIRY_EGGS', label: 'Milchprodukte, Eier & pflanzliche Alternativen' };
  }

  // 4. PRODUCE - VEGETABLES & MUSHROOMS
  if (
    cat.startsWith('gemüse/gemüse frisch') ||
    cat.startsWith('gemüse/gemüse gekocht') ||
    cat.startsWith('gemüse/pilze') ||
    cat.startsWith('gemüse/salate')
  ) {
    return { key: 'VEGETABLES', label: 'Gemüse & Pilze' };
  }

  // 5. PRODUCE - FRUITS
  if (
    cat.startsWith('früchte/früchte frisch') ||
    cat.startsWith('früchte/früchte gekocht') ||
    cat.startsWith('früchte/früchte getrocknet')
  ) {
    return { key: 'FRUITS', label: 'Obst & Früchte' };
  }

  // 6. SPICES & HERBS
  if (
    cat.includes('salz, gewürze') ||
    cat.includes('/kräuter') ||
    cat.includes('/gewürze') ||
    cat.startsWith('gemüse/kräuter')
  ) {
    return { key: 'SPICES_HERBS', label: 'Gewürze & Kräuter' };
  }

  // 7. OILS, FATS & CONDIMENTS (Oils, Vinegars, Sauces, Dressings, Mustard)
  if (
    cat.startsWith('fette und öle') ||
    cat.includes('/öle') ||
    cat.includes('/fette') ||
    cat.includes('/saucen') ||
    cat.includes('essig') ||
    cat.includes('senf') ||
    cat.includes('mayonnaise')
  ) {
    return { key: 'OILS_CONDIMENTS', label: 'Öle, Fette, Saucen & Essig' };
  }

  // 8. GRAINS, PASTA, BAKERY & STARCHES
  if (
    cat.startsWith('brote, flocken') ||
    cat.startsWith('getreideprodukte') ||
    cat.startsWith('getreide') ||
    cat.includes('teigwaren') ||
    cat.includes('flocken') ||
    cat.includes('brot') ||
    cat.includes('reis') ||
    cat.includes('kartoffel') ||
    cat.includes('teige') ||
    cat.includes('mehl') ||
    cat.includes('hülsenfrüchte')
  ) {
    return { key: 'GRAINS_PASTA', label: 'Getreide, Nudeln, Reis, Mehl & Brot' };
  }

  // 9. NUTS, SEEDS & DRIED PULSES
  if (
    cat.startsWith('nüsse, samen') ||
    cat.includes('ölfrüchte') ||
    cat.includes('samen') ||
    cat.includes('nüsse')
  ) {
    return { key: 'NUTS_SEEDS', label: 'Nüsse, Samen & Kerne' };
  }

  // 10. SWEETS, SNACKS & BAKERY DESSERTS
  if (
    cat.startsWith('süssigkeiten') ||
    cat.includes('/guetzli') ||
    cat.includes('/schokolade') ||
    cat.includes('/bonbons') ||
    cat.includes('kuchen, torten') ||
    cat.includes('eis') ||
    cat.includes('zucker')
  ) {
    return { key: 'SWEETS_SNACKS', label: 'Süßwaren, Kekse, Schokolade & Zucker' };
  }

  // 11. BEVERAGES
  if (
    cat.startsWith('alkoholfreie getränke') ||
    cat.startsWith('alkoholhaltige getränke') ||
    cat.includes('/fruchtsäfte') ||
    cat.includes('/mineralwasser') ||
    cat.includes('/bier') ||
    cat.includes('/wein') ||
    cat.includes('/sirup') ||
    cat.includes('spirituosen')
  ) {
    return { key: 'BEVERAGES', label: 'Getränke & Alkohol' };
  }

  // 12. PREPARED MEALS / COMPOSITES (Dishes, Pizzas, Sandwiches)
  if (
    cat.startsWith('gerichte') ||
    cat.includes('/pizza') ||
    cat.includes('/asiatische gerichte') ||
    cat.includes('/kuchen und gratins') ||
    cat.includes('/eintöpfe') ||
    cat.includes('/sandwiches') ||
    cat.includes('/fast food') ||
    cat.includes('/müesli')
  ) {
    return { key: 'PREPARED_MEALS', label: 'Fertiggerichte & zusammengesetzte Speisen' };
  }

  // 13. PANTRY & BAKING EXTRAS
  return { key: 'PANTRY_EXTRAS', label: 'Backzutaten & Vorrat (Hefe, Aromen etc.)' };
}

async function run() {
  const rawPath = path.resolve('eval_results/swiss_categories_raw.json');
  const raw: CategoryItem[] = JSON.parse(await fs.readFile(rawPath, 'utf-8'));

  const groupsMap = new Map<string, GroupingProposal>();

  for (const item of raw) {
    const { key, label } = assignMainCategory(item.category);
    const existing = groupsMap.get(key) || {
      mainCategory: key,
      mainCategoryLabel: label,
      totalItems: 0,
      swissSubcategories: [],
    };

    existing.totalItems += item.itemCount;
    existing.swissSubcategories.push(item);
    groupsMap.set(key, existing);
  }

  const sortedGroups = Array.from(groupsMap.values()).sort((a, b) => b.totalItems - a.totalItems);

  const outputPath = path.resolve('eval_results/swiss_categories_grouped.json');
  await fs.writeFile(outputPath, JSON.stringify(sortedGroups, null, 2), 'utf-8');

  console.log(`Successfully grouped categories into ${sortedGroups.length} main categories.`);
}

run();
