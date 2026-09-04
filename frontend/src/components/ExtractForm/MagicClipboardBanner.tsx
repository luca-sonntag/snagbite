import React from 'react';
import { Sparkles, X } from 'lucide-react';
import { useI18n } from '../../context/I18nContext';
import { hapticLight } from '../../utils/haptics';
import { detectPlatform, PlatformIcon } from '../SavedCatalog/PlatformIcon';
import type { MagicClipboardBannerProps } from './types';

export const MagicClipboardBanner: React.FC<MagicClipboardBannerProps> = ({
  detectedUrl,
  onApply,
  onDismiss,
  disabled = false,
}) => {
  const { t } = useI18n();
  const platform = detectPlatform(detectedUrl);

  return (
    <div className="flex flex-col gap-2.5 p-3.5 sm:p-4 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/15 ring-1 ring-emerald-500/25 shadow-[0_2px_8px_rgba(16,185,129,0.06)] animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-bold text-gray-900 dark:text-white">
            {t('form.magicClipboardTitle')}
          </span>
        </div>
        <button
          type="button"
          onClick={() => {
            hapticLight();
            onDismiss();
          }}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-black/5 dark:hover:bg-white/5 border-none cursor-pointer transition-colors"
          aria-label="Dismiss"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex items-center justify-between gap-3 pt-0.5">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className="shrink-0 w-4 h-4 text-emerald-600 dark:text-emerald-400">
            <PlatformIcon platform={platform} className="w-4 h-4" />
          </span>
          <span className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">
            {detectedUrl}
          </span>
        </div>

        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            hapticLight();
            onApply(detectedUrl);
          }}
          className="shrink-0 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs border-none cursor-pointer active:scale-95 transition-all shadow-none flex items-center gap-1.5"
        >
          <Sparkles className="w-3 h-3" />
          <span>{t('form.magicClipboardAction')}</span>
        </button>
      </div>
    </div>
  );
};

export default MagicClipboardBanner;
