import type { FC } from 'react';
import { Bell, Timer, X } from 'lucide-react';
import { stripInlineIngredientTags } from '../../utils/ingredientMatch';
import { hapticLight } from '../../utils/haptics';

export interface CookingTimerCardProps {
  label: string;
  countdownStr: string;
  progress?: number;
  isFinished?: boolean;
  onClick?: () => void;
  onDismiss?: () => void;
  dismissAriaLabel?: string;
  className?: string;
}

export const CookingTimerCard: FC<CookingTimerCardProps> = ({
  label,
  countdownStr,
  progress = 0,
  isFinished = false,
  onClick,
  onDismiss,
  dismissAriaLabel = 'Schließen',
  className = '',
}) => {
  return (
    <div
      onClick={onClick}
      className={`w-full relative flex items-center gap-3 px-4 py-2.5 rounded-2xl overflow-hidden transition-all duration-300 select-none ${
        onClick ? 'cursor-pointer active:scale-[0.98]' : ''
      } ${
        isFinished
          ? 'bg-rose-600 dark:bg-rose-700 animate-pulse text-white shadow-sm'
          : 'bg-blue-600 dark:bg-blue-700 text-white shadow-sm'
      } ${className}`}
    >
      {/* Background progress track */}
      {!isFinished && (
        <div
          className="absolute inset-0 bg-white/15 origin-left transition-all duration-500"
          style={{ transform: `scaleX(${progress})` }}
        />
      )}

      {/* Icon */}
      <div className="relative flex-shrink-0">
        {isFinished ? (
          <Bell className="w-4 h-4 text-white animate-bounce" />
        ) : (
          <Timer className="w-4 h-4 text-white/90" />
        )}
      </div>

      {/* Label + countdown */}
      <div className="relative flex-1 min-w-0 text-left">
        <p className="text-[10px] text-white/80 font-semibold leading-tight truncate">
          {stripInlineIngredientTags(label)}
        </p>
        <p className="text-sm font-black tabular-nums mt-0.5 leading-none">
          {countdownStr}
        </p>
      </div>

      {/* Close/Dismiss button */}
      {onDismiss && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            hapticLight();
            onDismiss();
          }}
          className="relative flex-shrink-0 w-9 h-9 min-w-[36px] min-h-[36px] rounded-xl bg-white/20 hover:bg-white/35 active:scale-90 flex items-center justify-center transition-all cursor-pointer border-none"
          aria-label={dismissAriaLabel}
        >
          <X className="w-4 h-4 text-white stroke-[2.5px]" />
        </button>
      )}
    </div>
  );
};

export default CookingTimerCard;
