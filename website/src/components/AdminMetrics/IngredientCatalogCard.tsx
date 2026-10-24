import { useState } from 'react';
import { Database, Sparkles } from 'lucide-react';
import { apiUrl } from '../../api';
import type { IngredientCatalogMetrics, TopIngredientItem } from './types';

interface IngredientCatalogCardProps {
  isDe: boolean;
  catalog?: IngredientCatalogMetrics;
}

function IngredientIconThumb({ item }: { item: TopIngredientItem }) {
  const [failed, setFailed] = useState(false);
  const src = item.iconSlug ? apiUrl(`/api/ingredient-icons/${item.iconSlug}.webp`) : null;

  if (!src || failed) {
    return (
      <div className="w-9 h-9 rounded-2xl bg-emerald-500/10 text-emerald-700 flex items-center justify-center font-bold text-xs shrink-0">
        {(item.mappingKeyDe || item.mappingKey || '?').charAt(0).toUpperCase()}
      </div>
    );
  }

  return (
    <div className="w-9 h-9 rounded-2xl bg-gray-100 p-1 flex items-center justify-center shrink-0 overflow-hidden">
      <img
        src={src}
        alt={item.mappingKey}
        onError={() => setFailed(true)}
        className="w-full h-full object-contain"
        loading="lazy"
      />
    </div>
  );
}

export function IngredientCatalogCard({ isDe, catalog }: IngredientCatalogCardProps) {
  const data: IngredientCatalogMetrics = catalog ?? {
    totalMappings: 0,
    offMatchCount: 0,
    offMatchPct: 0,
    aiEstimateCount: 0,
    aiEstimatePct: 0,
    noMatchCount: 0,
    noMatchPct: 0,
    avgRecipeNutritionCoveragePct: 0,
    topIngredients: [],
  };

  const maxHits = Math.max(...data.topIngredients.map((i) => i.hitCount), 1);

  return (
    <div className="p-5 sm:p-6 rounded-3xl bg-white shadow-[0_2px_6px_rgba(0,0,0,0.03)] flex flex-col gap-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600">
            <Database className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900">
              {isDe
                ? 'Zutaten-Katalog & OpenFoodFacts Coverage'
                : 'Ingredient Catalog & OpenFoodFacts Coverage'}
            </h3>
            <p className="text-xs text-gray-500">
              {isDe
                ? 'Kanonische Zutaten-Auflösung, Nährwert-Abdeckung & Top 20 meistverwendete Zutaten'
                : 'Canonical ingredient resolution, nutrition coverage & top 20 most used ingredients'}
            </p>
          </div>
        </div>
        <span className="self-start sm:self-center px-2.5 py-1 rounded-full text-[10px] font-bold bg-gray-100 text-gray-600 shrink-0">
          Global Snapshot
        </span>
      </div>

      {/* 3 KPI Summary Pills */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 rounded-2xl bg-gray-50 flex flex-col gap-1">
          <span className="text-xs font-semibold text-gray-500">
            {isDe ? 'Gemappte Zutaten' : 'Mapped Ingredients'}
          </span>
          <span className="text-2xl font-bold text-gray-900 font-mono">
            {data.totalMappings.toLocaleString()}
          </span>
          <span className="text-[11px] text-gray-500">
            in <code className="font-mono">ingredient_mappings</code>
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-emerald-500/10 flex flex-col gap-1">
          <span className="text-xs font-semibold text-emerald-700">
            OpenFoodFacts Produkt-Match
          </span>
          <span className="text-2xl font-bold text-emerald-900 font-mono">
            {data.offMatchPct}%
          </span>
          <span className="text-[11px] text-emerald-700">
            {data.offMatchCount.toLocaleString()} OFF | {data.aiEstimateCount.toLocaleString()}{' '}
            {isDe ? 'KI-Schätzung' : 'AI Estimate'} ({data.aiEstimatePct}%)
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-teal-500/10 flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-teal-700">
              {isDe ? 'Ø Rezept-Nährwert-Coverage' : 'Avg Recipe Nutrition Coverage'}
            </span>
            <Sparkles className="w-3.5 h-3.5 text-teal-600" />
          </div>
          <span className="text-2xl font-bold text-teal-900 font-mono">
            {data.avgRecipeNutritionCoveragePct}%
          </span>
          <span className="text-[11px] text-teal-700">
            {isDe
              ? 'Abgedeckte Zutaten pro Rezept'
              : 'Covered ingredients per recipe'}
          </span>
        </div>
      </div>

      {/* Top 20 Ingredients Leaderboard */}
      <div className="flex flex-col gap-3">
        <h4 className="text-sm font-bold text-gray-900">
          {isDe
            ? 'Top 20 Zutaten nach Häufigkeit (hit_count)'
            : 'Top 20 Ingredients by Frequency (hit_count)'}
        </h4>

        {data.topIngredients.length === 0 ? (
          <div className="py-8 text-center text-xs text-gray-500 bg-gray-50 rounded-2xl">
            {isDe ? 'Noch keine Zutaten-Mappings vorhanden.' : 'No ingredient mappings yet.'}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {data.topIngredients.map((item, idx) => {
              const barPct = (item.hitCount / maxHits) * 100;
              const isOff =
                item.resolution &&
                !item.resolution.toLowerCase().includes('no_match') &&
                !item.resolution.toLowerCase().includes('ai');

              return (
                <div
                  key={`${item.mappingKey}-${item.category}-${idx}`}
                  className="p-3 rounded-2xl bg-gray-50 flex items-center gap-3"
                >
                  <span className="w-5 text-xs font-bold font-mono text-gray-400 shrink-0">
                    #{idx + 1}
                  </span>
                  <IngredientIconThumb item={item} />
                  <div className="flex-1 min-w-0 flex flex-col gap-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0 truncate">
                        <span className="text-xs font-bold text-gray-900">
                          {item.mappingKeyDe || item.mappingKey}
                        </span>
                        {item.mappingKeyDe && item.mappingKeyDe !== item.mappingKey && (
                          <span className="text-[11px] text-gray-400 font-mono ml-1.5">
                            ({item.mappingKey})
                          </span>
                        )}
                      </div>
                      <span className="text-xs font-bold font-mono text-gray-900 shrink-0">
                        {item.hitCount}×
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-white h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-emerald-600 h-full rounded-full transition-all"
                          style={{ width: `${Math.min(barPct, 100)}%` }}
                        />
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold shrink-0 ${
                          isOff
                            ? 'bg-emerald-500/10 text-emerald-700'
                            : 'bg-amber-500/10 text-amber-700'
                        }`}
                      >
                        {isOff ? 'OFF' : 'AI'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
