import React, { useState } from 'react';
import { MoreVertical, Play, CheckCircle2, CalendarClock, Trash2 } from 'lucide-react';
import { Button, Popover } from '@heroui/react';
import type { MealPlanEntry } from '../../types';
import { useI18n } from '../../context/I18nContext';
import { hapticLight, hapticMedium, hapticHeavy } from '../../utils/haptics';

export interface MealPlanCardMenuProps {
  entry: MealPlanEntry;
  onUpdateServings?: (id: string, servings: number) => void;
  onToggleCooked: (entry: MealPlanEntry) => void;
  onDeleteEntry: (id: string) => void;
  onMoveToTomorrow?: (entry: MealPlanEntry) => void;
  onOpenCookMode?: (recipeId: string) => void;
}

export const MealPlanCardMenu: React.FC<MealPlanCardMenuProps> = ({
  entry,
  onToggleCooked,
  onDeleteEntry,
  onMoveToTomorrow,
  onOpenCookMode,
}) => {
  const { t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Popover isOpen={isOpen} onOpenChange={setIsOpen}>
      <Popover.Trigger>
        <Button
          isIconOnly
          variant="ghost"
          onClick={(e) => {
            e.stopPropagation();
            hapticLight();
          }}
          className="w-10 h-10 min-w-[40px] min-h-[40px] rounded-full text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 hover:bg-black/5 dark:hover:bg-white/10 active:scale-90 transition-all cursor-pointer border-none flex items-center justify-center -mr-1.5 touch-manipulation"
          aria-label={t('mealPlanner.options') || 'Optionen'}
        >
          <MoreVertical className="w-5 h-5" />
        </Button>
      </Popover.Trigger>
      <Popover.Content placement="bottom end" className="p-1.5 min-w-[210px] bg-white dark:bg-gray-900 border-none rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
        <Popover.Dialog className="outline-none border-none p-0 m-0">
          <div className="flex flex-col w-full gap-0.5">
            {/* 1. Kochen starten */}
            {onOpenCookMode && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  hapticMedium();
                  setIsOpen(false);
                  onOpenCookMode(entry.recipeId);
                }}
                className="flex items-center gap-3 w-full px-3.5 py-3 min-h-[44px] text-sm font-semibold text-gray-800 dark:text-gray-200 hover:bg-black/5 dark:hover:bg-white/5 active:scale-[0.98] rounded-xl text-left transition-all cursor-pointer border-none touch-manipulation"
              >
                <Play className="w-4 h-4 text-gray-500 dark:text-gray-400 shrink-0 fill-current" />
                <span>{t('mealPlanner.cookNow')}</span>
              </button>
            )}

            {/* 2. Gekocht Toggle */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                hapticMedium();
                setIsOpen(false);
                onToggleCooked(entry);
              }}
              className="flex items-center gap-3 w-full px-3.5 py-3 min-h-[44px] text-sm font-semibold text-gray-800 dark:text-gray-200 hover:bg-black/5 dark:hover:bg-white/5 active:scale-[0.98] rounded-xl text-left transition-all cursor-pointer border-none touch-manipulation"
            >
              <CheckCircle2 className="w-4 h-4 text-gray-500 dark:text-gray-400 shrink-0" />
              <span>
                {entry.isCooked
                  ? (t('mealPlanner.markAsUncooked') || 'Als ungekocht markieren')
                  : t('mealPlanner.markAsCooked')}
              </span>
            </button>

            {/* 3. Auf morgen verschieben */}
            {onMoveToTomorrow && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  hapticLight();
                  setIsOpen(false);
                  onMoveToTomorrow(entry);
                }}
                className="flex items-center gap-3 w-full px-3.5 py-3 min-h-[44px] text-sm font-semibold text-gray-800 dark:text-gray-200 hover:bg-black/5 dark:hover:bg-white/5 active:scale-[0.98] rounded-xl text-left transition-all cursor-pointer border-none touch-manipulation"
              >
                <CalendarClock className="w-4 h-4 text-gray-500 dark:text-gray-400 shrink-0" />
                <span>{t('mealPlanner.moveToTomorrow')}</span>
              </button>
            )}

            {/* 4. Aus Planer löschen (bleibt rot für Destruktivität) */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                hapticHeavy();
                setIsOpen(false);
                onDeleteEntry(entry.id);
              }}
              className="flex items-center gap-3 w-full px-3.5 py-3 min-h-[44px] text-sm font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 active:scale-[0.98] rounded-xl text-left transition-all cursor-pointer border-none touch-manipulation"
            >
              <Trash2 className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
              <span>{t('mealPlanner.deleteAction')}</span>
            </button>
          </div>
        </Popover.Dialog>
      </Popover.Content>
    </Popover>
  );
};

export const MealPlanCardActions = MealPlanCardMenu;
export default MealPlanCardMenu;
