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
  const protein = r.nutritionalValues?.protein;
  const score = typeof r.healthScore === 'number' ? r.healthScore : null;
  const scoreColor = score !== null ? getHealthScoreColor(score) : null;
  const scoreLetter = score !== null ? getHealthScoreLetter(score) : null;

  return (
    <div
      onClick={(e) => {
        hapticLight();
        onClick(e);
      }}
      className="group relative flex-1 h-full flex items-center gap-2.5 p-2 sm:p-2.5 rounded-2xl bg-white dark:bg-gray-900/90 shadow-[0_2px_12px_rgba(0,0,0,0.04)] border-none cursor-pointer active:scale-[0.98] hover:shadow-md transition-all duration-150 select-none overflow-hidden"
    >
      {/* Thumbnail with overlay time badge */}
      <div className="relative w-14 h-14 sm:w-16 sm:h-16 shrink-0 rounded-xl overflow-hidden bg-black/5 dark:bg-white/5">
        <CachedImage
          src={r.imageUrl}
          emoji={r.emoji}
          alt={r.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 pointer-events-none select-none"
        />
        {totalTime && (
          <div className="absolute bottom-1 right-1 px-1 py-0.5 rounded-md bg-black/75 backdrop-blur-xs text-[9px] font-semibold text-white flex items-center gap-0.5 pointer-events-none">
            <Clock className="w-2.5 h-2.5 shrink-0 text-emerald-300" />
            <span>{totalTime}</span>
          </div>
        )}
        {job.isFavorite && (
          <div className="absolute top-1 left-1 w-4 h-4 rounded-md bg-black/40 backdrop-blur-xs flex items-center justify-center text-amber-400 pointer-events-none">
            <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 flex flex-col justify-center gap-1">
        {/* Top line: Health Score Pill or Category */}
        <div className="flex items-center gap-1.5">
          {score !== null && scoreLetter && scoreColor ? (
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${scoreColor.badgeBg} ${scoreColor.badgeText}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${scoreColor.pillBg}`} />
              <span>Score {score} • {scoreLetter}</span>
            </span>
          ) : r.category ? (
            <span className="text-[10px] font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
              {r.category}
            </span>
          ) : null}
        </div>

        {/* Title */}
        <h4 className="text-sm font-bold text-gray-900 dark:text-white leading-tight line-clamp-2 tracking-tight group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
          {r.title}
        </h4>

        {/* Bottom meta: calories & protein */}
        <div className="flex items-center gap-1.5 text-[11px] text-gray-500 dark:text-gray-400 font-medium truncate">
          {caloriesFormatted && <span className="shrink-0">{caloriesFormatted}</span>}
          {caloriesFormatted && protein && protein > 0 && <span className="shrink-0">•</span>}
          {protein && protein > 0 && (
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold shrink-0">
              {Math.round(protein)}g Protein
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
