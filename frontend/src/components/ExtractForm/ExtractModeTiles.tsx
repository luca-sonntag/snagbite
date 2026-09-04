import React from 'react';
import { Camera, Film } from 'lucide-react';
import { useI18n } from '../../context/I18nContext';
import { hapticLight } from '../../utils/haptics';
import type { ExtractModeTilesProps } from './types';

export const ExtractModeTiles: React.FC<ExtractModeTilesProps> = ({
  mode,
  setMode,
  photosCount,
  disabled = false,
}) => {
  const { t } = useI18n();

  return (
    <div className="grid grid-cols-2 gap-2.5 w-full">
      {/* Tile 1: Video & Link */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          hapticLight();
          setMode('link');
        }}
        className={`relative flex flex-col p-3.5 sm:p-4 rounded-2xl text-left border-none cursor-pointer select-none transition-all active:scale-[0.98] outline-none ${
          mode === 'link'
            ? 'bg-emerald-500/10 dark:bg-emerald-500/15 ring-2 ring-emerald-500/40 text-emerald-950 dark:text-emerald-50'
            : 'bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 shadow-[0_2px_6px_rgba(0,0,0,0.03)] hover:bg-gray-50 dark:hover:bg-gray-800/50'
        }`}
      >
        <div className="flex items-center justify-between w-full mb-2">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
              mode === 'link'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
            }`}
          >
            <Film className="w-4 h-4" />
          </div>
          {/* Subtle social dots */}
          <div className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-pink-500" title="Instagram" />
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" title="TikTok" />
            <span className="w-1.5 h-1.5 rounded-full bg-red-500" title="YouTube" />
          </div>
        </div>

        <span className="text-xs sm:text-sm font-bold leading-tight block">
          {t('form.modeTiles.linkTitle')}
        </span>
        <span className="text-[11px] leading-snug mt-0.5 text-gray-500 dark:text-gray-400 line-clamp-1 block">
          {t('form.modeTiles.linkSubtitle')}
        </span>
      </button>

      {/* Tile 2: Foto-Scanner */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          hapticLight();
          setMode('photo');
        }}
        className={`relative flex flex-col p-3.5 sm:p-4 rounded-2xl text-left border-none cursor-pointer select-none transition-all active:scale-[0.98] outline-none ${
          mode === 'photo'
            ? 'bg-emerald-500/10 dark:bg-emerald-500/15 ring-2 ring-emerald-500/40 text-emerald-950 dark:text-emerald-50'
            : 'bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 shadow-[0_2px_6px_rgba(0,0,0,0.03)] hover:bg-gray-50 dark:hover:bg-gray-800/50'
        }`}
      >
        <div className="flex items-center justify-between w-full mb-2">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
              mode === 'photo'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
            }`}
          >
            <Camera className="w-4 h-4" />
          </div>
          {photosCount > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-600 text-white">
              {photosCount}
            </span>
          )}
        </div>

        <span className="text-xs sm:text-sm font-bold leading-tight block">
          {t('form.modeTiles.photoTitle')}
        </span>
        <span className="text-[11px] leading-snug mt-0.5 text-gray-500 dark:text-gray-400 line-clamp-1 block">
          {t('form.modeTiles.photoSubtitle')}
        </span>
      </button>
    </div>
  );
};

export default ExtractModeTiles;
