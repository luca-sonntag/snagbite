import { AlertTriangle, Check, Loader2, RotateCcw } from 'lucide-react';
import { useI18n } from '../context/I18nContext';

interface CookedModalPhotoViewProps {
  photo: string;
  isVerifying: boolean;
  rejectionReason: string | null;
  onClearPhoto: () => void;
  onSubmit: () => void;
  onMarkWithoutPhoto: () => void;
}

export default function CookedModalPhotoView({
  photo,
  isVerifying,
  rejectionReason,
  onClearPhoto,
  onSubmit,
  onMarkWithoutPhoto,
}: CookedModalPhotoViewProps) {
  const { t } = useI18n();

  return (
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
            onClick={onClearPhoto}
            className="absolute top-2 right-2 rounded-full bg-black/60 p-2 text-white backdrop-blur-md hover:bg-black/80 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center cursor-pointer border-none"
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
        <div className="space-y-2">
          <button
            type="button"
            onClick={onClearPhoto}
            className="w-full min-h-[48px] h-12 flex items-center justify-center gap-2 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/15 hover:bg-emerald-500/20 dark:hover:bg-emerald-500/25 text-emerald-600 dark:text-emerald-400 px-4 text-sm font-bold transition-all active:scale-[0.98] cursor-pointer outline-none border-none"
          >
            <RotateCcw className="w-4 h-4" />
            <span>{t('app.gamification.retryPhoto')}</span>
          </button>
          <button
            type="button"
            onClick={onMarkWithoutPhoto}
            className="w-full min-h-[44px] flex items-center justify-center gap-2 py-3 px-3.5 rounded-2xl text-xs font-semibold text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 active:scale-[0.98] transition-all cursor-pointer border-none whitespace-nowrap"
          >
            <Check className="w-4 h-4 text-gray-500 dark:text-gray-400 shrink-0" />
            <span>{t('app.gamification.markWithoutPhoto')}</span>
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={onSubmit}
          className="w-full min-h-[48px] h-12 flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 px-4 text-sm font-bold text-white shadow-lg active:scale-[0.98] transition-all cursor-pointer border-none"
        >
          <Check className="w-4 h-4" />
          <span>{t('app.gamification.verifyBtn')}</span>
        </button>
      )}
    </div>
  );
}
