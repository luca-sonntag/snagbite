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
      className={`relative -mx-4 md:-mx-6 -mt-4 overflow-hidden bg-gradient-to-br from-emerald-800 via-emerald-700 to-teal-800 dark:from-emerald-950 dark:via-emerald-900/90 dark:to-teal-950 text-white shadow-[0_10px_30px_-8px_rgba(6,78,59,0.3)] ${className}`}
    >
      {/* Ambient background glow points */}
      <div className="absolute -top-10 -left-10 w-52 h-52 rounded-full bg-emerald-400/20 blur-2xl pointer-events-none" />
      <div className="absolute top-0 -right-12 w-60 h-60 rounded-full bg-teal-300/15 blur-3xl pointer-events-none" />

      {/* Main Content Area */}
      <div className="relative z-10 px-4 md:px-6 pt-[calc(var(--safe-area-inset-top)+1.25rem)] pb-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5 drop-shadow-sm">
              {icon && (
                <span className="p-2 rounded-2xl bg-white/15 text-emerald-100 backdrop-blur-md shadow-inner border border-white/20 shrink-0 flex items-center justify-center">
                  {icon}
                </span>
              )}
              <span className="truncate">{title}</span>
            </h1>
            {subtitle && (
              <p className="text-xs text-emerald-100/80 mt-1 truncate font-medium">
                {subtitle}
              </p>
            )}
          </div>
          {action && (
            <div className="shrink-0 flex items-center gap-1.5">{action}</div>
          )}
        </div>

        {/* Optional floating children slot (e.g. Search Bar) */}
        {children && <div className="mt-4 relative z-10">{children}</div>}
      </div>

      {/* Animated Multi-Layer Organic Wave Bottom Border */}
      <div className="relative w-full h-10 overflow-hidden leading-none select-none pointer-events-none text-[#f4f6f5] dark:text-gray-950">
        {/* Layer 1: Translucent background wave drifting horizontally */}
        <svg
          className="absolute bottom-0 left-[-6%] w-[112%] h-full animate-wave-drift-1 fill-white/15 dark:fill-white/10"
          viewBox="0 0 1200 80"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path d="M0,25 C200,55 420,5 640,38 C860,70 1060,15 1200,30 L1200,80 L0,80 Z" />
        </svg>

        {/* Layer 2: Secondary subtle counter-wave */}
        <svg
          className="absolute bottom-0 left-[-6%] w-[112%] h-full animate-wave-drift-2 fill-emerald-300/25 dark:fill-teal-400/10"
          viewBox="0 0 1200 80"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path d="M0,35 C180,10 400,60 620,28 C840,-5 1040,45 1200,32 L1200,80 L0,80 Z" />
        </svg>

        {/* Layer 3: Foreground transition wave matching canvas background */}
        <svg
          className="absolute bottom-0 left-0 w-full h-full fill-current"
          viewBox="0 0 1200 80"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path d="M0,28 C260,65 520,8 780,45 C980,62 1100,25 1200,32 L1200,80 L0,80 Z" />
        </svg>
      </div>
    </header>
  );
};

export default HeroWaveHeader;
