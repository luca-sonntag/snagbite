import { HeartPulse, ChevronRight } from 'lucide-react';
import { hapticLight } from '../../utils/haptics';
import { useI18n } from '../../context/I18nContext';
import type { HealthScoreBreakdown } from '../../types';

interface HealthScoreBadgeProps {
  score: number;
  breakdown?: HealthScoreBreakdown | null;
  onClick: () => void;
  size?: 'sm' | 'md';
}

export function getHealthScoreColor(score: number): {
  badgeBg: string;
  badgeText: string;
  ringStroke: string;
  pillBg: string;
  iconColor: string;
} {
  if (score >= 85) {
    return {
      badgeBg: 'bg-emerald-500/10 dark:bg-emerald-500/15',
      badgeText: 'text-emerald-700 dark:text-emerald-300',
      ringStroke: '#10b981',
      pillBg: 'bg-emerald-500',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
    };
  }
  if (score >= 70) {
    return {
      badgeBg: 'bg-teal-500/10 dark:bg-teal-500/15',
      badgeText: 'text-teal-700 dark:text-teal-300',
      ringStroke: '#14b8a6',
      pillBg: 'bg-teal-500',
      iconColor: 'text-teal-600 dark:text-teal-400',
    };
  }
  if (score >= 50) {
    return {
      badgeBg: 'bg-amber-500/10 dark:bg-amber-500/15',
      badgeText: 'text-amber-700 dark:text-amber-300',
      ringStroke: '#f59e0b',
      pillBg: 'bg-amber-500',
      iconColor: 'text-amber-600 dark:text-amber-400',
    };
  }
  if (score >= 35) {
    return {
      badgeBg: 'bg-orange-500/10 dark:bg-orange-500/15',
      badgeText: 'text-orange-700 dark:text-orange-300',
      ringStroke: '#f97316',
      pillBg: 'bg-orange-500',
      iconColor: 'text-orange-600 dark:text-orange-400',
    };
  }
  return {
    badgeBg: 'bg-rose-500/10 dark:bg-rose-500/15',
    badgeText: 'text-rose-700 dark:text-rose-300',
    ringStroke: '#f43f5e',
    pillBg: 'bg-rose-500',
    iconColor: 'text-rose-600 dark:text-rose-400',
  };
}

export default function HealthScoreBadge({
  score,
  onClick,
  size = 'md',
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

  return (
    <button
      type="button"
      onClick={() => {
        hapticLight();
        onClick();
      }}
      className={`inline-flex items-center gap-2.5 rounded-2xl ${colors.badgeBg} ${
        isSmall ? 'py-1.5 px-3' : 'py-2 px-3.5 min-h-[44px]'
      } border-none select-none cursor-pointer active:scale-[0.97] transition-all text-left shadow-[0_1px_3px_rgba(0,0,0,0.02)]`}
      aria-label={`${t('recipe.healthScoreTitle')}: ${score}/100`}
    >
      {/* Visual Indicator: HeartPulse Icon with soft circular backdrop */}
      <div className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 bg-white/70 dark:bg-gray-800/80 shadow-xs`}>
        <HeartPulse className={`w-4 h-4 ${colors.iconColor}`} />
      </div>

      <div className="flex flex-col min-w-0">
        <div className="flex items-center gap-1.5 leading-none">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            {t('recipe.healthScoreTitle')}
          </span>
        </div>
        <div className="flex items-baseline gap-1.5 mt-0.5">
          <span className={`text-base font-bold tabular-nums tracking-tight ${colors.badgeText}`}>
            {score}
            <span className="text-[11px] font-normal text-gray-400 dark:text-gray-500">/100</span>
          </span>
          {!isSmall && (
            <span className="text-xs font-medium text-gray-600 dark:text-gray-300 truncate max-w-[130px]">
              · {getGradeLabel()}
            </span>
          )}
        </div>
      </div>

      <ChevronRight className="w-4 h-4 text-gray-400 dark:text-gray-500 shrink-0 ml-auto" />
    </button>
  );
}
