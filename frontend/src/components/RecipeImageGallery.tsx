import React from 'react';
import { Button } from '@heroui/react';
import {
  ArrowLeft,
  Camera,
  ChefHat
} from 'lucide-react';
import type { Recipe } from '../types';
import { useImageGallery } from '../hooks/useImageGallery';
import { useI18n } from '../context/I18nContext';
import CachedImage from './CachedImage';
import FullscreenImageModal from './FullscreenImageModal';
import { getCachedImage } from '../utils/imageStore';
import { isPhotoImportUrl } from '../utils/photoImport';
import { hapticLight } from '../utils/haptics';

const InstagramIcon = (props: React.SVGProps<SVGSVGElement>) => (
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

const TikTokIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="-2 -2 28 28"
    fill="currentColor"
    {...props}
  >
    <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
  </svg>
);

const YouTubeIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="currentColor"
    {...props}
  >
    <path d="M23.5 6.19a3.02 3.02 0 0 0-2.12-2.14C19.54 3.5 12 3.5 12 3.5s-7.54 0-9.38.55A3.02 3.02 0 0 0 .5 6.19C0 8.04 0 12 0 12s0 3.96.5 5.81a3.02 3.02 0 0 0 2.12 2.14C4.46 20.5 12 20.5 12 20.5s7.54 0 9.38-.55a3.02 3.02 0 0 0 2.12-2.14C24 15.96 24 12 24 12s0-3.96-.5-5.81zM9.75 15.02V8.98L15.5 12l-5.75 3.02z" />
  </svg>
);

const GlobeIcon = (props: React.SVGProps<SVGSVGElement>) => (
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
    <circle cx="12" cy="12" r="10" />
    <line x1="2" y1="12" x2="22" y2="12" />
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
  </svg>
);

type Platform = 'instagram' | 'tiktok' | 'youtube' | 'website';

function detectPlatform(url: string): Platform {
  try {
    const host = new URL(url).hostname.toLowerCase();
    if (host.includes('instagram.com')) return 'instagram';
    if (host.includes('tiktok.com')) return 'tiktok';
    if (host.includes('youtube.com') || host.includes('youtu.be')) return 'youtube';
  } catch { /* ignore */ }
  return 'website';
}

function PlatformIcon({ platform, className }: { platform: Platform; className?: string }) {
  switch (platform) {
    case 'instagram': return <InstagramIcon className={className} />;
    case 'tiktok': return <TikTokIcon className={className} />;
    case 'youtube': return <YouTubeIcon className={className} />;
    default: return <GlobeIcon className={className} />;
  }
}

function platformIconColor(platform: Platform): string {
  switch (platform) {
    case 'instagram': return 'text-pink-400';
    case 'tiktok': return 'text-cyan-300';
    case 'youtube': return 'text-red-400';
    default: return 'text-blue-300';
  }
}

interface RecipeImageGalleryProps {
  recipe: Recipe;
  reelUrl?: string;
  onBack?: () => void;
}

export default function RecipeImageGallery({ recipe, reelUrl, onBack }: RecipeImageGalleryProps) {
  const { t } = useI18n();

  // Derive initial list (excluding local: URLs since they need to be verified asynchronously)
  const initialImages = (recipe.imageUrls && recipe.imageUrls.length > 0
    ? recipe.imageUrls
    : (recipe.imageUrl ? [recipe.imageUrl] : [])
  ).filter(url => !url.startsWith('local:'));

  const [availableImages, setAvailableImages] = React.useState<string[]>(initialImages);

  React.useEffect(() => {
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

  const overlayButtons = (
    <>
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

      {/* Floating Bottom Actions */}
      {reelUrl && (() => {
        // A photo import has no source to open — label its origin instead of
        // rendering a link to an unresolvable photo:// URL.
        if (isPhotoImportUrl(reelUrl)) {
          return (
            <div className="absolute bottom-3 left-3 z-20 flex items-center gap-2">
              <span className="bg-black/65 text-white text-xs font-semibold px-3 py-1.5 rounded-full flex items-center gap-1.5 backdrop-blur-md border border-white/10 shadow-lg select-none">
                <Camera className="w-3.5 h-3.5 text-emerald-300" />
                <span>{t('catalog.photoImport')}</span>
              </span>
            </div>
          );
        }

        const platform = detectPlatform(reelUrl);
        const iconColor = platformIconColor(platform);

        return (
          <div className="absolute bottom-3 left-3 z-20 flex items-center gap-2">
            <a
              href={reelUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => hapticLight()}
              className="bg-black/65 hover:bg-emerald-600/90 text-white text-xs font-semibold px-3 py-1.5 min-h-[36px] rounded-full flex items-center gap-1.5 backdrop-blur-md border border-white/10 shadow-lg transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer"
            >
              <PlatformIcon platform={platform} className={`w-3.5 h-3.5 ${iconColor}`} />
              <span>{t('catalog.viewReel')}</span>
            </a>
          </div>
        );
      })()}
    </>
  );

  return (
    <>
      {/* Inline Gallery */}
      {availableImages.length > 1 ? (
        <div className="-mx-4 -mt-4 mb-4 relative group">
          {overlayButtons}
          <div
            ref={scrollContainerRef}
            onPointerDown={handlePointerDown}
            onPointerLeave={handlePointerLeave}
            onPointerUp={handlePointerUp}
            onPointerMove={handlePointerMove}
            className={`flex overflow-x-auto ${isDragging ? 'cursor-grabbing' : 'md:cursor-pointer cursor-grab snap-x snap-mandatory'}`}
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {availableImages.map((img, idx) => {
              return (
                <div key={idx} className="w-full shrink-0 snap-center snap-always relative">
                  <CachedImage
                    src={img}
                    emoji={recipe.emoji}
                    draggable={false}
                    alt={`${recipe.title} - view ${idx + 1}`}
                    className={`w-full aspect-video object-cover object-center transition-transform duration-300 ${isDragging ? 'cursor-grabbing' : 'cursor-pointer'
                      }`}
                    onClick={() => handleImageClick(idx)}
                  />
                  <div className="absolute bottom-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded-full pointer-events-none opacity-80 backdrop-blur-sm">
                    {idx + 1} / {availableImages.length}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : availableImages.length === 1 ? (
        <div className="-mx-4 -mt-4 mb-4 bg-black/5 dark:bg-white/5 relative group">
          {overlayButtons}
          <CachedImage
            src={availableImages[0]}
            emoji={recipe.emoji}
            alt={recipe.title}
            className="w-full aspect-video object-cover object-center cursor-pointer"
            onClick={() => {
              setFullscreenIndex(0);
            }}
          />
        </div>
      ) : (
        <div className="-mx-4 -mt-4 mb-4 aspect-video bg-gradient-to-br from-emerald-500/10 via-transparent to-indigo-500/10 border-b border-black/5 dark:border-white/5 relative flex items-center justify-center overflow-hidden">
          {overlayButtons}
          {recipe.emoji ? (
            <span className="text-5xl select-none" role="img" aria-label="recipe emoji">
              {recipe.emoji}
            </span>
          ) : (
            <ChefHat className="w-12 h-12 text-emerald-500/20 dark:text-emerald-400/15 animate-pulse" />
          )}
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
