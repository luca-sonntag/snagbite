import React from 'react';

/**
 * Ambient Diagonal Waves background layer.
 * Renders flowing, organic emerald wave ribbons that sweep diagonally across
 * the canvas, creating dynamic contrast and fluid depth behind the UI.
 */
export const AmbientDiagonalWaves: React.FC = () => {
  return (
    <div
      className="fixed inset-0 overflow-hidden pointer-events-none -z-10 select-none"
      aria-hidden="true"
    >
      {/* Top-to-Right Diagonal Flowing Emerald Ribbon */}
      <svg
        className="absolute -top-24 -left-20 w-[140%] h-[70vh] opacity-35 dark:opacity-20 animate-wave-drift-1"
        viewBox="0 0 1000 700"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="diagonal-emerald-grad-1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.35" />
            <stop offset="50%" stopColor="#059669" stopOpacity="0.20" />
            <stop offset="100%" stopColor="#0d9488" stopOpacity="0.05" />
          </linearGradient>
          <linearGradient id="diagonal-emerald-grad-2" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#34d399" stopOpacity="0.25" />
            <stop offset="60%" stopColor="#10b981" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#065f46" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Primary Diagonal Wave Band */}
        <path
          d="M-50,80 C180,40 320,240 550,180 C780,120 860,340 1080,260 L1080,480 C880,540 760,360 520,420 C280,480 160,300 -50,380 Z"
          fill="url(#diagonal-emerald-grad-1)"
        />

        {/* Secondary Delicate Diagonal Accent Line */}
        <path
          d="M-40,140 C200,90 350,300 580,230 C810,160 880,390 1070,320"
          stroke="url(#diagonal-emerald-grad-2)"
          strokeWidth="16"
          strokeLinecap="round"
          className="opacity-70"
        />
      </svg>

      {/* Mid-to-Bottom Diagonal Accent Wave */}
      <svg
        className="absolute top-[40vh] -right-24 w-[130%] h-[55vh] opacity-30 dark:opacity-20 animate-wave-drift-2"
        viewBox="0 0 1000 600"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M1050,100 C820,60 700,260 480,210 C260,160 180,360 -50,310 L-50,480 C180,520 280,350 500,400 C720,450 840,280 1050,320 Z"
          fill="url(#diagonal-emerald-grad-1)"
        />
      </svg>

      {/* Bottom Diagonal Wave (behind bottom nav) */}
      <svg
        className="absolute -bottom-16 -left-12 w-[130%] h-[32vh] opacity-30 dark:opacity-20 animate-wave-drift-1"
        viewBox="0 0 1000 350"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M-50,200 C220,140 400,280 650,210 C900,140 980,270 1100,220 L1100,380 L-50,380 Z"
          fill="url(#diagonal-emerald-grad-1)"
        />
        <path
          d="M-40,180 C240,120 420,260 670,190 C920,120 990,250 1080,200"
          stroke="url(#diagonal-emerald-grad-2)"
          strokeWidth="12"
          strokeLinecap="round"
          className="opacity-60"
        />
      </svg>
    </div>
  );
};

export default AmbientDiagonalWaves;
