import { useState, useEffect } from 'react';
import { Drawer, Button } from '@heroui/react';
import { Users, Minus, Plus, Flame, ArrowRight } from 'lucide-react';
import { useI18n } from '../../context/I18nContext';
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
  const oldProtein = Math.round(parseNum(nutritionalValues?.protein) * 10) / 10;
  const oldCarbs = Math.round(parseNum(nutritionalValues?.carbs) * 10) / 10;
  const oldFat = Math.round(parseNum(nutritionalValues?.fat) * 10) / 10;

  const hasNutrition = oldCalories > 0 || oldProtein > 0 || oldCarbs > 0 || oldFat > 0;
  const ratio = initialServings / targetServings;

  const newCalories = Math.round(oldCalories * ratio);
  const newProtein = Math.round(oldProtein * ratio * 10) / 10;
  const newCarbs = Math.round(oldCarbs * ratio * 10) / 10;
  const newFat = Math.round(oldFat * ratio * 10) / 10;

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
                  <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center flex-shrink-0 text-emerald-600 dark:text-emerald-400">
                    <Users className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-bold tracking-tight text-gray-900 dark:text-white">
                      {t('recipe.adjustServingsTitle')}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                      {initialServings === 1
                        ? t('recipe.adjustServingsSubtitleSingular')
                        : t('recipe.adjustServingsSubtitle', { servings: initialServings })}
                    </p>
                  </div>
                </div>

                {/* Stepper Box */}
                <div className="flex flex-col items-center justify-center py-4 px-6 bg-gray-100/70 dark:bg-gray-800/60 rounded-2xl border-none shadow-[0_2px_6px_rgba(0,0,0,0.03)]">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2">
                    {t('recipe.adjustServingsTargetLabel')}
                  </span>
                  <div className="flex items-center gap-4">
                    <Button
                      isIconOnly
                      size="md"
                      variant="tertiary"
                      className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-full text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 shadow-[0_2px_6px_rgba(0,0,0,0.03)] border-none hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-500/10 active:scale-90 disabled:opacity-30 disabled:pointer-events-none transition-all"
                      onPress={handleDecrease}
                      isDisabled={targetServings <= 1 || isSaving}
                      aria-label={t('recipe.decreaseServings')}
                    >
                      <Minus className="w-5 h-5" />
                    </Button>

                    <div className="min-w-[4rem] text-center">
                      <span className="text-3xl font-extrabold text-gray-900 dark:text-white tabular-nums tracking-tight">
                        {targetServings}
                      </span>
                    </div>

                    <Button
                      isIconOnly
                      size="md"
                      variant="tertiary"
                      className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-full text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 shadow-[0_2px_6px_rgba(0,0,0,0.03)] border-none hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-500/10 active:scale-90 disabled:opacity-30 disabled:pointer-events-none transition-all"
                      onPress={handleIncrease}
                      isDisabled={targetServings >= 24 || isSaving}
                      aria-label={t('recipe.increaseServings')}
                    >
                      <Plus className="w-5 h-5" />
                    </Button>
                  </div>
                </div>

                {/* Nutritional Preview Card */}
                {hasNutrition && (
                  <div className="bg-emerald-500/10 dark:bg-emerald-500/15 border-none shadow-[0_2px_6px_rgba(0,0,0,0.03)] rounded-2xl p-4 flex flex-col gap-2.5">
                    <div className="flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300">
                      <Flame className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                      <span className="text-[10px] font-bold uppercase tracking-wider">
                        {t('recipe.adjustServingsPreviewTitle')}
                      </span>
                    </div>

                    {oldCalories > 0 && (
                      <p className="text-xs text-gray-700 dark:text-gray-200 font-semibold leading-relaxed">
                        {targetServings === initialServings
                          ? t('recipe.adjustServingsPreviewUnchanged', { kcal: oldCalories })
                          : t('recipe.adjustServingsPreviewKcal', {
                              oldKcal: oldCalories.toLocaleString('de-DE'),
                              newKcal: newCalories.toLocaleString('de-DE'),
                            })}
                      </p>
                    )}

                    {/* Macros grid */}
                    {(oldProtein > 0 || oldCarbs > 0 || oldFat > 0) && (
                      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-emerald-500/10 dark:border-emerald-500/20">
                        {/* Protein */}
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                            {t('recipe.nutritionProtein')}
                          </span>
                          <div className="text-xs font-semibold text-gray-900 dark:text-white tabular-nums flex items-center gap-1">
                            <span>{formatMacro(oldProtein)}g</span>
                            {targetServings !== initialServings && (
                              <>
                                <ArrowRight className="w-2.5 h-2.5 opacity-40" />
                                <span className="text-emerald-700 dark:text-emerald-300 font-bold">
                                  {formatMacro(newProtein)}g
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Carbs */}
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            {t('recipe.nutritionCarbs')}
                          </span>
                          <div className="text-xs font-semibold text-gray-900 dark:text-white tabular-nums flex items-center gap-1">
                            <span>{formatMacro(oldCarbs)}g</span>
                            {targetServings !== initialServings && (
                              <>
                                <ArrowRight className="w-2.5 h-2.5 opacity-40" />
                                <span className="text-emerald-700 dark:text-emerald-300 font-bold">
                                  {formatMacro(newCarbs)}g
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Fat */}
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                            {t('recipe.nutritionFat')}
                          </span>
                          <div className="text-xs font-semibold text-gray-900 dark:text-white tabular-nums flex items-center gap-1">
                            <span>{formatMacro(oldFat)}g</span>
                            {targetServings !== initialServings && (
                              <>
                                <ArrowRight className="w-2.5 h-2.5 opacity-40" />
                                <span className="text-emerald-700 dark:text-emerald-300 font-bold">
                                  {formatMacro(newFat)}g
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-3 pt-2">
                  <Button
                    variant="tertiary"
                    onPress={onClose}
                    isDisabled={isSaving}
                    className="flex-1 h-12 rounded-2xl bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 font-bold border-none active:scale-95 transition-all"
                  >
                    {t('recipe.adjustServingsCancel')}
                  </Button>
                  <Button
                    onPress={handleConfirmSave}
                    isDisabled={isSaving}
                    className="flex-1 h-12 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold border-none shadow-[0_2px_6px_rgba(0,0,0,0.03)] active:scale-95 transition-all"
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
