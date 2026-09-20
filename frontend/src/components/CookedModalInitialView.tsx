import { AlertTriangle, Camera, Check, Image as ImageIcon, Loader2 } from 'lucide-react';
import { useI18n } from '../context/I18nContext';

interface CookedModalInitialViewProps {
  isVerifying: boolean;
  rejectionReason: string | null;
  onTakePhoto: () => void;
  onChooseGallery: () => void;
  onMarkWithoutPhoto: () => void;
}

export default function CookedModalInitialView({
  isVerifying,
  rejectionReason,
  onTakePhoto,
  onChooseGallery,
  onMarkWithoutPhoto,
}: CookedModalInitialViewProps) {
  const { t } = useI18n();

  return (
    <div className="space-y-4 py-2">
      <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
        {t('app.gamification.modalSubtitle')}
      </p>

      {rejectionReason && (
        <div className="rounded-2xl bg-rose-500/5 dark:bg-rose-500/10 p-3.5 flex items-start gap-3 text-rose-700 dark:text-rose-300">
          <AlertTriangle className="w-5 h-5 shrink-0 text-rose-500 dark:text-rose-400 mt-0.5" />
          <div className="space-y-1 text-xs">
            <p className="font-semibold text-rose-900 dark:text-rose-200">{t('app.gamification.cookError')}</p>
            <p className="leading-normal text-rose-700 dark:text-rose-300/90">{rejectionReason}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 pt-2">
        <button
          type="button"
          onClick={onTakePhoto}
          disabled={isVerifying}
          className="flex flex-col items-center justify-center gap-2 p-5 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/15 hover:bg-emerald-500/20 dark:hover:bg-emerald-500/25 text-emerald-600 dark:text-emerald-400 font-bold transition-all active:scale-[0.97] disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
        >
          <Camera className="w-7 h-7" />
          <span className="text-xs">{t('app.gamification.takePhoto')}</span>
        </button>

        <button
          type="button"
          onClick={onChooseGallery}
          disabled={isVerifying}
          className="flex flex-col items-center justify-center gap-2 p-5 rounded-2xl bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-700 dark:text-gray-200 font-bold transition-all active:scale-[0.97] disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
        >
          <ImageIcon className="w-7 h-7" />
          <span className="text-xs">{t('app.gamification.chooseGallery')}</span>
        </button>
      </div>

      <div className="pt-1 text-center">
        <button
          type="button"
          onClick={onMarkWithoutPhoto}
          disabled={isVerifying}
          className="w-full min-h-[44px] flex items-center justify-center gap-2 py-3 px-3.5 rounded-2xl text-xs font-semibold text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 active:scale-[0.98] transition-all duration-200 ease-out cursor-pointer border-none whitespace-nowrap disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isVerifying ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>{t('app.gamification.cooking')}</span>
            </>
          ) : (
            <>
              <Check className="w-4 h-4 text-gray-500 dark:text-gray-400 shrink-0" />
              <span>{t('app.gamification.markWithoutPhoto')}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
