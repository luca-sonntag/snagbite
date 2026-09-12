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

  const ingredientsPreview = useMemo(() => {
    if (!r.ingredients || r.ingredients.length === 0) return null;
    return r.ingredients
      .flatMap((g) => g.items || [])
      .slice(0, 3)
      .map((item) => item.name)
      .filter(Boolean)
      .join(', ');
  }, [r.ingredients]);

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

      {/* Wide Showcase Card */}
      <article
        onClick={(e) => {
          hapticLight();
          onOpenRecipe(e, job);
        }}
        className="group relative rounded-2xl p-3 sm:p-3.5 bg-gradient-to-br from-amber-500/10 via-emerald-500/5 to-white/70 dark:from-amber-950/25 dark:via-emerald-950/15 dark:to-gray-900/90 shadow-[0_2px_14px_rgba(0,0,0,0.04)] border border-amber-500/15 dark:border-amber-400/15 flex items-center gap-3.5 cursor-pointer active:scale-[0.98] hover:shadow-md transition-all duration-150 select-none overflow-hidden"
      >
        {/* Thumbnail */}
        <div className="relative w-20 h-20 sm:w-22 sm:h-22 rounded-xl overflow-hidden shrink-0 bg-black/5 dark:bg-white/5 shadow-xs">
          <CachedImage
            src={r.imageUrl}
            emoji={r.emoji}
            alt={r.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 pointer-events-none select-none"
          />
          {job.isFavorite && (
            <div className="absolute top-1 right-1 w-5 h-5 rounded-md bg-black/40 backdrop-blur-xs flex items-center justify-center text-amber-400 pointer-events-none">
              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 flex flex-col justify-center gap-1">
          {/* Top Line: Saved Date + Health Score */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">
              {t('catalog.magazine.savedOn', { date: formattedDate })}
            </span>
            {score !== null && scoreLetter && scoreColor && (
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold ${scoreColor.badgeBg} ${scoreColor.badgeText} shadow-2xs`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${scoreColor.pillBg}`} />
                <span>Score {score} • {scoreLetter}</span>
              </span>
            )}
          </div>

          {/* Title */}
          <h4 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white leading-tight line-clamp-2 tracking-tight group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
            {r.title}
          </h4>

          {/* Ingredients Preview */}
          {ingredientsPreview && (
            <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
              {ingredientsPreview}
            </p>
          )}

          {/* Bottom Meta */}
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 font-medium pt-0.5">
            {totalTime && (
              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                <Clock className="w-3 h-3 shrink-0" />
                <span>{totalTime}</span>
              </span>
            )}
            {totalTime && calories && <span>•</span>}
            {calories && <span>{calories}</span>}
          </div>
        </div>
      </article>
    </section>
  );
}
