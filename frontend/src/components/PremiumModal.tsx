import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Check, X, Loader2, AlertCircle,
  Video, MessageSquare, Flame, ListTodo, Coffee, Layers, ChefHat, EyeOff
} from 'lucide-react';
import { useI18n } from '../context/I18nContext';
import { buyPremium, getSubscriptionOfferings, getCachedOfferings } from '../utils/purchase';
import { useAuth } from '../context/AuthContext';
import { LEGAL_URLS } from '../legal';
import { useAdOverlay } from '../context/OverlayStackContext';

interface PremiumModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export default function PremiumModal({ isOpen, onOpenChange }: PremiumModalProps) {
  const { t } = useI18n();
  const { isPremium, user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Optimizations States — warm-start from the prefetched cache so the paywall
  // opens instantly instead of showing a spinner while offerings load.
  const cachedPackages = getCachedOfferings();
  const [packages, setPackages] = useState<any[]>(cachedPackages ?? []);
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);
  const [isLoadingPackages, setIsLoadingPackages] = useState(false);

  // Register with overlay stack for ad hide/resume
  useAdOverlay(isOpen);

  useEffect(() => {
    if (isOpen) {
      setSuccess(false);
      setErrorMsg(null);
      setLoading(false);
      document.body.style.overflow = 'hidden';

      // Note: server-tier reconciliation now runs in the background on session
      // load (see AuthContext), so the modal no longer needs to verify on open.

      // Auto-select the best default plan from a package list:
      // free-trial plan first, then Yearly, then the first available.
      const autoSelect = (offs: any[]) => {
        if (offs.length === 0) return;
        const trialPkg = offs.find(p => p.product?.introPrice && p.product.introPrice.price === 0);
        const yearly = offs.find(p => p.packageType === 'ANNUAL');
        setSelectedPackageId(prev => prev ?? (trialPkg?.identifier || yearly?.identifier || offs[0].identifier));
      };

      // If offerings were prefetched, select immediately — no spinner.
      if (cachedPackages && cachedPackages.length > 0) {
        autoSelect(cachedPackages);
      }

      // Load Packages from RevenueCat (served from cache when warm).
      const loadOfferings = async () => {
        // Only show the loading state when we have nothing to display yet.
        if (!cachedPackages || cachedPackages.length === 0) setIsLoadingPackages(true);
        try {
          const offs = await getSubscriptionOfferings();
          setPackages(offs);
          autoSelect(offs);
        } catch (err) {
          console.error('PremiumModal: Failed to load subscription offerings:', err);
        } finally {
          setIsLoadingPackages(false);
        }
      };
      loadOfferings();
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !loading) onOpenChange(false);
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [isOpen, loading, onOpenChange]);

  if (!isOpen) return null;

  const handleUpgrade = async () => {
    if (!selectedPackageId) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const purchased = await buyPremium(selectedPackageId);
      if (purchased) {
        setSuccess(true);
        setTimeout(() => onOpenChange(false), 1500);
      } else {
        setLoading(false);
      }
    } catch (err: any) {
      setErrorMsg(err.message || t('premium.modal.error'));
      setLoading(false);
    }
  };

  const featureItems = [
    {
      title: t('premium.modal.features.extractions.title'),
      desc: t('premium.modal.features.extractions.desc'),
      icon: <Video className="w-5 h-5 text-emerald-600" />,
    },
    {
      title: t('premium.modal.features.nutrition.title'),
      desc: t('premium.modal.features.nutrition.desc'),
      icon: <Flame className="w-5 h-5 text-emerald-600" />,
    },
    {
      title: t('premium.modal.features.remix.title'),
      desc: t('premium.modal.features.remix.desc'),
      icon: <MessageSquare className="w-5 h-5 text-emerald-600" />,
    },
    {
      title: t('premium.modal.features.shoppingList.title'),
      desc: t('premium.modal.features.shoppingList.desc'),
      icon: <ListTodo className="w-5 h-5 text-emerald-600" />,
    },
    {
      title: t('premium.modal.features.collections.title'),
      desc: t('premium.modal.features.collections.desc'),
      icon: <Layers className="w-5 h-5 text-emerald-600" />,
    },
    {
      title: t('premium.modal.features.cookingMode.title'),
      desc: t('premium.modal.features.cookingMode.desc'),
      icon: <ChefHat className="w-5 h-5 text-emerald-600" />,
    },
    {
      title: t('premium.modal.features.noAds.title'),
      desc: t('premium.modal.features.noAds.desc'),
      icon: <EyeOff className="w-5 h-5 text-emerald-600" />,
    },
  ];

