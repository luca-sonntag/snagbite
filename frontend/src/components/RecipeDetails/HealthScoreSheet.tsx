import { Drawer, Button } from '@heroui/react';
import { HeartPulse, CheckCircle2, AlertCircle, Sparkles, X } from 'lucide-react';
import { useI18n } from '../../context/I18nContext';
import { useModalOverlay } from '../../context/OverlayStackContext';
import { hapticLight } from '../../utils/haptics';
import type { HealthScoreBreakdown } from '../../types';
import { getHealthScoreColor } from './HealthScoreBadge';
import HealthScoreHero from './HealthScoreHero';
import HealthScoreMetricsGrid from './HealthScoreMetricsGrid';

interface HealthScoreSheetProps {
  isOpen: boolean;
  onClose: () => void;
  score: number;
  breakdown?: HealthScoreBreakdown | null;
}

function getPillarFill(score: number, maxScore: number): string {
  const pct = (score / maxScore) * 100;
  if (pct >= 85) return 'bg-emerald-500';
  if (pct >= 70) return 'bg-teal-500';
  if (pct >= 50) return 'bg-amber-500';
  return 'bg-orange-500';
}

export default function HealthScoreSheet({
  isOpen,
  onClose,
  score,
  breakdown,
}: HealthScoreSheetProps) {
  const { t, language } = useI18n();
  useModalOverlay(isOpen, onClose);

  if (!breakdown) return null;

  const isEn = language === 'en';
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
    { key: 'macro', data: pillars.macroBalance },
    { key: 'fiber', data: pillars.fiberSatiety },
    { key: 'plant', data: pillars.plantPower },
    { key: 'purity', data: pillars.processingPurity },
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
            <Drawer.Dialog className="relative !bg-white dark:!bg-gray-900 !p-0 pb-[calc(1.5rem_+_var(--safe-area-inset-bottom))] rounded-t-3xl border-none shadow-[0_-8px_30px_rgba(0,0,0,0.12)] max-h-[90vh] overflow-y-auto">
              <Drawer.Handle />

              <div className="p-4 sm:p-6 flex flex-col gap-4.5 text-gray-900 dark:text-white max-w-lg mx-auto w-full">
                {/* Header Bar with tactile close button */}
                <div className="flex items-center justify-between pt-0.5">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-8 h-8 rounded-xl ${colors.badgeBg} flex items-center justify-center shrink-0`}>
                      <HeartPulse className={`w-4.5 h-4.5 ${colors.iconColor}`} />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-gray-900 dark:text-white leading-tight">
                        {t('recipe.healthScoreTitle')}
                      </h3>
                      <p className="text-[11px] text-gray-400 dark:text-gray-500 leading-tight">
                        DGE, WHO & NOVA Standard
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      hapticLight();
                      onClose();
                    }}
                    className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-400 transition-colors border-none cursor-pointer"
                    aria-label={t('recipe.healthScoreClose')}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Hero Score Gauge & 5-Zone Spectrum */}
                <HealthScoreHero
                  score={score}
                  gradeLabel={getGradeLabel()}
                  colors={colors}
                  isEn={isEn}
                />

                {/* 2x2 Balanced Key Metrics Grid (Fixes orphan item bug) */}
                <HealthScoreMetricsGrid metrics={metrics} isEn={isEn} />

                {/* 4 Pillars Breakdown with Adaptive Progress Colors */}
                <div className="flex flex-col gap-2.5 pt-1">
                  <span className="text-xs font-bold text-gray-900 dark:text-white">
                    {isEn ? 'Evaluation Pillars' : 'Säulen der Bewertung'}
                  </span>
                  <div className="flex flex-col gap-3">
                    {pillarList.map(({ key, data }) => {
                      const pct = Math.round((data.score / data.maxScore) * 100);
                      const fillClass = getPillarFill(data.score, data.maxScore);
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
                              className={`h-full rounded-full ${fillClass} transition-all duration-700 ease-out`}
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

                {/* Highlights (Stärken) */}
                {highlights.length > 0 && (
                  <div className="flex flex-col gap-2 pt-1">
                    <h4 className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span>{t('recipe.healthScoreHighlightsTitle')}</span>
                    </h4>
                    <div className="flex flex-col gap-1.5">
                      {highlights.map((h, i) => (
                        <div key={i} className="flex items-start gap-2.5 text-xs text-gray-700 dark:text-gray-300 leading-snug">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 mt-1.5" />
                          <span>{h}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Cautions (Zu beachten) */}
                {cautions.length > 0 && (
                  <div className="flex flex-col gap-2 pt-0.5">
                    <h4 className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <span>{t('recipe.healthScoreCautionsTitle')}</span>
                    </h4>
                    <div className="flex flex-col gap-1.5">
                      {cautions.map((c, i) => (
                        <div key={i} className="flex items-start gap-2.5 text-xs text-gray-700 dark:text-gray-300 leading-snug">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0 mt-1.5" />
                          <span>{c}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Smart Swap AI Tip */}
                {smartSwapTip && (
                  <div className="bg-emerald-500/[0.08] dark:bg-emerald-500/15 rounded-2xl p-3.5 flex items-start gap-3 border-none">
                    <div className="w-7 h-7 rounded-xl bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0 mt-0.5">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <span className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                        {t('recipe.healthScoreSmartSwapTitle')}
                      </span>
                      <span className="text-xs text-emerald-800 dark:text-emerald-300 leading-relaxed font-normal">
                        {smartSwapTip}
                      </span>
                    </div>
                  </div>
                )}

                {/* Tactile Close Button */}
                <Button
                  onPress={() => {
                    hapticLight();
                    onClose();
                  }}
                  className="w-full py-3.5 mt-1 rounded-2xl font-semibold bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 border-none active:scale-[0.98] transition-all h-12 text-sm cursor-pointer"
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
