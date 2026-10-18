import type { ProgressData } from '../../types';

interface ExtractionFloatingLogoProps {
  isVisible: boolean;
  progress?: ProgressData | null;
}

/**
 * ExtractionFloatingLogo
 * 
 * Floating, screen-centered loading animation featuring the round Snagbite logo
 * and an emerald progress bar in an adaptive white/frosted rounded capsule below it.
 * Dynamically rotates with lively momentum while gently breathing (subtly pulsing in size)
 * and radiating an ambient emerald glow aura during active recipe extractions.
 */
export default function ExtractionFloatingLogo({ isVisible, progress }: ExtractionFloatingLogoProps) {
  if (!isVisible) return null;

  // Provide an immediate living start sliver (min 6%) so the bar feels responsive from second 1
  const displayPercent = Math.max(6, Math.min(100, Math.round(progress?.percent ?? 6)));

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Rezept wird analysiert"
      className="fixed inset-0 pointer-events-none flex items-center justify-center z-40 select-none animate-fade-in"
    >
      {/* Ambient Emerald Glow Aura */}
      <div className="absolute w-48 h-48 bg-emerald-500/25 dark:bg-emerald-500/20 blur-3xl rounded-full pointer-events-none animate-glow-breathe" />

      {/* Floating Breathing Container */}
      <div className="relative animate-extraction-breathe flex flex-col items-center">
        {/* Frosted Glass Badge with physical shadow */}
        <div className="relative p-3.5 rounded-full bg-white/85 dark:bg-gray-900/85 backdrop-blur-xl shadow-[0_16px_40px_rgba(16,185,129,0.32),0_6px_20px_rgba(0,0,0,0.12)] border border-white/60 dark:border-white/10 flex items-center justify-center">
          
          {/* Subtle orbiting highlight accent ring */}
          <div className="absolute inset-1 rounded-full border border-emerald-500/20 pointer-events-none" />

          {/* Dynamically Rotating Round Logo */}
          <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-full overflow-hidden flex items-center justify-center animate-spin-dynamic">
            <img
              src="/logo-round.png"
              alt="Snagbite"
              className="w-full h-full object-contain pointer-events-none select-none drop-shadow-xs"
            />
          </div>
        </div>

        {/* Emerald Progress Bar in white/frosted narrow capsule */}
        <div
          role="progressbar"
          aria-valuenow={displayPercent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Fortschritt der Rezept-Extraktion"
          className="mt-4 w-36 h-2.5 rounded-full overflow-hidden bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border border-white/60 dark:border-white/10 shadow-[0_8px_24px_rgba(16,185,129,0.22),0_2px_10px_rgba(0,0,0,0.08)] p-[1px] flex items-center"
        >
          <div
            className="h-full bg-emerald-500 rounded-full transition-all duration-500 ease-out shadow-[0_0_10px_rgba(16,185,129,0.6)]"
            style={{ width: `${displayPercent}%` }}
          />
        </div>
      </div>
    </div>
  );
}
