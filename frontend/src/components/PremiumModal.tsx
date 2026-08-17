import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Crown, Check, X, Loader2, Sparkles, AlertCircle, Video, MessageSquare, Flame, ListTodo } from 'lucide-react';
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
      icon: <Video className="w-4 h-4 text-amber-400" />
    },
    {
      title: t('premium.modal.features.remix.title'),
      desc: t('premium.modal.features.remix.desc'),
      icon: <MessageSquare className="w-4 h-4 text-amber-400" />
    },
    {
      title: t('premium.modal.features.nutrition.title'),
      desc: t('premium.modal.features.nutrition.desc'),
      icon: <Flame className="w-4 h-4 text-amber-400" />
    },
    {
      title: t('premium.modal.features.shoppingList.title'),
      desc: t('premium.modal.features.shoppingList.desc'),
      icon: <ListTodo className="w-4 h-4 text-amber-400" />
    },
  ];

  const comparisonRows = [
    {
      feature: t('premium.modal.comparison.rowExtractions'),
      free: t('premium.modal.comparison.rowExtractionsFree'),
      premium: t('premium.modal.comparison.rowExtractionsPremium'),
    },
    {
      feature: t('premium.modal.comparison.rowCookbook'),
      free: t('premium.modal.comparison.rowCookbookFree'),
      premium: t('premium.modal.comparison.rowCookbookPremium'),
    },
    {
      feature: t('premium.modal.comparison.rowShoppingList'),
      free: t('premium.modal.comparison.rowShoppingListFree'),
      premium: t('premium.modal.comparison.rowShoppingListPremium'),
    },
    {
      feature: t('premium.modal.comparison.rowAiChat'),
      free: false,
      premium: true,
    },
    {
      feature: t('premium.modal.comparison.rowNutrition'),
      free: false,
      premium: true,
    },
    {
      feature: t('premium.modal.comparison.rowCollections'),
      free: false,
      premium: true,
    },
    {
      feature: t('premium.modal.comparison.rowCookingMode'),
      free: false,
      premium: true,
    },
  ];

  // Helper to render comparison cells cleanly using modern check/cross components
  const renderCellContent = (val: string | boolean, isPremiumCol: boolean) => {
    if (typeof val === 'boolean') {
      if (val) {
        return (
          <div className="flex items-center justify-center">
            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-amber-400/30 to-yellow-500/20 border border-amber-400/40 flex items-center justify-center shadow-sm shadow-amber-400/10 shrink-0">
              <Check className="w-2.5 h-2.5 text-amber-300" strokeWidth={4} />
            </div>
          </div>
        );
      } else {
        return (
          <div className="flex items-center justify-center">
            <div className="w-5 h-5 rounded-full bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
              <X className="w-2.5 h-2.5 text-white/30" strokeWidth={3} />
            </div>
          </div>
        );
      }
    }

    return (
      <span className={isPremiumCol ? 'text-amber-300 font-extrabold text-[11px]' : 'text-emerald-100/65 font-medium text-[11px]'}>
        {val}
      </span>
    );
  };

  // Helper to determine trial info
  const selectedPackage = packages.find(p => p.identifier === selectedPackageId);
  const hasSelectedTrial = !!(selectedPackage?.product?.introPrice && selectedPackage?.product?.introPrice?.price === 0);
  const trialDays = selectedPackage?.product?.introPrice?.periodNumberOfUnits || 3;

  // Render the Coffee Anchor Badge
  const renderCoffeeAnchor = () => {
    return (
      <div className="flex items-center justify-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/10 border-none text-amber-300 text-[10px] font-bold tracking-wide shrink-0">
        <Sparkles className="w-3.5 h-3.5 fill-amber-300 animate-pulse" />
        {t('premium.modal.coffeeAnchor') || 'Weniger als ein Kaffee im Monat ☕'}
      </div>
    );
  };

  const modal = (
    <div className="fixed inset-0 z-[200] flex flex-col overflow-hidden" role="dialog" aria-modal="true">

      {/* Warm charcoal base — matches app dark mode bg-gray-950 */}
      <div className="absolute inset-0" style={{ background: '#141412' }} />

      {/* Subtle ambient glow — crown warmth top, amber warmth bottom */}
      <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[480px] h-72 bg-amber-500/8 rounded-full filter blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[10%] right-[-20%] w-72 h-72 bg-emerald-500/6 rounded-full filter blur-[100px] pointer-events-none" />

      {/* Subtle vignette at bottom */}
      <div className="absolute bottom-0 inset-x-0 h-40 bg-gradient-to-t from-black/30 to-transparent pointer-events-none" />

      {/* Content Container */}
      <div
        className="relative flex flex-col h-full w-full max-w-md mx-auto px-5 select-none"
        style={{
          paddingTop: 'max(var(--safe-area-inset-top, 0px), 52px)',
          paddingBottom: 'max(var(--safe-area-inset-bottom, 0px), 28px)'
        }}
      >

        {/* Close Button */}
        {!loading && (
          <div className="flex justify-end pt-4 pb-1 shrink-0">
            <button
              onClick={() => onOpenChange(false)}
              className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-800 hover:bg-gray-700 border-none text-gray-400 hover:text-white transition-all active:scale-95 cursor-pointer"
              aria-label={t('premium.modal.close') || 'Schließen'}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        {loading && <div className="h-10 shrink-0" />}

        {/* Header */}
        <div className="flex flex-col items-center text-center gap-2 pb-2 shrink-0">
          <div className="flex items-center justify-center gap-2">
            <Crown className="w-6 h-6 text-amber-400 fill-amber-400 drop-shadow-[0_2px_8px_rgba(251,191,36,0.4)]" />
            <h2 className="text-3xl font-black bg-gradient-to-r from-white via-amber-200 to-white bg-clip-text text-transparent tracking-tight drop-shadow-sm">
              {t('premium.modal.title')}
            </h2>
          </div>
          <p className="text-sm text-gray-400 max-w-xs leading-relaxed font-medium">
            {t('premium.modal.subtitle')}
          </p>
          {renderCoffeeAnchor()}
        </div>

        {/* Scrollable middle container - Scrollbar completely hidden. Displays both Cards and Table sequentially. */}
        <div className="flex-1 overflow-y-auto pr-1 -mr-1 flex flex-col gap-4 py-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">

          {/* 2x2 Outcome Benefit Tiles */}
          <div className="grid grid-cols-2 gap-3 shrink-0">
            {featureItems.map((item, idx) => (
              <div
                key={idx}
                className="bg-gray-900 border-none rounded-2xl p-3 flex flex-col gap-2 relative overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.15)] hover:bg-gray-800 transition-all active:scale-[0.98]"
              >
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 border-none flex items-center justify-center shrink-0">
                  {item.icon}
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs font-bold text-white leading-tight">
                    {item.title}
                  </span>
                  <span className="text-[10px] text-gray-500 leading-normal">
                    {item.desc}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Divider between Cards and Table */}
          <div className="flex items-center gap-3 py-1 shrink-0">
            <div className="flex-1 h-[1px] bg-gray-800" />
            <span className="text-[9px] font-bold text-gray-600 uppercase tracking-widest">
              {t('premium.modal.comparison.tableTitle') || 'Free vs. Premium im Vergleich'}
            </span>
            <div className="flex-1 h-[1px] bg-gray-800" />
          </div>

          {/* Comparison Table */}
          <div className="flex flex-col rounded-3xl overflow-hidden bg-gray-900 border-none shadow-[0_2px_8px_rgba(0,0,0,0.15)] shrink-0">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-gray-800 text-[9px] uppercase tracking-wider text-gray-500">
                  <th className="px-4 py-3 font-bold">{t('premium.modal.comparison.headerFeature')}</th>
                  <th className="px-3 py-3 font-bold text-center">{t('premium.modal.comparison.headerFree')}</th>
                  <th className="px-3 py-3 font-bold text-center text-amber-400">{t('premium.modal.comparison.headerPremium')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {comparisonRows.map((row, index) => (
                  <tr
                    key={index}
                    className={`transition-colors ${index % 2 === 0 ? 'bg-gray-900' : 'bg-gray-800/40'}`}
                  >
                    <td className="px-4 py-3.5 font-bold text-gray-200 text-[11px] leading-tight">{row.feature}</td>
                    <td className="px-3 py-3.5 text-center leading-none">
                      {renderCellContent(row.free, false)}
                    </td>
                    <td className="px-3 py-3.5 text-center leading-none">
                      {renderCellContent(row.premium, true)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </div>

        {/* Status messages */}
        {errorMsg && (
          <div className="mt-3 text-xs font-semibold text-white bg-red-500/30 py-2 px-3 rounded-xl border-none text-center shrink-0">
            {errorMsg}
          </div>
        )}
        {success && (
          <div className="mt-3 text-xs font-semibold text-white bg-emerald-400/20 py-2 px-3 rounded-xl border-none text-center flex items-center justify-center gap-1.5 shrink-0">
            <Check className="w-4 h-4" /> {t('premium.modal.success')}
          </div>
        )}

        {/* Sticky Pricing & CTA Block */}
        <div className="shrink-0 mt-3 pt-3 border-t border-gray-800 flex flex-col gap-3.5">

          {/* Pricing Options Cards */}
          {isLoadingPackages ? (
            <div className="flex flex-col items-center justify-center py-4 gap-2 shrink-0">
              <Loader2 className="w-5 h-5 animate-spin text-amber-300" />
              <span className="text-[10px] text-emerald-100/60">{t('premium.modal.verifying') || 'Lade Optionen...'}</span>
            </div>
          ) : packages.length > 0 ? (
            <div className={`grid ${packages.length === 1 ? 'grid-cols-1 w-52 mx-auto' : 'grid-cols-2'} gap-3 shrink-0`}>
              {packages.map((pkg) => {
                const isSelected = selectedPackageId === pkg.identifier;
                const isYearly = pkg.packageType === 'ANNUAL';

                // Format monthly equivalent for yearly (standard yearly price / 12)
                let monthlyPriceStr = pkg.product.priceString;
                if (isYearly) {
                  const monthlyEquiv = pkg.product.pricePerMonthString ||
                    (pkg.product.price ? `${(pkg.product.price / 12).toFixed(2).replace('.', ',')} €` : '');
                  monthlyPriceStr = t('premium.modal.priceMonthlyEquivalent').replace('{price}', monthlyEquiv);
                }

                // Free-trial length for this package (intro offer with price 0), if any
                const pkgTrialDays = (pkg.product?.introPrice && pkg.product.introPrice.price === 0)
                  ? (pkg.product.introPrice.periodNumberOfUnits || trialDays)
                  : 0;

                // If monthly package exists, we can show savings percentage on yearly
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
                  <div
                    key={pkg.identifier}
                    onClick={() => setSelectedPackageId(pkg.identifier)}
                    className={`relative p-3.5 rounded-2xl flex flex-col gap-0.5 border-none transition-all active:scale-[0.98] cursor-pointer ${isSelected
                        ? 'bg-amber-500/10 ring-2 ring-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.12)]'
                        : 'bg-gray-900 hover:bg-gray-800 shadow-[0_2px_8px_rgba(0,0,0,0.15)]'
                      }`}
                  >
                    {/* Bestseller Badge */}
                    {isYearly && (
                      <span className="absolute top-2 right-2 bg-amber-400 text-gray-950 font-extrabold text-[8px] px-1.5 py-0.5 rounded-md uppercase tracking-wider">
                        {t('premium.modal.bestseller') || 'Bestseller'}
                      </span>
                    )}

                    <div className="flex items-center gap-1.5 pt-1">
                      <span className="text-[10px] font-bold text-gray-300">
                        {isYearly ? t('premium.modal.yearly') : t('premium.modal.monthly')}
                      </span>
                      {hasSavings && (
                        <span className="bg-emerald-500/10 text-emerald-400 font-extrabold text-[7.5px] px-1 py-0.5 rounded border-none">
                          {t('premium.modal.savePercent').replace('{percent}', String(savingsPercent)) || `-${savingsPercent}%`}
                        </span>
                      )}
                      {pkgTrialDays > 0 && (
                        <span className="bg-amber-500/10 text-amber-400 font-extrabold text-[7.5px] px-1 py-0.5 rounded border-none">
                          {t('premium.modal.trialBadge').replace('{days}', String(pkgTrialDays))}
                        </span>
                      )}
                    </div>

                    <div className="text-base font-extrabold text-white leading-tight">
                      {monthlyPriceStr}
                    </div>

                    <div className="text-[9px] text-gray-500 mt-auto">
                      {isYearly
                        ? t('premium.modal.priceYearlyPeriod').replace('{price}', pkg.product.priceString)
                        : t('premium.modal.pricePeriod').replace('{price}', pkg.product.priceString)
                      }
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex items-center gap-2 p-3 bg-amber-500/10 border-none rounded-2xl shrink-0">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="text-[10px] text-gray-400 leading-relaxed">
                Keine Angebote verfügbar.
              </span>
            </div>
          )}

          {/* CTA Button Block */}
          <div>
            {user?.app_metadata?.tier === 'alpha' ? (
              <button className="w-full h-14 rounded-2xl bg-gray-800 border-none text-gray-300 text-sm font-bold flex items-center justify-center gap-2 cursor-default">
                <Check className="w-5 h-5 text-amber-400" /> {t('premium.modal.alphaOwned') || 'Käufe während der Alpha deaktiviert'}
              </button>
            ) : isPremium ? (
              <button className="w-full h-14 rounded-2xl bg-gray-800 border-none text-gray-300 text-sm font-bold flex items-center justify-center gap-2 cursor-default">
                <Check className="w-5 h-5 text-amber-400" /> {t('premium.modal.owned') || 'Du hast Premium'}
              </button>
            ) : isValidating || isLoadingPackages ? (
              <button disabled className="w-full h-14 rounded-2xl bg-gray-800 border-none text-gray-400 text-sm font-bold flex items-center justify-center gap-2 cursor-default">
                <Loader2 className="w-5 h-5 animate-spin text-amber-400" /> {t('premium.modal.verifying') || 'Verifiziere Status...'}
              </button>
            ) : (
              <button
                onClick={handleUpgrade}
                disabled={loading || !selectedPackageId}
                className="w-full h-14 rounded-2xl bg-amber-400 hover:bg-amber-300 text-emerald-950 text-base font-extrabold flex items-center justify-center gap-2 border-none active:scale-[0.98] transition-all duration-150 disabled:opacity-60 cursor-pointer"
              >
                {loading ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> {t('premium.modal.loading')}</>
                ) : (
                  <>
                    <Crown className="w-5 h-5" />
                    <span>
                      {hasSelectedTrial ? t('premium.modal.ctaWithTrial') : t('premium.modal.ctaWithoutTrial')}
                    </span>
                  </>
                )}
              </button>
            )}
            {!isPremium && !loading && !isValidating && !isLoadingPackages && (
              <>
                <p className="text-center text-[11px] text-gray-500 mt-2 font-semibold">
                  {t('premium.modal.cancelSubtitle') || 'Kein Risiko. Jederzeit kündbar.'}
                </p>
                {/* Reference to the AGB (terms) shown before the in-app purchase. */}
                <p className="text-center text-[10px] text-gray-600 mt-1">
                  {t('premium.modal.termsNoticePrefix') || 'Mit dem Kauf stimmst du den '}
                  <a
                    href={LEGAL_URLS.terms}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline underline-offset-2 hover:text-amber-400 transition-colors"
                  >
                    {t('premium.modal.termsLink') || 'AGB'}
                  </a>
                  {t('premium.modal.termsNoticeSuffix') || ' zu.'}
                </p>
              </>
            )}
          </div>

        </div>

      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
