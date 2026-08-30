import React from 'react';
import { TextField, Label, Input, FieldError } from '@heroui/react';
import { Link2, Clipboard } from 'lucide-react';
import { useI18n } from '../../context/I18nContext';
import { hapticLight } from '../../utils/haptics';
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
      <div className="relative">
        <Link2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-gray-400 dark:text-gray-500 pointer-events-none" />
        <Input
          placeholder={t('form.urlPlaceholderShort')}
          className="w-full !bg-gray-100 dark:!bg-gray-800 border-none rounded-2xl pl-11 !pr-12 py-3.5 text-sm text-gray-900 dark:text-white shadow-none focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition-all"
          disabled={isPending}
        />
        <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {url && (
            <button
              type="button"
              className="text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-white text-xl font-bold w-10 h-10 min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors border-none cursor-pointer"
              onClick={() => {
                hapticLight();
                setUrl('');
              }}
              disabled={isPending}
            >
              ×
            </button>
          )}
          {canPaste && !url && (
            <button
              type="button"
              className="text-gray-500 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 w-10 h-10 min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl hover:bg-emerald-500/10 transition-colors border-none cursor-pointer"
              onClick={() => {
                hapticLight();
                onPaste();
              }}
              disabled={isPending}
              title={t('form.pasteTooltip')}
            >
              <Clipboard className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
      {urlError && <FieldError className="text-xs text-red-500 mt-1">{urlError}</FieldError>}
    </TextField>
  );
};
export default UrlExtractInput;
