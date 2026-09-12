import { useMemo, type MouseEvent } from 'react';
import { Clock, Sparkles, Star } from 'lucide-react';
import type { SavedRecipe } from '../../types';
import CachedImage from '../CachedImage';
import { hapticLight } from '../../utils/haptics';
import { useI18n } from '../../context/I18nContext';
import { getRecipeCalories, formatCalories } from '../../utils/formatNutrition';
import { getHealthScoreColor, getHealthScoreLetter } from '../RecipeDetails/HealthScoreBadge';

interface RecipeShowcaseCardProps {
  job: SavedRecipe;
  totalTime: string | null;
  onOpenRecipe: (e: MouseEvent, job: SavedRecipe) => void;
}

/**
 * Format C: "Wiederentdeckt für dich" (Rediscovered gems).
 * Wide horizontal banner highlighting an older, saved recipe with high nutritional value
 * or nostalgic appeal, enticing the user to finally cook it.
 */
export default function RecipeShowcaseCard({
  job,
  totalTime,
  onOpenRecipe,
}: RecipeShowcaseCardProps) {
  const { t, language } = useI18n();
  const r = job.recipe;
  if (!r) return null;

  const calories = formatCalories(getRecipeCalories(r));
  const score = typeof r.healthScore === 'number' ? r.healthScore : null;
  const scoreColor = score !== null ? getHealthScoreColor(score) : null;
  const scoreLetter = score !== null ? getHealthScoreLetter(score) : null;

  const { formattedDate, daysAgo } = useMemo(() => {
    const rawDate = job.addedAt ? new Date(job.addedAt) : new Date();
    const diffTime = Math.abs(Date.now() - rawDate.getTime());
    const days = Math.max(1, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
    const formatted = rawDate.toLocaleDateString(language === 'de' ? 'de-DE' : 'en-US', {
      day: 'numeric',
      month: 'short',
    });
    return { formattedDate: formatted, daysAgo: days };
  }, [job.addedAt, language]);

  return (
    <section className="space-y-2.5">
      {/* Header */}
      <div className="px-0.5">
        <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-1.5 tracking-tight font-heading">
          <Sparkles className="w-4 h-4 text-amber-500 fill-amber-500" />
          <span>{t('catalog.magazine.rediscoveredTitle')}</span>
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
          {t('catalog.magazine.rediscoveredSubtitle', { days: daysAgo })}
        </p>
      </div>

      {/* Clean Flat Showcase Card - Harmonized with Poster & Compact Cards */}
      <article
        onClick={(e) => {
          hapticLight();
          onOpenRecipe(e, job);
        }}
        className="group relative rounded-2xl overflow-hidden bg-white dark:bg-gray-900 shadow-[0_4px_16px_rgba(0,0,0,0.06),0_1px_3px_rgba(0,0,0,0.04)] ring-1 ring-black/5 dark:ring-white/10 border-none flex items-stretch cursor-pointer active:scale-[0.98] hover:shadow-md transition-all duration-150 select-none"
      >
        {/* Full Height Left Cover Image */}
        <div className="relative w-28 sm:w-36 shrink-0 overflow-hidden bg-black/5 dark:bg-white/5 self-stretch">
          <CachedImage
            src={r.imageUrl}
            emoji={r.emoji}
            alt={r.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 pointer-events-none select-none"
          />
          {job.isFavorite && (
            <div className="absolute top-2 left-2 w-6 h-6 rounded-full bg-black/40 backdrop-blur-xs flex items-center justify-center text-amber-400 pointer-events-none">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            </div>
          )}
        </div>

        {/* Content Area */}
        <div className="flex-1 min-w-0 flex flex-col justify-between p-3 sm:p-3.5 overflow-hidden">
          {/* Top Line: Subtle Saved Date */}
          <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 tracking-tight">
            {t('catalog.magazine.savedOn', { date: formattedDate })}
          </span>

          {/* Title */}
          <h4 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white leading-snug line-clamp-2 tracking-tight group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors my-auto py-1 font-heading">
            {r.title}
          </h4>

          {/* Unified Bottom Meta - Matching RecipePosterCard & RecipeCompactCard */}
          <div className="flex items-center justify-between gap-1.5 w-full text-[11px] font-medium mt-auto pt-1 select-none">
            <div className="flex items-center gap-1.5 min-w-0 truncate">
              {totalTime && (
                <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-semibold text-[9.5px] shrink-0">
                  <Clock className="w-2.5 h-2.5 text-gray-500 dark:text-gray-400 shrink-0" />
                  <span>{totalTime}</span>
                </span>
              )}
              {calories && (
                <span className="whitespace-nowrap text-gray-500 dark:text-gray-400 font-medium truncate">
                  {calories}
                </span>
              )}
            </div>

            {/* Health Score Pill */}
            {score !== null && scoreLetter && scoreColor && (
              <span
                className={`w-4 h-4 rounded-full ${scoreColor.pillBg} text-white font-black text-[9.5px] flex items-center justify-center leading-none shadow-2xs shrink-0 select-none`}
                title={`Health Score: ${scoreLetter} (${score}/100)`}
              >
                {scoreLetter}
              </span>
            )}
          </div>
        </div>
      </article>
    </section>
  );
}
