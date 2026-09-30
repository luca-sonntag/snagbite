import type { MouseEvent } from 'react';
import { Clock, Star, Check } from 'lucide-react';
import type { SavedRecipe } from '../../types';
import CachedImage from '../CachedImage';
import { hapticLight } from '../../utils/haptics';
import { useI18n } from '../../context/I18nContext';
import { getRecipeCalories } from '../../utils/formatNutrition';
import { getHealthScoreColor, getHealthScoreLetter } from '../RecipeDetails/HealthScoreBadge';
import RecipeCompactCard from './RecipeCompactCard';

interface RecipeBentoSectionProps {
  recipes: SavedRecipe[];
  title?: string;
  subtitle?: string;
  formatTotalTime: (recipe: any) => string | null;
  onOpenRecipe: (e: MouseEvent, job: SavedRecipe) => void;
  onSeeAll?: () => void;
  isSelectMode?: boolean;
  selectedIds?: Set<string>;
  bindLongPress?: (id: string, job: SavedRecipe) => any;
  isCommunityJob?: (job: SavedRecipe) => boolean;
}

/**
 * Bento Grid Section (Format B) for fast weekday dishes & nutrient champions.
 * Shows 1 tall 3:4 portrait card on the left and 2 stacked compact cards on the right.
 */
