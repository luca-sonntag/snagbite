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
    <div className="bg-gray-50 dark:bg-gray-800/80 p-4 sm:p-5 rounded-3xl border-none shadow-[0_2px_6px_rgba(0,0,0,0.02)] flex flex-col gap-3 select-none">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4.5 h-4.5 text-emerald-600 dark:text-emerald-400" />
          <span className="text-sm font-bold text-gray-900 dark:text-white">
            {isEn ? 'Nutrition Audit' : 'Ernährungs-Check'}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-500 dark:text-gray-400">
          {highlights.length > 0 && (
            <span className="text-emerald-600 dark:text-emerald-400">
              +{highlights.length} {isEn ? 'pros' : 'Vorteile'}
            </span>
          )}
          {highlights.length > 0 && cautions.length > 0 && <span className="opacity-40">·</span>}
          {cautions.length > 0 && (
            <span className="text-amber-600 dark:text-amber-400">
              {cautions.length} {isEn ? (cautions.length === 1 ? 'tip' : 'tips') : (cautions.length === 1 ? 'Tipp' : 'Tipps')}
            </span>
          )}
        </div>
      </div>

      {/* Item list without dividing borders */}
      <div className="flex flex-col gap-2 pt-0.5">
        {/* Positive highlights */}
        {highlights.map((h, i) => (
          <div key={`h-${i}`} className="flex items-start gap-2.5 py-1">
            <div className="w-5 h-5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
              <Check className="w-3.5 h-3.5 stroke-[2.5]" />
            </div>
            <span className="text-xs font-medium text-gray-700 dark:text-gray-200 leading-snug flex-1">
              {cleanHumanText(h)}
            </span>
          </div>
        ))}

        {/* Cautionary points */}
        {cautions.map((c, i) => (
          <div key={`c-${i}`} className="flex items-start gap-2.5 py-1">
            <div className="w-5 h-5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
              <AlertCircle className="w-3.5 h-3.5 stroke-[2.5]" />
            </div>
            <span className="text-xs font-medium text-gray-700 dark:text-gray-200 leading-snug flex-1">
              {cleanHumanText(c)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
