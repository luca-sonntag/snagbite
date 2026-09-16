import React from 'react';
import { Clock, Check, Star, Layers, ArrowRight } from 'lucide-react';
import type { SavedRecipe, Recipe, MealPlanRecipeSummary } from '../types';
import CachedImage from './CachedImage';
import { useI18n } from '../context/I18nContext';
import { hapticLight } from '../utils/haptics';
import { getTotalTime } from '../hooks/useSavedCatalog';
import { getRecipeCalories, formatCalories } from '../utils/formatNutrition';
import { HealthScoreLetterBadge } from './RecipeDetails/HealthScoreBadge';

export interface RecipeListItemProps {
  job?: SavedRecipe;
  recipe?: Recipe | MealPlanRecipeSummary;
  isSelected?: boolean;
  isSelectMode?: boolean;
  /** Pre-formatted total time, e.g. "35 Min." — null hides the badge. If omitted, computed automatically from recipe. */
  totalTime?: string | null;
  recipeTags?: string[];
  bindLongPress?: any;
  onClick: (e: React.MouseEvent) => void;
  showRemix?: boolean;
  showArrow?: boolean;
  /** Custom right-hand element (e.g. 3-dots menu button, replaces showArrow) */
  rightAction?: React.ReactNode;
  /** Optional custom subtitle override (pass null to suppress) */
  subtitle?: React.ReactNode;
  /** Optional extra badge/info inside the meta line (e.g. Servings) */
  extraMeta?: React.ReactNode;
  /** Optional overlay rendered on top of the thumbnail (e.g. cooked checkmark) */
  thumbnailOverlay?: React.ReactNode;
  /** Whether the recipe is marked as cooked/completed */
  isCooked?: boolean;
  className?: string;
}

function getFirstRecipeTag(recipe?: Recipe | MealPlanRecipeSummary | null): string | null {
  if (!recipe) return null;
  const rawTags = 'tags' in recipe && Array.isArray(recipe.tags) ? recipe.tags : [];
  const validTag = rawTags.find((tag: string) => {
    const trimmed = tag.trim().toLowerCase();
    return !(trimmed.includes('min') || trimmed.startsWith('<') || trimmed.startsWith('unter'));
  });
  if (validTag) return validTag;
  if ('category' in recipe && recipe.category) return recipe.category;
  return null;
}

/**
 * Universal horizontal recipe card list item used across the entire app
 * (SavedCatalog list view, RecipePickerModal, HeroThemeSheet, MealPlanner, etc.).
 *
 * Features:
 * - 64-72px thumbnail with high-contrast presentation
 * - Line 1: Bold title with hover emerald transition
 * - Line 2: Creator handle (@handle) or Tag or custom Subtitle
 * - Line 3: Emerald duration, favorite star, calories, and centralized circular Health Score badge
 * - Switchable right action (e.g. 3-dots menu button, or chevron arrow)
 */
