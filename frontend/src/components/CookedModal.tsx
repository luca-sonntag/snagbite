import { useCallback, useRef, useState, type ChangeEvent } from 'react';
import { createPortal } from 'react-dom';
import { Camera, X, Loader2 } from 'lucide-react';
import { useI18n } from '../context/I18nContext';
import { resolveErrorCode } from '../i18n';
import { useGamification } from '../context/GamificationContext';
import { useTimerManager } from '../hooks/useTimerManager';
import { useModalOverlay } from '../context/OverlayStackContext';
import { compressImage, PREVIEW_PROFILE } from '../utils/imageCompression';
import { hapticLight, hapticMedium, hapticNotification } from '../utils/haptics';
import CookedModalPhotoView from './CookedModalPhotoView';
import CookedModalInitialView from './CookedModalInitialView';

interface CookedModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  recipeId: string;
  recipeTitle?: string;
  viaCookingMode?: boolean;
}

export default function CookedModal({
  isOpen,
  onClose,
  onSuccess,
  recipeId,
  recipeTitle,
  viaCookingMode,
}: CookedModalProps) {
  const { t, language } = useI18n();
  const { markCooked } = useGamification();
  const { finishedRecipeIds } = useTimerManager();

  // A finished in-app timer for this recipe means the user actually cooked with
  // the timer running. We read from finishedRecipeIds (not `timers`) because the
  // timer is removed from `timers` once dismissed — but the cook is recorded
  // afterwards, so the signal must survive the dismiss.
  const timerElapsed = finishedRecipeIds.includes(recipeId);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const [photo, setPhoto] = useState<string | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [rejectionReason, setRejectionReason] = useState<string | null>(null);

  const handleResetAndClose = useCallback(() => {
    hapticLight();
    setPhoto(null);
    setRejectionReason(null);
    setIsVerifying(false);
    setIsCompressing(false);
    onClose();
  }, [onClose]);

  useModalOverlay(isOpen, handleResetAndClose);

  if (!isOpen) return null;

  const submitCook = async (photoBase64?: string) => {
    setIsVerifying(true);
    setRejectionReason(null);
    try {
      await markCooked(recipeId, {
        photoBase64,
        viaCookingMode,
        timerElapsed,
      });
      hapticNotification('success');
      onSuccess?.();
      handleResetAndClose();
    } catch (err: unknown) {
      console.error('[CookedModal] Cook recording failed:', err);
      hapticNotification('error');
      const errObj =
        err && typeof err === 'object'
          ? (err as { code?: string; params?: Record<string, unknown>; message?: string })
          : null;
      const code = errObj?.code;
      const params = errObj?.params;
      const rawReason = typeof params?.reason === 'string' ? params.reason : undefined;
      const fallbackReason =
        rawReason ||
        (errObj?.message && !errObj.message.includes('Failed to record cook')
          ? errObj.message
          : photoBase64
            ? t('error.codes.PHOTO_NOT_MATCHING')
            : t('app.gamification.cookError'));
      const localizedReason = code ? resolveErrorCode(code, params, errObj?.message, language) : fallbackReason;
      setRejectionReason(localizedReason);
    } finally {
      setIsVerifying(false);
    }
  };

  const handlePhotoSelect = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    hapticLight();
    setIsCompressing(true);
    setRejectionReason(null);
    try {
      const dataUrl = await compressImage(file, PREVIEW_PROFILE);
      setPhoto(dataUrl);
      setIsCompressing(false);
      await submitCook(dataUrl);
    } catch (err: unknown) {
      console.warn('[CookedModal] Image compression/verification failed:', err);
      setIsCompressing(false);
    }
  };

  const handleMarkWithoutPhoto = () => {
    hapticLight();
    setPhoto(null);
    submitCook();
  };

  const handleVerifyAndSubmit = () => {
    if (!photo || isVerifying) return;
    hapticMedium();
    submitCook(photo);
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4 sm:p-6 pb-[calc(1.5rem_+_var(--safe-area-inset-bottom))] transition-opacity animate-in fade-in duration-200">
      {/* Hidden file inputs for Camera and Gallery */}
      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" hidden onChange={handlePhotoSelect} />
      <input ref={galleryInputRef} type="file" accept="image/*" hidden onChange={handlePhotoSelect} />

      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-md rounded-3xl bg-white dark:bg-gray-900 p-6 text-gray-900 dark:text-white shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
      >
        {/* Close Button */}
        <button
          onClick={handleResetAndClose}
          disabled={isVerifying}
          className="absolute top-4 right-4 w-10 h-10 min-w-[44px] min-h-[44px] text-gray-400 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-full bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 flex items-center justify-center transition-all cursor-pointer border-none disabled:opacity-40"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-4 pr-10">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
            <Camera className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-bold tracking-tight text-gray-900 dark:text-gray-100 leading-snug">
              {t('app.gamification.modalTitle')}
            </h3>
            {recipeTitle && (
              <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1 font-medium">{recipeTitle}</p>
            )}
          </div>
        </div>

        {/* Body content based on state */}
        {!photo && !isCompressing && (
          <CookedModalInitialView
            isVerifying={isVerifying}
            rejectionReason={rejectionReason}
            onTakePhoto={() => cameraInputRef.current?.click()}
            onChooseGallery={() => galleryInputRef.current?.click()}
            onMarkWithoutPhoto={handleMarkWithoutPhoto}
          />
        )}

        {isCompressing && (
          <div className="flex flex-col items-center justify-center py-10 text-center space-y-3">
            <Loader2 className="w-8 h-8 text-emerald-500 dark:text-emerald-400 animate-spin" />
            <p className="text-xs text-gray-600 dark:text-gray-300">Foto wird verarbeitet...</p>
          </div>
        )}

        {photo && !isCompressing && (
          <CookedModalPhotoView
            photo={photo}
            isVerifying={isVerifying}
            rejectionReason={rejectionReason}
            onClearPhoto={() => {
              setPhoto(null);
              setRejectionReason(null);
            }}
            onSubmit={handleVerifyAndSubmit}
            onMarkWithoutPhoto={handleMarkWithoutPhoto}
          />
        )}
      </div>
    </div>,
    document.body,
  );
}
