import { Drawer } from '@heroui/react';
import { HeartPulse, X } from 'lucide-react';
import { useI18n } from '../../context/I18nContext';
import { useModalOverlay } from '../../context/OverlayStackContext';
import { hapticLight } from '../../utils/haptics';
import type { HealthScoreBreakdown } from '../../types';
import { getHealthScoreColor } from './HealthScoreBadge';
import HealthScoreHeroCard from './HealthScoreHeroCard';
import HealthScoreActionCard from './HealthScoreActionCard';
import HealthScoreMetricsGrid from './HealthScoreMetricsGrid';
import HealthScoreNutritionCheck from './HealthScoreNutritionCheck';
import HealthScorePaywallPreview from './HealthScorePaywallPreview';

interface HealthScoreSheetProps {
  isOpen: boolean;
  onClose: () => void;
  score: number;
  breakdown?: HealthScoreBreakdown | null;
  onOpenCopilot?: (initialPrompt?: string) => void;
  isPremium?: boolean;
  onOpenPremium?: () => void;
}

export default function HealthScoreSheet({
  isOpen,
  onClose,
  score,
  breakdown,
  onOpenCopilot,
  isPremium = false,
  onOpenPremium,
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

  const { metrics, highlights = [], cautions = [] } = breakdown;

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
            <Drawer.Dialog className="relative !bg-[#f8fafc] dark:!bg-gray-950 max-h-[85vh] flex flex-col !p-0 rounded-t-3xl border-none shadow-[0_-4px_30px_rgba(0,0,0,0.12)] overflow-hidden w-full max-w-lg mx-auto">
              <Drawer.Handle />

              {/* Fixed Header Bar with tactile close button */}
              <Drawer.Header className="px-5 pt-3.5 pb-2 shrink-0 border-none">
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-2xl ${colors.badgeBg} flex items-center justify-center shrink-0`}>
                      <HeartPulse className={`w-5 h-5 ${colors.iconColor}`} />
                    </div>
                    <div>
                      <Drawer.Heading className="text-base sm:text-lg font-bold text-gray-900 dark:text-white leading-tight tracking-tight">
                        {t('recipe.healthScoreTitle')}
                      </Drawer.Heading>
                      <p className="text-xs text-gray-400 dark:text-gray-500 leading-tight mt-0.5">
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
                    className="w-10 h-10 min-w-[40px] min-h-[40px] rounded-full bg-white dark:bg-gray-900 shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex items-center justify-center text-gray-500 hover:text-gray-900 dark:hover:text-white shrink-0 active:scale-95 transition-all cursor-pointer border-none"
                    aria-label={t('recipe.healthScoreClose')}
                  >
                    <X className="w-4.5 h-4.5" />
                  </button>
                </div>
              </Drawer.Header>

              {/* Scrollable Content Body */}
              <Drawer.Body className="overflow-y-auto flex-1 flex flex-col gap-3.5 overscroll-contain px-5 pt-1 pb-[calc(1.5rem_+_var(--safe-area-inset-bottom))]">
                {/* 1. Luxury Hero Card (Gauge Left, Grade & Verdict Right, Spectrum Bottom) */}
                <HealthScoreHeroCard
                  score={score}
                  gradeLabel={getGradeLabel()}
                  colors={colors}
                  isEn={isEn}
                />

                {!isPremium ? (
                  <HealthScorePaywallPreview
                    isEn={isEn}
                    onUnlock={() => {
                      onClose();
                      onOpenPremium?.();
                    }}
                  />
                ) : (
                  <>
                    {/* 2. Sleek Action Card (Above-the-fold culinary customization trigger) */}
                    {onOpenCopilot && (
                      <HealthScoreActionCard
                        score={score}
                        grade={breakdown.grade}
                        onOpenCopilot={(prompt) => {
                          onClose();
                          onOpenCopilot(prompt);
                        }}
                      />
                    )}

                    {/* 3. Key Metrics 2x2 Bento Cards */}
                    <HealthScoreMetricsGrid metrics={metrics} isEn={isEn} />

                    {/* 4. Nutrition Audit (Yuka-style clean checklist) */}
                    <HealthScoreNutritionCheck
                      highlights={highlights}
                      cautions={cautions}
                      isEn={isEn}
                    />
                  </>
                )}
              </Drawer.Body>
            </Drawer.Dialog>
          </Drawer.Content>
        </Drawer.Backdrop>
      </Drawer>
    </div>
  );
}