  // Helper to determine trial info
  const selectedPackage = packages.find(p => p.identifier === selectedPackageId);
  const hasSelectedTrial = !!(selectedPackage?.product?.introPrice && selectedPackage?.product?.introPrice?.price === 0);
  const trialDays = selectedPackage?.product?.introPrice?.periodNumberOfUnits || 3;

  const modal = (
    <div className="fixed inset-0 z-[200] flex flex-col overflow-hidden" role="dialog" aria-modal="true">

      {/* Blurred backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      {/* Sheet container */}
      <div className="absolute inset-0 flex flex-col">

        {/* Tapable top spacer to dismiss */}
        <div
          className="shrink-0"
          style={{ height: 'max(var(--safe-area-inset-top, 0px), 32px)' }}
          onClick={() => !loading && onOpenChange(false)}
        />

        {/* Main sheet — ONE gradient for the whole sheet, hero + features share it seamlessly */}
        <div
          className="relative flex-1 flex flex-col w-full max-w-md mx-auto rounded-t-[28px] overflow-hidden shadow-[0_-8px_40px_rgba(0,0,0,0.18)]"
          style={{ background: 'linear-gradient(180deg, #ddf6e8 0%, #e8f9f0 150px, #f0faf5 300px, #f5fbf8 450px, #f9fafb 620px, #f9fafb 100%)' }}
        >

          {/* Soft indirect glow radiating from the top-left corner — lives on the
              sheet (not the hero) so it bleeds gently down into the feature area */}
          <div className="absolute -top-16 -left-16 w-80 h-80 bg-emerald-400/15 rounded-[50%] blur-[80px] pointer-events-none z-0" />

          {/* ─── Hero: transparent — sheet gradient + glow show through ─── */}
          <div className="relative z-10 shrink-0">
            <div className="relative px-6 pt-6 pb-5">
              {/* Close */}
              {!loading && (
                <button
                  onClick={() => onOpenChange(false)}
                  className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-black/6 hover:bg-black/10 border-none text-gray-500 hover:text-gray-800 transition-all active:scale-95 cursor-pointer z-10"
                  aria-label={t('premium.modal.close') || 'SchlieÃŸen'}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}

              <div className="flex flex-col items-center text-center gap-2 relative">
                {/* PREMIUM label â€” elegant, no icon */}
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600/70 mt-1">
                  Premium
                </span>

                {/* Gradient title â€” the hero IS the title */}
                <h2
                  className="text-[28px] font-black tracking-tight leading-[1.1]"
                  style={{
                    background: 'linear-gradient(135deg, #0f172a 0%, #064e3b 60%, #059669 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  {t('premium.modal.title')}
                </h2>

                <p className="text-[13px] text-gray-500 leading-relaxed max-w-[210px] mx-auto">
                  {t('premium.modal.subtitle')}
                </p>

                {/* Coffee anchor */}
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 mt-0.5">
                  <Coffee className="w-3 h-3 text-emerald-600" />
                  <span className="text-[10px] font-bold text-emerald-700 tracking-wide">
                    {t('premium.modal.coffeeAnchor') || 'Weniger als ein Kaffee im Monat'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ─── Scrollable feature list ─── transparent, inherits sheet gradient */}
          <div className="relative z-10 flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <div className="px-5 pt-4 pb-3">
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.15em] mb-2.5">
                Alles in Premium
              </p>
              <div className="bg-white/35 backdrop-blur-md rounded-2xl shadow-[0_1px_4px_rgba(0,0,0,0.05)] overflow-hidden">
                {featureItems.map((item, idx) => (
                  <div
                    key={idx}
                    className={`flex items-center gap-3 px-4 py-3 ${idx < featureItems.length - 1 ? 'border-b border-gray-100' : ''}`}
                  >
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
                      {item.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-bold text-gray-900 leading-tight">{item.title}</p>
                      <p className="text-[11px] text-gray-500 leading-snug mt-0.5">{item.desc}</p>
                    </div>
                    <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
                      <Check className="w-3 h-3 text-white" strokeWidth={3} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* â”€â”€â”€ Plans â€” always visible, never scrolls â”€â”€â”€ */}
          <div className="shrink-0 px-5 pt-3 pb-2 bg-gray-50 border-t border-gray-100">
            <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.15em] mb-2.5">
              {t('premium.modal.comparison.tableTitle') ? 'Dein Plan' : 'Dein Plan'}
            </p>

            {isLoadingPackages ? (
              <div className="flex items-center justify-center py-3 gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
                <span className="text-xs text-gray-400">{t('premium.modal.verifying') || 'Lade Optionen...'}</span>
              </div>
            ) : packages.length > 0 ? (
              <div className={`grid ${packages.length === 1 ? 'grid-cols-1' : 'grid-cols-2'} gap-2`}>
                {packages.map((pkg) => {
                  const isSelected = selectedPackageId === pkg.identifier;
                  const isYearly = pkg.packageType === 'ANNUAL';

                  let monthlyPriceStr = pkg.product.priceString;
                  if (isYearly) {
                    const monthlyEquiv = pkg.product.pricePerMonthString ||
                      (pkg.product.price ? `${(pkg.product.price / 12).toFixed(2).replace('.', ',')} â‚¬` : '');
                    monthlyPriceStr = t('premium.modal.priceMonthlyEquivalent').replace('{price}', monthlyEquiv);
                  }

                  const pkgTrialDays = (pkg.product?.introPrice && pkg.product.introPrice.price === 0)
                    ? (pkg.product.introPrice.periodNumberOfUnits || trialDays)
                    : 0;

                  const hasSavings = isYearly && packages.some(p => p.packageType === 'MONTHLY');
                  let savingsPercent = 37;
                  if (hasSavings) {
                    const monthlyPkg = packages.find(p => p.packageType === 'MONTHLY');
                    if (monthlyPkg?.product?.price && pkg.product.price) {
                      const monthlyCost = monthlyPkg.product.price * 12;
                      const yearlyCost = pkg.product.price;
                      if (monthlyCost > yearlyCost) {
                        savingsPercent = Math.round(((monthlyCost - yearlyCost) / monthlyCost) * 100);
                      }
                    }
                  }

                  return (
                    <button
                      key={pkg.identifier}
                      type="button"
                      onClick={() => setSelectedPackageId(pkg.identifier)}
                      className={`relative pt-4 pb-3 px-3.5 rounded-2xl flex flex-col gap-0.5 border-2 transition-all active:scale-[0.97] cursor-pointer text-left w-full ${
                        isSelected
                          ? 'bg-white border-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,0.10)]'
                          : 'bg-white border-transparent shadow-[0_1px_4px_rgba(0,0,0,0.06)] hover:border-gray-200'
                      }`}
                    >
                      {/* Bestseller chip */}
                      {isYearly && (
                        <span className="absolute -top-[10px] left-1/2 -translate-x-1/2 bg-emerald-500 text-white font-extrabold text-[8px] px-2.5 py-[3px] rounded-full uppercase tracking-wider whitespace-nowrap">
                          {t('premium.modal.bestseller') || 'Bestseller'}
                        </span>
                      )}

                      {/* Labels row — pr-6 leaves room for the selection check */}
                      <div className="flex items-center gap-1 flex-wrap mb-0.5 pr-6">
                        <span className={`text-[10px] font-bold ${isSelected ? 'text-emerald-700' : 'text-gray-500'}`}>
                          {isYearly ? t('premium.modal.yearly') : t('premium.modal.monthly')}
                        </span>
                        {/* Flexibel badge for monthly — makes card feel less empty */}
                        {!isYearly && (
                          <span className="bg-gray-100 text-gray-500 font-black text-[8px] px-1.5 py-0.5 rounded-full">
                            Flexibel
                          </span>
                        )}
                        {hasSavings && (
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

                      {/* Price */}
                      <div className="text-lg font-black text-gray-900 leading-none">
                        {monthlyPriceStr}
                      </div>

                      {/* Period */}
                      <div className="text-[9px] text-gray-400 mt-0.5 leading-tight">
                        {isYearly
                          ? t('premium.modal.priceYearlyPeriod').replace('{price}', pkg.product.priceString)
                          : t('premium.modal.pricePeriod').replace('{price}', pkg.product.priceString)
                        }
                      </div>

                      {/* Selection check — bottom-right to avoid overlapping labels */}
                      {isSelected && (
                        <div className="absolute bottom-2.5 right-2.5 w-[18px] h-[18px] rounded-full bg-emerald-500 flex items-center justify-center shadow-sm">
                          <Check className="w-2.5 h-2.5 text-white" strokeWidth={3.5} />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="flex items-center gap-2 p-3 bg-white rounded-2xl">
                <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                <span className="text-xs text-gray-500">Keine Angebote verfÃ¼gbar.</span>
              </div>
            )}
          </div>

          {/* â”€â”€â”€ Sticky CTA block â”€â”€â”€ */}
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
                <Check className="w-4 h-4" /> {t('premium.modal.success')}
              </div>
            )}

            {user?.app_metadata?.tier === 'alpha' ? (
              <button className="w-full h-[52px] rounded-2xl bg-gray-100 border-none text-gray-500 text-sm font-bold flex items-center justify-center gap-2 cursor-default">
                <Check className="w-5 h-5 text-emerald-500" />
                {t('premium.modal.alphaOwned') || 'KÃ¤ufe wÃ¤hrend der Alpha deaktiviert'}
              </button>
            ) : isPremium ? (
              <button className="w-full h-[52px] rounded-2xl bg-gray-100 border-none text-gray-500 text-sm font-bold flex items-center justify-center gap-2 cursor-default">
                <Check className="w-5 h-5 text-emerald-500" />
                {t('premium.modal.owned') || 'Du hast Premium'}
              </button>
            ) : isLoadingPackages ? (
              <button disabled className="w-full h-[52px] rounded-2xl bg-gray-100 border-none text-gray-400 text-sm font-bold flex items-center justify-center gap-2 cursor-default">
                <Loader2 className="w-5 h-5 animate-spin text-emerald-500" />
                {t('premium.modal.verifying') || 'Verifiziere Status...'}
              </button>
            ) : (
              <button
                onClick={handleUpgrade}
                disabled={loading || !selectedPackageId}
                className="w-full h-[52px] rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-[15px] font-extrabold flex items-center justify-center gap-2 border-none active:scale-[0.98] transition-all duration-150 disabled:opacity-60 cursor-pointer shadow-[0_4px_20px_rgba(16,185,129,0.30)]"
              >
                {loading ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> {t('premium.modal.loading')}</>
                ) : (
                  <span>{hasSelectedTrial ? t('premium.modal.ctaWithTrial') : t('premium.modal.ctaWithoutTrial')}</span>
                )}
              </button>
            )}

            {!isPremium && !loading && !isLoadingPackages && (
              <div className="mt-2 text-center space-y-0.5">
                <p className="text-[11px] text-gray-400 font-semibold">
                  {t('premium.modal.cancelSubtitle') || 'Kein Risiko. Jederzeit kÃ¼ndbar.'}
                </p>
                <p className="text-[10px] text-gray-400">
                  {t('premium.modal.termsNoticePrefix') || 'Mit dem Kauf stimmst du den '}
                  <a
                    href={LEGAL_URLS.terms}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline underline-offset-2 hover:text-emerald-600 transition-colors"
                  >
                    {t('premium.modal.termsLink') || 'AGB'}
                  </a>
                  {t('premium.modal.termsNoticeSuffix') || ' zu.'}
                </p>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
