import { Check, Loader2, AlertCircle } from 'lucide-react';
import { useI18n } from '../../context/I18nContext';
import { hapticLight } from '../../utils/haptics';
import type { SubscriptionPackage } from './types';

interface PremiumPlansProps {
  packages: SubscriptionPackage[];
  selectedPackageId: string | null;
  onSelectPackage: (id: string) => void;
  isLoading: boolean;
  trialDays: number;
}

export function PremiumPlans({
  packages,
  selectedPackageId,
  onSelectPackage,
  isLoading,
  trialDays,
}: PremiumPlansProps) {
  const { t } = useI18n();

  if (isLoading) {
    return (
      <div className="shrink-0 px-5 pt-3 pb-2 bg-gray-50 border-t border-gray-100">
        <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.15em] mb-2.5">
          {t('premium.modal.comparison.tableTitle') ? 'Dein Plan' : 'Dein Plan'}
        </p>
        <div className="flex items-center justify-center py-5 gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
          <span className="text-xs text-gray-400">{t('premium.modal.verifying') || 'Lade Optionen...'}</span>
        </div>
      </div>
    );
  }

  if (packages.length === 0) {
    return (
      <div className="shrink-0 px-5 pt-3 pb-2 bg-gray-50 border-t border-gray-100">
        <div className="flex items-center gap-2 p-3 bg-white rounded-2xl">
          <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
          <span className="text-xs text-gray-500">Keine Angebote verfügbar.</span>
        </div>
      </div>
    );
  }

  const monthlyPkg = packages.find((p) => p.packageType === 'MONTHLY');

  return (
    <div className="shrink-0 px-5 pt-3 pb-2 bg-gray-50 border-t border-gray-100">
      <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.15em] mb-2.5">
        {t('premium.modal.comparison.tableTitle') ? 'Dein Plan' : 'Dein Plan'}
      </p>

      <div className={`grid ${packages.length === 1 ? 'grid-cols-1' : 'grid-cols-2'} gap-2`}>
        {packages.map((pkg) => {
          const isSelected = selectedPackageId === pkg.identifier;
          const isYearly = pkg.packageType === 'ANNUAL';

          let monthlyPriceStr = pkg.product.priceString;
          if (isYearly) {
            const monthlyEquiv =
              pkg.product.pricePerMonthString ||
              (pkg.product.price ? `${(pkg.product.price / 12).toFixed(2).replace('.', ',')} €` : '');
            monthlyPriceStr = t('premium.modal.priceMonthlyEquivalent').replace('{price}', monthlyEquiv);
          }

          const pkgTrialDays =
            pkg.product?.introPrice && pkg.product.introPrice.price === 0
              ? pkg.product.introPrice.periodNumberOfUnits || trialDays
              : 0;

          let savingsPercent = 37;
          if (isYearly && monthlyPkg?.product?.price && pkg.product.price) {
            const monthlyCost = monthlyPkg.product.price * 12;
            const yearlyCost = pkg.product.price;
            if (monthlyCost > yearlyCost) {
              savingsPercent = Math.round(((monthlyCost - yearlyCost) / monthlyCost) * 100);
            }
          }

          return (
            <button
              key={pkg.identifier}
              type="button"
              onClick={() => {
                hapticLight();
                onSelectPackage(pkg.identifier);
              }}
              className={`relative pt-4 pb-3 px-3.5 rounded-2xl flex flex-col gap-0.5 border-2 transition-all active:scale-[0.97] cursor-pointer text-left w-full min-h-[44px] ${
                isSelected
                  ? 'bg-white border-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,0.10)]'
                  : 'bg-white border-transparent shadow-[0_1px_4px_rgba(0,0,0,0.06)] hover:border-gray-200'
              }`}
            >
              {isYearly && (
                <span className="absolute -top-[10px] left-1/2 -translate-x-1/2 bg-emerald-500 text-white font-extrabold text-[8px] px-2.5 py-[3px] rounded-full uppercase tracking-wider whitespace-nowrap">
                  {t('premium.modal.bestseller') || 'Bestseller'}
                </span>
              )}

              <div className="flex items-center gap-1 flex-wrap mb-0.5 pr-6">
                <span className={`text-[10px] font-bold ${isSelected ? 'text-emerald-700' : 'text-gray-500'}`}>
                  {isYearly ? t('premium.modal.yearly') || 'Jährlich' : t('premium.modal.monthly') || 'Monatlich'}
                </span>

                {!isYearly && (
                  <span className="bg-gray-100 text-gray-500 font-black text-[8px] px-1.5 py-0.5 rounded-full">
                    Flexibel
                  </span>
                )}

                {isYearly && (
                  <span className="bg-emerald-500/10 text-emerald-600 font-black text-[8px] px-1.5 py-0.5 rounded-full">
                    -{savingsPercent}%
                  </span>
                )}

                {pkgTrialDays > 0 && (
                  <span className="bg-emerald-500/10 text-emerald-600 font-black text-[8px] px-1.5 py-0.5 rounded-full">
                    {t('premium.modal.trialBadge').replace('{days}', String(pkgTrialDays))}
                  </span>
                )}
              </div>

              <div className="text-lg font-black text-gray-900 leading-none">
                {monthlyPriceStr}
              </div>

              <div className="text-[9px] text-gray-400 mt-0.5 leading-tight">
                {isYearly
                  ? t('premium.modal.priceYearlyPeriod').replace('{price}', pkg.product.priceString)
                  : t('premium.modal.pricePeriod').replace('{price}', pkg.product.priceString)}
              </div>

              {isSelected && (
                <div className="absolute bottom-2.5 right-2.5 w-[18px] h-[18px] rounded-full bg-emerald-500 flex items-center justify-center shadow-sm">
                  <Check className="w-2.5 h-2.5 text-white" strokeWidth={3.5} />
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
