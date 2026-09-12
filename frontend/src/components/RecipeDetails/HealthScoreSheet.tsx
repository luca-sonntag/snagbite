import { Drawer, Button } from '@heroui/react';
import { HeartPulse, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';
import { useI18n } from '../../context/I18nContext';
import { useModalOverlay } from '../../context/OverlayStackContext';
import { hapticLight } from '../../utils/haptics';
import type { HealthScoreBreakdown } from '../../types';
import { getHealthScoreColor } from './HealthScoreBadge';

interface HealthScoreSheetProps {
  isOpen: boolean;
  onClose: () => void;
  score: number;
  breakdown?: HealthScoreBreakdown | null;
}

export default function HealthScoreSheet({
  isOpen,
  onClose,
  score,
  breakdown,
}: HealthScoreSheetProps) {
  const { t } = useI18n();
  useModalOverlay(isOpen, onClose);

  if (!breakdown) return null;

  const colors = getHealthScoreColor(score);

  const getGradeLabel = (): string => {
    if (score >= 85) return t('recipe.healthScoreGradeExcellent');
    if (score >= 70) return t('recipe.healthScoreGradeBalanced');
    if (score >= 50) return t('recipe.healthScoreGradeSolid');
    if (score >= 35) return t('recipe.healthScoreGradeIndulgent');
    return t('recipe.healthScoreGradeCheatMeal');
  };

  const { pillars, metrics, highlights, cautions, smartSwapTip } = breakdown;

  const pillarList = [
    { key: 'macro', data: pillars.macroBalance, bg: 'bg-blue-500' },
    { key: 'fiber', data: pillars.fiberSatiety, bg: 'bg-emerald-500' },
    { key: 'plant', data: pillars.plantPower, bg: 'bg-teal-500' },
    { key: 'purity', data: pillars.processingPurity, bg: 'bg-amber-500' },
  ];

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
            <Drawer.Dialog className="relative !bg-white dark:!bg-gray-900 !p-0 pb-[calc(1.5rem_+_var(--safe-area-inset-bottom))] rounded-t-3xl border-none shadow-[0_-4px_30px_rgba(0,0,0,0.12)] max-h-[88vh] overflow-y-auto">
              <Drawer.Handle />

              <div className="p-5 sm:p-6 flex flex-col gap-5 text-gray-900 dark:text-white max-w-lg mx-auto w-full">
                {/* Header with circular Score Ring */}
                <div className="flex items-center justify-between gap-4 pt-1">
                  <div className="flex items-center gap-3.5 flex-1 min-w-0">
                    <div className={`w-12 h-12 rounded-2xl ${colors.badgeBg} flex items-center justify-center shrink-0`}>
                      <HeartPulse className={`w-6 h-6 ${colors.iconColor}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
                          {t('recipe.healthScoreTitle')}
                        </h3>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${colors.badgeBg} ${colors.badgeText}`}>
                          {getGradeLabel()}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {t('recipe.healthScoreSheetSubtitle')}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className={`text-3xl font-black tabular-nums tracking-tight ${colors.badgeText}`}>
                      {score}
                    </span>
                    <span className="text-xs font-medium text-gray-400 dark:text-gray-500 block -mt-1">
                      /100 Pkt.
                    </span>
                  </div>
                </div>

                {/* Metrics Summary Strip (Clean Flat Pills) */}
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 pt-1">
                  {metrics.vegetableGramsPerServing !== undefined && (
                    <div className="bg-gray-50 dark:bg-gray-800/60 rounded-2xl p-2.5 flex flex-col text-center">
                      <span className="text-[11px] font-medium text-gray-400 dark:text-gray-500">Gemüse</span>
                      <span className="text-sm font-bold text-gray-900 dark:text-white tabular-nums mt-0.5">
                        {metrics.vegetableGramsPerServing}g
                      </span>
                    </div>
                  )}
                  {metrics.fiberGramsPerServing !== undefined && (
                    <div className="bg-gray-50 dark:bg-gray-800/60 rounded-2xl p-2.5 flex flex-col text-center">
                      <span className="text-[11px] font-medium text-gray-400 dark:text-gray-500">Ballastst.</span>
                      <span className="text-sm font-bold text-gray-900 dark:text-white tabular-nums mt-0.5">
                        {metrics.fiberGramsPerServing}g
                      </span>
                    </div>
                  )}
                  {metrics.plantIngredientsCount !== undefined && (
                    <div className="bg-gray-50 dark:bg-gray-800/60 rounded-2xl p-2.5 flex flex-col text-center">
                      <span className="text-[11px] font-medium text-gray-400 dark:text-gray-500">Pflanzen</span>
                      <span className="text-sm font-bold text-gray-900 dark:text-white tabular-nums mt-0.5">
                        {metrics.plantIngredientsCount} Arten
                      </span>
                    </div>
                  )}
                  {metrics.sugarGramsPerServing !== undefined && (
                    <div className="bg-gray-50 dark:bg-gray-800/60 rounded-2xl p-2.5 flex flex-col text-center">
                      <span className="text-[11px] font-medium text-gray-400 dark:text-gray-500">Zucker</span>
                      <span className="text-sm font-bold text-gray-900 dark:text-white tabular-nums mt-0.5">
                        {metrics.sugarGramsPerServing}g
                      </span>
                    </div>
                  )}
                </div>

                {/* 4 Pillars Progress Section */}
                <div className="flex flex-col gap-3 pt-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                    Säulen-Aufschlüsselung
                  </span>
                  <div className="flex flex-col gap-3">
                    {pillarList.map(({ key, data, bg }) => {
                      const pct = Math.round((data.score / data.maxScore) * 100);
                      return (
                        <div key={key} className="flex flex-col gap-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-gray-800 dark:text-gray-200">
                              {data.label}
                            </span>
                            <span className="font-bold tabular-nums text-gray-900 dark:text-white">
                              {data.score} <span className="font-normal text-gray-400">/{data.maxScore}</span>
                            </span>
                          </div>
                          <div className="w-full h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${bg} transition-all duration-500 ease-out`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-[11px] text-gray-500 dark:text-gray-400 leading-tight">
                            {data.explanation}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Highlights & Notes */}
                {highlights.length > 0 && (
                  <div className="flex flex-col gap-2 pt-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                      {t('recipe.healthScoreHighlightsTitle')}
                    </span>
                    <div className="flex flex-col gap-1.5">
                      {highlights.map((h, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs text-gray-700 dark:text-gray-300">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                          <span>{h}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {cautions.length > 0 && (
                  <div className="flex flex-col gap-2 pt-1">
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                      {t('recipe.healthScoreCautionsTitle')}
                    </span>
                    <div className="flex flex-col gap-1.5">
                      {cautions.map((c, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs text-gray-700 dark:text-gray-300">
                          <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                          <span>{c}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Smart Swap Tip */}
                {smartSwapTip && (
                  <div className="bg-emerald-500/[0.08] dark:bg-emerald-500/10 rounded-2xl p-3.5 flex items-start gap-3 border-none">
                    <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                    <span className="text-xs text-emerald-900 dark:text-emerald-200 font-medium leading-relaxed">
                      {smartSwapTip}
                    </span>
                  </div>
                )}

                {/* Close Button */}
                <Button
                  onPress={() => {
                    hapticLight();
                    onClose();
                  }}
                  className="w-full py-3.5 mt-2 rounded-2xl font-semibold bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 border-none active:scale-[0.98] transition-all h-12 text-sm"
                >
                  {t('recipe.healthScoreClose')}
                </Button>
              </div>
            </Drawer.Dialog>
          </Drawer.Content>
        </Drawer.Backdrop>
      </Drawer>
    </div>
  );
}