export const RecipeListItem = React.memo<RecipeListItemProps>(({
  job,
  recipe,
  isSelected = false,
  isSelectMode = false,
  totalTime,
  recipeTags,
  bindLongPress,
  onClick,
  showRemix = false,
  showArrow = false,
  rightAction,
  subtitle,
  extraMeta,
  thumbnailOverlay,
  isCooked = false,
  className = '',
}) => {
  const { t } = useI18n();
  const r = recipe ?? job?.recipe;
  if (!r) return null;

  const isFavorite = Boolean(job?.isFavorite);
  const remixCount = showRemix
    ? (job?.remixCount ?? job?.recipe?.remixCount ?? ('remixCount' in r ? r.remixCount : 0) ?? 0)
    : 0;
  const calculatedTime = getTotalTime(r);
  const totalTimeStr =
    totalTime !== undefined
      ? totalTime
      : calculatedTime > 0
      ? `${calculatedTime} Min.`
      : null;

  const firstTag = recipeTags?.[0] ?? getFirstRecipeTag(r);
  const sourceHandle = 'sourceHandle' in r && typeof r.sourceHandle === 'string' ? r.sourceHandle : null;
  const handleText = sourceHandle ? `@${sourceHandle.replace(/^@/, '')}` : null;
  const defaultSubtitle = handleText ?? firstTag;
  const renderedSubtitle = subtitle !== undefined ? subtitle : defaultSubtitle;

  const calories = getRecipeCalories(r);
  const caloriesFormatted = formatCalories(calories);
  const healthScoreNum = typeof r.healthScore === 'number' ? r.healthScore : null;

  return (
    <div
      className={`group w-full rounded-2xl p-2.5 sm:p-3 flex items-center gap-3 cursor-pointer active:scale-[0.98] transition-all duration-150 select-none border-none touch-manipulation ${
        isSelected
          ? 'bg-emerald-500/10 ring-2 ring-emerald-500 shadow-sm'
          : isCooked
          ? 'bg-white dark:bg-gray-900 opacity-75 shadow-2xs'
          : 'bg-white dark:bg-gray-900 shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-md'
      } ${className}`}
      onClick={(e) => {
        hapticLight();
        onClick(e);
      }}
      {...(bindLongPress ?? {})}
    >
      {/* Thumbnail (64-72px) with Checkbox in select mode or custom thumbnail overlay */}
      <div className="relative w-16 h-16 sm:w-18 sm:h-18 rounded-xl sm:rounded-2xl overflow-hidden bg-black/5 dark:bg-white/5 shrink-0 border-none pointer-events-none">
        {isSelectMode && (
          <div
            className={`absolute top-1.5 left-1.5 z-10 w-6 h-6 rounded-xl flex items-center justify-center transition-all border-none ${
              isSelected ? 'bg-emerald-500 text-white shadow-xs' : 'bg-black/40 text-white'
            }`}
          >
            {isSelected && <Check className="w-3.5 h-3.5 text-white stroke-[3px]" />}
          </div>
        )}

        <CachedImage
          src={r.imageUrl}
          emoji={r.emoji}
          alt={r.title}
          className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300 pointer-events-none select-none"
        />

        {thumbnailOverlay}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 flex flex-col justify-center py-0.5 pointer-events-none">
        {/* Line 1: Title */}
        <h4
          className={`text-sm font-bold line-clamp-1 leading-snug transition-colors ${
            isCooked
              ? 'text-gray-500 dark:text-gray-400 line-through decoration-gray-400/50'
              : 'text-gray-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400'
          }`}
        >
          {r.title}
        </h4>

        {/* Line 2: Creator Handle, Tag, or Custom Subtitle */}
        {renderedSubtitle && (
          <p className="text-[11px] text-gray-400 dark:text-gray-500 font-medium truncate mt-0.5">
            {renderedSubtitle}
          </p>
        )}

        {/* Line 3: Meta line */}
        {(totalTimeStr || isFavorite || caloriesFormatted || healthScoreNum !== null || (showRemix && remixCount > 0) || extraMeta) && (
          (showArrow || rightAction) ? (
            /* Arrow / Right Action Mode: Meta grouped on left with arrow or custom action on far right */
            <div className="flex items-center gap-2 mt-1 text-[11px] font-medium text-gray-500 dark:text-gray-400 select-none">
              {totalTimeStr && (
                <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-semibold text-[9.5px] shrink-0">
                  <Clock className="w-2.5 h-2.5 text-gray-500 dark:text-gray-400 shrink-0" />
                  <span>{totalTimeStr}</span>
                </span>
              )}
              {isFavorite && !isSelectMode && (
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400 shrink-0" />
              )}
              {extraMeta}
              {caloriesFormatted && (
                <span className="shrink-0">{caloriesFormatted}</span>
              )}
              {healthScoreNum !== null && (
                <HealthScoreLetterBadge score={healthScoreNum} size="sm" />
              )}
              {showRemix && remixCount > 0 && (
                <span className="shrink-0 flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                  <Layers className="w-3 h-3 shrink-0" />
                  <span>{remixCount === 1 ? t('remix.singleCount') : t('remix.multipleCount', { count: remixCount })}</span>
                </span>
              )}
            </div>
          ) : (
            /* Standard Mode: Left cluster + right-aligned (rechtsbündig) Calories & Health Score */
            <div className="flex items-center justify-between gap-1.5 mt-1 text-[11px] font-medium text-gray-500 dark:text-gray-400 select-none">
              {/* Left Cluster: Time, Favorite Star, Remix Badge */}
              <div className="flex items-center gap-2 min-w-0 overflow-hidden">
                {totalTimeStr && (
                  <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-semibold text-[9.5px] shrink-0">
                    <Clock className="w-2.5 h-2.5 text-gray-500 dark:text-gray-400 shrink-0" />
                    <span>{totalTimeStr}</span>
                  </span>
                )}
                {isFavorite && !isSelectMode && (
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400 shrink-0" />
                )}
                {extraMeta}
                {showRemix && remixCount > 0 && (
                  <span className="shrink-0 flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                    <Layers className="w-3 h-3 shrink-0" />
                    <span>{remixCount === 1 ? t('remix.singleCount') : t('remix.multipleCount', { count: remixCount })}</span>
                  </span>
                )}
              </div>

              {/* Right Cluster (rechtsbündig): Calories & Health Score */}
              <div className="flex items-center gap-1.5 shrink-0 ml-auto">
                {caloriesFormatted && (
                  <span className="whitespace-nowrap text-gray-500 dark:text-gray-400 font-medium">
                    {caloriesFormatted}
                  </span>
                )}
                <HealthScoreLetterBadge score={healthScoreNum} size="sm" />
              </div>
            </div>
          )
        )}
      </div>

      {/* Far Right: Optional Custom Action (e.g. 3-dots menu) or Arrow */}
      {rightAction ? (
        <div className="shrink-0 -mr-1 z-10" onClick={(e) => e.stopPropagation()}>
          {rightAction}
        </div>
      ) : showArrow ? (
        <ArrowRight className="w-4 h-4 text-gray-300 dark:text-gray-600 shrink-0 mr-1 pointer-events-none" />
      ) : null}
    </div>
  );
});

export default RecipeListItem;