export default function RecipeBentoSection({
  recipes,
  title,
  subtitle,
  formatTotalTime,
  onOpenRecipe,
  onSeeAll,
  isSelectMode = false,
  selectedIds,
  bindLongPress,
  isCommunityJob,
}: RecipeBentoSectionProps) {
  const { t } = useI18n();

  if (!recipes || recipes.length < 3) return null;

  const mainJob = recipes[0];
  const sideJobs = recipes.slice(1, 3);
  const mainRecipe = mainJob.recipe;
  if (!mainRecipe) return null;

  const isMainCommunity = isCommunityJob ? isCommunityJob(mainJob) : false;
  const isMainSelected = !isMainCommunity && selectedIds?.has(mainJob.recipeId);
  const mainScore = typeof mainRecipe.healthScore === 'number' ? mainRecipe.healthScore : null;
  const mainScoreColor = mainScore !== null ? getHealthScoreColor(mainScore) : null;
  const mainScoreLetter = mainScore !== null ? getHealthScoreLetter(mainScore) : null;
  const mainTime = formatTotalTime(mainRecipe);
  const mainCalories = getRecipeCalories(mainRecipe) ?? mainRecipe.nutritionalValues?.calories ?? null;

  return (
    <section className="space-y-3">
      {/* Section Header */}
      <div className="flex items-center justify-between px-0.5">
        <div>
          <h3 className="text-base font-bold text-gray-900 dark:text-white tracking-tight font-heading">
            {title || t('catalog.magazine.bentoDefaultTitle')}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {subtitle || t('catalog.magazine.bentoDefaultSubtitle')}
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
      <div className={`grid ${sideJobs.length > 0 ? 'grid-cols-2' : 'grid-cols-1'} gap-2.5 sm:gap-3 items-stretch`}>
        {/* Left: 3:4 Portrait Card (Stretches to match stacked right cards) */}
        <article
          onClick={(e) => {
            hapticLight();
            onOpenRecipe(e, mainJob);
          }}
          className={`group relative w-full h-full min-h-[220px] sm:min-h-[250px] rounded-2xl overflow-hidden bg-white dark:bg-gray-900 shadow-[0_2px_12px_rgba(0,0,0,0.04)] ring-1 ring-black/5 dark:ring-white/10 border-none cursor-pointer active:scale-[0.98] transition-all select-none ${
            isMainSelected ? 'ring-2 ring-emerald-500' : ''
          }`}
          {...((!isMainCommunity && bindLongPress) ? bindLongPress(mainJob.recipeId, mainJob) : {})}
        >
          <div className="absolute inset-0 bg-black/5 dark:bg-white/5 overflow-hidden">
            <CachedImage
              src={mainRecipe.imageUrl}
              emoji={mainRecipe.emoji}
              alt={mainRecipe.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 pointer-events-none select-none"
            />
          </div>
          {/* Scrim overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-white via-white/80 via-45% to-transparent dark:from-gray-950 dark:via-gray-950/70 dark:via-45% dark:to-transparent pointer-events-none" />

          {/* Select-mode checkbox */}
          {isSelectMode && !isMainCommunity && (
            <div
              className={`absolute top-2 left-2 z-10 w-7 h-7 rounded-full flex items-center justify-center transition-all border-none ${
                isMainSelected
                  ? 'bg-emerald-500 text-white shadow-md'
                  : 'bg-white/80 dark:bg-black/40 backdrop-blur-sm text-gray-700 dark:text-white shadow-xs'
              }`}
            >
              {isMainSelected && <Check className="w-4 h-4 text-white stroke-[3px]" />}
            </div>
          )}

          {/* Top Badges */}
          <div className="absolute top-2 right-2 pointer-events-none">
            {mainJob.isFavorite && (
              <div className="w-6 h-6 rounded-full bg-white/80 dark:bg-black/40 backdrop-blur-xs flex items-center justify-center text-amber-500 shadow-xs">
                <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
              </div>
            )}
          </div>

          {/* Bottom Meta */}
          <div className="absolute bottom-2.5 inset-x-2.5 flex flex-col gap-1 pointer-events-none">
            {/* 1. Meta-Zeile: Nur Dauer, kcal, Health Score (kein Wrapping) */}
            <div className="flex items-center gap-1.5 text-[10px] font-semibold text-gray-700 dark:text-white/90 whitespace-nowrap overflow-hidden">
              {mainTime && (
                <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/90 text-white font-bold text-[10px] shadow-xs shrink-0">
                  <Clock className="w-2.5 h-2.5 text-white shrink-0" />
                  <span>{mainTime}</span>
                </span>
              )}

              {/* Calories vor Health Score direkt nebeneinander */}
              {(mainCalories !== null && mainCalories !== undefined) || (mainScore !== null && mainScoreLetter && mainScoreColor) ? (
                <div className="flex items-center gap-1 shrink-0">
                  {mainTime && <span className="text-gray-400 dark:text-white/30 text-[9px] mr-0.5">•</span>}
                  {mainCalories !== null && mainCalories !== undefined && (
                    <span className="text-gray-600 dark:text-white/90 font-medium">
                      {Math.round(mainCalories)} kcal
                    </span>
                  )}
                  {mainScore !== null && mainScoreLetter && mainScoreColor && (
                    <span
                      className={`w-3.5 h-3.5 rounded-full ${mainScoreColor.pillBg} text-white font-black text-[9px] flex items-center justify-center leading-none shadow-md shrink-0 select-none`}
                      title={`Health Score: ${mainScoreLetter} (${mainScore}/100)`}
                    >
                      {mainScoreLetter}
                    </span>
                  )}
                </div>
              ) : null}
            </div>

            {/* 2. Titel direkt unter der Dauer-Zeile (kein Autor) */}
            <h4 className="font-bold text-xs sm:text-sm leading-tight text-gray-900 dark:text-white line-clamp-2 pt-0.5 font-heading">
              {mainRecipe.title}
            </h4>
          </div>
        </article>

        {/* Right: Two Stacked Compact Cards */}
        {sideJobs.length > 0 && (
          <div className="flex flex-col gap-2.5 sm:gap-3 justify-between h-full">
            {sideJobs.map((job) => {
              const isSideCommunity = isCommunityJob ? isCommunityJob(job) : false;
              const isSideSelected = !isSideCommunity && selectedIds?.has(job.recipeId);
              return (
                <RecipeCompactCard
                  key={job.recipeId}
                  job={job}
                  totalTime={job.recipe ? formatTotalTime(job.recipe) : null}
                  isSelected={isSideSelected}
                  isSelectMode={isSelectMode}
                  bindLongPress={(!isSideCommunity && bindLongPress) ? bindLongPress(job.recipeId, job) : undefined}
                  isCommunity={isSideCommunity}
                  onClick={(e) => onOpenRecipe(e, job)}
                />
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
