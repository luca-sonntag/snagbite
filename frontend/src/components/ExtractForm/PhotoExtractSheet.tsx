import React from 'react';
import { Drawer } from '@heroui/react';
import { X } from 'lucide-react';
import { useI18n } from '../../context/I18nContext';
import { useModalOverlay } from '../../context/OverlayStackContext';
import { hapticLight } from '../../utils/haptics';
import PhotoExtractGrid from './PhotoExtractGrid';
import ExtractSubmitButton from './ExtractSubmitButton';
import type { PhotoExtractSheetProps } from './types';

export const PhotoExtractSheet: React.FC<PhotoExtractSheetProps> = ({
  isOpen,
  onClose,
  photos,
  photoPreviews,
  cameraInputRef,
  galleryInputRef,
  onPhotoChange,
  onRemovePhoto,
  onOpenPicker,
  isPending,
  isUploadingPhotos,
  submitDisabled,
  handleFormSubmit,
}) => {
  const { t } = useI18n();
  useModalOverlay(isOpen, onClose);

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
          <Drawer.Dialog className="relative !bg-gray-50 dark:!bg-gray-950 max-h-[85vh] flex flex-col p-5 pb-[calc(1.5rem_+_var(--safe-area-inset-bottom))] rounded-t-3xl border-none shadow-[0_-4px_30px_rgba(0,0,0,0.12)]">
            <Drawer.Handle />

            <Drawer.Header className="pb-3 mb-1">
              <div className="flex items-center justify-between">
                <div>
                  <Drawer.Heading className="text-base font-bold text-gray-900 dark:text-white">
                    {t('form.sheet.photoTitle')}
                  </Drawer.Heading>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {t('form.sheet.photoSubtitle')}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    hapticLight();
                    onClose();
                  }}
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-black/5 dark:hover:bg-white/5 border-none cursor-pointer transition-colors"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </Drawer.Header>

            <Drawer.Body className="overflow-y-auto py-2 flex flex-col gap-4">
              <form onSubmit={handleFormSubmit} className="flex flex-col gap-4">
                <PhotoExtractGrid
                  photos={photos}
                  photoPreviews={photoPreviews}
                  cameraInputRef={cameraInputRef}
                  galleryInputRef={galleryInputRef}
                  onPhotoChange={onPhotoChange}
                  onRemovePhoto={onRemovePhoto}
                  onOpenPicker={onOpenPicker}
                />

                <p className="text-center text-[11px] leading-relaxed text-gray-400 dark:text-gray-500">
                  {t('form.photo.tips')}
                </p>

                <ExtractSubmitButton
                  mode="photo"
                  isPending={isPending}
                  isUploadingPhotos={isUploadingPhotos}
                  submitDisabled={submitDisabled || photos.length === 0}
                />
              </form>
            </Drawer.Body>
          </Drawer.Dialog>
        </Drawer.Content>
      </Drawer.Backdrop>
    </Drawer>
  );
};

export default PhotoExtractSheet;
