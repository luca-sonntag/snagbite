import { createPortal } from 'react-dom';
import { useModalOverlay } from '../../context/OverlayStackContext';
import { usePremiumModal } from './usePremiumModal';
import { PremiumHero } from './PremiumHero';
import { PremiumFeatures } from './PremiumFeatures';
import { PremiumPlans } from './PremiumPlans';
import { PremiumFooter } from './PremiumFooter';
import type { PremiumModalProps } from './types';

export default function PremiumModal({ isOpen, onOpenChange }: PremiumModalProps) {
  useModalOverlay(isOpen, () => onOpenChange(false));

  const {
    loading,
    restoring,
    success,
    errorMsg,
    packages,
    selectedPackageId,
    setSelectedPackageId,
    isLoadingPackages,
    hasSelectedTrial,
    trialDays,
    isPremium,
    user,
    handleUpgrade,
    handleRestore,
  } = usePremiumModal(isOpen, onOpenChange);

  if (!isOpen) return null;

  const isAlphaTier = user?.app_metadata?.tier === 'alpha';
  const isBusy = loading || restoring;

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
          onClick={() => !isBusy && onOpenChange(false)}
        />

        {/* Main sheet container */}
        <div
          className="relative flex-1 flex flex-col w-full max-w-md mx-auto rounded-t-[28px] overflow-hidden shadow-[0_-8px_40px_rgba(0,0,0,0.18)]"
          style={{
            background:
              'linear-gradient(180deg, #fdeecf 0%, #fdf4e2 150px, #fbf7ee 300px, #f9f8f4 450px, #f9fafb 620px, #f9fafb 100%)',
          }}
        >
          {/* Ambient glow radiating from top-left */}
          <div className="absolute -top-16 -left-16 w-80 h-80 bg-amber-400/15 rounded-[50%] blur-[80px] pointer-events-none z-0" />

          {/* Hero Header */}
          <PremiumHero onClose={() => onOpenChange(false)} disabled={isBusy} />

          {/* Core Premium Features */}
          <PremiumFeatures />

          {/* Plan Selection */}
          <PremiumPlans
            packages={packages}
            selectedPackageId={selectedPackageId}
            onSelectPackage={setSelectedPackageId}
            isLoading={isLoadingPackages}
            trialDays={trialDays}
          />

          {/* Footer with CTA, Restore Purchases, and Legal Links */}
          <PremiumFooter
            loading={loading}
            restoring={restoring}
            success={success}
            errorMsg={errorMsg}
            isPremium={isPremium}
            isAlphaTier={isAlphaTier}
            isLoadingPackages={isLoadingPackages}
            selectedPackageId={selectedPackageId}
            hasSelectedTrial={hasSelectedTrial}
            onUpgrade={handleUpgrade}
            onRestore={handleRestore}
          />
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
