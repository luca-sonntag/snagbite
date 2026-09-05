import React from 'react';
import { Film, Camera, ChevronRight, Globe } from 'lucide-react';
import { useI18n } from '../../context/I18nContext';
import { hapticLight } from '../../utils/haptics';
import { InstagramIcon } from '../ShareMockups';
import type { ExtractActionCardsProps } from './types';

const TikTokIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.75a4.85 4.85 0 0 1-1.01-.06z" />
  </svg>
);

const YoutubeIcon = (props: React.SVGProps<SVGSVGElement>) => (
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
    <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z" />
    <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" fill="currentColor" />
  </svg>
);

export const ExtractActionCards: React.FC<ExtractActionCardsProps> = ({
  onOpenLinkSheet,
  onOpenPhotoSheet,
  photosCount = 0,
  disabled = false,
}) => {
  const { t } = useI18n();

  return (
    <div className="flex flex-col gap-3 w-full">
      {/* Action Card 1: Video & Link */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          hapticLight();
          onOpenLinkSheet();
        }}
        className={`w-full p-4 sm:p-5 rounded-3xl bg-white dark:bg-gray-900 border-none shadow-[0_2px_6px_rgba(0,0,0,0.03)] transition-all flex items-center justify-between gap-4 text-left outline-none select-none ${
          disabled
            ? 'opacity-50 cursor-not-allowed shadow-none'
            : 'hover:bg-gray-50 dark:hover:bg-gray-800/50 active:scale-[0.99] cursor-pointer group'
        }`}
      >
        <div className="flex items-center gap-3.5 min-w-0 flex-1">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <Film className="w-6 h-6" />
          </div>

          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-sm sm:text-base font-bold text-gray-900 dark:text-white leading-tight">
              {t('form.actionCards.linkTitle')}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-snug">
              {t('form.actionCards.linkSubtitle')}
            </span>

            {/* Subtle Platform Indicators */}
            <div className="flex items-center gap-2 mt-2 text-gray-400 dark:text-gray-500">
              <InstagramIcon className="w-3.5 h-3.5" />
              <TikTokIcon className="w-3.5 h-3.5" />
              <YoutubeIcon className="w-3.5 h-3.5" />
              <Globe className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>

        <ChevronRight className="w-5 h-5 text-gray-400 dark:text-gray-500 shrink-0 group-hover:translate-x-0.5 transition-transform" />
      </button>

      {/* Action Card 2: Foto-Scanner */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          hapticLight();
          onOpenPhotoSheet();
        }}
        className={`w-full p-4 sm:p-5 rounded-3xl bg-white dark:bg-gray-900 border-none shadow-[0_2px_6px_rgba(0,0,0,0.03)] transition-all flex items-center justify-between gap-4 text-left outline-none select-none ${
          disabled
            ? 'opacity-50 cursor-not-allowed shadow-none'
            : 'hover:bg-gray-50 dark:hover:bg-gray-800/50 active:scale-[0.99] cursor-pointer group'
        }`}
      >
        <div className="flex items-center gap-3.5 min-w-0 flex-1">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <Camera className="w-6 h-6" />
          </div>

          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-sm sm:text-base font-bold text-gray-900 dark:text-white leading-tight">
              {t('form.actionCards.photoTitle')}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-snug">
              {t('form.actionCards.photoSubtitle')}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {photosCount > 0 && (
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-600 text-white">
              {photosCount}
            </span>
          )}
          <ChevronRight className="w-5 h-5 text-gray-400 dark:text-gray-500 group-hover:translate-x-0.5 transition-transform" />
        </div>
      </button>
    </div>
  );
};

export default ExtractActionCards;
