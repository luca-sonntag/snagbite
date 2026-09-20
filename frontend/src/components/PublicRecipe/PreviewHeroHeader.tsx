import React from 'react';
import { X, ExternalLink, Camera, ChefHat } from 'lucide-react';
import CachedImage from '../CachedImage';
import { isPhotoImportUrl } from '../../utils/photoImport';
import { hapticLight } from '../../utils/haptics';
import { useI18n } from '../../context/I18nContext';

export interface PreviewHeroHeaderProps {
  imageUrl?: string | null;
  title: string;
  sourceUrl?: string | null;
  onClose: () => void;
}

export const PreviewHeroHeader: React.FC<PreviewHeroHeaderProps> = ({
  imageUrl,
  title,
  sourceUrl,
  onClose,
}) => {
  const { t } = useI18n();

  return (
    <div className="relative w-full aspect-[16/10] bg-gray-100 dark:bg-gray-800 shrink-0 overflow-hidden">
      {imageUrl ? (
        <CachedImage
          src={imageUrl}
          alt={title}
          className="w-full h-full object-cover object-center pointer-events-none"
          fallbackComponent={
            <div className="w-full h-full flex items-center justify-center text-gray-400 dark:text-gray-500">
              <ChefHat className="w-14 h-14 opacity-40" />
            </div>
          }
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-gray-400 dark:text-gray-500">
          <ChefHat className="w-14 h-14 opacity-40" />
        </div>
      )}

      {/* Subtle Bottom Gradient */}
      <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/60 via-black/20 to-transparent pointer-events-none" />

      {/* Close Floating Button */}
      <button
        type="button"
        onClick={() => {
          hapticLight();
          onClose();
        }}
        aria-label={t('app.close') || 'Schließen'}
        className="absolute top-3 right-3 z-10 w-11 h-11 min-w-[44px] min-h-[44px] rounded-full bg-black/55 hover:bg-black/75 text-white flex items-center justify-center backdrop-blur-md active:scale-95 transition-all border-none cursor-pointer shadow-sm"
      >
        <X className="w-5 h-5" />
      </button>

      {/* Source Link / Origin Badge */}
      {sourceUrl && (
        <div className="absolute bottom-3 left-3 z-10 flex items-center gap-2">
          {isPhotoImportUrl(sourceUrl) ? (
            <span className="bg-black/60 backdrop-blur-md text-white text-xs font-semibold px-3 py-1.5 min-h-[34px] rounded-full flex items-center gap-1.5 shadow-sm border-none select-none">
              <Camera className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>{t('catalog.photoImport')}</span>
            </span>
          ) : (
            <a
              href={sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => hapticLight()}
              className="bg-black/60 hover:bg-black/80 backdrop-blur-md text-white text-xs font-semibold px-3 py-1.5 min-h-[34px] rounded-full flex items-center gap-1.5 shadow-sm border-none active:scale-95 transition-all cursor-pointer no-underline"
            >
              <ExternalLink className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>{t('catalog.viewReel')}</span>
            </a>
          )}
        </div>
      )}
    </div>
  );
};

export default PreviewHeroHeader;

