import { ChevronRight, Clock, Crown, Flame, Utensils } from 'lucide-react';
import { useI18n } from '../../context/I18nContext';

interface RecipeMetaStripProps {
  /** Combined prep + cook time, already formatted for display. */
  totalTimeLabel: string | null;
  servings: number;
  /** Per-serving calories, or null when the recipe has no nutrition data. */
  calories: number | null;
  /** Free users see a crown instead of the calorie value (premium gate). */
  isPremium: boolean;
  onScrollToDetails: () => void;
  /** If true, renders a flat text flow without background, borders, padding, and chevron. */
  flat?: boolean;
}

/**
 * A single tapping row or text flow summarising the recipe's key figures (total time,
 * servings, calories). If flat=true, fits neatly inside the header under the title.
 */
export default function RecipeMetaStrip({
  totalTimeLabel,
  servings,
  calories,
  isPremium,
  onScrollToDetails,
  flat = false,
}: RecipeMetaStripProps) {
  const { t } = useI18n();

  const chipClasses =
    'flex items-center gap-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap';

  return (
    <button
      type="button"
      onClick={onScrollToDetails}
      aria-label={t('recipe.metaDetails')}
      className={
        flat
          ? "flex items-center min-h-[24px] mt-2.5 bg-transparent text-left cursor-pointer outline-none border-none p-0 select-none active:opacity-85"
          : "w-full flex items-center gap-3 min-h-[44px] py-2.5 px-3 -mx-1 rounded-xl bg-gradient-to-br from-emerald-500/[0.05] via-transparent to-indigo-500/[0.05] border border-black/5 dark:border-white/5 text-left cursor-pointer transition-colors hover:bg-black/5 dark:hover:bg-white/5 active:scale-[0.99] outline-none"
      }
    >
      <div className="flex-1 flex items-center gap-4.5 overflow-x-auto scrollbar-none">
        {totalTimeLabel && (
          <span className={chipClasses}>
            <Clock className="w-4 h-4 text-emerald-500 flex-shrink-0" />
            {totalTimeLabel}
          </span>
        )}

        <span className={chipClasses}>
          <Utensils className="w-4 h-4 text-emerald-500 flex-shrink-0" />
          {t('recipe.servingsCount', { count: servings })}
        </span>

        {calories !== null && (
          <span className={chipClasses}>
            <Flame className="w-4 h-4 text-emerald-500 flex-shrink-0" />
            <span>{calories} kcal</span>
          </span>
        )}
      </div>

      {!flat && <ChevronRight className="w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />}
    </button>
  );
}
