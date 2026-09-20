import React from 'react';
import { Minus, Plus, Users } from 'lucide-react';
import { hapticLight } from '../utils/haptics';

export interface ServingsStepperProps {
  servings: number;
  onDecrease: () => void;
  onIncrease: () => void;
  min?: number;
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
  ariaLabel?: string;
}

export const ServingsStepper: React.FC<ServingsStepperProps> = ({
  servings,
  onDecrease,
  onIncrease,
  min = 1,
  max,
  size = 'md',
  showIcon = false,
  className = '',
  ariaLabel = 'Portionen anpassen',
}) => {
  const isMinDisabled = servings <= min;
  const isMaxDisabled = max !== undefined && servings >= max;

  const handleDecrease = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isMinDisabled) {
      hapticLight();
      onDecrease();
    }
  };

  const handleIncrease = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isMaxDisabled) {
      hapticLight();
      onIncrease();
    }
  };

  // Mobile UX Size configurations (Rule 1: Touch-Targets >= 44x44px)
  const sizeConfig = {
    sm: {
      capsule: 'h-10 px-1 gap-1',
      btn: 'w-10 h-10 min-w-[40px] min-h-[40px] rounded-full',
      icon: 'w-3.5 h-3.5 stroke-[2.5]',
      text: 'text-xs font-extrabold min-w-[24px]',
      userIcon: 'w-3.5 h-3.5',
    },
    md: {
      capsule: 'h-11 sm:h-12 px-1 gap-1.5',
      btn: 'w-11 h-11 min-w-[44px] min-h-[44px] rounded-full',
      icon: 'w-4 h-4 stroke-[2.5]',
      text: 'text-sm font-extrabold min-w-[28px]',
      userIcon: 'w-4 h-4',
    },
    lg: {
      capsule: 'h-12 px-1.5 gap-2',
      btn: 'w-12 h-12 min-w-[48px] min-h-[48px] rounded-full',
      icon: 'w-4.5 h-4.5 stroke-[2.5]',
      text: 'text-base font-black min-w-[32px]',
      userIcon: 'w-4.5 h-4.5',
    },
  }[size];

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      role="group"
      aria-label={ariaLabel}
      className={`inline-flex items-center bg-gray-100/90 dark:bg-gray-800/80 rounded-full shrink-0 select-none border-none touch-manipulation transition-colors ${sizeConfig.capsule} ${className}`}
    >
      <button
        type="button"
        onClick={handleDecrease}
        disabled={isMinDisabled}
        aria-label="Portionen verringern"
        className={`${sizeConfig.btn} flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-20 disabled:cursor-not-allowed active:scale-[0.88] disabled:active:scale-100 transition-all duration-150 ease-out cursor-pointer border-none touch-manipulation`}
      >
        <Minus className={sizeConfig.icon} />
      </button>

      <div className={`flex items-center justify-center gap-1 px-1 text-gray-800 dark:text-gray-100 select-none ${sizeConfig.text}`}>
        {showIcon && (
          <Users className={`${sizeConfig.userIcon} text-gray-400 dark:text-gray-500 shrink-0`} />
        )}
        <span className="tabular-nums">{servings}</span>
      </div>

      <button
        type="button"
        onClick={handleIncrease}
        disabled={isMaxDisabled}
        aria-label="Portionen erhöhen"
        className={`${sizeConfig.btn} flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-20 disabled:cursor-not-allowed active:scale-[0.88] disabled:active:scale-100 transition-all duration-150 ease-out cursor-pointer border-none touch-manipulation`}
      >
        <Plus className={sizeConfig.icon} />
      </button>
    </div>
  );
};

export default ServingsStepper;

