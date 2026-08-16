import React from 'react';
import { ChefHat } from 'lucide-react';
import { useI18n } from '../context/I18nContext';

// Custom SVG component for Instagram icon
export const InstagramIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
  </svg>
);

export const ShareStep1Mockup = () => (
  <div className="relative w-[132px] h-[104px] shrink-0 mx-auto rounded-2xl bg-gray-100 dark:bg-gray-800/80 p-1.5 flex items-center justify-center overflow-hidden shadow-none select-none">
    {/* Vertical Phone Screen Mockup representing a Reel */}
    <div className="w-[56px] h-[90px] rounded-xl bg-white dark:bg-gray-900 relative shadow-[0_2px_6px_rgba(0,0,0,0.04)] overflow-hidden flex flex-col justify-between p-1">
      {/* Video Content representation (light background) */}
      <div className="absolute inset-0 bg-transparent flex items-center justify-center">
        <ChefHat className="w-6 h-6 text-black/10 dark:text-white/10" />
      </div>

      {/* Top Status Bar mock */}
      <div className="absolute top-1 left-0 right-0 px-1.5 flex justify-between items-center z-10 opacity-50">
        <div className="w-1 h-1 rounded-full bg-black/35 dark:bg-white/35" />
        <div className="flex gap-0.5">
          <div className="w-1 h-0.5 bg-black/35 dark:bg-white/35 rounded-xs" />
          <div className="w-2 h-0.5 bg-black/35 dark:bg-white/35 rounded-xs" />
        </div>
      </div>

      {/* Bottom overlay: user profile and caption */}
      <div className="absolute bottom-1.5 left-1.5 flex flex-col gap-0.5 z-10 w-[24px]">
        {/* User avatar + handle */}
        <div className="flex items-center gap-0.5">
          <div className="w-1.5 h-1.5 rounded-full bg-black/20 dark:bg-white/20 shrink-0" />
          <div className="h-0.5 w-3 rounded bg-black/15 dark:bg-white/15" />
        </div>
        {/* Caption lines */}
        <div className="h-0.5 w-full rounded bg-black/10 dark:bg-white/10" />
        <div className="h-0.5 w-2/3 rounded bg-black/10 dark:bg-white/10" />
      </div>

      {/* Right side overlays: Action icons stack */}
      <div className="absolute right-1.5 bottom-1.5 flex flex-col items-center gap-1 z-10">
        {/* Like (Heart) */}
        <div className="w-2.5 h-2.5 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center">
          <svg className="w-1.5 h-1.5 text-black/50 dark:text-white/50" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
        </div>
        {/* Comment */}
        <div className="w-2.5 h-2.5 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center">
          <svg className="w-1.5 h-1.5 text-black/50 dark:text-white/50" viewBox="0 0 24 24" fill="currentColor"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
        </div>
        {/* Share (Paper Airplane) with active highlight */}
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-75 duration-1000" />
          <div className="relative w-3.5 h-3.5 rounded-full bg-emerald-500 flex items-center justify-center text-white shadow-sm shadow-emerald-500/30">
            <svg className="w-2 h-2 translate-x-[0.3px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
          </div>
        </div>
      </div>
    </div>
  </div>
);

export const ShareStep2Mockup = () => {
  const { language } = useI18n();
  return (
    <div className="relative w-[132px] h-[104px] shrink-0 mx-auto rounded-2xl bg-gray-100 dark:bg-gray-800/80 p-2 overflow-hidden flex flex-col justify-end select-none">
      <div className="flex-1 flex flex-col gap-2 opacity-25 px-1 pt-1">
        <div className="h-2 w-full rounded bg-black/20 dark:bg-white/20" />
        <div className="grid grid-cols-4 gap-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <div className="w-4 h-4 rounded-full bg-black/30 dark:bg-white/30" />
              <div className="w-4 h-1 rounded bg-black/20 dark:bg-white/20" />
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl p-1.5 shadow-[0_2px_6px_rgba(0,0,0,0.04)] flex items-start gap-1">
        <div className="flex-1 min-w-0 flex flex-col items-center gap-1 opacity-40">
          <div className="w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
            <svg className="w-3 h-3 text-gray-700 dark:text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
          </div>
          <span className="text-[7px] leading-none text-gray-500 dark:text-gray-400 truncate w-full text-center">Story</span>
        </div>

        <div className="flex-1 min-w-0 flex flex-col items-center gap-1 opacity-40">
          <div className="w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
            <svg className="w-3 h-3 text-gray-700 dark:text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
          </div>
          <span className="text-[7px] leading-none text-gray-500 dark:text-gray-400 truncate w-full text-center">
            {language === 'de' ? 'Kopieren' : 'Copy'}
          </span>
        </div>

        <div className="flex-1 min-w-0 flex flex-col items-center gap-1">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-75 duration-1000" />
            <div className="relative w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center shadow-sm shadow-emerald-500/20 text-white">
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                <polyline points="16 6 12 2 8 6" />
                <line x1="12" y1="2" x2="12" y2="15" />
              </svg>
            </div>
          </div>
          <span className="text-[7px] leading-none font-bold text-emerald-600 dark:text-emerald-400 truncate w-full text-center">
            {language === 'de' ? 'Teilen' : 'Share'}
          </span>
        </div>
      </div>
    </div>
  );
};

export const ShareStep3Mockup = () => {
  return (
    <div className="relative w-[132px] h-[104px] shrink-0 mx-auto rounded-2xl bg-gray-100 dark:bg-gray-800/80 p-2 overflow-hidden flex flex-col justify-end select-none">
      {/* Background share options sheet representation */}
      <div className="flex-1 flex flex-col gap-1 opacity-25 px-0.5 pt-0.5">
        <div className="h-2 w-1/3 rounded bg-black/40 dark:bg-white/40" />
        <div className="h-1.5 w-full rounded bg-black/20 dark:bg-white/20" />
        <div className="h-1.5 w-2/3 rounded bg-black/20 dark:bg-white/20" />
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl p-1.5 shadow-[0_2px_6px_rgba(0,0,0,0.04)] flex items-center gap-2">
        <div className="flex-1 min-w-0 flex flex-col items-center gap-0.5 opacity-40">
          <div className="w-5 h-5 rounded bg-gray-300 dark:bg-gray-700 flex items-center justify-center">
            <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.5-5.739-1.446L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.42 9.864-9.858.002-2.634-1.02-5.11-2.884-6.974C16.592 1.89 14.12 1.865 11.99 1.865c-5.43 0-9.854 4.417-9.858 9.853-.002 1.773.465 3.5 1.353 5.03L2.43 21.65l5.06-1.33.157.08z"/></svg>
          </div>
          <span className="text-[5px] text-gray-500 truncate">WhatsApp</span>
        </div>

        {/* Snagbite App Option highlighted */}
        <div className="flex-1 min-w-0 flex flex-col items-center gap-0.5">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-75 duration-1000" />
            <div className="relative w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center shadow-md shadow-emerald-500/30 p-0.5">
              <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <polygon points="5 3 19 12 5 21 5 3" fill="currentColor"/>
              </svg>
            </div>
          </div>
          <span className="text-[5px] font-bold text-emerald-600 dark:text-emerald-400 truncate">Snagbite</span>
        </div>

        <div className="flex-1 min-w-0 flex flex-col items-center gap-0.5 opacity-40">
          <div className="w-5 h-5 rounded bg-gray-300 dark:bg-gray-700 flex items-center justify-center">
            <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.32 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.8z"/></svg>
          </div>
          <span className="text-[5px] text-gray-500 truncate">LinkedIn</span>
        </div>
      </div>
    </div>
  );
};
