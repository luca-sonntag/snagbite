import React from 'react';
import { Drawer } from '@heroui/react';
import { X } from 'lucide-react';
import { useI18n } from '../../context/I18nContext';
import { hapticLight } from '../../utils/haptics';
import UrlExtractInput from './UrlExtractInput';
import ExtractSubmitButton from './ExtractSubmitButton';
import type { UrlExtractSheetProps } from './types';

export const UrlExtractSheet: React.FC<UrlExtractSheetProps> = ({
  isOpen,
  onClose,
  url,
  setUrl,
  urlError,
  validateUrl,
  isPending,
  canPaste,
  onPaste,
  submitDisabled,
  handleFormSubmit,
}) => {
  const { t } = useI18n();

  return (
    <Drawer>
      <Drawer.Backdrop
        isOpen={isOpen}
        onOpenChange={(open) => {
          if (!open) onClose();
        }}
        className="!z-[100]"
      >
        <Drawer.Content placement="bottom" className="!z-[100]">
          <Drawer.Dialog className="relative !bg-white dark:!bg-gray-900 max-h-[85vh] flex flex-col p-5 pb-[calc(1.5rem_+_var(--safe-area-inset-bottom))] rounded-t-3xl border-none shadow-[0_-4px_30px_rgba(0,0,0,0.12)]">
            <Drawer.Handle />

            <Drawer.Header className="pb-3 mb-1">
              <div className="flex items-center justify-between">
                <div>
                  <Drawer.Heading className="text-base font-bold text-gray-900 dark:text-white">
                    {t('form.sheet.linkTitle')}
                  </Drawer.Heading>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {t('form.sheet.linkSubtitle')}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    hapticLight();
                    onClose();
                  }}
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-black/5 dark:hover:bg-white/5 active:scale-95 border-none cursor-pointer transition-all"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </Drawer.Header>

            <Drawer.Body className="overflow-y-auto py-2 flex flex-col gap-4">
              <form onSubmit={handleFormSubmit} className="flex flex-col gap-4">
                <UrlExtractInput
                  url={url}
                  setUrl={setUrl}
                  urlError={urlError}
                  validateUrl={validateUrl}
                  isPending={isPending}
                  canPaste={canPaste}
                  onPaste={onPaste}
                />

                <ExtractSubmitButton
                  mode="link"
                  isPending={isPending}
                  isUploadingPhotos={false}
                  submitDisabled={submitDisabled}
                />
              </form>
            </Drawer.Body>
          </Drawer.Dialog>
        </Drawer.Content>
      </Drawer.Backdrop>
    </Drawer>
  );
};

export default UrlExtractSheet;
