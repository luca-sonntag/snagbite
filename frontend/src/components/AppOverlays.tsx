import React, { lazy, Suspense, useState, useEffect } from 'react';

const PremiumModal = lazy(() => import('./PremiumModal'));
const WelcomeGuide = lazy(() => import('./WelcomeGuide'));
const AlphaWelcome = lazy(() => import('./AlphaWelcome'));
import { DevTools } from './DevTools';
import type { AppOverlaysProps } from '../types/app';



export const AppOverlays: React.FC<AppOverlaysProps> = ({
  isPremiumModalOpen,
  setIsPremiumModalOpen,
  showOnboarding,
  onCompleteOnboarding,
  showAlphaWelcome,
  onCompleteAlphaWelcome,
}) => {
  // Mount the (lazy) premium modal only once it's first opened, then keep it
  // mounted so its close transition still runs.
  const [premiumModalLoaded, setPremiumModalLoaded] = useState(false);

  useEffect(() => {
    if (isPremiumModalOpen) {
      setPremiumModalLoaded(true);
    }
  }, [isPremiumModalOpen]);

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

      {/* Dev mode in-app developer tools & console overlay */}
      <DevTools />
    </>
  );
};
export default AppOverlays;
