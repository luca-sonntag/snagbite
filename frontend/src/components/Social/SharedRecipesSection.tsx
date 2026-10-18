import { useState, useCallback } from 'react';
import { Button } from '@heroui/react';
import { ExternalLink, X } from 'lucide-react';
import { useI18n } from '../../context/I18nContext';
import { useSocial } from '../../context/SocialContext';
import { useToast } from '../../context/ToastContext';
import { hapticLight, hapticMedium } from '../../utils/haptics';
import { PublicRecipePreviewModal } from '../PublicRecipe/PublicRecipePreviewModal';
import Avatar from './Avatar';
import type { Recipe } from '../../types';

interface SharedRecipesSectionProps {
  onRecipeSaved?: (recipeId: string) => void;
}

export default function SharedRecipesSection({ onRecipeSaved }: SharedRecipesSectionProps = {}) {
  const { t } = useI18n();
  const toast = useToast();
  const { sharedRecipes, saveFriendRecipe, dismissSharedRecipe } = useSocial();
  const [previewRecipe, setPreviewRecipe] = useState<Recipe | null>(null);

  const handleSave = useCallback(
    async (recipeId: string) => {
      hapticMedium();
      try {
        await saveFriendRecipe(recipeId);
        onRecipeSaved?.(recipeId);
        toast.success(t('app.social.shares.savedSuccess'));
      } catch {
        toast.danger(t('app.social.friends.genericError'));
      }
    },
    [saveFriendRecipe, onRecipeSaved, t, toast],
  );

  const handleDismiss = useCallback(
    async (shareId: string) => {
      hapticLight();
      try {
        await dismissSharedRecipe(shareId);
      } catch {
        toast.danger(t('app.social.friends.genericError'));
      }
    },
    [dismissSharedRecipe, t, toast],
  );

  if (sharedRecipes.length === 0) return null;

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between px-1">
        <h2 className="font-heading font-bold text-sm text-gray-900 dark:text-white">
          {t('app.social.shares.recommendedTitle')}
        </h2>
        <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
          {sharedRecipes.length}
        </span>
      </div>

      <div className="flex flex-col gap-2">
        {sharedRecipes.map((item) => {
          return (
            <div
              key={item.shareId}
              role="button"
              tabIndex={0}
              onClick={() => {
                hapticLight();
                setPreviewRecipe(item.recipe);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  setPreviewRecipe(item.recipe);
                }
              }}
              className="flex items-center gap-3 p-3 rounded-2xl bg-white dark:bg-gray-900 shadow-[0_2px_8px_rgba(0,0,0,0.03)] border-none cursor-pointer active:scale-[0.99] transition-all select-none"
            >
              {/* Recipe Thumbnail */}
              <div className="w-14 h-14 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 shrink-0">
                {item.recipe.imageUrl ? (
                  <img
                    src={item.recipe.imageUrl}
                    alt={item.recipe.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xl">
                    {item.recipe.emoji || '🍽️'}
                  </div>
                )}
              </div>

              {/* Recipe & Sender Info */}
              <div className="min-w-0 flex-1">
                <span className="font-bold text-sm text-gray-900 dark:text-white truncate block">
                  {item.recipe.title}
                </span>

                <div className="flex items-center gap-1.5 mt-0.5">
                  <Avatar name={item.sender.displayName} avatarUrl={item.sender.avatarUrl} size={18} />
                  <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {t('app.social.shares.from', { name: item.sender.displayName })}
                  </span>
                </div>

                {item.message && (
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-300 font-medium italic truncate mt-0.5">
                    „{item.message}“
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                <Button
                  isIconOnly
                  size="sm"
                  onPress={() => {
                    hapticLight();
                    setPreviewRecipe(item.recipe);
                  }}
                  aria-label={t('app.social.shares.view')}
                  className="w-8 h-8 min-w-0 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-none active:scale-95 transition-all"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </Button>

                <Button
                  isIconOnly
                  size="sm"
                  onPress={() => handleDismiss(item.shareId)}
                  aria-label={t('app.social.shares.dismiss')}
                  className="w-7 h-7 min-w-0 rounded-xl bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 border-none active:scale-95 transition-all"
                >
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {previewRecipe && (
        <PublicRecipePreviewModal
          isOpen={!!previewRecipe}
          onClose={() => setPreviewRecipe(null)}
          recipe={previewRecipe}
          isSaved={sharedRecipes.find((s) => s.recipe.id === previewRecipe.id)?.isRecipeSaved}
          onSave={async (r) => {
            if (r.id) await handleSave(r.id);
          }}
        />
      )}
    </div>
  );
}
