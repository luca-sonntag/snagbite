import { ChevronRight } from 'lucide-react';
import { hapticLight } from '../../utils/haptics';
import { useI18n } from '../../context/I18nContext';
import type { HealthScoreBreakdown } from '../../types';

interface HealthScoreBadgeProps {
  score: number;
  breakdown?: HealthScoreBreakdown | null;
  onClick: () => void;
  size?: 'sm' | 'md';
  fullWidth?: boolean;
}

export interface HealthScoreColorSet {
  badgeBg: string;
  badgeText: string;
  ringStroke: string;
  pillBg: string;
  iconColor: string;
  strokeClass: string;
}

export function getHealthScoreColor(score: number): HealthScoreColorSet {
  if (score >= 85) {
    return {
      badgeBg: 'bg-emerald-500/10 dark:bg-emerald-500/15',
      badgeText: 'text-emerald-700 dark:text-emerald-300',
      ringStroke: '#10b981',
      pillBg: 'bg-emerald-500',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      strokeClass: 'stroke-emerald-500',
    };
  }
  if (score >= 70) {
    return {
      badgeBg: 'bg-teal-500/10 dark:bg-teal-500/15',
      badgeText: 'text-teal-700 dark:text-teal-300',
      ringStroke: '#14b8a6',
      pillBg: 'bg-teal-500',
      iconColor: 'text-teal-600 dark:text-teal-400',
      strokeClass: 'stroke-teal-500',
    };
  }
  if (score >= 50) {
    return {
      badgeBg: 'bg-amber-500/10 dark:bg-amber-500/15',
      badgeText: 'text-amber-700 dark:text-amber-300',
      ringStroke: '#f59e0b',
      pillBg: 'bg-amber-500',
      iconColor: 'text-amber-600 dark:text-amber-400',
      strokeClass: 'stroke-amber-500',
    };
  }
  if (score >= 35) {
    return {
      badgeBg: 'bg-orange-500/10 dark:bg-orange-500/15',
      badgeText: 'text-orange-700 dark:text-orange-300',
      ringStroke: '#f97316',
      pillBg: 'bg-orange-500',
      iconColor: 'text-orange-600 dark:text-orange-400',
      strokeClass: 'stroke-orange-500',
    };
  }
  return {
    badgeBg: 'bg-rose-500/10 dark:bg-rose-500/15',
    badgeText: 'text-rose-700 dark:text-rose-300',
    ringStroke: '#f43f5e',
    pillBg: 'bg-rose-500',
    iconColor: 'text-rose-600 dark:text-rose-400',
    strokeClass: 'stroke-rose-500',
  };
}

export default function HealthScoreBadge({
  score,
  breakdown,
  onClick,
  size = 'md',
  fullWidth = false,
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

  const highlightSnippet =
    breakdown?.highlights && breakdown.highlights.length > 0
      ? breakdown.highlights[0]
      : breakdown?.metrics?.vegetableGramsPerServing && breakdown.metrics.vegetableGramsPerServing > 0
      ? `${breakdown.metrics.vegetableGramsPerServing}g Gemüse pro Portion`
      : t('recipe.healthScoreSheetSubtitle');

  return (
    <button
      type="button"
      onClick={() => {
        hapticLight();
        onClick();
      }}
      className={`w-full group ${
        fullWidth
          ? 'px-4.5 sm:px-5 py-3.5 bg-gray-50/75 dark:bg-gray-800/40 hover:bg-gray-100/80 dark:hover:bg-gray-800/60 rounded-b-3xl'
          : `rounded-2xl ${isSmall ? 'p-2.5' : 'p-3 sm:p-3.5 min-h-[52px]'} bg-gray-50/90 dark:bg-gray-800/40 hover:bg-gray-100/80 dark:hover:bg-gray-800/70`
      } border-none select-none cursor-pointer active:scale-[0.99] transition-all flex items-center justify-between gap-3 text-left`}
      aria-label={`${t('recipe.healthScoreTitle')}: ${score}/100`}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {/* Apple Health-style circular mini-gauge */}
        <div className="relative w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 bg-white dark:bg-gray-800 shadow-xs">
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
        <div className="flex flex-col min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-bold text-gray-900 dark:text-white leading-tight">
              {t('recipe.healthScoreTitle')}
            </span>
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold leading-tight ${colors.badgeBg} ${colors.badgeText}`}
            >
              {getGradeLabel()}
            </span>
          </div>
          {!isSmall && (
            <span className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate leading-snug">
              {highlightSnippet}
            </span>
          )}
        </div>
      </div>

      {/* Tactile Chevron Target */}
      <div className="w-7 h-7 rounded-full bg-white dark:bg-gray-800 shadow-xs flex items-center justify-center shrink-0 text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors">
        <ChevronRight className="w-4 h-4" />
      </div>
    </button>
  );
}
