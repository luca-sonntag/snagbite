import { Plus, Camera } from 'lucide-react';
import { useI18n } from '../../context/I18nContext';
import { hapticMedium, hapticLight } from '../../utils/haptics';

interface CookbookQuickStartBannerProps {
  className?: string;
}

/**
 * Clean Flat Quick-Start Banner displayed at the top of the Cookbook magazine
 * when the user has 0 saved recipes. Provides immediate 1-tap entry points
 * for link extraction and photo import without blocking the magazine feed.
 */
export default function CookbookQuickStartBanner({ className = '' }: CookbookQuickStartBannerProps) {
  const { t } = useI18n();

  const handleAddLink = () => {
    hapticMedium();
    window.location.hash = '#/extract';
  };

  const handleAddPhoto = () => {
    hapticLight();
    window.location.hash = '#/extract/photo';
  };

  return (
    <div
      className={`relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-teal-500/5 dark:from-emerald-500/15 dark:via-emerald-500/10 dark:to-teal-500/10 p-4 sm:p-5 shadow-[0_2px_16px_rgba(0,0,0,0.03)] border-none select-none ${className}`}
    >
      {/* Subtle Ambient Decorative Glows */}
      <div className="absolute -top-10 -right-10 w-28 h-28 bg-emerald-500/15 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute -bottom-10 -left-10 w-28 h-28 bg-teal-500/15 rounded-full blur-2xl pointer-events-none" />

      <div className="relative z-10 flex flex-col gap-3">
        {/* Header Row: Title & Description */}
        <div className="flex flex-col min-w-0">
          <h3 className="text-sm sm:text-base font-bold text-gray-950 dark:text-white leading-snug">
            {t('catalog.quickStart.title')}
          </h3>
          <p className="text-xs text-gray-600 dark:text-gray-300 mt-0.5 leading-relaxed">
            {t('catalog.quickStart.description')}
          </p>
        </div>

        {/* Action Buttons Row */}
        <div className="flex items-center gap-2.5 pt-1">
          <button
            type="button"
            onClick={handleAddLink}
            className="flex-1 min-w-[130px] h-11 min-h-[44px] px-3 sm:px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white font-bold text-xs shadow-md shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer border-none"
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span className="truncate">{t('catalog.quickStart.addRecipe')}</span>
          </button>

          <button
            type="button"
            onClick={handleAddPhoto}
            className="flex-1 min-w-[110px] h-11 min-h-[44px] px-3 sm:px-4 rounded-2xl bg-white/80 dark:bg-gray-800/80 hover:bg-white dark:hover:bg-gray-800 active:scale-[0.98] text-gray-800 dark:text-gray-200 font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer border-none backdrop-blur-xs"
          >
            <Camera className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span className="truncate">{t('catalog.quickStart.scanPhoto')}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
