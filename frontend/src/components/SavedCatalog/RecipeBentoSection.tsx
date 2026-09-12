import type { MouseEvent } from 'react';
import { Clock, Star, Zap } from 'lucide-react';
import type { SavedRecipe } from '../../types';
import CachedImage from '../CachedImage';
import { hapticLight } from '../../utils/haptics';
import { useI18n } from '../../context/I18nContext';
import { getRecipeCalories, formatCalories } from '../../utils/formatNutrition';
import { getHealthScoreColor, getHealthScoreLetter } from '../RecipeDetails/HealthScoreBadge';
import RecipeCompactCard from './RecipeCompactCard';

interface RecipeBentoSectionProps {
  recipes: SavedRecipe[];
  formatTotalTime: (recipe: any) => string | null;
  onOpenRecipe: (e: MouseEvent, job: SavedRecipe) => void;
  onSeeAll?: () => void;
}

/**
 * Bento Grid Section (Format B) for fast weekday dishes & nutrient champions.
 * Shows 1 tall 3:4 portrait card on the left and 2 stacked compact cards on the right.
 */
export default function RecipeBentoSection({
  recipes,
  formatTotalTime,
  onOpenRecipe,
  onSeeAll,
}: RecipeBentoSectionProps) {
  const { t } = useI18n();

  if (!recipes || recipes.length === 0) return null;

  const mainJob = recipes[0];
  const sideJobs = recipes.slice(1, 3);
  const mainRecipe = mainJob.recipe;
  if (!mainRecipe) return null;

  const mainScore = typeof mainRecipe.healthScore === 'number' ? mainRecipe.healthScore : null;
  const mainScoreColor = mainScore !== null ? getHealthScoreColor(mainScore) : null;
  const mainScoreLetter = mainScore !== null ? getHealthScoreLetter(mainScore) : null;
  const mainTime = formatTotalTime(mainRecipe);
  const mainCalories = formatCalories(getRecipeCalories(mainRecipe));
  const mainProtein = mainRecipe.nutritionalValues?.protein;

  return (
    <section className="space-y-3">
      {/* Section Header */}
      <div className="flex items-center justify-between px-0.5">
        <div>
          <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-1.5 tracking-tight font-heading">
            <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
            <span>{t('catalog.magazine.bentoTitle')}</span>
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {t('catalog.magazine.bentoSubtitle')}
          </p>
        </div>
        {onSeeAll && recipes.length > 3 && (
          <button
            onClick={onSeeAll}
            className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer select-none"
          >
            {t('catalog.magazine.allShelfButton', { count: recipes.length })}
          </button>
        )}
      </div>

      {/* Grid Layout */}
      <div className={`grid ${sideJobs.length > 0 ? 'grid-cols-2' : 'grid-cols-1'} gap-2.5 sm:gap-3`}>
        {/* Left: 3:4 Portrait Card */}
        <article
          onClick={(e) => {
            hapticLight();
            onOpenRecipe(e, mainJob);
          }}
          className="group relative aspect-[3/4] w-full rounded-2xl overflow-hidden bg-gray-900 shadow-[0_2px_12px_rgba(0,0,0,0.06)] border-none cursor-pointer active:scale-[0.98] transition-all select-none"
        >
          <CachedImage
            src={mainRecipe.imageUrl}
            emoji={mainRecipe.emoji}
            alt={mainRecipe.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 pointer-events-none select-none"
          />
          {/* Scrim overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent pointer-events-none" />

          {/* Top Badges */}
          <div className="absolute top-2 right-2 pointer-events-none">
            {mainJob.isFavorite && (
              <div className="w-6 h-6 rounded-full bg-black/40 backdrop-blur-xs flex items-center justify-center text-amber-400">
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              </div>
            )}
          </div>

          {/* Bottom Meta */}
          <div className="absolute bottom-2.5 inset-x-2.5 text-white flex flex-col gap-1 pointer-events-none">
            {mainTime && (
              <span className="self-start px-1.5 py-0.5 rounded-md bg-emerald-500/90 text-white text-[10px] font-bold flex items-center gap-1">
                <Clock className="w-2.5 h-2.5" />
                <span>{mainTime}</span>
              </span>
            )}
            <h4 className="font-bold text-xs sm:text-sm leading-tight text-white line-clamp-2 drop-shadow-xs">
              {mainRecipe.title}
            </h4>
            <div className="flex items-center justify-between gap-1 text-[10px] text-gray-200 font-medium">
              <div className="flex items-center gap-1.5 min-w-0 truncate">
                {mainCalories && <span>{mainCalories}</span>}
                {mainCalories && mainProtein && <span>•</span>}
                {mainProtein && <span>{Math.round(mainProtein)}g Protein</span>}
              </div>

              {/* Health Score rechts unten */}
              {mainScore !== null && mainScoreLetter && mainScoreColor && (
                <span
                  className={`w-4.5 h-4.5 rounded-full ${mainScoreColor.pillBg} text-white font-black text-[10px] flex items-center justify-center leading-none shadow-md shrink-0 ml-auto select-none`}
                  title={`Health Score: ${mainScoreLetter} (${mainScore}/100)`}
                >
                  {mainScoreLetter}
                </span>
              )}
            </div>
          </div>
        </article>

        {/* Right: Two Stacked Compact Cards */}
        {sideJobs.length > 0 && (
          <div className="flex flex-col gap-2.5 sm:gap-3 justify-between">
            {sideJobs.map((job) => (
              <RecipeCompactCard
                key={job.recipeId}
                job={job}
                totalTime={job.recipe ? formatTotalTime(job.recipe) : null}
                onClick={(e) => onOpenRecipe(e, job)}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
