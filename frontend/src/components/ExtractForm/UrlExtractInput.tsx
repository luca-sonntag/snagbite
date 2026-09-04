import React from 'react';
import { TextField, Label, Input, FieldError } from '@heroui/react';
import { Sparkles, Clipboard, X } from 'lucide-react';
import { useI18n } from '../../context/I18nContext';
import { hapticLight } from '../../utils/haptics';
import { PlatformIcon } from '../SavedCatalog/PlatformIcon';
import type { UrlExtractInputProps } from './types';

export const UrlExtractInput: React.FC<UrlExtractInputProps> = ({
  url,
  setUrl,
  urlError,
  validateUrl,
  isPending,
  canPaste,
  onPaste,
}) => {
  const { t } = useI18n();

  return (
    <div className="flex flex-col gap-2.5 w-full">
      <TextField
        fullWidth
        name="url"
        value={url}
        onChange={(val) => {
          setUrl(val);
          if (urlError) validateUrl(val);
        }}
        isInvalid={!!urlError}
      >
        <Label className="sr-only">{t('form.urlLabel')}</Label>
        <div className="relative flex items-center">
          <Sparkles className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500 pointer-events-none" />
          <Input
            placeholder={t('form.urlPlaceholderShort')}
            className="w-full !bg-gray-100/90 dark:!bg-gray-800/90 border-none rounded-2xl pl-10 !pr-24 py-3.5 text-sm text-gray-900 dark:text-white shadow-none focus:ring-2 focus:ring-emerald-500/25 focus:outline-none transition-all"
            disabled={isPending}
          />

          {/* Right Action buttons */}
          <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {url ? (
              <button
                type="button"
                className="w-8 h-8 rounded-xl flex items-center justify-center text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors border-none cursor-pointer"
                onClick={() => {
                  hapticLight();
                  setUrl('');
                }}
                disabled={isPending}
                aria-label="Clear URL"
              >
                <X className="w-4 h-4" />
              </button>
            ) : canPaste ? (
              <button
                type="button"
                className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-gray-700 shadow-[0_1px_3px_rgba(0,0,0,0.06)] text-xs font-bold text-gray-700 dark:text-gray-200 hover:text-emerald-600 dark:hover:text-emerald-400 active:scale-95 transition-all border-none cursor-pointer flex items-center gap-1.5"
                onClick={() => {
                  hapticLight();
                  onPaste();
                }}
                disabled={isPending}
                title={t('form.pasteTooltip')}
              >
                <Clipboard className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>{t('form.pasteAction')}</span>
              </button>
            ) : null}
          </div>
        </div>

        {urlError && <FieldError className="text-xs text-red-500 mt-1">{urlError}</FieldError>}
      </TextField>

      {/* Subtle, refined platform badges with brand accents */}
      <div className="flex items-center justify-center gap-2 pt-0.5">
        <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
          {t('form.platformsTitle')}
        </span>
        <div className="flex items-center gap-1.5">
          <div
            className="w-6 h-6 rounded-lg bg-pink-500/10 text-pink-600 dark:text-pink-400 flex items-center justify-center"
            title="Instagram"
          >
            <PlatformIcon platform="instagram" className="w-3.5 h-3.5" />
          </div>
          <div
            className="w-6 h-6 rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center"
            title="TikTok"
          >
            <PlatformIcon platform="tiktok" className="w-3.5 h-3.5" />
          </div>
          <div
            className="w-6 h-6 rounded-lg bg-red-500/10 text-red-600 dark:text-red-400 flex items-center justify-center"
            title="YouTube"
          >
            <PlatformIcon platform="youtube" className="w-3.5 h-3.5" />
          </div>
          <div
            className="w-6 h-6 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center"
            title="Web"
          >
            <PlatformIcon platform="website" className="w-3.5 h-3.5" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default UrlExtractInput;
