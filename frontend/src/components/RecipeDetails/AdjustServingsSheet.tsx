import { useState, useEffect } from 'react';
import { Drawer, Button } from '@heroui/react';
import { Users, Minus, Plus, Flame } from 'lucide-react';
import { useI18n } from '../../context/I18nContext';
import { useAuth } from '../../context/AuthContext';
import { useAdOverlay } from '../../context/OverlayStackContext';

interface AdjustServingsSheetProps {
  isOpen: boolean;
  onClose: () => void;
  baseServings: number;
  nutritionalValues?: any;
  onSave: (targetServings: number) => Promise<void>;
}

export default function AdjustServingsSheet({
  isOpen,
  onClose,
  baseServings,
  nutritionalValues,
  onSave,
}: AdjustServingsSheetProps) {
  const { t } = useI18n();
  const { isPremium } = useAuth();
  useAdOverlay(isOpen);

  const initialServings = Math.max(1, baseServings || 1);
  const [targetServings, setTargetServings] = useState<number>(initialServings);
  const [isSaving, setIsSaving] = useState(false);

  // Reset target servings when opened
  useEffect(() => {
    if (isOpen) {
      setTargetServings(Math.max(1, baseServings || 1));
      setIsSaving(false);
    }
  }, [isOpen, baseServings]);

  const parseNum = (val: any): number => {
    if (val === undefined || val === null || val === '') return 0;
    if (typeof val === 'number') return val;
    const match = String(val).trim().match(/^([\d.,]+)/);
    if (!match) return 0;
    const n = parseFloat(match[1].replace(',', '.'));
    return isNaN(n) ? 0 : n;
  };

  const oldCalories = Math.round(parseNum(nutritionalValues?.calories));
  const oldProtein = parseNum(nutritionalValues?.protein);
  const oldCarbs = parseNum(nutritionalValues?.carbs);
  const oldFat = parseNum(nutritionalValues?.fat);

  const hasNutrition = oldCalories > 0 || oldProtein > 0 || oldCarbs > 0 || oldFat > 0;
  const ratio = initialServings / targetServings;

  const newCalories = Math.round(oldCalories * ratio);
  const newProtein = Math.round(oldProtein * ratio * 10) / 10;
  const newCarbs = Math.round(oldCarbs * ratio * 10) / 10;
  const newFat = Math.round(oldFat * ratio * 10) / 10;

  const proteinKcal = newProtein * 4;
  const carbsKcal = newCarbs * 4;
  const fatKcal = newFat * 9;
  const totalMacroKcal = proteinKcal + carbsKcal + fatKcal;

  const proteinPct = totalMacroKcal > 0 ? Math.round((proteinKcal / totalMacroKcal) * 100) : 0;
  const carbsPct = totalMacroKcal > 0 ? Math.round((carbsKcal / totalMacroKcal) * 100) : 0;
  const fatPct = totalMacroKcal > 0 ? Math.max(0, 100 - proteinPct - carbsPct) : 0;

  const handleDecrease = () => {
    if (targetServings > 1) {
      setTargetServings((prev) => prev - 1);
    }
  };

  const handleIncrease = () => {
    if (targetServings < 24) {
      setTargetServings((prev) => prev + 1);
    }
  };

  const handleConfirmSave = async () => {
    try {
      setIsSaving(true);
      await onSave(targetServings);
      onClose();
    } catch (err) {
      console.error('Failed to save adjusted servings:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const formatMacro = (val: number) => {
    return Number.isInteger(val) ? String(val) : val.toFixed(1);
  };

  const iconBadge =
    'w-9 h-9 rounded-full bg-emerald-500/5 flex items-center justify-center flex-shrink-0';
  const iconClass = 'w-[18px] h-[18px] text-emerald-600 dark:text-emerald-400';
  const statLabel =
    'text-[10px] uppercase tracking-wider font-bold text-gray-400 dark:text-gray-500';

  return (
    <div onClick={(e) => e.stopPropagation()}>
      <Drawer>
        <Drawer.Backdrop
          isOpen={isOpen}
          onOpenChange={(open) => {
            if (!open && !isSaving) onClose();
          }}
          className="!z-[100]"
        >
          <Drawer.Content placement="bottom" className="!z-[100]">
            <Drawer.Dialog className="relative !bg-white dark:!bg-gray-900 !p-0 pb-[calc(1.5rem_+_var(--safe-area-inset-bottom))] rounded-t-3xl border-none shadow-[0_-4px_30px_rgba(0,0,0,0.12)]">
              <Drawer.Handle />

              <div className="p-5 sm:p-6 flex flex-col gap-5 text-gray-900 dark:text-white max-w-lg mx-auto w-full">
                {/* Header */}
                <div className="flex items-start gap-3">
                  <div className={iconBadge}>
                    <Users className={iconClass} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-bold text-gray-900 dark:text-white">
                      {t('recipe.adjustServingsTitle')}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-normal">
                      {t('recipe.adjustServingsSubtitle')}
                    </p>
                  </div>
                </div>

                {/* Clean Stepper (No grey box) */}
                <div className="flex items-center justify-center gap-6 py-2">
                  <Button
                    isIconOnly
                    size="md"
                    variant="tertiary"
                    className="w-12 h-12 min-w-[48px] min-h-[48px] rounded-full text-gray-600 dark:text-gray-300 bg-black/[0.03] dark:bg-white/[0.05] hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-500/10 active:scale-90 disabled:opacity-30 disabled:pointer-events-none transition-all"
                    onPress={handleDecrease}
                    isDisabled={targetServings <= 1 || isSaving}
                    aria-label={t('recipe.decreaseServings')}
                  >
                    <Minus className="w-5 h-5" />
                  </Button>

                  <div className="min-w-[4.5rem] text-center">
                    <span className="text-4xl font-extrabold text-gray-900 dark:text-white tabular-nums tracking-tight">
                      {targetServings}
                    </span>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mt-0.5">
                      {t('recipe.serves')}
                    </div>
                  </div>

                  <Button
                    isIconOnly
                    size="md"
                    variant="tertiary"
                    className="w-12 h-12 min-w-[48px] min-h-[48px] rounded-full text-gray-600 dark:text-gray-300 bg-black/[0.03] dark:bg-white/[0.05] hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-500/10 active:scale-90 disabled:opacity-30 disabled:pointer-events-none transition-all"
                    onPress={handleIncrease}
                    isDisabled={targetServings >= 24 || isSaving}
                    aria-label={t('recipe.increaseServings')}
                  >
                    <Plus className="w-5 h-5" />
                  </Button>
                </div>

                {/* Nutrition card matching RecipeNutrition */}
                {hasNutrition && (
                  <div className="glass-panel rounded-2xl p-4 flex flex-col gap-2.5">
                    <div className="flex items-center gap-3">
                      <div className={iconBadge}>
                        <Flame className={iconClass} />
                      </div>

                      <div className="flex-1 min-w-0">
                        {/* Top Label */}
                        <div className="flex items-center justify-between gap-1 min-w-0 mb-1">
                          <span className={statLabel}>
                            {t('recipe.nutritionTitle')} ({t('recipe.nutritionPerServing')})
                          </span>
                        </div>

                        {/* 4-column grid */}
                        <div className="grid grid-cols-4 gap-1.5 text-left items-start">
                          {/* Calories */}
                          <div>
                            <div className="text-gray-900 dark:text-white text-base font-bold tabular-nums leading-tight">
                              {newCalories > 0 ? newCalories : '—'}
                            </div>
                            <div className="text-[10px] font-medium text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                              {t('recipe.nutritionCalories')}
                            </div>
                          </div>

                          {/* Protein */}
                          <div className={!isPremium ? 'filter blur-[2.5px] select-none opacity-60' : ''}>
                            <div className="flex items-center gap-1.5">
                              <span className={`w-2 h-2 rounded-[3px] shrink-0 ${isPremium ? 'bg-blue-500' : 'bg-blue-500/70'}`} />
                              <span className="text-gray-900 dark:text-white text-xs sm:text-sm font-semibold tabular-nums leading-tight">
                                {isPremium ? `${formatMacro(newProtein)}g` : '00g'}
                              </span>
                            </div>
                            <div className="text-[10px] font-medium text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                              {t('recipe.ingredientNutritionProtein')}
                            </div>
                          </div>

                          {/* Carbs */}
                          <div className={!isPremium ? 'filter blur-[2.5px] select-none opacity-60' : ''}>
                            <div className="flex items-center gap-1.5">
                              <span className={`w-2 h-2 rounded-[3px] shrink-0 ${isPremium ? 'bg-amber-500' : 'bg-amber-500/70'}`} />
                              <span className="text-gray-900 dark:text-white text-xs sm:text-sm font-semibold tabular-nums leading-tight">
                                {isPremium ? `${formatMacro(newCarbs)}g` : '00g'}
                              </span>
                            </div>
                            <div className="text-[10px] font-medium text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                              {t('recipe.nutritionCarbs')}
                            </div>
                          </div>

                          {/* Fat */}
                          <div className={!isPremium ? 'filter blur-[2.5px] select-none opacity-60' : ''}>
                            <div className="flex items-center gap-1.5">
                              <span className={`w-2 h-2 rounded-[3px] shrink-0 ${isPremium ? 'bg-rose-500' : 'bg-rose-500/70'}`} />
                              <span className="text-gray-900 dark:text-white text-xs sm:text-sm font-semibold tabular-nums leading-tight">
                                {isPremium ? `${formatMacro(newFat)}g` : '00g'}
                              </span>
                            </div>
                            <div className="text-[10px] font-medium text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                              {t('recipe.ingredientNutritionFat')}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Macro Progress Bar */}
                    {isPremium ? (
                      totalMacroKcal > 0 && (
                        <div className="h-1.5 w-full rounded-full bg-black/5 dark:bg-white/10 overflow-hidden flex shadow-inner">
                          {proteinPct > 0 && (
                            <div
                              style={{ width: `${proteinPct}%` }}
                              className="h-full bg-blue-500 transition-all duration-300"
                            />
                          )}
                          {carbsPct > 0 && (
                            <div
                              style={{ width: `${carbsPct}%` }}
                              className="h-full bg-amber-500 transition-all duration-300"
                            />
                          )}
                          {fatPct > 0 && (
                            <div
                              style={{ width: `${fatPct}%` }}
                              className="h-full bg-rose-500 transition-all duration-300"
                            />
                          )}
                        </div>
                      )
                    ) : (
                      /* Free mode: blurred uneven preview */
                      <div className="h-1.5 w-full rounded-full bg-black/5 dark:bg-white/10 overflow-hidden flex shadow-inner filter blur-[1.5px] opacity-60">
                        <div className="w-[18%] h-full bg-blue-500" />
                        <div className="w-[54%] h-full bg-amber-500" />
                        <div className="w-[28%] h-full bg-rose-500" />
                      </div>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2 pt-1">
                  <Button
                    variant="tertiary"
                    onPress={onClose}
                    isDisabled={isSaving}
                    className="flex-1 h-12 rounded-xl text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white font-semibold transition-all"
                  >
                    {t('recipe.adjustServingsCancel')}
                  </Button>
                  <Button
                    onPress={handleConfirmSave}
                    isDisabled={isSaving}
                    className="flex-1 h-12 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shadow-md active:scale-[0.98] transition-all"
                  >
                    {isSaving ? t('recipe.adjustServingsSaving') : t('recipe.adjustServingsSave')}
                  </Button>
                </div>
              </div>
            </Drawer.Dialog>
          </Drawer.Content>
        </Drawer.Backdrop>
      </Drawer>
    </div>
  );
}
