import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { createPortal } from 'react-dom';
import { Camera, Image as ImageIcon, Check, AlertTriangle, RotateCcw, X, Loader2 } from 'lucide-react';
import { useI18n } from '../context/I18nContext';
import { resolveErrorCode } from '../i18n';
import { useGamification } from '../context/GamificationContext';
import { useTimerManager } from '../hooks/useTimerManager';
import { compressImage, PREVIEW_PROFILE } from '../utils/imageCompression';

interface CookedModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipeId: string;
  recipeTitle?: string;
  viaCookingMode?: boolean;
}

export default function CookedModal({
  isOpen,
  onClose,
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

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const submitPhoto = async (photoBase64: string) => {
    setIsVerifying(true);
    setRejectionReason(null);

    try {
      await markCooked(recipeId, {
        photoBase64,
        viaCookingMode,
        timerElapsed,
      });
      // GamificationContext automatically opens the RewardOverlay on success
      handleResetAndClose();
    } catch (err: any) {
      console.error('[CookedModal] Verification failed:', err);
      const code = err?.code;
      const params = err?.params;
      const localizedReason = code
        ? resolveErrorCode(code, params, err?.message, language)
        : (params?.reason || (err?.message && !err.message.includes('Failed to record cook') ? err.message : t('error.codes.PHOTO_NOT_MATCHING')));
      setRejectionReason(localizedReason);
    } finally {
      setIsVerifying(false);
    }
  };

  const handlePhotoSelect = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setIsCompressing(true);
    setRejectionReason(null);
    try {
      const dataUrl = await compressImage(file, PREVIEW_PROFILE);
      setPhoto(dataUrl);
      setIsCompressing(false);
      // Immediately start photo verification on selection
      await submitPhoto(dataUrl);
    } catch (err: any) {
      console.warn('[CookedModal] Image compression/verification failed:', err);
      setIsCompressing(false);
    }
  };

  const handleVerifyAndSubmit = async () => {
    if (!photo || isVerifying) return;
    await submitPhoto(photo);
  };

  const handleResetAndClose = () => {
    setPhoto(null);
    setRejectionReason(null);
    setIsVerifying(false);
    setIsCompressing(false);
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4 sm:p-6 pb-[calc(1.5rem_+_var(--safe-area-inset-bottom))] transition-opacity animate-in fade-in duration-200">
      {/* Hidden file inputs for Camera and Gallery */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={handlePhotoSelect}
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={handlePhotoSelect}
      />

      <div className="relative w-full max-w-md rounded-3xl bg-white dark:bg-gray-900 p-6 text-gray-900 dark:text-white shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Close Button */}
        <button
          onClick={handleResetAndClose}
          disabled={isVerifying}
          className="absolute top-4 right-4 p-2 text-gray-400 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-full bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 transition-colors disabled:opacity-40"
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
          <div className="space-y-4 py-2">
            <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
              {t('app.gamification.modalSubtitle')}
            </p>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="flex flex-col items-center justify-center gap-2 p-5 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/15 hover:bg-emerald-500/20 dark:hover:bg-emerald-500/25 text-emerald-600 dark:text-emerald-400 font-bold transition-all active:scale-[0.97]"
              >
                <Camera className="w-7 h-7" />
                <span className="text-xs">{t('app.gamification.takePhoto')}</span>
              </button>

              <button
                type="button"
                onClick={() => galleryInputRef.current?.click()}
                className="flex flex-col items-center justify-center gap-2 p-5 rounded-2xl bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-700 dark:text-gray-200 font-bold transition-all active:scale-[0.97]"
              >
                <ImageIcon className="w-7 h-7" />
                <span className="text-xs">{t('app.gamification.chooseGallery')}</span>
              </button>
            </div>
          </div>
        )}

        {isCompressing && (
          <div className="flex flex-col items-center justify-center py-10 text-center space-y-3">
            <Loader2 className="w-8 h-8 text-emerald-500 dark:text-emerald-400 animate-spin" />
            <p className="text-xs text-gray-600 dark:text-gray-300">Foto wird verarbeitet...</p>
          </div>
        )}

        {photo && !isCompressing && (
          <div className="space-y-4 py-1">
            {/* Image Preview Container */}
            <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-gray-100 dark:bg-black/40">
              <img
                src={photo}
                alt="Uploaded dish preview"
                className="h-full w-full object-cover"
              />
              {!isVerifying && (
                <button
                  type="button"
                  onClick={() => setPhoto(null)}
                  className="absolute top-2 right-2 rounded-full bg-black/60 p-1.5 text-white backdrop-blur-md hover:bg-black/80 transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Rejection Message if AI rejected previous attempt */}
            {rejectionReason && (
              <div className="rounded-2xl bg-rose-500/5 dark:bg-rose-500/10 p-3.5 flex items-start gap-3 text-rose-700 dark:text-rose-300">
                <AlertTriangle className="w-5 h-5 shrink-0 text-rose-500 dark:text-rose-400 mt-0.5" />
                <div className="space-y-1 text-xs">
                  <p className="font-semibold text-rose-900 dark:text-rose-200">{t('app.gamification.rejectionTitle')}</p>
                  <p className="leading-normal text-rose-700 dark:text-rose-300/90">{rejectionReason}</p>
                </div>
              </div>
            )}

            {/* Verifying Status, Retry Button, or Submit Button */}
            {isVerifying ? (
              <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-500/15 p-4 text-center space-y-2">
                <div className="flex items-center justify-center gap-2 text-emerald-700 dark:text-emerald-400 font-bold text-sm">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{t('app.gamification.verifyingTitle')}</span>
                </div>
                <p className="text-[11px] text-emerald-800 dark:text-emerald-200/80">
                  {t('app.gamification.verifyingDesc')}
                </p>
              </div>
            ) : rejectionReason ? (
              <button
                type="button"
                onClick={() => {
                  setPhoto(null);
                  setRejectionReason(null);
                }}
                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/15 hover:bg-emerald-500/20 dark:hover:bg-emerald-500/25 text-emerald-600 dark:text-emerald-400 px-4 py-3.5 text-xs font-bold transition-all active:scale-[0.98] cursor-pointer outline-none border-none"
              >
                <RotateCcw className="w-4 h-4" />
                <span>{t('app.gamification.retryPhoto')}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleVerifyAndSubmit}
                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 px-4 py-3.5 text-xs font-bold text-white shadow-lg active:scale-[0.98] transition-all"
              >
                <Check className="w-4 h-4" />
                <span>{t('app.gamification.verifyBtn')}</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
