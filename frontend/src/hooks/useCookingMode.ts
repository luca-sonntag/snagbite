import { useState, useEffect } from 'react';

interface UseCookingModeProps {
  instructionsCount: number;
  initialStepIndex?: number;
  onClose: () => void;
}

export type StepSlideDirection = 'forward' | 'backward';

export function useCookingMode({
  instructionsCount,
  initialStepIndex = 0,
  onClose,
}: UseCookingModeProps) {
  const [cookingStepIndex, setCookingStepIndex] = useState(initialStepIndex);
  const [slideDirection, setSlideDirection] = useState<StepSlideDirection>('forward');
  const [, setWakeLock] = useState<WakeLockSentinel | null>(null);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  const handleNextCookingStep = () => {
    if (cookingStepIndex < instructionsCount - 1) {
      setSlideDirection('forward');
      setCookingStepIndex((prev) => prev + 1);
    }
  };

  const handlePrevCookingStep = () => {
    if (cookingStepIndex > 0) {
      setSlideDirection('backward');
      setCookingStepIndex((prev) => prev - 1);
    }
  };

  const jumpToStep = (index: number) => {
    setSlideDirection(index >= cookingStepIndex ? 'forward' : 'backward');
    setCookingStepIndex(index);
  };

  // Touch handlers for swiping between steps
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX - touchEndX;
    if (diff > 60) {
      handleNextCookingStep();
    } else if (diff < -60) {
      handlePrevCookingStep();
    }
    setTouchStartX(null);
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        handleNextCookingStep();
      } else if (e.key === 'ArrowLeft') {
        handlePrevCookingStep();
      } else if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cookingStepIndex, instructionsCount, onClose]);

  // Screen Wake Lock to keep screen active while cooking
  useEffect(() => {
    let activeWakeLock: WakeLockSentinel | null = null;
    const requestWakeLock = async () => {
      if ('wakeLock' in navigator) {
        try {
          activeWakeLock = await (navigator as Navigator & {
            wakeLock: { request: (type: string) => Promise<WakeLockSentinel> };
          }).wakeLock.request('screen');
          setWakeLock(activeWakeLock);
        } catch (err) {
          console.warn('Could not acquire Screen Wake Lock:', err);
        }
      }
    };

    requestWakeLock();

    return () => {
      if (activeWakeLock) {
        activeWakeLock.release().catch((err: unknown) => {
          console.warn('Error releasing Wake Lock:', err);
        });
      }
    };
  }, []);

  return {
    cookingStepIndex,
    slideDirection,
    setCookingStepIndex: jumpToStep,
    handleNextCookingStep,
    handlePrevCookingStep,
    handleTouchStart,
    handleTouchEnd,
  };
}
