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
      className={`relative -mx-4 md:-mx-6 -mt-4 overflow-hidden bg-gradient-to-b from-emerald-950 via-emerald-800 to-teal-900 dark:from-emerald-950 dark:via-emerald-900/80 dark:to-gray-950 text-white shadow-[0_12px_32px_-8px_rgba(6,78,59,0.35)] ${className}`}
    >
      {/* Ambient background glow accents & luminous fluid ribbons */}
      <div className="absolute -top-12 -left-12 w-56 h-56 rounded-full bg-emerald-400/20 blur-3xl pointer-events-none" />
      <div className="absolute top-4 -right-16 w-64 h-64 rounded-full bg-teal-300/15 blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 -left-10 w-[120%] h-20 bg-gradient-to-r from-transparent via-emerald-400/15 to-transparent blur-xl pointer-events-none animate-wave-drift-1" />

      {/* Main Content Area */}
      <div className="relative z-10 px-4 md:px-6 pt-[calc(var(--safe-area-inset-top)+1.25rem)] pb-2">
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

        {/* Content slot for embedded controls (Search Bar & Filter) */}
        {children && <div className="mt-4 relative z-10">{children}</div>}
      </div>

      {/* Animated Multi-Layer Organic Wave Bottom Border */}
      <div className="relative w-full h-14 overflow-hidden leading-none select-none pointer-events-none text-[#f4f6f5] dark:text-gray-950">
        {/* Layer 1: Translucent background wave drifting horizontally */}
        <svg
          className="absolute bottom-0 left-[-6%] w-[112%] h-full animate-wave-drift-1 fill-white/15 dark:fill-white/10"
          viewBox="0 0 1200 90"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path d="M0,24 C240,54 480,-2 720,32 C960,62 1080,16 1200,26 L1200,90 L0,90 Z" />
        </svg>

        {/* Layer 2: Secondary subtle counter-wave */}
        <svg
          className="absolute bottom-0 left-[-6%] w-[112%] h-full animate-wave-drift-2 fill-emerald-300/25 dark:fill-teal-400/15"
          viewBox="0 0 1200 90"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path d="M0,38 C180,12 420,58 660,26 C900,-4 1060,42 1200,34 L1200,90 L0,90 Z" />
        </svg>

        {/* Layer 3: Foreground transition wave matching canvas background */}
        <svg
          className="absolute bottom-0 left-0 w-full h-full fill-current"
          viewBox="0 0 1200 90"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path d="M0,32 C200,68 440,8 700,48 C940,82 1080,24 1200,38 L1200,90 L0,90 Z" />
        </svg>
      </div>
    </header>
  );
};

export default HeroWaveHeader;
