import React from 'react';
import { Trash2, CheckCircle2, Play, CalendarClock } from 'lucide-react';
import type { MealPlanEntry } from '../../types';
import { useI18n } from '../../context/I18nContext';
import { hapticLight, hapticMedium, hapticHeavy } from '../../utils/haptics';

export interface MealPlanCardActionsProps {
  entry: MealPlanEntry;
  onUpdateServings?: (id: string, servings: number) => void;
  onToggleCooked: (entry: MealPlanEntry) => void;
  onDeleteEntry: (id: string) => void;
  onMoveToTomorrow?: (entry: MealPlanEntry) => void;
  onOpenCookMode?: (recipeId: string) => void;
}

export const MealPlanCardActions: React.FC<MealPlanCardActionsProps> = ({
  entry,
  onToggleCooked,
  onDeleteEntry,
  onMoveToTomorrow,
  onOpenCookMode,
}) => {
  const { t } = useI18n();

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    hapticHeavy();
    onDeleteEntry(entry.id);
  };

  if (entry.isCooked) {
    return (
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex items-center justify-between mt-2 pt-0.5 gap-2 select-none"
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-xs font-bold text-gray-500 dark:text-gray-400 truncate">
            {entry.servings} {t('mealPlanner.servings')}
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 shrink-0">
            <CheckCircle2 className="w-3 h-3 stroke-[2.2]" />
            <span>{t('mealPlanner.cooked')}</span>
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* Toggle Cooked Back */}
          <button
            onClick={() => {
              hapticMedium();
              onToggleCooked(entry);
            }}
            title={t('mealPlanner.markAsCooked')}
            aria-label={t('mealPlanner.markAsCooked')}
            className="w-9 h-9 min-w-[36px] min-h-[36px] rounded-full transition-all duration-150 flex items-center justify-center border-none bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 active:scale-90 cursor-pointer touch-manipulation"
          >
            <CheckCircle2 className="w-4 h-4 stroke-[2.25]" />
          </button>

          {/* Delete Entry */}
          <button
            onClick={handleDelete}
            title={t('mealPlanner.deleteAction')}
            aria-label={t('mealPlanner.deleteConfirmBtn')}
            className="w-9 h-9 min-w-[36px] min-h-[36px] rounded-full bg-gray-100 hover:bg-rose-50 dark:bg-gray-800 dark:hover:bg-rose-950/30 text-gray-400 hover:text-rose-600 dark:hover:text-rose-400 active:scale-90 transition-all duration-150 flex items-center justify-center cursor-pointer border-none touch-manipulation"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className="flex items-center justify-between mt-2 pt-0.5 gap-2 select-none"
    >
      {/* Servings display */}
      <span className="text-xs font-bold text-gray-600 dark:text-gray-300">
        {entry.servings} {t('mealPlanner.servings')}
      </span>

      {/* Action Buttons Cluster */}
      <div className="flex items-center gap-1.5 shrink-0">
        {/* Cook Mode (Play) */}
        {onOpenCookMode && (
          <button
            onClick={() => {
              hapticMedium();
              onOpenCookMode(entry.recipeId);
            }}
            title={t('mealPlanner.cookNow')}
            aria-label={t('mealPlanner.cookNow')}
            className="w-9 h-9 min-w-[36px] min-h-[36px] rounded-full bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs shadow-emerald-600/30 active:scale-90 transition-all duration-150 flex items-center justify-center cursor-pointer border-none touch-manipulation"
          >
            <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
          </button>
        )}

        {/* Cooked Status Button */}
        <button
          onClick={() => {
            hapticMedium();
            onToggleCooked(entry);
          }}
          title={t('mealPlanner.markAsCooked')}
          aria-label={t('mealPlanner.markAsCooked')}
          className="w-9 h-9 min-w-[36px] min-h-[36px] rounded-full transition-all duration-150 flex items-center justify-center border-none bg-gray-100 hover:bg-emerald-50 dark:bg-gray-800 dark:hover:bg-emerald-950/30 text-gray-500 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 active:scale-90 cursor-pointer touch-manipulation"
        >
          <CheckCircle2 className="w-4 h-4 stroke-[2.25]" />
        </button>

        {/* Move to Tomorrow */}
        {onMoveToTomorrow && (
          <button
            onClick={() => {
              hapticLight();
              onMoveToTomorrow(entry);
            }}
            title={t('mealPlanner.moveToTomorrow')}
            aria-label={t('mealPlanner.moveToTomorrow')}
            className="w-9 h-9 min-w-[36px] min-h-[36px] rounded-full bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 active:scale-90 transition-all duration-150 flex items-center justify-center cursor-pointer border-none touch-manipulation"
          >
            <CalendarClock className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Delete Entry */}
        <button
          onClick={handleDelete}
          title={t('mealPlanner.deleteAction')}
          aria-label={t('mealPlanner.deleteConfirmBtn')}
          className="w-9 h-9 min-w-[36px] min-h-[36px] rounded-full bg-gray-100 hover:bg-rose-50 dark:bg-gray-800 dark:hover:bg-rose-950/30 text-gray-400 hover:text-rose-600 dark:hover:text-rose-400 active:scale-90 transition-all duration-150 flex items-center justify-center cursor-pointer border-none touch-manipulation"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

export default MealPlanCardActions;
