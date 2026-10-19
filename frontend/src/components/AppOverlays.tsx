import React, { lazy, Suspense, useState, useEffect, useRef } from 'react';

const PremiumModal = lazy(() => import('./PremiumModal'));
const WelcomeGuide = lazy(() => import('./WelcomeGuide'));
const AlphaWelcome = lazy(() => import('./AlphaWelcome'));
const PreAdTransparencySheet = lazy(() => import('./Ads/PreAdTransparencySheet'));
import SmartResumeSheet from './ExtractForm/SmartResumeSheet';
import { DevTools } from './DevTools';
import { SHOW_PRE_AD_NOTICE_EVENT, markPreAdNoticeSeen, initAds } from '../utils/ads';
import { useAuth } from '../context/AuthContext';
import { useModalOverlay } from '../context/OverlayStackContext';
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
  limitStatus,
  onAnalyzeUrl,
  onNavigateExtract,
}) => {
  const { isPremium } = useAuth();

  // Immediately register onboarding / alpha welcome on the overlay stack even while
  // their lazy chunks are still loading inside <Suspense>, preventing background
  // spotlight tours from firing before the portal mounts.
  useModalOverlay(
    Boolean(showOnboarding || showAlphaWelcome),
    showOnboarding ? onCompleteOnboarding : onCompleteAlphaWelcome
  );

  // Mount the (lazy) premium modal only once it's first opened, then keep it
  // mounted so its close transition still runs.
  const [premiumModalLoaded, setPremiumModalLoaded] = useState(false);
  const [internalShowPreAdNotice, setInternalShowPreAdNotice] = useState(false);
  const pendingAdActionRef = useRef<((upgradedToPremium?: boolean) => void) | null>(null);
  const openedPremiumFromPreAdRef = useRef(false);

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

  // When PremiumModal closes after being opened from PreAdTransparencySheet:
  // - If Pro was purchased: skip AdMob consent and immediately resume the pending action (extraction starts ad-free).
  // - If closed without purchase: re-open PreAdTransparencySheet so user can confirm -> AdMob consent -> extraction.
  useEffect(() => {
    if (!openedPremiumFromPreAdRef.current) return;
    if (isPremiumModalOpen) return;

    openedPremiumFromPreAdRef.current = false;

    if (isPremium) {
      markPreAdNoticeSeen();
      const action = pendingAdActionRef.current;
      pendingAdActionRef.current = null;
      action?.(true);
    } else {
      setPreAdNoticeOpen(true);
    }
  }, [isPremiumModalOpen, isPremium]);

  // Listen for pre-ad transparency notice events triggered across the app
  useEffect(() => {
    const handleShowNotice = (e: Event) => {
      const customEvent = e as CustomEvent<{ onConfirm?: (upgradedToPremium?: boolean) => void }>;
      pendingAdActionRef.current = customEvent.detail?.onConfirm ?? null;
      setPreAdNoticeOpen(true);
    };

    window.addEventListener(SHOW_PRE_AD_NOTICE_EVENT, handleShowNotice);
    return () => {
      window.removeEventListener(SHOW_PRE_AD_NOTICE_EVENT, handleShowNotice);
    };
  }, []);

  const handleConfirmPreAdNotice = async () => {
    markPreAdNoticeSeen();
    setPreAdNoticeOpen(false);
    onConfirmPreAdNotice?.();
    const action = pendingAdActionRef.current;
    pendingAdActionRef.current = null;
    await initAds();
    action?.(false);
  };

  const handleClosePreAdNotice = () => {
    if (pendingAdActionRef.current) {
      void handleConfirmPreAdNotice();
      return;
    }
    setPreAdNoticeOpen(false);
  };

  const handleOpenPremiumFromPreAd = () => {
    openedPremiumFromPreAdRef.current = true;
    setPreAdNoticeOpen(false);
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

      {/* Smart Resume Sheet for Queued Recipes */}
      {!showOnboarding && !showAlphaWelcome && !isPreAdNoticeOpen && onAnalyzeUrl && onNavigateExtract && (
        <SmartResumeSheet
          limitStatus={limitStatus}
          onAnalyze={onAnalyzeUrl}
          onNavigateToWaitlist={onNavigateExtract}
        />
      )}

      {/* Dev mode in-app developer tools & console overlay */}
      <DevTools />
    </>
  );
};
export default AppOverlays;

