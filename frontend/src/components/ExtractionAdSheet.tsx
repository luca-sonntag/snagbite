import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useI18n } from '../context/I18nContext';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';
import { isNative } from '../native';
import ExtractionAdCard from './ExtractionAdCard';

interface ExtractionAdSheetProps {
  isOpen: boolean;
  onClose?: () => void;
}

/**
 * Non-dismissible overlay displaying an MREC AdMob banner during foreground
 * recipe extractions for Free-tier users.
 *
 * Renders as a floating card overlay (similar to CookedModal) without backdrop blur,
 * allowing the user to observe background extraction progress.
 *
 * Automatically stays open while the extraction job is active and cannot be
 * dismissed via backdrop clicks, gestures, or close buttons.
 */
export default function ExtractionAdSheet({ isOpen, onClose }: ExtractionAdSheetProps) {
  const { t } = useI18n();
  const [adStatus, setAdStatus] = useState<'pending' | 'loaded' | 'failed'>('pending');

  useEffect(() => {
    if (isOpen) {
      setAdStatus('pending');
    }
  }, [isOpen]);

  const isEffectivelyOpen = isOpen && (!isNative() || adStatus !== 'failed');
  useBodyScrollLock(isEffectivelyOpen);

  if (!isEffectivelyOpen) return null;

  return createPortal(
    <div
      role="presentation"
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 px-3 py-4 sm:p-6 pb-[calc(1.5rem_+_var(--safe-area-inset-bottom))] transition-opacity animate-in fade-in duration-200 select-none pointer-events-auto"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('ads.label')}
        className="relative w-full max-w-sm rounded-3xl bg-gray-50 dark:bg-gray-950 px-3.5 py-4 sm:p-5 text-gray-900 dark:text-white shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col items-center justify-center border border-black/5 dark:border-white/5"
      >
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/[0.04] dark:bg-white/[0.06] text-gray-400 hover:text-gray-900 dark:hover:text-white flex items-center justify-center transition-all border-none active:scale-95 cursor-pointer z-10"
            aria-label={t('common.close') || 'Schließen'}
          >
            <X className="w-4 h-4" />
          </button>
        )}

        <ExtractionAdCard
          isActive={isOpen}
          variant="mrec"
          bare
          onStatusChange={setAdStatus}
        />
      </div>
    </div>,
    document.body,
  );
}
