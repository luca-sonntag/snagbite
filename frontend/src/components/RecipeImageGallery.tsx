import React, { useState, useEffect } from 'react';
import { Button } from '@heroui/react';
import { ArrowLeft, Camera, ChefHat } from 'lucide-react';
import type { Recipe } from '../types';
import { useImageGallery } from '../hooks/useImageGallery';
import { useI18n } from '../context/I18nContext';
import CachedImage from './CachedImage';
import FullscreenImageModal from './FullscreenImageModal';
import { getCachedImage } from '../utils/imageStore';
import { isPhotoImportUrl } from '../utils/photoImport';
import { hapticLight } from '../utils/haptics';
import { PlatformIcon, detectPlatform, PLATFORM_ICON_COLOR } from './SavedCatalog/PlatformIcon';

export interface RecipeImageGalleryProps {
  recipe: Recipe;
  reelUrl?: string;
  onBack?: () => void;
  topRightActions?: React.ReactNode;
}

export default function RecipeImageGallery({
  recipe,
  reelUrl,
  onBack,
  topRightActions,
}: RecipeImageGalleryProps) {
  const { t } = useI18n();
  const [activeSlide, setActiveSlide] = useState(0);

  // Derive initial list (excluding local: URLs since they need to be verified asynchronously)
  const initialImages = (recipe.imageUrls && recipe.imageUrls.length > 0
    ? recipe.imageUrls
    : (recipe.imageUrl ? [recipe.imageUrl] : [])
  ).filter((url) => !url.startsWith('local:'));

  const [availableImages, setAvailableImages] = useState<string[]>(initialImages);

  useEffect(() => {
    let isMounted = true;
    async function checkLocalImages() {
      const urls = recipe.imageUrls && recipe.imageUrls.length > 0
        ? recipe.imageUrls
        : (recipe.imageUrl ? [recipe.imageUrl] : []);

      const checks = await Promise.all(
        urls.map(async (url) => {
          if (url.startsWith('local:')) {
            const cached = await getCachedImage(url);
            return cached ? url : null;
          }
          return url;
        })
      );

      const valid = checks.filter((url): url is string => url !== null);
      if (isMounted) {
        setAvailableImages(valid);
      }
    }
    checkLocalImages();
    return () => {
      isMounted = false;
    };
  }, [recipe.imageUrls, recipe.imageUrl]);

  const images = availableImages;

  const {
    fullscreenIndex,
    setFullscreenIndex,
    scrollContainerRef,
    isDragging,
    handlePointerDown,
    handlePointerLeave,
    handlePointerUp,
    handlePointerMove,
    handleImageClick,
  } = useImageGallery(images);

  const formattedHandle = recipe.sourceHandle
    ? `@${recipe.sourceHandle.replace(/^@/, '')}`
    : isPhotoImportUrl(reelUrl)
      ? '@Foto-Import'
      : null;

  const platform = detectPlatform(reelUrl);

  const overlayHeader = (
    <>
      {/* Top Ambient Scrim for Back & Action Buttons */}
      <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/65 via-black/20 to-transparent pointer-events-none z-10" />

      {/* Floating Back Button (44x44px touch target) */}
      {onBack && (
        <Button
          isIconOnly
          onPress={() => {
            hapticLight();
            onBack();
          }}
          className="absolute top-4 left-4 z-20 bg-black/65 hover:bg-emerald-600/90 text-white w-11 h-11 min-w-[44px] min-h-[44px] rounded-full flex items-center justify-center backdrop-blur-md border border-white/10 shadow-lg transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer"
          aria-label="Go back"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
      )}

      {/* Floating Top Right Actions */}
      {topRightActions && (
        <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
          {topRightActions}
        </div>
      )}

      {/* Soft Ambient Scrim for high contrast (Hero style from bottom) */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 via-40% to-transparent pointer-events-none z-10" />

      {/* Bottom Content: Meta row, Title & Creator handle */}
      <div className="absolute bottom-[38px] inset-x-4 sm:bottom-10 sm:inset-x-5 z-20 flex flex-col text-white pointer-events-none">
        {/* Meta Bar: Platform/Import badge */}
        {reelUrl && (
          <div className="flex items-center gap-2 min-h-[30px] mb-1">
            {isPhotoImportUrl(reelUrl) ? (
              <span className="bg-black/65 text-white text-[11px] font-semibold px-2.5 py-1 rounded-full flex items-center gap-1.5 backdrop-blur-md border border-white/10 shadow-sm pointer-events-auto select-none">
                <Camera className="w-3.5 h-3.5 text-emerald-300" />
                <span>{t('catalog.photoImport')}</span>
              </span>
            ) : (
              <a
                href={reelUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => {
                  e.stopPropagation();
                  hapticLight();
                }}
                className="bg-black/65 hover:bg-emerald-600/90 text-white text-[11px] font-semibold px-2.5 py-1 rounded-full flex items-center gap-1.5 backdrop-blur-md border border-white/10 shadow-sm transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer pointer-events-auto select-none"
              >
                <PlatformIcon
                  platform={platform}
                  className={`w-3.5 h-3.5 ${PLATFORM_ICON_COLOR[platform]}`}
                />
                <span>{t('catalog.viewReel')}</span>
              </a>
            )}
          </div>
        )}

        {/* Recipe Title (Hero style directly in cover) */}
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-white leading-tight font-heading break-words drop-shadow-md">
          {recipe.title}
        </h1>

        {/* Creator Handle & Slide indicator */}
        {(formattedHandle || availableImages.length > 1) && (
          <div className="flex items-center justify-between gap-2 mt-0.5">
            {formattedHandle ? (
              <p className="text-xs sm:text-sm text-gray-200/90 font-medium truncate leading-none drop-shadow-xs min-w-0">
                {formattedHandle}
              </p>
            ) : (
              <div />
            )}

            {availableImages.length > 1 && (
              <span className="bg-black/60 text-white text-[10.5px] font-bold px-2.5 py-0.5 rounded-full backdrop-blur-md border border-white/10 shadow-sm pointer-events-none select-none shrink-0 ml-auto">
                {activeSlide + 1} / {availableImages.length}
              </span>
            )}
          </div>
        )}
      </div>
    </>
  );

  return (
    <>
      {/* Inline Gallery */}
      {availableImages.length > 1 ? (
        <div className="-mx-4 -mt-4 mb-0 relative group select-none bg-gray-950">
          {overlayHeader}
          <div
            ref={scrollContainerRef}
            onScroll={(e) => {
              const container = e.currentTarget;
              if (container.clientWidth > 0) {
                const idx = Math.round(container.scrollLeft / container.clientWidth);
                if (idx !== activeSlide && idx >= 0 && idx < availableImages.length) {
                  setActiveSlide(idx);
                }
              }
            }}
            onPointerDown={handlePointerDown}
            onPointerLeave={handlePointerLeave}
            onPointerUp={handlePointerUp}
            onPointerMove={handlePointerMove}
            className={`flex overflow-x-auto ${isDragging ? 'cursor-grabbing' : 'md:cursor-pointer cursor-grab snap-x snap-mandatory'}`}
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {availableImages.map((img, idx) => (
              <div key={idx} className="w-full shrink-0 snap-center snap-always relative">
                <CachedImage
                  src={img}
                  emoji={recipe.emoji}
                  draggable={false}
                  alt={`${recipe.title} - view ${idx + 1}`}
                  className={`w-full aspect-[4/3] sm:aspect-[16/10] object-cover object-center transition-transform duration-300 ${
                    isDragging ? 'cursor-grabbing' : 'cursor-pointer'
                  }`}
                  onClick={() => handleImageClick(idx)}
                />
              </div>
            ))}
          </div>
        </div>
      ) : availableImages.length === 1 ? (
        <div className="-mx-4 -mt-4 mb-0 relative group select-none bg-gray-950">
          {overlayHeader}
          <CachedImage
            src={availableImages[0]}
            emoji={recipe.emoji}
            alt={recipe.title}
            className="w-full aspect-[4/3] sm:aspect-[16/10] object-cover object-center cursor-pointer"
            onClick={() => setFullscreenIndex(0)}
          />
        </div>
      ) : (
        <div className="-mx-4 -mt-4 mb-0 relative group select-none bg-gray-950">
          {overlayHeader}
          <div className="w-full aspect-[4/3] sm:aspect-[16/10] bg-gradient-to-br from-emerald-950 via-gray-900 to-indigo-950 flex items-center justify-center">
            {recipe.emoji ? (
              <span className="text-6xl select-none" role="img" aria-label="recipe emoji">
                {recipe.emoji}
              </span>
            ) : (
              <ChefHat className="w-16 h-16 text-emerald-400/25 animate-pulse" />
            )}
          </div>
        </div>
      )}

      {/* Fullscreen Overlay */}
      <FullscreenImageModal
        images={images}
        initialIndex={fullscreenIndex}
        onClose={() => setFullscreenIndex(null)}
        emoji={recipe.emoji ?? undefined}
      />
    </>
  );
}
