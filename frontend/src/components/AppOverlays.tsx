import React, { lazy, Suspense, useState, useEffect, useRef } from 'react';

const PremiumModal = lazy(() => import('./PremiumModal'));
const WelcomeGuide = lazy(() => import('./WelcomeGuide'));
const AlphaWelcome = lazy(() => import('./AlphaWelcome'));
const PreAdTransparencySheet = lazy(() => import('./Ads/PreAdTransparencySheet'));
import { DevTools } from './DevTools';
import { SHOW_PRE_AD_NOTICE_EVENT, markPreAdNoticeSeen } from '../utils/ads';
import type { AppOverlaysProps } from '../types/app';

export const AppOverlays: React.FC<AppOverlaysProps> = ({
  isPremiumModalOpen,
  setIsPremiumModalOpen,
  showOnboarding,
  onCompleteOnboarding,
  showAlphaWelcome,
  onCompleteAlphaWelcome,
  showPreAdNotice: externalShowPreAdNotice,
  setShowPreAdNotice: externalSetShowPreAdNotice,
  onConfirmPreAdNotice,
}) => {
  // Mount the (lazy) premium modal only once it's first opened, then keep it
  // mounted so its close transition still runs.
  const [premiumModalLoaded, setPremiumModalLoaded] = useState(false);
  const [internalShowPreAdNotice, setInternalShowPreAdNotice] = useState(false);
  const pendingAdActionRef = useRef<(() => void) | null>(null);

  const isPreAdNoticeOpen = externalShowPreAdNotice ?? internalShowPreAdNotice;

  const setPreAdNoticeOpen = (open: boolean) => {
    if (externalSetShowPreAdNotice) {
      externalSetShowPreAdNotice(open);
    } else {
      setInternalShowPreAdNotice(open);
    }
  };

  useEffect(() => {
    if (isPremiumModalOpen) {
      setPremiumModalLoaded(true);
    }
  }, [isPremiumModalOpen]);

  // Listen for pre-ad transparency notice events triggered across the app
  useEffect(() => {
    const handleShowNotice = (e: Event) => {
      const customEvent = e as CustomEvent<{ onConfirm?: () => void }>;
      pendingAdActionRef.current = customEvent.detail?.onConfirm ?? null;
      setPreAdNoticeOpen(true);
    };

    window.addEventListener(SHOW_PRE_AD_NOTICE_EVENT, handleShowNotice);
    return () => {
      window.removeEventListener(SHOW_PRE_AD_NOTICE_EVENT, handleShowNotice);
    };
  }, []);

  const handleConfirmPreAdNotice = () => {
    markPreAdNoticeSeen();
    setPreAdNoticeOpen(false);
    onConfirmPreAdNotice?.();
    if (pendingAdActionRef.current) {
      const action = pendingAdActionRef.current;
      pendingAdActionRef.current = null;
      action();
    }
  };

  const handleClosePreAdNotice = () => {
    setPreAdNoticeOpen(false);
    pendingAdActionRef.current = null;
  };

  const handleOpenPremiumFromPreAd = () => {
    handleClosePreAdNotice();
    setIsPremiumModalOpen(true);
  };

  return (
    <>
      {/* Global Premium Modal */}
      {premiumModalLoaded && (
        <Suspense fallback={null}>
          <PremiumModal isOpen={isPremiumModalOpen} onOpenChange={setIsPremiumModalOpen} />
        </Suspense>
      )}

      {/* First-launch onboarding overlay (rendered via portal) */}
      {showOnboarding && (
        <Suspense fallback={null}>
          <WelcomeGuide onClose={onCompleteOnboarding} />
        </Suspense>
      )}

      {/* Alpha tester welcome overlay — after onboarding so they don't stack */}
      {!showOnboarding && showAlphaWelcome && (
        <Suspense fallback={null}>
          <AlphaWelcome onClose={onCompleteAlphaWelcome} />
        </Suspense>
      )}

      {/* Pre-Ad Transparency Sheet for Free-Tier users */}
      {isPreAdNoticeOpen && (
        <Suspense fallback={null}>
          <PreAdTransparencySheet
            isOpen={isPreAdNoticeOpen}
            onClose={handleClosePreAdNotice}
            onConfirm={handleConfirmPreAdNotice}
            onOpenPremium={handleOpenPremiumFromPreAd}
          />
        </Suspense>
      )}

      {/* Dev mode in-app developer tools & console overlay */}
      <DevTools />
    </>
  );
};
export default AppOverlays;

