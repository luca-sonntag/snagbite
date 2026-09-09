import React from 'react';

export interface HeroWaveHeaderProps {
  /** Main title of the view */
  title: React.ReactNode;
  /** Optional descriptive subtitle */
  subtitle?: React.ReactNode;
  /** Optional icon to render inside the frosted glass badge */
  icon?: React.ReactNode;
  /** Optional right-aligned action buttons (e.g. view toggle, select mode) */
  action?: React.ReactNode;
  /** Optional content slot floating over the wave edge (e.g. search bar & filters) */
  children?: React.ReactNode;
  /** Extra container classes */
  className?: string;
}

/**
 * Organic Hero Wave Header component.
 * Combines a lush emerald gradient with multi-layered GPU-animated SVG waves
 * and frosted-glass accents to introduce rich contrast and visual depth.
 */
export const HeroWaveHeader: React.FC<HeroWaveHeaderProps> = ({
  title,
  subtitle,
  icon,
  action,
  children,
  className = '',
}) => {
  return (
    <header
      className={`relative -mx-4 md:-mx-6 -mt-4 pb-14 overflow-hidden bg-gradient-to-b from-emerald-950 via-emerald-800 to-teal-900 dark:from-emerald-950 dark:via-emerald-900/80 dark:to-gray-950 text-white rounded-b-[2.25rem] shadow-[0_14px_36px_-10px_rgba(6,78,59,0.35)] ${className}`}
    >
      {/* Ambient background glow accents */}
      <div className="absolute -top-12 -left-12 w-56 h-56 rounded-full bg-emerald-400/20 blur-3xl pointer-events-none" />
      <div className="absolute top-4 -right-16 w-64 h-64 rounded-full bg-teal-300/15 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 inset-x-0 h-12 bg-gradient-to-t from-black/10 to-transparent pointer-events-none" />

      {/* Main Content Area */}
      <div className="relative z-10 px-4 md:px-6 pt-[calc(var(--safe-area-inset-top)+1.25rem)]">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5 drop-shadow-sm">
              {icon && (
                <span className="p-2.5 rounded-2xl bg-white/15 text-white backdrop-blur-md shadow-inner border border-white/20 shrink-0 flex items-center justify-center">
                  {icon}
                </span>
              )}
              <span className="truncate">{title}</span>
            </h1>
            {subtitle && (
              <p className="text-xs text-emerald-100/85 mt-1 truncate font-medium tracking-wide">
                {subtitle}
              </p>
            )}
          </div>
          {action && (
            <div className="shrink-0 flex items-center gap-1.5">{action}</div>
          )}
        </div>

        {/* Content slot for embedded or floating controls (e.g. Search Bar) */}
        {children && <div className="mt-4 relative z-10">{children}</div>}
      </div>
    </header>
  );
};

export default HeroWaveHeader;
