import { Clock } from 'lucide-react';
import { useI18n } from '../../context/I18nContext';

export interface HeroInfoPillsProps {
  totalTime: string | null;
  calories?: number | null;
  score?: number | null;
  scoreLetter?: string | null;
  scoreColors?: { pillBg: string } | null;
  isVital?: boolean;
  protein?: number | null;
  vegGrams?: number | null;
  hasImage: boolean;
}

export default function HeroInfoPills({
  totalTime,
  calories,
  score = null,
  scoreLetter = null,
  scoreColors = null,
  isVital = false,
  protein,
  vegGrams,
  hasImage,
}: HeroInfoPillsProps) {
  const { t } = useI18n();

  const hasScore = score !== null && scoreLetter && scoreColors;
  const hasCalories = calories !== undefined && calories !== null;

  return (
    <div
      className={`flex items-center gap-1.5 text-[10px] sm:text-[11px] font-semibold flex-wrap mb-1.5 ${
        hasImage ? 'text-white/90 drop-shadow-xs' : 'text-gray-700 dark:text-white/90'
      }`}
    >
      {totalTime && (
        <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/90 text-white font-bold text-[10px] shadow-xs shrink-0">
          <Clock className="w-2.5 h-2.5 text-white shrink-0" />
          <span>{totalTime}</span>
        </span>
      )}

      {/* Calories vor Health Score direkt nebeneinander */}
      {hasCalories || hasScore ? (
        <div className="flex items-center gap-1 shrink-0">
          {totalTime && (
            <span className={`text-[9px] mr-0.5 ${hasImage ? 'text-white/30' : 'text-gray-400 dark:text-white/30'}`}>
              •
            </span>
          )}
          {hasCalories && (
            <span className={`font-medium ${hasImage ? 'text-white/90' : 'text-gray-600 dark:text-white/90'}`}>
              {Math.round(calories!)} kcal
            </span>
          )}
          {hasScore && (
            <span
              className={`w-3.5 h-3.5 rounded-full ${scoreColors!.pillBg} text-white font-black text-[9px] flex items-center justify-center leading-none shadow-md shrink-0 select-none`}
              title={`Health Score: ${scoreLetter} (${score}/100)`}
            >
              {scoreLetter}
            </span>
          )}
        </div>
      ) : null}

      {isVital && protein && protein > 0 && (
        <div className="flex items-center gap-1 shrink-0">
          {(totalTime || hasCalories || hasScore) && (
            <span className={`text-[9px] ${hasImage ? 'text-white/30' : 'text-gray-400 dark:text-white/30'}`}>•</span>
          )}
          <span className={`font-medium ${hasImage ? 'text-white/90' : 'text-gray-600 dark:text-white/90'}`}>
            {Math.round(protein)}g Protein
          </span>
        </div>
      )}
      {isVital && vegGrams && vegGrams > 0 && (
        <div className="flex items-center gap-1 shrink-0">
          {(totalTime || hasCalories || hasScore || (protein && protein > 0)) && (
            <span className={`text-[9px] ${hasImage ? 'text-white/30' : 'text-gray-400 dark:text-white/30'}`}>•</span>
          )}
          <span className={`font-medium ${hasImage ? 'text-white/90' : 'text-gray-600 dark:text-white/90'}`}>
            {t('catalog.magazine.vegGrams', { grams: Math.round(vegGrams) })}
          </span>
        </div>
      )}
    </div>
  );
}
