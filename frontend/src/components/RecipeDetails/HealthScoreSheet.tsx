import { Drawer, Button } from '@heroui/react';
import { HeartPulse, X } from 'lucide-react';
import { useI18n } from '../../context/I18nContext';
import { useModalOverlay } from '../../context/OverlayStackContext';
import { hapticLight } from '../../utils/haptics';
import type { HealthScoreBreakdown } from '../../types';
import { getHealthScoreColor } from './HealthScoreBadge';
import HealthScoreHeroCard from './HealthScoreHeroCard';
import HealthScoreMetricsGrid from './HealthScoreMetricsGrid';
import HealthScoreNutritionCheck from './HealthScoreNutritionCheck';
import HealthScoreSmartTip from './HealthScoreSmartTip';

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

  const { metrics, highlights = [], cautions = [], smartSwapTip } = breakdown;

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
            <Drawer.Dialog className="relative !bg-[#fbfbfb] dark:!bg-gray-900 max-h-[88vh] flex flex-col p-4 sm:p-5 pb-[calc(1.5rem_+_var(--safe-area-inset-bottom))] rounded-t-3xl border-none shadow-[0_-8px_30px_rgba(0,0,0,0.12)] overflow-hidden w-full max-w-lg mx-auto">
              <Drawer.Handle />

              {/* Fixed Header Bar with tactile close button */}
              <Drawer.Header className="pb-2.5 mb-1 shrink-0">
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-8 h-8 rounded-xl ${colors.badgeBg} flex items-center justify-center shrink-0`}>
                      <HeartPulse className={`w-4.5 h-4.5 ${colors.iconColor}`} />
                    </div>
                    <div>
                      <Drawer.Heading className="text-base font-bold text-gray-900 dark:text-white leading-tight tracking-tight">
                        {t('recipe.healthScoreTitle')}
                      </Drawer.Heading>
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
                    className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-400 transition-colors border-none cursor-pointer active:scale-95"
                    aria-label={t('recipe.healthScoreClose')}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </Drawer.Header>

              {/* Scrollable Luxury Content Body */}
              <Drawer.Body className="overflow-y-auto flex-1 flex flex-col gap-3.5 overscroll-contain pr-1 -mr-1">
                {/* 1. Luxury Hero Card (Gauge Left, Grade & Verdict Right, Spectrum Bottom) */}
                <HealthScoreHeroCard
                  score={score}
                  gradeLabel={getGradeLabel()}
                  colors={colors}
                  isEn={isEn}
                />

                {/* 2. Key Metrics 2x2 Bento Cards */}
                <HealthScoreMetricsGrid metrics={metrics} isEn={isEn} />

                {/* 3. Nutrition Audit (Yuka-style clean checklist) */}
                <HealthScoreNutritionCheck
                  highlights={highlights}
                  cautions={cautions}
                  isEn={isEn}
                />

                {/* 4. Smart Swap AI Tip */}
                {smartSwapTip && (
                  <HealthScoreSmartTip tip={smartSwapTip} isEn={isEn} />
                )}
              </Drawer.Body>

              {/* Fixed Footer with Apple-grade CTA Button */}
              <Drawer.Footer className="pt-2 shrink-0">
                <Button
                  onPress={() => {
                    hapticLight();
                    onClose();
                  }}
                  className="w-full py-3 rounded-2xl font-semibold bg-gray-900 hover:bg-gray-800 text-white dark:bg-white dark:hover:bg-gray-100 dark:text-gray-900 border-none active:scale-[0.98] transition-all h-12 text-sm shadow-sm cursor-pointer"
                >
                  {t('recipe.healthScoreClose')}
                </Button>
              </Drawer.Footer>
            </Drawer.Dialog>
          </Drawer.Content>
        </Drawer.Backdrop>
      </Drawer>
    </div>
  );
}
