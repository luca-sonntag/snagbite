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
    ? veg >= 200 ? 'WHO goal met (≥200g)' : veg > 0 ? 'Goal: ≥200g' : 'Little vegetables'
    : veg >= 200 ? 'WHO-Ziel erreicht (≥200g)' : veg > 0 ? 'Ziel: ≥200g' : 'Kaum Gemüse';

  const fiberSubtext = isEn
    ? fiber >= 10 ? 'High satiety (≥10g)' : fiber > 0 ? 'Goal: ≥30g/day' : 'Low fiber'
    : fiber >= 10 ? 'Hohe Sättigung (≥10g)' : fiber > 0 ? 'Tagesziel: 30g' : 'Wenig Ballaststoffe';

  const plantSubtext = isEn
    ? plants >= 5 ? 'Diverse microbiome' : 'Basic diversity'
    : plants >= 5 ? 'Vielfältiges Mikrobiom' : 'Basis-Pflanzen';

  const sugarSubtext = isEn
    ? sugar <= 5 ? 'Very low sugar' : sugar <= 15 ? 'Moderate sweetness' : 'Higher sugar'
    : sugar <= 5 ? 'Sehr zuckerarm' : sugar <= 15 ? 'Moderate Süße' : 'Erhöhter Zucker';

  return (
    <div className="grid grid-cols-2 gap-2.5 select-none">
      {/* 1. Gemüse & Obst */}
      <div className="bg-white dark:bg-gray-900 p-3.5 sm:p-4 rounded-2xl border-none shadow-[0_2px_6px_rgba(0,0,0,0.03)] flex flex-col justify-between">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 dark:text-gray-300">
          <Salad className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span className="truncate">{isEn ? 'Veggies & Fruit' : 'Gemüse & Obst'}</span>
        </div>
        <div className="text-xl font-bold text-gray-900 dark:text-white tabular-nums tracking-tight my-1">
          {veg}g
        </div>
        <div className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
          {vegSubtext}
        </div>
      </div>

      {/* 2. Ballaststoffe */}
      <div className="bg-white dark:bg-gray-900 p-3.5 sm:p-4 rounded-2xl border-none shadow-[0_2px_6px_rgba(0,0,0,0.03)] flex flex-col justify-between">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 dark:text-gray-300">
          <Wheat className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
          <span className="truncate">{isEn ? 'Fiber' : 'Ballaststoffe'}</span>
        </div>
        <div className="text-xl font-bold text-gray-900 dark:text-white tabular-nums tracking-tight my-1">
          {fiber}g
        </div>
        <div className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
          {fiberSubtext}
        </div>
      </div>

      {/* 3. Pflanzenvielfalt */}
      <div className="bg-white dark:bg-gray-900 p-3.5 sm:p-4 rounded-2xl border-none shadow-[0_2px_6px_rgba(0,0,0,0.03)] flex flex-col justify-between">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 dark:text-gray-300">
          <Sprout className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span className="truncate">{isEn ? 'Plant Diversity' : 'Pflanzenvielfalt'}</span>
        </div>
        <div className="text-xl font-bold text-gray-900 dark:text-white tabular-nums tracking-tight my-1">
          {plants} {isEn ? (plants === 1 ? 'type' : 'types') : (plants === 1 ? 'Art' : 'Arten')}
        </div>
        <div className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
          {plantSubtext}
        </div>
      </div>

      {/* 4. Zuckergehalt */}
      <div className="bg-white dark:bg-gray-900 p-3.5 sm:p-4 rounded-2xl border-none shadow-[0_2px_6px_rgba(0,0,0,0.03)] flex flex-col justify-between">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 dark:text-gray-300">
          <Candy className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
          <span className="truncate">{isEn ? 'Sugar' : 'Zuckergehalt'}</span>
        </div>
        <div className="text-xl font-bold text-gray-900 dark:text-white tabular-nums tracking-tight my-1">
          {sugar}g
        </div>
        <div className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
          {sugarSubtext}
        </div>
      </div>
    </div>
  );
}
