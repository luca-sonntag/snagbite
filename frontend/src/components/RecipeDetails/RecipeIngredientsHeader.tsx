import { Button } from '@heroui/react';
import { LayoutGrid, List } from 'lucide-react';
import { useI18n } from '../../context/I18nContext';
import { hapticLight } from '../../utils/haptics';
import RecipeServingsStepper from './RecipeServingsStepper';

interface RecipeIngredientsHeaderProps {
  isExtracting?: boolean;
  servings: number;
  onDecreaseServings: () => void;
  onIncreaseServings: () => void;
  viewMode: 'grid' | 'list';
  onViewModeChange: (mode: 'grid' | 'list') => void;
  hasComponents: boolean;
  groupingMode: 'components' | 'category';
  onGroupingModeChange: (mode: 'components' | 'category') => void;
}

export default function RecipeIngredientsHeader({
  isExtracting = false,
  servings,
  onDecreaseServings,
  onIncreaseServings,
  viewMode,
  onViewModeChange,
  hasComponents,
  groupingMode,
  onGroupingModeChange,
}: RecipeIngredientsHeaderProps) {
  const { t } = useI18n();

  return (
    <>
      {/* Servings & View Mode Header */}
      {isExtracting ? (
        <div className="px-0.5 py-3 flex items-center justify-between gap-3 animate-pulse">
          <div className="flex flex-col gap-1.5">
            <div className="h-3 w-16 bg-gray-200/90 dark:bg-gray-800/90 rounded-md" />
            <div className="h-4.5 w-24 bg-gray-200/90 dark:bg-gray-800/90 rounded-md" />
          </div>
          <div className="flex items-center gap-2 sm:gap-2.5">
            <div className="h-10 w-28 bg-gray-200/90 dark:bg-gray-800/90 rounded-2xl" />
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-gray-200/90 dark:bg-gray-800/90" />
          </div>
        </div>
      ) : (
        <div id="tour-recipe-servings" className="px-0.5 py-3 flex items-center justify-between gap-3 animate-fade-in">
          <div className="flex flex-col">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
              {t('recipe.serves')}
            </span>
            <span className="text-sm font-bold text-gray-900 dark:text-white mt-0.5">
              {t('recipe.servingsCount', { count: servings })}
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-2.5">
            <RecipeServingsStepper
              servings={servings}
              onDecreaseServings={onDecreaseServings}
              onIncreaseServings={onIncreaseServings}
            />

            <Button
              isIconOnly
              variant="tertiary"
              className="w-11 h-11 sm:w-12 sm:h-12 min-w-[44px] min-h-[44px] rounded-2xl bg-black/[0.04] dark:bg-white/[0.06] border-0 text-gray-600 dark:text-gray-300 hover:text-emerald-600 dark:hover:text-emerald-400 active:scale-95 transition-all shrink-0 cursor-pointer flex items-center justify-center"
              onPress={() => {
                hapticLight();
                onViewModeChange(viewMode === 'grid' ? 'list' : 'grid');
              }}
              aria-label={viewMode === 'grid' ? t('recipe.viewList') : t('recipe.viewGrid')}
            >
              {viewMode === 'grid' ? (
                <List className="w-4 h-4" />
              ) : (
                <LayoutGrid className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Component / Supermarket Grouping Toggle (only when multi-component recipe) */}
      {!isExtracting && hasComponents && (
        <div className="px-0.5 py-2.5 flex items-center justify-between gap-3 animate-fade-in border-none">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
            {t('recipe.groupingLabel')}
          </span>
          <div className="inline-flex p-0.5 rounded-xl bg-black/[0.045] dark:bg-white/[0.08]">
            <button
              type="button"
              onClick={() => onGroupingModeChange('components')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer border-none ${
                groupingMode === 'components'
                  ? 'bg-[#fdfbf7] dark:bg-gray-800 text-gray-900 dark:text-white shadow-xs'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 bg-transparent'
              }`}
            >
              {t('recipe.groupByComponents')}
            </button>
            <button
              type="button"
              onClick={() => onGroupingModeChange('category')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer border-none ${
                groupingMode === 'category'
                  ? 'bg-[#fdfbf7] dark:bg-gray-800 text-gray-900 dark:text-white shadow-xs'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 bg-transparent'
              }`}
            >
              {t('recipe.groupByCategory')}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
