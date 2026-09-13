import type { MouseEvent } from 'react';
import { Clock, Star } from 'lucide-react';
import type { SavedRecipe } from '../../types';
import CachedImage from '../CachedImage';
import { hapticLight } from '../../utils/haptics';
import { getRecipeCalories, formatCalories } from '../../utils/formatNutrition';
import { getHealthScoreColor, getHealthScoreLetter } from '../RecipeDetails/HealthScoreBadge';

interface RecipeCompactCardProps {
  job: SavedRecipe;
  totalTime: string | null;
  onClick: (e: MouseEvent) => void;
}

/**
 * Compact horizontal card for Bento stacks and quick dish rows.
 * Features a square thumbnail with overlaid duration badge, Health Score pill,
 * and high-contrast typography adhering to anti-slop guidelines.
 */
export default function RecipeCompactCard({
  job,
  totalTime,
  onClick,
}: RecipeCompactCardProps) {
  const r = job.recipe;
  if (!r) return null;

  const calories = getRecipeCalories(r);
  const caloriesFormatted = formatCalories(calories);
  const score = typeof r.healthScore === 'number' ? r.healthScore : null;
  const scoreColor = score !== null ? getHealthScoreColor(score) : null;
  const scoreLetter = score !== null ? getHealthScoreLetter(score) : null;

  return (
    <div
      onClick={(e) => {
        hapticLight();
        onClick(e);
      }}
      className="group relative flex-1 min-w-0 flex items-stretch rounded-2xl bg-white dark:bg-gray-900/90 shadow-[0_2px_12px_rgba(0,0,0,0.04)] border-none cursor-pointer active:scale-[0.98] hover:shadow-md transition-all duration-150 select-none overflow-hidden"
    >
      {/* Thumbnail: Full card height presentation */}
      <div className="relative w-22 sm:w-26 shrink-0 overflow-hidden bg-black/5 dark:bg-white/5 self-stretch">
        <CachedImage
          src={r.imageUrl}
          emoji={r.emoji}
          alt={r.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 pointer-events-none select-none"
        />

        {/* Subtle dark gradient scrim at the bottom for duration contrast */}
        {totalTime && (
          <div className="absolute inset-x-0 bottom-0 h-9 bg-gradient-to-t from-black/65 via-black/25 to-transparent pointer-events-none" />
        )}

        {/* Dauer links unten im Cover: neutral grau mit feinem Scrim */}
        {totalTime && (
          <div className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-black/55 backdrop-blur-xs text-white text-[9.5px] font-semibold flex items-center gap-1 shadow-xs pointer-events-none">
            <Clock className="w-2.5 h-2.5 shrink-0 text-white/80" />
            <span>{totalTime}</span>
          </div>
        )}

        {job.isFavorite && (
          <div className="absolute top-1.5 left-1.5 w-5 h-5 rounded-full bg-black/40 backdrop-blur-xs flex items-center justify-center text-amber-400 pointer-events-none">
            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 flex flex-col justify-between p-2.5 sm:p-3 overflow-hidden">
        {/* Title */}
        <h4 className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white leading-tight line-clamp-3 tracking-tight group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors my-auto py-0.5 break-words [overflow-wrap:anywhere]">
          {r.title}
        </h4>

        {/* Bottom line: Calories (left) & Health Score (right) */}
        <div className="flex items-center justify-between gap-1 text-[11px] text-gray-500 dark:text-gray-400 font-medium mt-auto pt-1 select-none">
          {caloriesFormatted ? (
            <span className="shrink-0 whitespace-nowrap">{caloriesFormatted}</span>
          ) : <span />}

          {/* Health Score rechts unten: nur Buchstabe */}
          {score !== null && scoreLetter && scoreColor && (
            <span
              className={`w-4 h-4 rounded-full ${scoreColor.pillBg} text-white font-black text-[9.5px] flex items-center justify-center leading-none shadow-2xs shrink-0 ml-auto select-none`}
              title={`Health Score: ${scoreLetter} (${score}/100)`}
            >
              {scoreLetter}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
