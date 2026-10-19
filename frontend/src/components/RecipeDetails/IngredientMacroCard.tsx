import type { FC } from 'react';

export interface IngredientMacroCardProps {
  label: string;
  color: 'blue' | 'amber' | 'rose';
  grams: number;
  pct: number;
  isMultiServing: boolean;
  perServingGrams?: number;
}

const MACRO_CARD_STYLES = {
  blue: {
    bg: 'bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-transparent dark:from-blue-500/15 dark:to-transparent',
    dot: 'bg-blue-500',
    text: 'text-blue-700 dark:text-blue-300',
  },
  amber: {
    bg: 'bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent dark:from-amber-500/15 dark:to-transparent',
    dot: 'bg-amber-500',
    text: 'text-amber-700 dark:text-amber-300',
  },
  rose: {
    bg: 'bg-gradient-to-br from-rose-500/10 via-rose-500/5 to-transparent dark:from-rose-500/15 dark:to-transparent',
    dot: 'bg-rose-500',
    text: 'text-rose-700 dark:text-rose-300',
  },
} as const;

export const IngredientMacroCard: FC<IngredientMacroCardProps> = ({
  label,
  color,
  grams,
  pct,
  isMultiServing,
  perServingGrams,
}) => {
  const style = MACRO_CARD_STYLES[color];

  return (
    <div className={`${style.bg} rounded-2xl p-3 flex flex-col justify-between text-left`}>
      <div className="flex items-center gap-1.5 mb-1">
        <span className={`w-1.5 h-1.5 rounded-[2.5px] ${style.dot} shrink-0`} />
        <span className={`text-[10.5px] font-semibold uppercase tracking-wider ${style.text} truncate`}>
          {label}
        </span>
      </div>
      <div>
        <span className="text-lg font-bold text-gray-900 dark:text-white tracking-tight block tabular-nums">
          {grams} <span className="text-xs font-normal text-gray-500 dark:text-gray-400">g</span>
        </span>
        <div className="flex items-center justify-between text-[10.5px] text-gray-400 dark:text-gray-500 font-normal mt-0.5">
          <span>{pct}%</span>
          {isMultiServing && perServingGrams !== undefined && (
            <span className="tabular-nums opacity-90">≈{perServingGrams}g/P.</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default IngredientMacroCard;
