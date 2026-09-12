import { Plus, Minus } from 'lucide-react';
import { useI18n } from '../../context/I18nContext';

interface HealthScoreProsConsProps {
  highlights: string[];
  cautions: string[];
  isEn?: boolean;
}

/**
 * Clean, tactile Plus- and Minuspunkte list for the Healthy Score drawer.
 * Presents recipe strengths and cautionary aspects as soft-tinted cards with distinctive +/- badges.
 */
export default function HealthScoreProsCons({
  highlights,
  cautions,
  isEn = false,
}: HealthScoreProsConsProps) {
  const { t } = useI18n();

  if (highlights.length === 0 && cautions.length === 0) return null;

  return (
    <div className="flex flex-col gap-3.5 pt-0.5">
      {/* Pluspunkte / Highlights */}
      {highlights.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
              {t('recipe.healthScoreHighlightsTitle')}
            </span>
            <span className="text-[10.5px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded-full tabular-nums">
              +{highlights.length}
            </span>
          </div>

          <div className="flex flex-col gap-1.5">
            {highlights.map((h, i) => (
              <div
                key={`highlight-${i}`}
                className="flex items-center gap-2.5 p-2.5 rounded-2xl bg-emerald-500/[0.06] dark:bg-emerald-500/10 text-xs font-medium text-gray-800 dark:text-gray-200 border-none select-none"
              >
                <div className="w-5 h-5 rounded-lg bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0">
                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                </div>
                <span className="leading-snug flex-1">{h}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Minuspunkte / Zu beachten */}
      {cautions.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
              {t('recipe.healthScoreCautionsTitle')}
            </span>
            <span className="text-[10.5px] font-bold text-amber-700 dark:text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-full tabular-nums">
              {cautions.length} {isEn ? 'to watch' : 'Tipps'}
            </span>
          </div>

          <div className="flex flex-col gap-1.5">
            {cautions.map((c, i) => (
              <div
                key={`caution-${i}`}
                className="flex items-center gap-2.5 p-2.5 rounded-2xl bg-amber-500/[0.06] dark:bg-amber-500/10 text-xs font-medium text-gray-800 dark:text-gray-200 border-none select-none"
              >
                <div className="w-5 h-5 rounded-lg bg-amber-500/20 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0">
                  <Minus className="w-3.5 h-3.5 stroke-[2.5]" />
                </div>
                <span className="leading-snug flex-1">{c}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
