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
  <svg viewBox="-2 -2 28 28" fill="currentColor" {...props}>
    <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
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
        compact ? 'aspect-[2.8/1] max-h-24' : 'aspect-[2.3/1] sm:aspect-[2.4/1] max-h-32'
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
