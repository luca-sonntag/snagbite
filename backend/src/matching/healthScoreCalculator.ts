import type {
  Recipe,
  Ingredient,
  HealthScoreBreakdown,
  HealthScoreGrade,
  HealthScorePillar,
} from '@cookbook/shared';
import { calculateWeightGrams } from './nutritionCalculator.js';
import { getMajorCategoryGroup, normalizeToCategoryKey } from './categoryGroups.js';

export function isVegetableOrFruitCategory(cat?: string | null): boolean {
  if (!cat) return false;
  const upper = cat.toUpperCase().trim();
  if (getMajorCategoryGroup(upper) === 'PRODUCE') return true;
  const key = normalizeToCategoryKey(upper);
  return key === 'VEGETABLES' || key === 'FRUITS';
}

export function isPlantCategory(cat?: string | null): boolean {
  if (!cat) return false;
  const upper = cat.toUpperCase().trim();
  if (isVegetableOrFruitCategory(upper)) return true;
  const major = getMajorCategoryGroup(upper);
  if (major === 'SPICES' || major === 'GRAINS' || major === 'NUTS_SEEDS') return true;
  const key = normalizeToCategoryKey(upper);
  return (
    key === 'VEGETABLES' ||
    key === 'FRUITS' ||
    key === 'NUTS_SEEDS' ||
    key === 'SPICES_HERBS' ||
    key === 'GRAINS_PASTA'
  );
}

function getGrade(score: number): HealthScoreGrade {
  if (score >= 85) return 'EXCELLENT';
  if (score >= 70) return 'BALANCED';
  if (score >= 50) return 'SOLID';
  if (score >= 35) return 'INDULGENT';
  return 'CHEAT_MEAL';
}

function calculateMacroPillar(
  calories: number,
  protein: number,
  sugar: number,
  totalDishWeightGrams: number,
  servings: number
): { pillar: HealthScorePillar; proteinEnergyPct: number; caloriesPer100g: number } {
  const proteinKcal = protein * 4;
  const proteinEnergyPct = calories > 0 ? Math.round((proteinKcal / calories) * 100) : 0;

  // 1. Protein balance (0 - 12)
  let proteinScore = 4;
  if (proteinEnergyPct >= 15 && proteinEnergyPct <= 32) {
    proteinScore = 12;
  } else if (proteinEnergyPct >= 10 && proteinEnergyPct <= 42) {
    proteinScore = 8;
  }

  // 2. Calorie density per 100g (0 - 10)
  const totalGramsPerServing = servings > 0 && totalDishWeightGrams > 0
    ? totalDishWeightGrams / servings
    : 0;
  const caloriesPer100g = totalGramsPerServing > 0
    ? Math.round((calories / totalGramsPerServing) * 100)
    : 160;

  let densityScore = 4;
  if (caloriesPer100g <= 135) {
    densityScore = 10;
  } else if (caloriesPer100g <= 195) {
    densityScore = 8;
  } else if (caloriesPer100g <= 270) {
    densityScore = 5;
  } else {
    densityScore = 2;
  }

  // 3. Sugar moderation (0 - 8)
  let sugarScore = 8;
  if (sugar > 18) {
    sugarScore = 1;
  } else if (sugar > 10) {
    sugarScore = 4;
  } else if (sugar > 5) {
    sugarScore = 6;
  }

  const totalMacroScore = Math.min(30, proteinScore + densityScore + sugarScore);

  return {
    pillar: {
      score: totalMacroScore,
      maxScore: 30,
      label: 'Nährstoff- & Energie-Balance',
      explanation: `${proteinEnergyPct}% Eiweiß-Energie, ${caloriesPer100g} kcal/100g Dichte`,
    },
    proteinEnergyPct,
    caloriesPer100g,
  };
}

function calculateFiberPillar(fiberGrams: number): HealthScorePillar {
  let score = 2;
  if (fiberGrams >= 10) {
    score = 25;
  } else if (fiberGrams >= 7) {
    score = 20;
  } else if (fiberGrams >= 4.5) {
    score = 14;
  } else if (fiberGrams >= 2.5) {
    score = 8;
  }

  return {
    score,
    maxScore: 25,
    label: 'Ballaststoffe & Sättigung',
    explanation: `${fiberGrams}g Ballaststoffe pro Portion (DGE-Richtwert: ≥30g/Tag)`,
  };
}

function calculatePlantPillar(
  vegGramsPerServing: number,
  plantCount: number
): HealthScorePillar {
  // 1. Vegetable/fruit quantity (0 - 15)
  let vegScore = 0;
  if (vegGramsPerServing >= 200) {
    vegScore = 15;
  } else if (vegGramsPerServing >= 140) {
    vegScore = 11;
  } else if (vegGramsPerServing >= 80) {
    vegScore = 7;
  } else if (vegGramsPerServing >= 30) {
    vegScore = 3;
  }

  // 2. Plant diversity (0 - 10)
  let diversityScore = 2;
  if (plantCount >= 6) {
    diversityScore = 10;
  } else if (plantCount >= 4) {
    diversityScore = 7;
  } else if (plantCount >= 2) {
    diversityScore = 4;
  }

  const score = Math.min(25, vegScore + diversityScore);
  return {
    score,
    maxScore: 25,
    label: 'Pflanzenkraft & Vielfalt',
    explanation: `${vegGramsPerServing}g Gemüse/Obst, ${plantCount} verschiedene Pflanzen`,
  };
}

