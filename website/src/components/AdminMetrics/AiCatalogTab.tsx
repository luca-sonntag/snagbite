import { Cpu } from 'lucide-react';
import type { AdminMetricsData } from './types';
import { IngredientCatalogCard } from './IngredientCatalogCard';

interface AiCatalogTabProps {
  isDe: boolean;
  metrics: AdminMetricsData;
  rangeLabel: string;
}

const FEATURE_LABELS: Record<string, { de: string; en: string }> = {
  extract_recipe: { de: 'Rezept-Extraktion (Gemini)', en: 'Recipe Extraction (Gemini)' },
  audit_recipe: { de: '2nd-Stage Recipe Audit', en: '2nd-Stage Recipe Audit' },
  resolve_ingredient: { de: 'Zutaten-Resolver (OFF)', en: 'Ingredient Resolver (OFF)' },
  chat_recipe: { de: 'Recipe Copilot Chat', en: 'Recipe Copilot Chat' },
  chat_chips: { de: 'Copilot Quick-Chips', en: 'Copilot Quick Chips' },
  remix_recipe: { de: 'Rezept KI-Remix', en: 'Recipe AI Remix' },
  verify_cook_photo: { de: 'Koch-Foto Verifikation', en: 'Cook Photo Verification' },
  notification_copy: { de: 'Smart Push Copywriting', en: 'Smart Push Copywriting' },
  select_best_frame: { de: 'Best-Frame Auswahl', en: 'Best Frame Selection' },
  transcribe_audio: { de: 'Audio-Transkription (Gemini)', en: 'Audio Transcription (Gemini)' },
  flux_cover_image: { de: 'KI-Cover-Generierung (FLUX.1)', en: 'AI Cover Generation (FLUX.1)' },
  whisper_audio: { de: 'Audio-Transkription (Whisper)', en: 'Audio Transcription (Whisper)' },
};

