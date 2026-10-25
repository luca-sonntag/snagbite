import { ChevronRight } from 'lucide-react';
import ProBadge from '../ProBadge';
import { hapticLight } from '../../utils/haptics';
import { useI18n } from '../../context/I18nContext';
import type { HealthScoreBreakdown } from '../../types';
import {
  getHealthScoreColor,
  getHealthScoreLetter,
  type HealthScoreColorSet,
} from './healthScoreUtils';
import { HealthScoreLetterBadge } from './HealthScoreLetterBadge';

export { getHealthScoreColor, getHealthScoreLetter, HealthScoreLetterBadge, type HealthScoreColorSet };

interface HealthScoreBadgeProps {
  score: number;
  breakdown?: HealthScoreBreakdown | null;
  onClick: () => void;
  size?: 'sm' | 'md';
  fullWidth?: boolean;
  isPremium?: boolean;
}

export default function HealthScoreBadge({
  score,
  breakdown: _breakdown,
  onClick,
  size = 'md',
  fullWidth = false,
  isPremium = false,
}: HealthScoreBadgeProps) {
  const { t } = useI18n();
  const colors = getHealthScoreColor(score);

  const getGradeLabel = (): string => {
    if (score >= 85) return t('recipe.healthScoreGradeExcellent');
    if (score >= 70) return t('recipe.healthScoreGradeBalanced');
    if (score >= 50) return t('recipe.healthScoreGradeSolid');
    if (score >= 35) return t('recipe.healthScoreGradeIndulgent');
    return t('recipe.healthScoreGradeCheatMeal');
  };

  const isSmall = size === 'sm';
  const radius = 17;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - Math.min(100, Math.max(0, score)) / 100);

  return (
    <button
      type="button"
      onClick={() => {
        hapticLight();
        onClick();
      }}
      className={`w-full group ${
        fullWidth
          ? 'px-3.5 py-3 bg-black/[0.03] hover:bg-black/[0.05] active:bg-black/[0.07] dark:bg-white/[0.04] dark:hover:bg-white/[0.06] dark:active:bg-white/[0.08] rounded-2xl'
          : `rounded-2xl ${isSmall ? 'p-2.5' : 'p-3 sm:p-3.5 min-h-[52px]'} bg-black/[0.03] dark:bg-white/[0.04] hover:bg-black/[0.05] dark:hover:bg-white/[0.06]`
      } border-none select-none cursor-pointer active:scale-[0.99] transition-all flex items-center justify-between gap-3 text-left`}
      aria-label={`${t('recipe.healthScoreTitle')}: ${score}/100`}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {/* Apple Health-style circular mini-gauge */}
        <div className="relative w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 bg-black/[0.04] dark:bg-white/[0.06]">
          <svg className="w-10 h-10 -rotate-90" viewBox="0 0 40 40">
            <circle
              cx="20"
              cy="20"
              r={radius}
              className="stroke-gray-200/80 dark:stroke-gray-700/60"
              strokeWidth="2.8"
              fill="none"
            />
            <circle
              cx="20"
              cy="20"
              r={radius}
              className={`${colors.strokeClass} transition-all duration-700 ease-out`}
              strokeWidth="2.8"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="none"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={`text-xs font-black tabular-nums leading-none ${colors.badgeText}`}>
              {score}
            </span>
          </div>
        </div>

        {/* Labels & Micro-context */}
        <div className="flex items-center gap-2 flex-wrap min-w-0 flex-1">
          <span className="text-sm font-bold text-gray-900 dark:text-white leading-tight">
            {t('recipe.healthScoreTitle')}
          </span>
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold leading-tight ${colors.badgeBg} ${colors.badgeText}`}
          >
            {getGradeLabel()}
          </span>
        </div>
      </div>

      {/* Tactile Chevron Target & Status indicator */}
      <div className="flex items-center gap-2 shrink-0">
        {!isPremium && <ProBadge variant="chip" />}
        <div className="w-7 h-7 rounded-full flex items-center justify-center bg-black/[0.04] dark:bg-white/[0.06] text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-200 transition-colors">
          <ChevronRight className="w-4 h-4" />
        </div>
      </div>
    </button>
  );
}
