import React from 'react';
import { useI18n } from '../../context/I18nContext';
import { useTimerManager } from '../../hooks/useTimerManager';
import { hapticLight } from '../../utils/haptics';
import CookingTimerCard from './CookingTimerCard';

export const CookingModeTimers: React.FC = () => {
  const { t } = useI18n();
  const { timers, removeTimer, dismissFinished, setPendingNavigation } = useTimerManager();

  if (timers.length === 0) return null;

  return (
    <div className="flex flex-col gap-2 mt-2 w-full max-w-lg mx-auto shrink-0">
      <div className="flex flex-col gap-1.5">
        {timers.map((timer) => {
          const remaining = Math.max(0, Math.ceil((timer.endAt - Date.now()) / 1000));
          const isFinished = timer.isFinished;

          const m = Math.floor(remaining / 60);
          const s = remaining % 60;
          const countdownStr = isFinished
            ? t('timer.finished')
            : `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;

          const { recipeId, stepNum } = timer;
          const isAssociated = Boolean(recipeId && stepNum);
          const progress = isFinished ? 0 : remaining / timer.durationSeconds;

          const handleCardClick = isAssociated
            ? () => {
                hapticLight();
                setPendingNavigation({ recipeId: recipeId!, stepNum: stepNum! });
                window.dispatchEvent(
                  new CustomEvent('app:navigate-to-timer-step', {
                    detail: { recipeId, stepNum },
                  })
                );
              }
            : undefined;

          return (
            <CookingTimerCard
              key={timer.id}
              label={timer.label}
              countdownStr={countdownStr}
              progress={progress}
              isFinished={isFinished}
              onClick={handleCardClick}
              onDismiss={() => {
                if (isFinished) {
                  dismissFinished(timer.id);
                } else {
                  removeTimer(timer.id);
                }
              }}
              dismissAriaLabel={t('dialog.closeAria')}
            />
          );
        })}
      </div>
    </div>
  );
};

export default CookingModeTimers;
