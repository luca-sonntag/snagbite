import { useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useI18n } from '../../context/I18nContext';
import { useSocial } from '../../context/SocialContext';
import { PublicRecipePreviewModal } from '../PublicRecipe/PublicRecipePreviewModal';
import { hapticLight } from '../../utils/haptics';
import Avatar from './Avatar';
import type { Recipe } from '../../types';

interface SharedRecipeBannerProps {
  onSelectRecipe?: (recipeId: string) => void;
}

const STORAGE_KEY = 'snagbite:dismissed_share_banners';

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

function persistDismissedBannerId(id: string) {
  try {
    const set = getDismissedBannerIds();
    set.add(id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...set]));
  } catch {
    /* ignore */
  }
}

export default function SharedRecipeBanner({ onSelectRecipe }: SharedRecipeBannerProps) {
  const { t } = useI18n();
  const { sharedRecipes, saveFriendRecipe, markSharesSeen } = useSocial();
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(getDismissedBannerIds);
  const [previewRecipe, setPreviewRecipe] = useState<Recipe | null>(null);

  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  // Find the first share that hasn't been dismissed from the banner
  const currentShare = sharedRecipes.find(
    (s) => !dismissedIds.has(s.shareId),
  );

  const handleDismiss = useCallback(
    (shareId: string) => {
      hapticLight();
      persistDismissedBannerId(shareId);
      setDismissedIds((prev) => new Set([...prev, shareId]));
      void markSharesSeen();
    },
    [markSharesSeen],
  );

  const handleCardClick = () => {
    if (!currentShare) return;
    hapticLight();
    if (currentShare.isRecipeSaved && currentShare.recipe.id) {
      handleDismiss(currentShare.shareId);
      onSelectRecipe?.(currentShare.recipe.id);
    } else {
      setPreviewRecipe(currentShare.recipe);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    if (touch) {
      touchStartRef.current = { x: touch.clientX, y: touch.clientY };
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current || !currentShare) return;
    const touch = e.changedTouches[0];
    if (!touch) return;
    const deltaY = touch.clientY - touchStartRef.current.y;
    const deltaX = touch.clientX - touchStartRef.current.x;
    touchStartRef.current = null;

    // Swipe up (deltaY < -35) or swipe side (|deltaX| > 75)
    if (deltaY < -35 || Math.abs(deltaX) > 75) {
      handleDismiss(currentShare.shareId);
    }
  };

  if (!currentShare) return null;

  const recipeImg = currentShare.recipe.imageUrl || currentShare.recipe.imageUrls?.[0];

  return createPortal(
    <>
      <div className="fixed inset-x-0 top-0 z-[120] pointer-events-none flex justify-center p-3 sm:p-4 pt-[calc(var(--safe-area-inset-top,0px)+0.75rem)]">
        <div
          role="button"
          tabIndex={0}
          onClick={handleCardClick}
          onKeyDown={(e) => e.key === 'Enter' && handleCardClick()}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          className="w-full max-w-md pointer-events-auto relative flex items-center gap-3 p-2.5 sm:p-3 rounded-2xl bg-white/95 dark:bg-gray-900/95 backdrop-blur-md shadow-[0_12px_40px_rgba(0,0,0,0.18)] dark:shadow-[0_12px_40px_rgba(0,0,0,0.55)] border border-black/5 dark:border-white/10 cursor-pointer active:scale-[0.99] transition-all animate-in fade-in slide-in-from-top-4 duration-200 select-none"
        >
          {/* Recipe Thumbnail */}
          <div className="w-12 h-12 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 shrink-0 shadow-2xs">
            {recipeImg ? (
              <img
                src={recipeImg}
                alt={currentShare.recipe.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xl">
                {currentShare.recipe.emoji || '🍽️'}
              </div>
            )}
          </div>

          {/* Recipe & Sender Info */}
          <div className="min-w-0 flex-1">
            <span className="font-bold text-sm text-gray-900 dark:text-white truncate block leading-snug">
              {currentShare.recipe.title}
            </span>

            <div className="flex items-center gap-1.5 mt-0.5">
              <Avatar
                name={currentShare.sender.displayName}
                avatarUrl={currentShare.sender.avatarUrl}
                size={18}
              />
              <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {t('app.social.shares.from', { name: currentShare.sender.displayName })}
              </span>
            </div>

            {currentShare.message && (
              <p className="text-[11px] text-emerald-700 dark:text-emerald-300 font-medium italic truncate mt-0.5">
                „{currentShare.message}“
              </p>
            )}
          </div>

          {/* Close Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleDismiss(currentShare.shareId);
            }}
            aria-label={t('common.close') || 'Schließen'}
            className="w-8 h-8 -mr-1 flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-xl bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors border-none cursor-pointer active:scale-90 shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Recipe Preview Modal */}
      {previewRecipe && (
        <PublicRecipePreviewModal
          isOpen={!!previewRecipe}
          onClose={() => setPreviewRecipe(null)}
          recipe={previewRecipe}
          isSaved={currentShare.isRecipeSaved}
          onSave={async (r) => {
            if (r.id) {
              await saveFriendRecipe(r.id);
              handleDismiss(currentShare.shareId);
            }
          }}
        />
      )}
    </>,
    document.body,
  );
}