export function AiCatalogTab({ isDe, metrics, rangeLabel }: AiCatalogTabProps) {
  const breakdownEntries = Object.entries(metrics.llm?.breakdown ?? {}).sort(
    (a, b) => (b[1].cost ?? 0) - (a[1].cost ?? 0),
  );
  const dailyExtractions = metrics.jobs?.dailyStats ?? [];
  const dailyCosts = metrics.llm?.dailyCost || metrics.llm?.dailyStats || [];

  return (
    <div className="flex flex-col gap-5">
      {/* 1. LLM & AI Feature Breakdown */}
      <div className="p-5 sm:p-6 rounded-3xl bg-white shadow-[0_2px_6px_rgba(0,0,0,0.03)] flex flex-col gap-4 overflow-hidden">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600">
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">
                {isDe
                  ? 'LLM- & KI-Aufschlüsselung nach Feature'
                  : 'LLM & AI Breakdown by Feature'}
              </h3>
              <p className="text-xs text-gray-500">
                {isDe
                  ? 'Gemini, FLUX.1 Cover & Whisper Audio inkl. Kosten-Anteil, Latenz und Fehlerrate'
                  : 'Gemini, FLUX.1 Cover & Whisper Audio with cost share, latency, and error rate'}
              </p>
            </div>
          </div>
          <span className="text-xs font-semibold text-gray-500">{rangeLabel}</span>
        </div>

        {breakdownEntries.length === 0 ? (
          <div className="py-8 text-center text-xs text-gray-500 bg-gray-50 rounded-2xl">
            {isDe ? 'Keine KI-Aufrufe im gewählten Zeitraum.' : 'No AI calls in timeframe.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-700 border-collapse">
              <thead>
                <tr className="text-[11px] font-semibold text-gray-500">
                  <th className="pb-3 pr-3">{isDe ? 'Feature / Funktion' : 'Feature'}</th>
                  <th className="pb-3 px-2 text-right">{isDe ? 'Calls' : 'Calls'}</th>
                  <th className="pb-3 px-3 min-w-[130px]">
                    {isDe ? 'Kosten-Anteil' : 'Cost Share'}
                  </th>
                  <th className="pb-3 px-2 text-right">Tokens</th>
                  <th className="pb-3 px-2 text-right">{isDe ? 'Ø Dauer' : 'Avg Time'}</th>
                  <th className="pb-3 px-2 text-right">{isDe ? 'Fehlerrate' : 'Error Rate'}</th>
                  <th className="pb-3 pl-2 text-right">{isDe ? 'Kosten (USD)' : 'Cost (USD)'}</th>
                </tr>
              </thead>
              <tbody className="font-medium">
                {breakdownEntries.map(([key, val]) => {
                  const labelObj = FEATURE_LABELS[key];
                  const readable = labelObj ? (isDe ? labelObj.de : labelObj.en) : key;
                  const share = val.sharePct ?? 0;
                  const avgSec = val.avgDurationMs ? (val.avgDurationMs / 1000).toFixed(1) : '0.0';
                  const errRate = val.errorRatePct ?? 0;

                  return (
                    <tr key={key} className="text-gray-900 hover:bg-gray-50/80">
                      <td className="py-2.5 pr-3">
                        <div className="flex flex-col">
                          <span className="font-bold text-gray-900">{readable}</span>
                          <span className="text-[10px] font-mono text-gray-400">{key}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-2 text-right font-mono font-bold">{val.count}</td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-100 h-2 rounded-full overflow-hidden">
                            <div
                              className="bg-amber-500 h-full rounded-full transition-all"
                              style={{ width: `${Math.min(share, 100)}%` }}
                            />
                          </div>
                          <span className="w-10 text-right font-mono text-[11px] text-gray-600">
                            {share}%
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 px-2 text-right font-mono text-gray-600">
                        {val.tokens > 0 ? val.tokens.toLocaleString() : '—'}
                      </td>
                      <td className="py-2.5 px-2 text-right font-mono text-gray-600">
                        {avgSec}s
                      </td>
                      <td className="py-2.5 px-2 text-right font-mono">
                        <span
                          className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                            errRate > 5
                              ? 'bg-rose-500/10 text-rose-600'
                              : 'bg-emerald-500/10 text-emerald-700'
                          }`}
                        >
                          {errRate}%
                        </span>
                      </td>
                      <td className="py-2.5 pl-2 text-right font-mono font-bold text-amber-600">
                        ${val.cost.toFixed(4)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 2. Daily Extractions & Daily LLM Costs Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-5 sm:p-6 rounded-3xl bg-white shadow-[0_2px_6px_rgba(0,0,0,0.03)] flex flex-col gap-4">
          <h3 className="text-base font-bold text-gray-900">
            {isDe ? 'Tägliche Extraktionen' : 'Daily Extractions'} ({rangeLabel})
          </h3>
          {dailyExtractions.length > 0 ? (
            <div className="flex flex-col gap-2 max-h-60 overflow-y-auto pr-1">
              {dailyExtractions.map((stat) => {
                const maxCount = Math.max(...dailyExtractions.map((s) => s.count), 1);
                const pct = (stat.count / maxCount) * 100;
                return (
                  <div key={stat.date} className="flex items-center gap-3 text-xs">
                    <span className="w-14 sm:w-20 text-gray-500 font-mono font-medium shrink-0">
                      {stat.date.slice(5)}
                    </span>
                    <div className="flex-1 bg-gray-100 h-2.5 rounded-full overflow-hidden">
                      <div
                        className="bg-emerald-600 h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="w-7 text-right font-bold font-mono text-gray-900 shrink-0">
                      {stat.count}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-center text-xs text-gray-500 py-8 font-medium">
              {isDe ? 'Keine Extraktionen im Zeitraum.' : 'No extractions in timeframe.'}
            </p>
          )}
        </div>

        <div className="p-5 sm:p-6 rounded-3xl bg-white shadow-[0_2px_6px_rgba(0,0,0,0.03)] flex flex-col gap-4">
          <h3 className="text-base font-bold text-gray-900">
            {isDe ? 'Tägliche KI-Kosten' : 'Daily AI Costs'} ({rangeLabel})
          </h3>
          {dailyCosts.length > 0 ? (
            <div className="flex flex-col gap-2 max-h-60 overflow-y-auto pr-1">
              {dailyCosts.map((stat) => {
                const maxCost = Math.max(
                  ...dailyCosts.map((s) => Number(s.cost || 0)),
                  0.0001,
                );
                const costVal = Number(stat.cost || 0);
                const pct = (costVal / maxCost) * 100;
                return (
                  <div key={stat.date} className="flex items-center gap-3 text-xs">
                    <span className="w-14 sm:w-20 text-gray-500 font-mono font-medium shrink-0">
                      {stat.date.slice(5)}
                    </span>
                    <div className="flex-1 bg-gray-100 h-2.5 rounded-full overflow-hidden">
                      <div
                        className="bg-amber-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(pct, 100)}%` }}
                      />
                    </div>
                    <span className="w-16 text-right font-bold font-mono text-gray-900 shrink-0">
                      ${costVal.toFixed(4)}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-center text-xs text-gray-500 py-8 font-medium">
              {isDe ? 'Keine Kosten im Zeitraum.' : 'No costs in timeframe.'}
            </p>
          )}
        </div>
      </div>

      {/* 3. Ingredient Catalog & Top 20 Ingredients */}
      <IngredientCatalogCard
        isDe={isDe}
        catalog={metrics.pipeline?.ingredientCatalog}
      />
    </div>
  );
}
