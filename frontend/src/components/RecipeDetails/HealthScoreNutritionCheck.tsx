import { Check, AlertCircle, ShieldCheck } from 'lucide-react';

interface HealthScoreNutritionCheckProps {
  highlights: string[];
  cautions: string[];
  isEn?: boolean;
}

function cleanHumanText(text: string): string {
  return text
    .replace(/\s*\(NOVA\s*1\)/i, '')
    .replace(/\s*\(NOVA\s*3-4\)/i, '')
    .replace(/<\s*40g/i, 'unter 40g')
    .replace(/<\s*2\.5g/i, 'unter 2,5g')
    .trim();
}

export default function HealthScoreNutritionCheck({
  highlights,
  cautions,
  isEn = false,
}: HealthScoreNutritionCheckProps) {
  if (highlights.length === 0 && cautions.length === 0) return null;

  return (
    <div className="bg-white dark:bg-gray-850 p-4 sm:p-4.5 rounded-3xl ring-1 ring-black/[0.04] dark:ring-white/[0.06] shadow-xs border-none flex flex-col gap-3 select-none">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
          <ShieldCheck className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          <span>{isEn ? 'Nutrition Audit' : 'Ernährungs-Check'}</span>
        </div>
        <div className="flex items-center gap-2 text-[11px] font-semibold text-gray-400 dark:text-gray-500">
          {highlights.length > 0 && (
            <span className="text-emerald-700 dark:text-emerald-400">
              +{highlights.length} {isEn ? 'pros' : 'Stärken'}
            </span>
          )}
          {highlights.length > 0 && cautions.length > 0 && <span>·</span>}
          {cautions.length > 0 && (
            <span className="text-amber-700 dark:text-amber-400">
              {cautions.length} {isEn ? 'to watch' : 'Tipps'}
            </span>
          )}
        </div>
      </div>

      {/* Row items with clean dividers */}
      <div className="flex flex-col divide-y divide-gray-100 dark:divide-gray-800/60">
        {/* Positive highlights */}
        {highlights.map((h, i) => (
          <div key={`h-${i}`} className="flex items-start gap-2.5 py-2.5 first:pt-0.5 last:pb-0.5">
            <div className="w-5 h-5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
              <Check className="w-3.5 h-3.5 stroke-[2.5]" />
            </div>
            <span className="text-xs font-medium text-gray-800 dark:text-gray-200 leading-snug flex-1">
              {cleanHumanText(h)}
            </span>
          </div>
        ))}

        {/* Cautionary points */}
        {cautions.map((c, i) => (
          <div key={`c-${i}`} className="flex items-start gap-2.5 py-2.5 first:pt-0.5 last:pb-0.5">
            <div className="w-5 h-5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
              <AlertCircle className="w-3.5 h-3.5 stroke-[2.5]" />
            </div>
            <span className="text-xs font-medium text-gray-800 dark:text-gray-200 leading-snug flex-1">
              {cleanHumanText(c)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
