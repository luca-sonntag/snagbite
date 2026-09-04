import React from 'react';
import { Camera, Globe, BookOpen } from 'lucide-react';
import { useI18n } from '../../context/I18nContext';
import { InstagramIcon } from '../ShareMockups';
import type { PlatformType } from './types';
import type { RecipePreviewData } from '../../types';

interface RecipeCoverPreviewProps {
  platform: PlatformType;
  preview: RecipePreviewData | null;
  isCompleted: boolean;
  compact?: boolean;
}

const YoutubeIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z" />
    <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" fill="currentColor" />
  </svg>
);

const TikTokIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.75a4.85 4.85 0 0 1-1.01-.06z" />
  </svg>
);

export default function RecipeCoverPreview({
  platform,
  preview,
  isCompleted: _isCompleted,
  compact = false,
}: RecipeCoverPreviewProps) {
  const { t } = useI18n();
  const imageUrl = preview?.coverUrl || preview?.thumbnailUrl;

  const platformBadge = {
    instagram: { label: 'Instagram', icon: <InstagramIcon className="w-3.5 h-3.5 fill-pink-400" /> },
    tiktok: { label: 'TikTok', icon: <TikTokIcon className="w-3.5 h-3.5 text-cyan-400" /> },
    youtube: { label: 'Shorts', icon: <YoutubeIcon className="w-3.5 h-3.5 text-red-400" /> },
    photo: { label: t('job.preview.photoImportBadge') || 'Rezeptkarte', icon: <Camera className="w-3.5 h-3.5 text-emerald-400" /> },
    web: { label: 'Web', icon: <Globe className="w-3.5 h-3.5 text-blue-400" /> },
  }[platform];

  return (
    <div
      className={`relative w-full overflow-hidden rounded-2xl bg-gray-100 dark:bg-gray-800 select-none ${
        compact ? 'aspect-[2.3/1] max-h-28' : 'aspect-[2/1] sm:aspect-[2.1/1]'
      }`}
    >
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={preview?.title || 'Recipe Preview'}
          className="w-full h-full object-cover object-center animate-fade-in transition-transform duration-700"
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-800/90 relative overflow-hidden">
          <div className="w-11 h-11 rounded-2xl bg-gray-200/80 dark:bg-gray-700/60 flex items-center justify-center text-gray-400 dark:text-gray-500 animate-pulse shadow-2xs">
            <BookOpen className="w-5 h-5 stroke-[1.75]" />
          </div>
        </div>
      )}

      {/* Top Floating Badges */}
      <div className="absolute top-2.5 inset-x-2.5 flex items-center justify-between pointer-events-none z-10">
        <div className="px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-white text-[11px] font-semibold flex items-center gap-1.5 shadow-sm">
          {platformBadge.icon}
          <span>{platformBadge.label}</span>
        </div>

        {preview?.authorHandle && (
          <div className="px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-white/90 text-[11px] font-medium shadow-sm max-w-[130px] truncate">
            @{preview.authorHandle.replace(/^@/, '')}
          </div>
        )}
      </div>

      {/* Bottom Subtle Gradient Scrim - only active when real image is loaded */}
      {imageUrl && (
        <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
      )}
    </div>
  );
}