function calculatePurityPillar(averageNova: number | null): HealthScorePillar {
  let score = 15; // default for home-cooked recipes without explicit OFF NOVA
  if (averageNova !== null) {
    if (averageNova <= 1.4) score = 20;
    else if (averageNova <= 2.2) score = 16;
    else if (averageNova <= 2.9) score = 12;
    else if (averageNova <= 3.5) score = 7;
    else score = 2;
  }

  return {
    score,
    maxScore: 20,
    label: 'Zutaten-Reinheit & Clean Eating',
    explanation: averageNova ? `Durchschnittlicher NOVA-Grad ${averageNova} (1 = Vollwert, 4 = UPF)` : 'Frisch zubereitet mit Grundzutaten',
  };
}

export function computeRecipeHealthScore(recipe: Recipe): {
  score: number;
  breakdown: HealthScoreBreakdown;
} {
  const servings = recipe.servings && recipe.servings > 0 ? recipe.servings : 1;
  const nutrition = recipe.nutritionalValues ?? {};
  const calories = Number(nutrition.calories) || 0;
  const protein = Number(nutrition.protein) || 0;
  const fiber = Number(nutrition.fiber) || 0;
  const sugar = Number(nutrition.sugar) || 0;

  // Flatten ingredients and compute metrics
  let totalDishWeightGrams = 0;
  let totalVegWeightGrams = 0;
  const distinctPlants = new Set<string>();
  let novaSum = 0;
  let novaWeight = 0;

  if (recipe.ingredients) {
    for (const group of recipe.ingredients) {
      const groupCategory = (group.name || '').toUpperCase().trim();
      for (const item of group.items || []) {
        const itemCategory = (item.category || groupCategory).toUpperCase().trim();
        const grams = calculateWeightGrams(item.amount, item.unit, null, item.gramsPerUnit);
        totalDishWeightGrams += grams;

        if (isVegetableOrFruitCategory(itemCategory)) {
          totalVegWeightGrams += grams;
        }

        if (isPlantCategory(itemCategory)) {
          const key = (item.baseName || item.name || '').toLowerCase().trim();
          if (key) distinctPlants.add(key);
        }

        if (item.novaGroup !== undefined && item.novaGroup !== null && grams > 0) {
          novaSum += item.novaGroup * grams;
          novaWeight += grams;
        }
      }
    }
  }

  const vegetableGramsPerServing = Math.round(totalVegWeightGrams / servings);
  const plantIngredientsCount = distinctPlants.size;
  const averageNovaGroup = novaWeight > 0 ? Math.round((novaSum / novaWeight) * 10) / 10 : null;

  const macroPillarRes = calculateMacroPillar(calories, protein, sugar, totalDishWeightGrams, servings);
  const fiberPillar = calculateFiberPillar(fiber);
  const plantPillar = calculatePlantPillar(vegetableGramsPerServing, plantIngredientsCount);
  const purityPillar = calculatePurityPillar(averageNovaGroup);

  const totalScore = Math.max(0, Math.min(100, Math.round(
    macroPillarRes.pillar.score +
    fiberPillar.score +
    plantPillar.score +
    purityPillar.score
  )));

  const highlights: string[] = [];
  const cautions: string[] = [];

  if (vegetableGramsPerServing >= 150) {
    highlights.push(`Reich an Gemüse (${vegetableGramsPerServing}g pro Portion)`);
  } else if (vegetableGramsPerServing < 40) {
    cautions.push('Geringer Gemüseanteil (< 40g)');
  }

  if (fiber >= 6) {
    highlights.push(`Hoher Ballaststoffgehalt (${fiber}g)`);
  } else if (fiber < 2.5) {
    cautions.push('Wenig Ballaststoffe (< 2.5g)');
  }

  if (macroPillarRes.proteinEnergyPct >= 16 && macroPillarRes.proteinEnergyPct <= 35) {
    highlights.push(`Gutes Eiweiß-Verhältnis (${macroPillarRes.proteinEnergyPct}% der Kalorien)`);
  }

  if (plantIngredientsCount >= 5) {
    highlights.push(`Hohe Pflanzenvielfalt (${plantIngredientsCount} Pflanzenzutaten)`);
  }

  if (sugar >= 12) {
    cautions.push(`Erhöhter Zuckergehalt (${sugar}g pro Portion)`);
  }

  if (averageNovaGroup && averageNovaGroup <= 1.5) {
    highlights.push('Überwiegend naturbelassene Vollwertzutaten (NOVA 1)');
  } else if (averageNovaGroup && averageNovaGroup >= 3.3) {
    cautions.push('Hoher Anteil industriell verarbeiteter Zutaten (NOVA 3-4)');
  }

  let smartSwapTip: string | null = null;
  if (sugar >= 12) {
    smartSwapTip = 'Tipp: Zucker oder süße Saucen reduzieren, um den Score weiter zu steigern.';
  } else if (fiber < 3 && vegetableGramsPerServing < 100) {
    smartSwapTip = 'Tipp: Eine Extraportion Gemüse oder Vollkorn hinzufügen für mehr Ballaststoffe.';
  }

  const breakdown: HealthScoreBreakdown = {
    score: totalScore,
    grade: getGrade(totalScore),
    pillars: {
      macroBalance: macroPillarRes.pillar,
      fiberSatiety: fiberPillar,
      plantPower: plantPillar,
      processingPurity: purityPillar,
    },
    metrics: {
      caloriesPer100g: macroPillarRes.caloriesPer100g,
      fiberGramsPerServing: fiber,
      sugarGramsPerServing: sugar,
      vegetableGramsPerServing,
      plantIngredientsCount,
      averageNovaGroup,
      proteinEnergyPct: macroPillarRes.proteinEnergyPct,
    },
    highlights,
    cautions,
    smartSwapTip,
  };

  return { score: totalScore, breakdown };
}
