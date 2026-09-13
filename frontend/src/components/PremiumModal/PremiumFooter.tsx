import { Check, Loader2, RotateCw } from 'lucide-react';
import { useI18n } from '../../context/I18nContext';
import { LEGAL_URLS } from '../../legal';

interface PremiumFooterProps {
  loading: boolean;
  restoring: boolean;
  success: boolean;
  errorMsg: string | null;
  isPremium: boolean;
  isAlphaTier: boolean;
  isLoadingPackages: boolean;
  selectedPackageId: string | null;
  hasSelectedTrial: boolean;
  onUpgrade: () => void;
  onRestore: () => void;
}

export function PremiumFooter({
  loading,
  restoring,
  success,
  errorMsg,
  isPremium,
  isAlphaTier,
  isLoadingPackages,
  selectedPackageId,
  hasSelectedTrial,
  onUpgrade,
  onRestore,
}: PremiumFooterProps) {
  const { t } = useI18n();

  return (
    <div
      className="shrink-0 bg-gray-50 px-5 pt-3"
      style={{ paddingBottom: 'max(var(--safe-area-inset-bottom, 0px), 20px)' }}
    >
      {errorMsg && (
        <div className="mb-2.5 text-xs font-semibold text-red-600 bg-red-50 py-2 px-3 rounded-2xl text-center">
          {errorMsg}
        </div>
      )}

      {success && (
        <div className="mb-2.5 text-xs font-semibold text-emerald-700 bg-emerald-50 py-2 px-3 rounded-2xl text-center flex items-center justify-center gap-1.5">
          <Check className="w-4 h-4" /> {t('premium.modal.success') || 'Erfolgreich freigeschaltet!'}
        </div>
      )}

      {isAlphaTier ? (
        <button
          type="button"
          disabled
          className="w-full h-[52px] min-h-[44px] rounded-2xl bg-gray-100 border-none text-gray-500 text-sm font-bold flex items-center justify-center gap-2 cursor-default"
        >
          <Check className="w-5 h-5 text-emerald-500" />
          {t('premium.modal.alphaOwned') || 'Käufe während der Alpha deaktiviert'}
        </button>
      ) : isPremium ? (
        <button
          type="button"
          disabled
          className="w-full h-[52px] min-h-[44px] rounded-2xl bg-gray-100 border-none text-gray-500 text-sm font-bold flex items-center justify-center gap-2 cursor-default"
        >
          <Check className="w-5 h-5 text-emerald-500" />
          {t('premium.modal.owned') || 'Du hast Premium'}
        </button>
      ) : isLoadingPackages ? (
        <button
          type="button"
          disabled
          className="w-full h-[52px] min-h-[44px] rounded-2xl bg-gray-100 border-none text-gray-400 text-sm font-bold flex items-center justify-center gap-2 cursor-default"
        >
          <Loader2 className="w-5 h-5 animate-spin text-emerald-500" />
          {t('premium.modal.verifying') || 'Verifiziere Status...'}
        </button>
      ) : (
        <button
          type="button"
          onClick={onUpgrade}
          disabled={loading || restoring || !selectedPackageId}
          className="w-full h-[52px] min-h-[44px] rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-[15px] font-extrabold flex items-center justify-center gap-2 border-none active:scale-[0.98] transition-all duration-150 disabled:opacity-60 cursor-pointer shadow-[0_4px_20px_rgba(16,185,129,0.30)]"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>{t('premium.modal.loading') || 'Zahlung wird verarbeitet...'}</span>
            </>
          ) : (
            <span>
              {hasSelectedTrial
                ? t('premium.modal.ctaWithTrial') || 'Kostenlose Testphase starten'
                : t('premium.modal.ctaWithoutTrial') || 'Premium freischalten'}
            </span>
          )}
        </button>
      )}

      {/* Restore purchases ghost button */}
      {!isPremium && !isAlphaTier && (
        <button
          type="button"
          onClick={onRestore}
          disabled={loading || restoring}
          className="w-full min-h-[44px] py-2 px-3 mt-1.5 rounded-xl text-xs font-semibold text-gray-500 hover:text-gray-800 active:text-gray-900 border-none bg-transparent hover:bg-black/5 active:bg-black/10 transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
        >
          {restoring ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-500" />
              <span>{t('premium.modal.restoring') || 'Wiederherstellen...'}</span>
            </>
          ) : (
            <>
              <RotateCw className="w-3.5 h-3.5 text-gray-400" />
              <span>{t('premium.modal.restore') || 'Käufe wiederherstellen'}</span>
            </>
          )}
        </button>
      )}

      {!isPremium && (
        <div className="mt-2 text-center space-y-1">
          <p className="text-[11px] text-gray-400 font-semibold">
            {t('premium.modal.cancelSubtitle') || 'Kein Risiko. Jederzeit kündbar.'}
          </p>
          <p className="text-[10px] text-gray-400 leading-normal">
            {t('premium.modal.termsNoticePrefix') || 'Mit dem Kauf stimmst du den '}
            <a
              href={LEGAL_URLS.terms}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-emerald-600 transition-colors"
            >
              {t('premium.modal.termsLink') || 'AGB'}
            </a>
            {' '}{t('premium.modal.and') || 'und der'}{' '}
            <a
              href={LEGAL_URLS.privacy}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-emerald-600 transition-colors"
            >
              {t('premium.modal.privacyLink') || 'Datenschutzerklärung'}
            </a>
            {t('premium.modal.termsNoticeSuffix') || ' zu.'}
          </p>
        </div>
      )}
    </div>
  );
}
