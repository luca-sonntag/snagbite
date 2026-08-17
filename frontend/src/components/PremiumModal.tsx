import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Crown, Check, X, Loader2, AlertCircle,
  Video, MessageSquare, Flame, ListTodo, Coffee
} from 'lucide-react';
import { useI18n } from '../context/I18nContext';
import { buyPremium, getSubscriptionOfferings } from '../utils/purchase';
import { useAuth } from '../context/AuthContext';
import { apiUrl } from '../api';
import { LEGAL_URLS } from '../legal';
import { useAdOverlay } from '../context/OverlayStackContext';

interface PremiumModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export default function PremiumModal({ isOpen, onOpenChange }: PremiumModalProps) {
  const { t } = useI18n();
  const { isPremium, user, getAccessToken, refreshSession } = useAuth();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  // Optimizations States
  const [packages, setPackages] = useState<any[]>([]);
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

      // Verify status with server if currently seen as free user
      const currentTier = user?.app_metadata?.tier;
      if (currentTier !== 'premium' && currentTier !== 'alpha') {
        const verifyServerTier = async () => {
          setIsValidating(true);
          try {
            const token = await getAccessToken();
            if (!token) return;
            const res = await fetch(apiUrl('/api/extractions/limit'), {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
              const data = await res.json();
              if (data.success && data.tier && data.tier !== currentTier) {
                console.log(`PremiumModal: Tier mismatch detected (local: ${currentTier}, server: ${data.tier}). Refreshing session...`);
                await refreshSession();
              }
            }
          } catch (err) {
            console.warn('PremiumModal: Failed to verify server tier:', err);
          } finally {
            setIsValidating(false);
          }
        };
        verifyServerTier();
      }

      // Load Packages from RevenueCat
      const loadOfferings = async () => {
        setIsLoadingPackages(true);
        try {
          const offs = await getSubscriptionOfferings();
          setPackages(offs);
          if (offs.length > 0) {
            // Auto-select the plan that offers a free trial, then Yearly, then first available
            const trialPkg = offs.find(p => p.product?.introPrice && p.product.introPrice.price === 0);
            const yearly = offs.find(p => p.packageType === 'ANNUAL');
            setSelectedPackageId(trialPkg?.identifier || yearly?.identifier || offs[0].identifier);
          }
        } catch (err) {
          console.error('PremiumModal: Failed to load subscription offerings:', err);
        } finally {
          setIsLoadingPackages(false);
        }
      };
      loadOfferings();
    } else {
      document.body.style.overflow = '';
      setIsValidating(false);
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen, user, getAccessToken, refreshSession]);

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
      title: t('premium.modal.features.remix.title'),
      desc: t('premium.modal.features.remix.desc'),
      icon: <MessageSquare className="w-5 h-5 text-emerald-600" />,
    },
    {
      title: t('premium.modal.features.nutrition.title'),
      desc: t('premium.modal.features.nutrition.desc'),
      icon: <Flame className="w-5 h-5 text-emerald-600" />,
    },
    {
      title: t('premium.modal.features.shoppingList.title'),
      desc: t('premium.modal.features.shoppingList.desc'),
      icon: <ListTodo className="w-5 h-5 text-emerald-600" />,
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

        {/* Tapable top spacer */}
        <div
          className="shrink-0"
          style={{ height: 'max(var(--safe-area-inset-top, 0px), 24px)' }}
          onClick={() => !loading && onOpenChange(false)}
        />

        {/* Main sheet */}
        <div className="relative flex-1 flex flex-col w-full max-w-md mx-auto bg-gray-50 rounded-t-[28px] overflow-hidden shadow-[0_-8px_40px_rgba(0,0,0,0.2)]">

          {/* â”€â”€â”€ Hero Section â”€â”€â”€ */}
          <div className="relative shrink-0 bg-white rounded-t-[28px] px-6 pt-7 pb-6 overflow-hidden">
            {/* Ambient glow â€” very subtle, feels premium */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-72 h-28 bg-emerald-400/12 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-40 h-20 bg-amber-300/10 rounded-full blur-2xl pointer-events-none" />

            {/* Close button */}
            {!loading && (
              <button
                onClick={() => onOpenChange(false)}
                className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 border-none text-gray-400 hover:text-gray-700 transition-all active:scale-95 cursor-pointer z-10"
                aria-label={t('premium.modal.close') || 'Schließen'}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}

            <div className="flex flex-col items-center text-center gap-2.5 relative">
              {/* Crown icon badge */}
              <div className="w-[52px] h-[52px] rounded-2xl bg-amber-50 flex items-center justify-center shadow-[0_4px_16px_rgba(251,191,36,0.20)]">
                <Crown className="w-7 h-7 text-amber-500 fill-amber-400" />
              </div>

              <div>
                <h2 className="text-[22px] font-black text-gray-900 tracking-tight leading-tight">
                  {t('premium.modal.title')}
                </h2>
                <p className="text-sm text-gray-500 leading-relaxed mt-1 max-w-[230px] mx-auto">
                  {t('premium.modal.subtitle')}
                </p>
              </div>

              {/* Price anchor pill — Coffee icon, no emoji */}
              <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-500/10 mt-0.5">
                <Coffee className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-[11px] font-bold text-emerald-700 tracking-wide">
                  {t('premium.modal.coffeeAnchor') || 'Weniger als ein Kaffee im Monat'}
                </span>
              </div>
            </div>
          </div>

          {/* Hero → body separator: thin shadow line instead of hard border */}
          <div className="h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent shrink-0 mx-4" />

          {/* ——— Scrollable body ——— */}
          <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] pb-2">

            {/* Feature list */}
            <div className="px-5 pt-4">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2.5">
                Alles in Premium
              </p>
              <div className="bg-white rounded-2xl shadow-[0_2px_6px_rgba(0,0,0,0.03)] overflow-hidden border-none">
                {featureItems.map((item, idx) => (
                  <div
                    key={idx}
                    className={`flex items-center gap-3.5 px-4 py-3.5 ${idx < featureItems.length - 1 ? 'border-b border-gray-100' : ''}`}
                  >
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
                      {item.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-900 leading-tight">{item.title}</p>
                      <p className="text-xs text-gray-500 leading-snug mt-0.5">{item.desc}</p>
                    </div>
                    {/* Solid check — more visible than the pale circle */}
                    <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
                      <Check className="w-3 h-3 text-white" strokeWidth={3} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Pricing section */}
            <div className="px-5 pt-5">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2.5">
                Dein Plan
              </p>

              {isLoadingPackages ? (
                <div className="flex items-center justify-center py-6 gap-2">
                  <Loader2 className="w-5 h-5 animate-spin text-emerald-500" />
                  <span className="text-sm text-gray-400">{t('premium.modal.verifying') || 'Lade Optionen...'}</span>
                </div>
              ) : packages.length > 0 ? (
                <div className={`grid ${packages.length === 1 ? 'grid-cols-1' : 'grid-cols-2'} gap-2.5`}>
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
                        className={`relative pt-5 pb-3.5 px-4 rounded-2xl flex flex-col gap-0.5 border-2 transition-all active:scale-[0.97] cursor-pointer text-left w-full ${
                          isSelected
                            ? 'bg-white border-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.08)]'
                            : 'bg-white border-transparent shadow-[0_2px_6px_rgba(0,0,0,0.04)] hover:border-gray-200'
                        }`}
                      >
                        {/* Bestseller chip */}
                        {isYearly && (
                          <span className="absolute -top-[11px] left-1/2 -translate-x-1/2 bg-emerald-500 text-white font-extrabold text-[9px] px-2.5 py-[3px] rounded-full uppercase tracking-wider whitespace-nowrap">
                            {t('premium.modal.bestseller') || 'Bestseller'}
                          </span>
                        )}

                        {/* Labels */}
                        <div className="flex items-center gap-1.5 flex-wrap mb-1">
                          <span className={`text-[11px] font-bold ${isSelected ? 'text-emerald-700' : 'text-gray-500'}`}>
                            {isYearly ? t('premium.modal.yearly') : t('premium.modal.monthly')}
                          </span>
                          {hasSavings && (
                            <span className="bg-emerald-500/10 text-emerald-600 font-black text-[9px] px-1.5 py-0.5 rounded-full">
                              -{savingsPercent}%
                            </span>
                          )}
                          {pkgTrialDays > 0 && (
                            <span className="bg-emerald-500/10 text-emerald-600 font-black text-[9px] px-1.5 py-0.5 rounded-full">
                              {t('premium.modal.trialBadge').replace('{days}', String(pkgTrialDays))}
                            </span>
                          )}
                        </div>

                        {/* Price */}
                        <div className="text-xl font-black text-gray-900 leading-none">
                          {monthlyPriceStr}
                        </div>

                        {/* Period */}
                        <div className="text-[10px] text-gray-400 mt-1 leading-tight">
                          {isYearly
                            ? t('premium.modal.priceYearlyPeriod').replace('{price}', pkg.product.priceString)
                            : t('premium.modal.pricePeriod').replace('{price}', pkg.product.priceString)
                          }
                        </div>

                        {/* Selected check */}
                        {isSelected && (
                          <div className="absolute top-3 right-3 w-[18px] h-[18px] rounded-full bg-emerald-500 flex items-center justify-center shadow-sm">
                            <Check className="w-2.5 h-2.5 text-white" strokeWidth={3.5} />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="flex items-center gap-2.5 p-3.5 bg-white rounded-2xl shadow-[0_2px_6px_rgba(0,0,0,0.03)]">
                  <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                  <span className="text-sm text-gray-500">Keine Angebote verfÃ¼gbar.</span>
                </div>
              )}
            </div>

            {/* Bottom breathing room */}
            <div className="h-5" />
          </div>

          {/* â”€â”€â”€ Sticky CTA block â”€â”€â”€ */}
          <div
            className="shrink-0 bg-gray-50 border-t border-gray-100 px-5 pt-4"
            style={{ paddingBottom: 'max(var(--safe-area-inset-bottom, 0px), 20px)' }}
          >
            {/* Status messages */}
            {errorMsg && (
              <div className="mb-3 text-xs font-semibold text-red-600 bg-red-50 py-2.5 px-3 rounded-2xl text-center">
                {errorMsg}
              </div>
            )}
            {success && (
              <div className="mb-3 text-xs font-semibold text-emerald-700 bg-emerald-50 py-2.5 px-3 rounded-2xl text-center flex items-center justify-center gap-1.5">
                <Check className="w-4 h-4" /> {t('premium.modal.success')}
              </div>
            )}

            {/* Main CTA */}
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
            ) : isValidating || isLoadingPackages ? (
              <button disabled className="w-full h-[52px] rounded-2xl bg-gray-100 border-none text-gray-400 text-sm font-bold flex items-center justify-center gap-2 cursor-default">
                <Loader2 className="w-5 h-5 animate-spin text-emerald-500" />
                {t('premium.modal.verifying') || 'Verifiziere Status...'}
              </button>
            ) : (
              <button
                onClick={handleUpgrade}
                disabled={loading || !selectedPackageId}
                className="w-full h-[52px] rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-base font-extrabold flex items-center justify-center gap-2 border-none active:scale-[0.98] transition-all duration-150 disabled:opacity-60 cursor-pointer shadow-[0_4px_20px_rgba(16,185,129,0.28)]"
              >
                {loading ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> {t('premium.modal.loading')}</>
                ) : (
                  <>
                    <Crown className="w-[18px] h-[18px] fill-white/80" />
                    <span>{hasSelectedTrial ? t('premium.modal.ctaWithTrial') : t('premium.modal.ctaWithoutTrial')}</span>
                  </>
                )}
              </button>
            )}

            {/* Legal footnotes */}
            {!isPremium && !loading && !isValidating && !isLoadingPackages && (
              <div className="mt-2.5 text-center space-y-1">
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
