import React, { useState, useMemo } from 'react';
import { Drawer } from '@heroui/react';
import {
  Calendar,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Clock,
  X,
} from 'lucide-react';
import { useI18n } from '../../context/I18nContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useModalOverlay } from '../../context/OverlayStackContext';
import { apiUrl } from '../../api';
import type { Recipe } from '../../types';
import { formatDateIso, addDays, getMonday } from './mealPlannerUtils';
import { getTotalTime } from '../../hooks/useSavedCatalog';
import CachedImage from '../CachedImage';
import ServingsStepper from '../ServingsStepper';
import { hapticLight, hapticMedium, hapticSelection } from '../../utils/haptics';

interface AddToMealPlanSheetProps {
  isOpen: boolean;
  onClose: () => void;
  recipeId: string;
  recipe: Recipe;
  initialServings?: number;
  onAddedSuccess?: () => void;
}

export const AddToMealPlanSheet: React.FC<AddToMealPlanSheetProps> = ({
  isOpen,
  onClose,
  recipeId,
  recipe,
  initialServings = 2,
  onAddedSuccess,
}) => {
  useModalOverlay(isOpen, onClose);
  const { t, language } = useI18n();
  const { getAccessToken, user } = useAuth();
  const toast = useToast();

  const [selectedDate, setSelectedDate] = useState<string>(() => formatDateIso(new Date()));
  const [weekStart, setWeekStart] = useState<Date>(() => getMonday(new Date()));
  const [servings, setServings] = useState<number>(initialServings);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const totalTime = useMemo(() => getTotalTime(recipe), [recipe]);
  const weekEnd = useMemo(() => addDays(weekStart, 6), [weekStart]);

  const weekLabel = useMemo(() => {
    const locale = language === 'en' ? 'en-US' : 'de-DE';
    const startDay = weekStart.getDate();
    const endDay = weekEnd.getDate();
    const startMonth = weekStart.toLocaleDateString(locale, { month: 'short' });
    const endMonth = weekEnd.toLocaleDateString(locale, { month: 'short' });
    if (startMonth === endMonth) {
      return `${startDay}. – ${endDay}. ${startMonth}`;
    }
    return `${startDay}. ${startMonth} – ${endDay}. ${endMonth}`;
  }, [weekStart, weekEnd, language]);

  const weekDays = useMemo(() => {
    const todayStr = formatDateIso(new Date());
    const locale = language === 'en' ? 'en-US' : 'de-DE';
    return Array.from({ length: 7 }, (_, i) => {
      const d = addDays(weekStart, i);
      const dateStr = formatDateIso(d);
      const dayName = d.toLocaleDateString(locale, { weekday: 'short' });
      const dayNumber = d.getDate();
      const isToday = dateStr === todayStr;
      return { dateStr, dayName, dayNumber, isToday };
    });
  }, [weekStart, language]);

  const handlePrevWeek = () => {
    hapticLight();
    setWeekStart((prev) => addDays(prev, -7));
  };

  const handleNextWeek = () => {
    hapticLight();
    setWeekStart((prev) => addDays(prev, 7));
  };

  const handleSubmit = async () => {
    if (!user) {
      toast.danger(t('auth.pleaseSignIn') || 'Bitte melde dich an');
      return;
    }
    if (isSubmitting) return;

    const targetRecipeId = recipeId || recipe?.id;
    if (!targetRecipeId) {
      toast.danger(t('mealPlanner.addError') || 'Fehler beim Planen des Rezepts');
      return;
    }

    setIsSubmitting(true);
    try {
      const token = await getAccessToken();
      const res = await fetch(apiUrl('/api/meal-plan'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          recipeId: targetRecipeId,
          planDate: selectedDate,
          mealType: 'dinner',
          servings,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        hapticMedium();
        window.dispatchEvent(new CustomEvent('meal-plans-updated'));
        toast.success(t('mealPlanner.addedToPlan'));
        onAddedSuccess?.();
        onClose();
      } else {
        toast.danger(data?.error?.message || t('mealPlanner.addError') || 'Fehler beim Hinzufügen zum Plan');
      }
    } catch (err) {
      console.error('Failed to add recipe to meal plan:', err);
      toast.danger(t('common.networkError') || 'Netzwerkfehler');
    } finally {
      setIsSubmitting(false);
    }
  };

  const recipeImage = recipe.imageUrl || recipe.imageUrls?.[0];
  const calories = recipe.nutritionalValues?.calories;

  return (
    <div onClick={(e) => e.stopPropagation()}>
      <Drawer>
        <Drawer.Backdrop
          isOpen={isOpen}
          onOpenChange={(open) => {
            if (!open) onClose();
          }}
          className="!z-[100]"
        >
          <Drawer.Content placement="bottom" className="!z-[100]">
            <Drawer.Dialog className="relative !bg-gray-50 dark:!bg-gray-950 max-h-[90vh] flex flex-col p-5 pb-[calc(1.5rem_+_var(--safe-area-inset-bottom))] rounded-t-3xl border-none shadow-[0_-4px_30px_rgba(0,0,0,0.12)]">
              <Drawer.Handle />

              {/* Recipe Header Card */}
              <div className="flex items-center justify-between gap-3 pt-1 pb-3 mb-2 border-none">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  {recipeImage && (
                    <div className="w-12 h-12 rounded-2xl overflow-hidden shrink-0 shadow-2xs bg-gray-100 dark:bg-gray-800">
                      <CachedImage
                        src={recipeImage}
                        alt={recipe.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white truncate">
                      {recipe.title}
                    </h3>
                    {(totalTime > 0 || !!calories) && (
                      <div className="flex items-center gap-1.5 mt-0.5 text-xs text-gray-500 dark:text-gray-400 font-semibold">
                        {totalTime > 0 && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-gray-400" />
                            <span>{totalTime} min</span>
                          </span>
                        )}
                        {totalTime > 0 && !!calories && (
                          <span className="text-gray-300 dark:text-gray-600 text-[10px] leading-none select-none">•</span>
                        )}
                        {calories ? (
                          <span>{Math.round(Number(calories))} kcal</span>
                        ) : null}
                      </div>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    hapticLight();
                    onClose();
                  }}
                  className="w-10 h-10 min-w-[44px] min-h-[44px] rounded-full bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white border-none flex items-center justify-center active:scale-95 transition-all cursor-pointer shrink-0"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body */}
              <Drawer.Body className="overflow-y-auto py-1 flex flex-col gap-4">
                {/* Week & Day Picker Section */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between px-0.5">
                    <span className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                      {t('mealPlanner.selectDate')}
                    </span>
                    {/* Mini Week Switcher */}
                    <div className="flex items-center gap-1.5 text-xs font-bold text-gray-800 dark:text-gray-200">
                      <button
                        type="button"
                        onClick={handlePrevWeek}
                        aria-label="Vorherige Woche"
                        className="w-6 h-6 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-800 dark:hover:text-gray-100 hover:bg-black/5 dark:hover:bg-white/10 active:scale-90 transition-all border-none cursor-pointer"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <span className="select-none min-w-[90px] text-center font-bold text-[11px] text-gray-700 dark:text-gray-300">
                        {weekLabel}
                      </span>
                      <button
                        type="button"
                        onClick={handleNextWeek}
                        aria-label="Nächste Woche"
                        className="w-6 h-6 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-800 dark:hover:text-gray-100 hover:bg-black/5 dark:hover:bg-white/10 active:scale-90 transition-all border-none cursor-pointer"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* 7-Day Capsule Grid (matching WeekDayPicker) */}
                  <div className="grid grid-cols-7 gap-1 pt-0.5">
                    {weekDays.map((day) => {
                      const isSelected = day.dateStr === selectedDate;
                      return (
                        <button
                          key={day.dateStr}
                          type="button"
                          onClick={() => {
                            hapticSelection();
                            setSelectedDate(day.dateStr);
                          }}
                          aria-label={`${day.dayName}, ${day.dayNumber}`}
                          aria-selected={isSelected}
                          className={`group relative flex flex-col items-center justify-center py-2 px-0.5 rounded-2xl transition-all duration-200 cursor-pointer border-none select-none active:scale-[0.93] ${
                            isSelected
                              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30 scale-[1.02] z-10'
                              : 'bg-gray-100/90 dark:bg-gray-800/80 text-gray-700 dark:text-gray-200 hover:bg-gray-200/80 shadow-2xs'
                          }`}
                        >
                          <span
                            className={`text-[10px] font-bold uppercase tracking-wider transition-colors ${
                              isSelected
                                ? 'text-emerald-100'
                                : day.isToday
                                ? 'text-emerald-600 dark:text-emerald-400 font-extrabold'
                                : 'text-gray-400 dark:text-gray-400'
                            }`}
                          >
                            {day.dayName}
                          </span>
                          <span
                            className={`text-sm sm:text-base font-black my-0.5 leading-none transition-colors ${
                              isSelected
                                ? 'text-white'
                                : day.isToday
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-gray-800 dark:text-gray-100'
                            }`}
                          >
                            {day.dayNumber}
                          </span>
                          <div className="flex items-center justify-center h-2 mt-0.5">
                            {day.isToday ? (
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  isSelected ? 'bg-white' : 'bg-emerald-500 ring-2 ring-emerald-500/20'
                                }`}
                              />
                            ) : (
                              <span className="w-1.5 h-1.5" />
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Servings Stepper */}
                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-gray-50/80 dark:bg-gray-850/60">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-gray-800 dark:text-gray-200">
                      {t('mealPlanner.servings')}
                    </span>
                    <span className="text-[11px] text-gray-400">
                      {servings === 1 ? '1 Person' : `${servings} Personen`}
                    </span>
                  </div>

                  <ServingsStepper
                    servings={servings}
                    onDecrease={() => setServings((s) => Math.max(1, s - 1))}
                    onIncrease={() => setServings((s) => s + 1)}
                    size="md"
                    showIcon={true}
                    ariaLabel={t('mealPlanner.servings')}
                  />
                </div>
              </Drawer.Body>

              {/* Primary Action Button */}
              <div className="pt-3">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleSubmit}
                  className="w-full h-12 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-md shadow-emerald-600/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2 border-none cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Calendar className="w-4.5 h-4.5" />
                      <span>{t('mealPlanner.addToPlan')}</span>
                    </>
                  )}
                </button>
              </div>
            </Drawer.Dialog>
          </Drawer.Content>
        </Drawer.Backdrop>
      </Drawer>
    </div>
  );
};

export default AddToMealPlanSheet;
