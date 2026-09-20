import React from 'react';
import { Button, Spinner } from '@heroui/react';
import { BookOpen, Bookmark } from 'lucide-react';
import { useI18n } from '../../context/I18nContext';
import type { ExtractMode } from './types';

interface ExtractSubmitButtonProps {
  mode?: ExtractMode;
  isPending: boolean;
  isUploadingPhotos?: boolean;
  submitDisabled: boolean;
  isWaitlistMode?: boolean;
}

export const ExtractSubmitButton: React.FC<ExtractSubmitButtonProps> = ({
  isPending,
  isUploadingPhotos = false,
  submitDisabled,
  isWaitlistMode = false,
}) => {
  const { t } = useI18n();

  const actuallyDisabled = isWaitlistMode ? isPending || isUploadingPhotos : submitDisabled;

  return (
    <Button
      type="submit"
      fullWidth
      isPending={isPending || isUploadingPhotos}
      isDisabled={actuallyDisabled}
      className={`py-3.5 h-12 text-sm rounded-2xl font-bold border-none text-white ${
        actuallyDisabled
          ? 'bg-gray-300 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed opacity-80 shadow-none'
          : isPending
            ? 'bg-emerald-700 shadow-none'
            : isWaitlistMode
              ? 'bg-emerald-600 hover:bg-emerald-500 active:scale-95 transition-all shadow-none cursor-pointer'
              : 'bg-emerald-600 hover:bg-emerald-500 active:scale-95 transition-all shadow-none cursor-pointer'
      }`}
    >
      {({ isPending: btnPending }) => (
        <span className="flex items-center gap-2 justify-center">
          {btnPending ? (
            <>
              <Spinner color="current" size="sm" />
              <span>{isUploadingPhotos ? t('form.photo.btnUploading') : t('form.btnPending')}</span>
            </>
          ) : isWaitlistMode ? (
            <>
              <Bookmark className="w-4 h-4" />
              <span>{t('queue.btnQueueForLater')}</span>
            </>
          ) : (
            <>
              <BookOpen className="w-4 h-4" />
              <span>{t('form.btnSubmit')}</span>
            </>
          )}
        </span>
      )}
    </Button>
  );
};

export default ExtractSubmitButton;
