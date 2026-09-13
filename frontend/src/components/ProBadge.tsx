import React from 'react';
import { ChevronRight } from 'lucide-react';

export interface ProBadgeProps {
  /**
   * - `chip`: compact inline text chip (e.g. in Settings, headers)
   * - `corner`: micro badge on top-right of action buttons (replaces corner crown)
   * - `interactive`: pill target for locked sections (e.g. Healthy Score, Macros)
   */
  variant?: 'chip' | 'corner' | 'interactive';
  /** Optional text label to display next to PRO (interactive variant) */
  label?: string;
  /** Whether to show a trailing chevron (interactive variant) */
  hasChevron?: boolean;
  /** Click handler */
  onClick?: (e: React.MouseEvent) => void;
  className?: string;
}

/**
 * Single source of truth for all PRO indicators across the app.
 * Option 3: Swiss Minimalist Micro-Typography — ultra-refined, subtle, and quiet.
 */
export default function ProBadge({
  variant = 'chip',
  label,
  hasChevron = false,
  onClick,
  className = '',
}: ProBadgeProps) {
  if (variant === 'corner') {
    return (
      <span
        className={`absolute -top-1 -right-1 z-10 flex items-center justify-center px-1 h-3.5 min-w-[18px] rounded-full bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900 text-[7.5px] font-bold uppercase tracking-[0.1em] ring-1.5 ring-white dark:ring-gray-900 pointer-events-none select-none leading-none shadow-xs ${className}`}
        aria-label="PRO"
      >
        PRO
      </span>
    );
  }

  if (variant === 'chip') {
    return (
      <span
        className={`inline-flex items-center justify-center px-1.5 py-[2px] rounded-[4px] text-[8px] font-bold uppercase tracking-[0.14em] bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 ring-1 ring-black/[0.06] dark:ring-white/[0.08] select-none leading-none ${className}`}
        aria-label="PRO"
      >
        PRO
      </span>
    );
  }

  return (
    <span
      onClick={onClick}
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/95 dark:bg-gray-800/95 shadow-sm ring-1 ring-black/[0.06] dark:ring-white/[0.08] text-[11px] font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-all select-none ${
        onClick ? 'cursor-pointer active:scale-95' : ''
      } ${className}`}
    >
      <span className="px-1.5 py-[2px] rounded-[4px] text-[8px] font-bold uppercase tracking-[0.14em] bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 ring-1 ring-black/[0.06] dark:ring-white/[0.08] leading-none">
        PRO
      </span>
      {label && <span className="truncate">{label}</span>}
      {hasChevron && (
        <ChevronRight className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 -mr-0.5 shrink-0" />
      )}
    </span>
  );
}
