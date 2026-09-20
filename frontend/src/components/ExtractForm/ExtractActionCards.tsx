import React from 'react';
import { Film, Camera, ChevronRight, Globe } from 'lucide-react';
import { useI18n } from '../../context/I18nContext';
import { hapticLight } from '../../utils/haptics';
import { InstagramIcon } from '../ShareMockups';
import type { ExtractActionCardsProps } from './types';

const TikTokIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="-2 -2 28 28" fill="currentColor" {...props}>
    <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
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
        className={`w-full p-4 sm:p-5 rounded-3xl bg-white dark:bg-gray-900 border-none shadow-[0_2px_8px_rgba(0,0,0,0.03),0_1px_2px_rgba(0,0,0,0.02)] transition-all flex items-center justify-between gap-4 text-left outline-none select-none ${
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
        className={`w-full p-4 sm:p-5 rounded-3xl bg-white dark:bg-gray-900 border-none shadow-[0_2px_8px_rgba(0,0,0,0.03),0_1px_2px_rgba(0,0,0,0.02)] transition-all flex items-center justify-between gap-4 text-left outline-none select-none ${
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
