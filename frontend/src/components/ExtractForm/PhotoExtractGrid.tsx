import React from 'react';
import { Camera, ImagePlus, X } from 'lucide-react';
import { useI18n } from '../../context/I18nContext';
import { MAX_IMPORT_PHOTOS } from '../../hooks/useRecipeExtraction';
import { hapticLight, hapticHeavy } from '../../utils/haptics';
import type { PhotoExtractGridProps } from './types';

export const PhotoExtractGrid: React.FC<PhotoExtractGridProps> = ({
  photos,
  photoPreviews,
  cameraInputRef,
  galleryInputRef,
  onPhotoChange,
  onRemovePhoto,
  onOpenPicker,
}) => {
  const { t } = useI18n();
  const photosFull = photos.length >= MAX_IMPORT_PHOTOS;

  return (
    <div className="flex flex-col gap-3">
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={onPhotoChange}
        className="hidden"
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={onPhotoChange}
        className="hidden"
      />

      {photos.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-6 px-4 rounded-2xl bg-gray-50 dark:bg-gray-800/40 text-center border-none">
          <div className="p-2.5 rounded-2xl bg-emerald-500/10">
            <Camera className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <p className="text-sm font-bold text-gray-900 dark:text-white">{t('form.photo.emptyTitle')}</p>
          <p className="text-xs leading-relaxed text-gray-500 dark:text-gray-400 max-w-[16rem]">
            {t('form.photo.emptyHint')}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {photos.map((photo, index) => (
            <div
              key={`${photo.name}-${index}`}
              className="relative aspect-square rounded-2xl overflow-hidden border-none bg-gray-100 dark:bg-gray-800 shadow-[0_1px_3px_rgba(0,0,0,0.02)]"
            >
              <img src={photoPreviews[index]} alt="" className="w-full h-full object-cover" />
              <span className="absolute bottom-1.5 left-1.5 w-5 h-5 rounded-full bg-black/65 text-white text-[10px] font-bold flex items-center justify-center backdrop-blur-sm">
                {index + 1}
              </span>
              <button
                type="button"
                onClick={() => {
                  hapticHeavy();
                  onRemovePhoto(index);
                }}
                className="absolute top-0 right-0 w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center border-none bg-transparent cursor-pointer touch-manipulation z-10"
                aria-label={t('form.photo.remove')}
              >
                <span className="w-7 h-7 min-w-[28px] min-h-[28px] rounded-full bg-black/65 text-white flex items-center justify-center backdrop-blur-sm active:scale-90 transition-transform">
                  <X className="w-3.5 h-3.5" />
                </span>
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => {
            hapticLight();
            onOpenPicker(cameraInputRef);
          }}
          disabled={photosFull}
          className="flex-1 flex items-center justify-center gap-2 min-h-[48px] py-3 rounded-2xl text-xs font-bold bg-gray-100 dark:bg-gray-800 border-none text-gray-900 dark:text-white disabled:opacity-40 hover:bg-gray-200 dark:hover:bg-gray-700 active:scale-95 transition-all cursor-pointer shadow-none"
        >
          <Camera className="w-4 h-4" />
          <span>{t('form.photo.takePhoto')}</span>
        </button>
        <button
          type="button"
          onClick={() => {
            hapticLight();
            onOpenPicker(galleryInputRef);
          }}
          disabled={photosFull}
          className="flex-1 flex items-center justify-center gap-2 min-h-[48px] py-3 rounded-2xl text-xs font-bold bg-gray-100 dark:bg-gray-800 border-none text-gray-900 dark:text-white disabled:opacity-40 hover:bg-gray-200 dark:hover:bg-gray-700 active:scale-95 transition-all cursor-pointer shadow-none"
        >
          <ImagePlus className="w-4 h-4" />
          <span>{t('form.photo.fromGallery')}</span>
        </button>
      </div>

      <p className="text-center text-[11px] text-gray-400 dark:text-gray-500">
        {t('form.photo.counter', { count: photos.length, max: MAX_IMPORT_PHOTOS })}
      </p>
    </div>
  );
};
export default PhotoExtractGrid;
