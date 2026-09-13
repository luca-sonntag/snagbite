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
 * Replaces playful crown icons with a clean, modern typographic badge.
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
        className={`absolute -top-1.5 -right-1.5 z-10 flex items-center justify-center px-1 min-w-[22px] h-4 rounded-full bg-amber-500 text-white text-[8.5px] font-black uppercase tracking-wider shadow-xs ring-2 ring-white dark:ring-gray-900 pointer-events-none select-none leading-none ${className}`}
        aria-label="PRO"
      >
        PRO
      </span>
    );
  }

  if (variant === 'chip') {
    return (
      <span
        className={`inline-flex items-center justify-center px-1.5 py-0.5 rounded-md text-[9.5px] font-black uppercase tracking-wider bg-amber-500 text-white shadow-xs select-none leading-none ${className}`}
        aria-label="PRO"
      >
        PRO
      </span>
    );
  }

  return (
    <span
      onClick={onClick}
      className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white dark:bg-gray-800 shadow-md ring-1 ring-black/5 dark:ring-white/10 text-xs font-bold text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700/80 transition-all select-none ${
        onClick ? 'cursor-pointer active:scale-95' : ''
      } ${className}`}
    >
      <span className="px-1.5 py-0.5 rounded-md bg-amber-500 text-white text-[9.5px] font-black uppercase tracking-wider shadow-xs leading-none">
        PRO
      </span>
      {label && <span className="truncate">{label}</span>}
      {hasChevron && (
        <ChevronRight className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 -mr-0.5 shrink-0" />
      )}
    </span>
  );
}
