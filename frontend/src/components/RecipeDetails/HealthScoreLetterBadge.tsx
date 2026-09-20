import React from 'react';
import { getHealthScoreColor, getHealthScoreLetter } from './healthScoreUtils';

export interface HealthScoreLetterBadgeProps {
  score: number | null | undefined;
  size?: 'xs' | 'sm' | 'md';
  className?: string;
}

/**
 * Centralized circular Health Score letter badge (A/B/C/D/E).
 * Used across recipe cards, list items, and summary headers with optical centering.
 */
export const HealthScoreLetterBadge: React.FC<HealthScoreLetterBadgeProps> = React.memo(({
  score,
  size = 'sm',
  className = '',
}) => {
  if (typeof score !== 'number' || isNaN(score)) return null;

  const color = getHealthScoreColor(score);
  const letter = getHealthScoreLetter(score);

  const sizeClasses =
    size === 'xs'
      ? 'w-3.5 h-3.5 text-[8.5px]'
      : size === 'md'
      ? 'w-5 h-5 text-[11px]'
      : 'w-4 h-4 text-[9.5px]';

  return (
    <span
      className={`inline-flex items-center justify-center text-center font-black leading-none text-white rounded-full ${color.pillBg} shadow-2xs shrink-0 select-none ${sizeClasses} ${className}`}
      title={`Health Score: ${letter} (${score}/100)`}
      aria-label={`Health Score: ${letter}`}
    >
      <span className="translate-y-[0.25px] inline-block">{letter}</span>
    </span>
  );
});

export default HealthScoreLetterBadge;
