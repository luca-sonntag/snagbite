import type { SVGProps } from 'react';
import { Camera, Infinity as InfinityIcon } from 'lucide-react';
import { InstagramIcon } from '../../ShareMockups';
import { useI18n } from '../../../context/I18nContext';
import ProBadge from '../../ProBadge';

const TikTokIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="-2 -2 28 28" fill="currentColor" {...props}>
    <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
  </svg>
);

const YoutubeIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="currentColor"
    {...props}
  >
    <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z" />
    <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" fill="white" />
  </svg>
);

export default function UnlimitedExtractionsPreview() {
  const { language } = useI18n();
  const isEn = language.startsWith('en');

  return (
    <div className="w-full bg-gray-50/75 dark:bg-gray-800/35 rounded-3xl p-4 sm:p-5 border border-black/[0.04] dark:border-white/[0.06] shadow-xs flex flex-col gap-3.5 select-none">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <InfinityIcon className="w-4 h-4" />
          </div>
          <span className="text-xs font-bold text-gray-900 dark:text-white">
            {isEn ? 'Unlimited AI Extractions' : 'Unbegrenzte KI-Extraktionen'}
          </span>
        </div>
        <ProBadge variant="chip" />
      </div>

      {/* Platform Chips */}
      <div className="grid grid-cols-4 gap-2">
        <div className="flex flex-col items-center gap-1 py-2 px-1 rounded-2xl bg-gradient-to-b from-pink-50 to-pink-100/50 dark:from-pink-950/20 dark:to-pink-900/10 text-pink-600 dark:text-pink-400 text-center">
          <InstagramIcon className="w-5 h-5" />
          <span className="text-[10px] font-semibold">Instagram</span>
        </div>

        <div className="flex flex-col items-center gap-1 py-2 px-1 rounded-2xl bg-gradient-to-b from-gray-50 to-gray-100/50 dark:from-gray-800/40 dark:to-gray-800/20 text-gray-800 dark:text-gray-200 text-center">
          <TikTokIcon className="w-5 h-5" />
          <span className="text-[10px] font-semibold">TikTok</span>
        </div>

        <div className="flex flex-col items-center gap-1 py-2 px-1 rounded-2xl bg-gradient-to-b from-red-50 to-red-100/50 dark:from-red-950/20 dark:to-red-900/10 text-red-600 dark:text-red-400 text-center">
          <YoutubeIcon className="w-5 h-5" />
          <span className="text-[10px] font-semibold">YouTube</span>
        </div>

        <div className="flex flex-col items-center gap-1 py-2 px-1 rounded-2xl bg-gradient-to-b from-emerald-50 to-emerald-100/50 dark:from-emerald-950/20 dark:to-emerald-900/10 text-emerald-600 dark:text-emerald-400 text-center">
          <Camera className="w-5 h-5" />
          <span className="text-[10px] font-semibold">{isEn ? 'Photo' : 'Foto-Scan'}</span>
        </div>
      </div>
    </div>
  );
}
