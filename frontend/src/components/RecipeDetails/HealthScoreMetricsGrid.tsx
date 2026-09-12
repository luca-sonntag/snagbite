import { Salad, Wheat, Sprout, Candy } from 'lucide-react';
import type { HealthScoreBreakdown } from '../../types';

interface HealthScoreMetricsGridProps {
  metrics: HealthScoreBreakdown['metrics'];
  isEn: boolean;
}

export default function HealthScoreMetricsGrid({
  metrics,
  isEn,
}: HealthScoreMetricsGridProps) {
  const veg = metrics.vegetableGramsPerServing ?? 0;
  const fiber = metrics.fiberGramsPerServing ?? 0;
  const plants = metrics.plantIngredientsCount ?? 0;
  const sugar = metrics.sugarGramsPerServing ?? 0;

  const vegSubtext = isEn
    ? veg >= 200 ? 'WHO goal met (≥200g)' : 'Goal: ≥200g per serv.'
    : veg >= 200 ? 'WHO-Ziel erreicht (≥200g)' : 'Ziel: ≥200g pro Port.';

  const fiberSubtext = isEn
    ? fiber >= 10 ? 'High satiety (≥10g)' : 'DGE daily goal: 30g'
    : fiber >= 10 ? 'Hohe Sättigung (≥10g)' : 'DGE-Tagesziel: 30g';

  const plantSubtext = isEn
    ? plants >= 5 ? 'Diverse microbiome' : 'Basic plant diversity'
    : plants >= 5 ? 'Vielfältiges Mikrobiom' : 'Basis-Pflanzenvielfalt';

  const sugarSubtext = isEn
    ? sugar <= 5 ? 'Very low sugar' : sugar <= 15 ? 'Moderate sweetness' : 'Higher sugar'
    : sugar <= 5 ? 'Sehr zuckerarm' : sugar <= 15 ? 'Moderate Süße' : 'Erhöhter Zucker';

  return (
    <div className="grid grid-cols-2 gap-2.5">
      {/* 1. Gemüse & Obst */}
      <div className="bg-gray-50/90 dark:bg-gray-800/50 rounded-2xl p-3 flex flex-col justify-between border-none">
        <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400">
          <Salad className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span className="truncate">{isEn ? 'Veggies & Fruit' : 'Gemüse & Obst'}</span>
        </div>
        <div className="text-lg font-bold text-gray-900 dark:text-white tabular-nums mt-1.5">
          {veg}g
        </div>
        <div className="text-[10.5px] text-gray-400 dark:text-gray-500 mt-0.5 truncate">
          {vegSubtext}
        </div>
      </div>

      {/* 2. Ballaststoffe */}
      <div className="bg-gray-50/90 dark:bg-gray-800/50 rounded-2xl p-3 flex flex-col justify-between border-none">
        <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400">
          <Wheat className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
          <span className="truncate">{isEn ? 'Fiber' : 'Ballaststoffe'}</span>
        </div>
        <div className="text-lg font-bold text-gray-900 dark:text-white tabular-nums mt-1.5">
          {fiber}g
        </div>
        <div className="text-[10.5px] text-gray-400 dark:text-gray-500 mt-0.5 truncate">
          {fiberSubtext}
        </div>
      </div>

      {/* 3. Pflanzenarten */}
      <div className="bg-gray-50/90 dark:bg-gray-800/50 rounded-2xl p-3 flex flex-col justify-between border-none">
        <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400">
          <Sprout className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span className="truncate">{isEn ? 'Plant Diversity' : 'Pflanzenvielfalt'}</span>
        </div>
        <div className="text-lg font-bold text-gray-900 dark:text-white tabular-nums mt-1.5">
          {plants} {isEn ? 'Types' : 'Arten'}
        </div>
        <div className="text-[10.5px] text-gray-400 dark:text-gray-500 mt-0.5 truncate">
          {plantSubtext}
        </div>
      </div>

      {/* 4. Zuckergehalt */}
      <div className="bg-gray-50/90 dark:bg-gray-800/50 rounded-2xl p-3 flex flex-col justify-between border-none">
        <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400">
          <Candy className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
          <span className="truncate">{isEn ? 'Sugar' : 'Zuckergehalt'}</span>
        </div>
        <div className="text-lg font-bold text-gray-900 dark:text-white tabular-nums mt-1.5">
          {sugar}g
        </div>
        <div className="text-[10.5px] text-gray-400 dark:text-gray-500 mt-0.5 truncate">
          {sugarSubtext}
        </div>
      </div>
    </div>
  );
}
