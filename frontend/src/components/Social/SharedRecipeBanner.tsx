import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useI18n } from '../../context/I18nContext';
import { PublicRecipePreviewModal } from '../PublicRecipe/PublicRecipePreviewModal';
import { hapticLight } from '../../utils/haptics';
import Avatar from './Avatar';
import CachedImage from '../CachedImage';
import { useSharedRecipeToast, AUTO_DISMISS_MS } from './useSharedRecipeToast';

interface SharedRecipeBannerProps {
  onSelectRecipe?: (recipeId: string) => void;
}

export default function SharedRecipeBanner({ onSelectRecipe }: SharedRecipeBannerProps) {
  const { t } = useI18n();
  const {
    currentShare,
    bannerPhase,
    isVisible,
    isExiting,
    isPaused,
    previewRecipe,
    setPreviewRecipe,
    triggerDismiss,
    handleCardClick,
    handleTouchStart,
    handleTouchEnd,
    handleMouseEnter,
    handleMouseLeave,
    saveFriendRecipe,
  } = useSharedRecipeToast(onSelectRecipe);

  if (!currentShare || bannerPhase === 'gone') {
    if (previewRecipe) {
      return createPortal(
        <PublicRecipePreviewModal
          isOpen={!!previewRecipe}
          onClose={() => setPreviewRecipe(null)}
          recipe={previewRecipe}
          isSaved={currentShare?.isRecipeSaved}
          onSave={async (r) => {
            if (r.id) {
              await saveFriendRecipe(r.id);
            }
          }}
        />,
        document.body,
      );
    }
    return null;
  }

  const recipeImg = currentShare.recipe.imageUrl || currentShare.recipe.imageUrls?.[0];

  return createPortal(
    <>
      <div className="fixed inset-x-0 top-0 z-[120] pointer-events-none flex justify-center p-3 sm:p-4 pt-[calc(var(--app-sticky-top,var(--safe-area-inset-top,0px))+0.75rem)] sm:pt-[calc(var(--app-sticky-top,var(--safe-area-inset-top,0px))+1rem)]">
        <div
          role="button"
          tabIndex={0}
          onClick={handleCardClick}
          onKeyDown={(e) => e.key === 'Enter' && handleCardClick()}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          className={`w-full max-w-md pointer-events-auto relative flex flex-col p-2.5 sm:p-3 pb-3 sm:pb-3.5 rounded-2xl bg-white/95 dark:bg-gray-900/95 backdrop-blur-md shadow-[0_12px_40px_rgba(0,0,0,0.18)] dark:shadow-[0_12px_40px_rgba(0,0,0,0.55)] border border-black/5 dark:border-white/10 cursor-pointer active:scale-[0.99] select-none overflow-hidden transition-all ${
            isVisible
              ? 'translate-y-0 opacity-100 scale-100 duration-400 ease-out'
              : `-translate-y-12 opacity-0 scale-95 pointer-events-none ${isExiting ? 'duration-300 ease-in' : 'duration-0'}`
          }`}
        >
          <div className="flex items-center gap-3">
            {/* Recipe Thumbnail */}
            <div className="w-12 h-12 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 shrink-0 shadow-2xs">
              <CachedImage
                src={recipeImg}
                alt={currentShare.recipe.title}
                emoji={currentShare.recipe.emoji}
                className="w-full h-full object-cover"
              />
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
                hapticLight();
                triggerDismiss(currentShare.shareId);
              }}
              aria-label={t('common.close') || 'Schließen'}
              className="w-8 h-8 -mr-1 flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-xl bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors border-none cursor-pointer active:scale-90 shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Auto-dismiss bottom progress indicator */}
          <div className="absolute bottom-0 inset-x-0 h-1 bg-black/5 dark:bg-white/10 overflow-hidden">
            <div
              className="h-full bg-emerald-500 dark:bg-emerald-400 transition-[width] ease-linear"
              style={{
                width: bannerPhase === 'waiting' ? '100%' : '0%',
                transitionDuration: isVisible && !isPaused ? `${AUTO_DISMISS_MS}ms` : '0ms',
              }}
            />
          </div>
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
            }
          }}
        />
      )}
    </>,
    document.body,
  );
}
