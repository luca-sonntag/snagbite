import React from 'react';
import { Button } from '@heroui/react';
import { X, Timer, MessageCircle } from 'lucide-react';
import { useI18n } from '../../context/I18nContext';
import { useTimerContext } from '../../context/TimerContext';
import { hapticLight } from '../../utils/haptics';
import PremiumCrownBadge from '../PremiumCrownBadge';

interface CookingModeHeaderProps {
  currentStepIndex: number;
  totalSteps: number;
  onClose: () => void;
  onOpenTimer: () => void;
  onOpenCopilot: () => void;
  hasCoverImage?: boolean;
  isPremium?: boolean;
}

export const CookingModeHeader: React.FC<CookingModeHeaderProps> = ({
  onClose,
  onOpenTimer,
  onOpenCopilot,
  isPremium = false,
}) => {
  const { t } = useI18n();
  const { timers } = useTimerContext();
  const hasRunningTimer = timers.some((t) => !t.isFinished);

  return (
    <header className="flex items-center justify-between gap-2 pb-1 shrink-0">
      {/* Left: Close Action */}
      <div className="flex items-center">
        <Button
          isIconOnly
          variant="ghost"
          onPress={() => {
            hapticLight();
            onClose();
          }}
          className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-2xl bg-black/[0.04] hover:bg-black/[0.08] dark:bg-white/[0.06] dark:hover:bg-white/[0.1] text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white flex items-center justify-center border-none transition-all active:scale-95 cursor-pointer"
          aria-label={t('dialog.closeAria')}
        >
          <X className="w-5 h-5" />
        </Button>
      </div>

      {/* Center: Clean Title */}
      <div className="flex items-center">
        <span className="text-sm font-bold text-gray-900 dark:text-white tracking-tight">
          {t('recipe.cookingMode')}
        </span>
      </div>

      {/* Right: Quick action controls in unified calm styling */}
      <div className="flex items-center gap-1.5">
        <div className="relative">
          <Button
            isIconOnly
            variant="ghost"
            onPress={() => {
              hapticLight();
              onOpenTimer();
            }}
            className={`w-11 h-11 min-w-[44px] min-h-[44px] rounded-2xl flex items-center justify-center border-none transition-all active:scale-95 cursor-pointer ${
              hasRunningTimer
                ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400 animate-pulse'
                : 'bg-black/[0.04] hover:bg-black/[0.08] dark:bg-white/[0.06] dark:hover:bg-white/[0.1] text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
            }`}
            aria-label={t('timer.start')}
          >
            <Timer className="w-5 h-5" />
          </Button>
          {!isPremium && <PremiumCrownBadge />}
        </div>

        <div className="relative">
          <Button
            isIconOnly
            variant="ghost"
            onPress={() => {
              hapticLight();
              onOpenCopilot();
            }}
            className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-2xl bg-black/[0.04] hover:bg-black/[0.08] dark:bg-white/[0.06] dark:hover:bg-white/[0.1] text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white flex items-center justify-center border-none transition-all active:scale-95 cursor-pointer"
            aria-label={t('recipe.copilot')}
          >
            <MessageCircle className="w-5 h-5" />
          </Button>
          {!isPremium && <PremiumCrownBadge />}
        </div>
      </div>
    </header>
  );
};

export default CookingModeHeader;
