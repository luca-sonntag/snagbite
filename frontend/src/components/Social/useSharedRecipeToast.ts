import { useState, useRef, useEffect, useCallback } from 'react';
import { useSocial } from '../../context/SocialContext';
import { useOverlayStack } from '../../context/OverlayStackContext';
import { hapticLight } from '../../utils/haptics';
import type { Recipe, SharedRecipeItem } from '../../types';

const STORAGE_KEY = 'snagbite:dismissed_share_banners';
const AUTO_DISMISS_MS = 4500;
const ENTER_DELAY_MS = 600;
const EXIT_DURATION_MS = 320;

function getDismissedBannerIds(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

function persistDismissedBannerId(id: string): void {
  try {
    const set = getDismissedBannerIds();
    set.add(id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...set]));
  } catch {
    /* ignore */
  }
}

export type BannerPhase = 'waiting' | 'visible' | 'exiting' | 'gone';

export interface UseSharedRecipeToastResult {
  currentShare: SharedRecipeItem | undefined;
  bannerPhase: BannerPhase;
  isVisible: boolean;
  isExiting: boolean;
  isPaused: boolean;
  previewRecipe: Recipe | null;
  setPreviewRecipe: (recipe: Recipe | null) => void;
  triggerDismiss: (shareId: string) => void;
  handleCardClick: () => void;
  handleTouchStart: (e: React.TouchEvent) => void;
  handleTouchEnd: (e: React.TouchEvent) => void;
  handleMouseEnter: () => void;
  handleMouseLeave: () => void;
  saveFriendRecipe: (recipeId: string) => Promise<void>;
}

export function useSharedRecipeToast(onSelectRecipe?: (recipeId: string) => void): UseSharedRecipeToastResult {
  const { sharedRecipes, saveFriendRecipe, markSharesSeen } = useSocial();
  const { isAnyOverlayOpen } = useOverlayStack();

  const [dismissedIds, setDismissedIds] = useState<Set<string>>(getDismissedBannerIds);
  const [previewRecipe, setPreviewRecipe] = useState<Recipe | null>(null);
  const [bannerPhase, setBannerPhase] = useState<BannerPhase>('waiting');
  const [isPaused, setIsPaused] = useState(false);

  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const exitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentShare = sharedRecipes.find((s) => !dismissedIds.has(s.shareId));
  const activeShareId = currentShare?.shareId;

  // Reset phase to waiting when a new share arrives
  const lastShareIdRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (activeShareId && activeShareId !== lastShareIdRef.current) {
      lastShareIdRef.current = activeShareId;
      setBannerPhase('waiting');
    }
  }, [activeShareId]);

  const completeDismiss = useCallback(
    (shareId: string) => {
      persistDismissedBannerId(shareId);
      setDismissedIds((prev) => new Set([...prev, shareId]));
      setBannerPhase('gone');
      void markSharesSeen();
    },
    [markSharesSeen],
  );

  const triggerDismiss = useCallback(
    (shareId: string) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      setBannerPhase('exiting');
      if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
      exitTimerRef.current = setTimeout(() => {
        completeDismiss(shareId);
      }, EXIT_DURATION_MS);
    },
    [completeDismiss],
  );

  // Entrance: Fly in when share exists and no overlay/dialog is open
  useEffect(() => {
    if (!currentShare) {
      setBannerPhase('gone');
      return;
    }

    if (isAnyOverlayOpen) {
      if (bannerPhase === 'visible') {
        triggerDismiss(currentShare.shareId);
      }
      return;
    }

    if (bannerPhase === 'waiting') {
      const enterTimer = setTimeout(() => {
        hapticLight();
        setBannerPhase('visible');
      }, ENTER_DELAY_MS);
      return () => clearTimeout(enterTimer);
    }
  }, [currentShare, isAnyOverlayOpen, bannerPhase, triggerDismiss]);

  // Auto-dismiss countdown
  useEffect(() => {
    if (bannerPhase !== 'visible' || isPaused || !activeShareId) return;

    timerRef.current = setTimeout(() => {
      triggerDismiss(activeShareId);
    }, AUTO_DISMISS_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [bannerPhase, isPaused, activeShareId, triggerDismiss]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
    };
  }, []);

  const handleCardClick = useCallback(() => {
    if (!currentShare) return;
    hapticLight();
    completeDismiss(currentShare.shareId);
    if (currentShare.isRecipeSaved && currentShare.recipe.id) {
      onSelectRecipe?.(currentShare.recipe.id);
    } else {
      setPreviewRecipe(currentShare.recipe);
    }
  }, [currentShare, completeDismiss, onSelectRecipe]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    setIsPaused(true);
    const touch = e.touches[0];
    if (touch) {
      touchStartRef.current = { x: touch.clientX, y: touch.clientY };
    }
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    setIsPaused(false);
    if (!touchStartRef.current || !currentShare) return;
    const touch = e.changedTouches[0];
    if (!touch) return;
    const deltaY = touch.clientY - touchStartRef.current.y;
    const deltaX = touch.clientX - touchStartRef.current.x;
    touchStartRef.current = null;

    if (deltaY < -35 || Math.abs(deltaX) > 75) {
      hapticLight();
      triggerDismiss(currentShare.shareId);
    }
  }, [currentShare, triggerDismiss]);

  return {
    currentShare,
    bannerPhase,
    isVisible: bannerPhase === 'visible',
    isExiting: bannerPhase === 'exiting',
    isPaused,
    previewRecipe,
    setPreviewRecipe,
    triggerDismiss,
    handleCardClick,
    handleTouchStart,
    handleTouchEnd,
    handleMouseEnter: () => setIsPaused(true),
    handleMouseLeave: () => setIsPaused(false),
    saveFriendRecipe,
  };
}
