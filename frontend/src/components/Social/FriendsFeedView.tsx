import { useState } from 'react';
import { Button, Spinner } from '@heroui/react';
import { Users, Camera, UtensilsCrossed, Share2, UserPlus } from 'lucide-react';
import { useI18n } from '../../context/I18nContext';
import { useSocial } from '../../context/SocialContext';
import { useSocialFeed } from '../../hooks/useSocialFeed';
import { PublicRecipePreviewModal } from '../PublicRecipe/PublicRecipePreviewModal';
import FeedEventCard from './FeedEventCard';
import { hapticLight, hapticSelection } from '../../utils/haptics';
import type { Recipe } from '../../types';

interface FriendsFeedViewProps {
  onGoToFriends?: () => void;
  onGoToCookbook?: () => void;
}

export default function FriendsFeedView({
  onGoToFriends,
  onGoToCookbook,
}: FriendsFeedViewProps) {
  const { t } = useI18n();
  const { friends, profile } = useSocial();
  const { items, loading, toggleReaction, saveRecipe } = useSocialFeed();
  const [previewRecipe, setPreviewRecipe] = useState<Recipe | null>(null);

  const handleShareCode = async () => {
    if (!profile) return;
    hapticLight();
    const url = `${window.location.origin}/invite/${profile.friendCode}`;
    const text = t('app.social.friends.inviteText', { code: profile.friendCode }) + '\n' + url;
    try {
      const { Share } = await import('@capacitor/share');
      const can = await Share.canShare();
      if (can.value) {
        await Share.share({ title: 'Snagbite', text });
        return;
      }
    } catch {
      /* ignore */
    }
    if (navigator.share) {
      try { await navigator.share({ title: 'Snagbite', text }); return; } catch { /* ignore */ }
    }
    try {
      await navigator.clipboard.writeText(text);
    } catch { /* ignore */ }
  };

  const isSavedInFeed = (recipeId?: string) => {
    if (!recipeId) return false;
    return items.some((i) => i.recipe.id === recipeId && i.isRecipeSaved);
  };

  if (loading && items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Spinner size="md" color="success" />
        <span className="text-xs font-semibold text-gray-400">Feed wird geladen...</span>
      </div>
    );
  }

  // Case A: No friends connected yet
  if (friends.length === 0 && items.length === 0) {
    return (
      <div className="flex flex-col items-center text-center py-8 px-4 gap-4">
        <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 dark:bg-emerald-500/15 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-2xs">
          <Users className="w-8 h-8" />
        </div>
        <div className="max-w-xs">
          <h2 className="font-heading font-extrabold text-gray-900 dark:text-white text-lg">
            {t('app.social.feed.emptyNoFriendsTitle')}
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
            {t('app.social.feed.emptyNoFriendsSubtitle')}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full max-w-xs mt-2">
          <Button
            onPress={handleShareCode}
            className="w-full h-12 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm border-none shadow-xs cursor-pointer active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <Share2 className="w-4 h-4" />
            <span>{t('app.social.feed.shareCodeAction')}</span>
          </Button>
          {onGoToFriends && (
            <Button
              onPress={() => {
                hapticSelection();
                onGoToFriends();
              }}
              className="w-full h-12 rounded-2xl bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 font-bold text-sm border-none cursor-pointer active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <UserPlus className="w-4 h-4" />
              <span>{t('app.social.feed.addFriendsAction')}</span>
            </Button>
          )}
        </div>
      </div>
    );
  }

  // Case B: Has friends, but no photo cook event in feed yet
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center text-center py-8 px-4 gap-4">
        <div className="w-16 h-16 rounded-3xl bg-amber-500/10 dark:bg-amber-500/15 flex items-center justify-center text-amber-500 shadow-2xs">
          <Camera className="w-8 h-8" />
        </div>
        <div className="max-w-xs">
          <h2 className="font-heading font-extrabold text-gray-900 dark:text-white text-lg">
            {t('app.social.feed.emptyNoCooksTitle')}
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
            {t('app.social.feed.emptyNoCooksSubtitle')}
          </p>
        </div>
        {onGoToCookbook && (
          <Button
            onPress={() => {
              hapticSelection();
              onGoToCookbook();
            }}
            className="w-full max-w-xs h-12 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm border-none shadow-xs cursor-pointer active:scale-95 transition-all flex items-center justify-center gap-2 mt-2"
          >
            <UtensilsCrossed className="w-4 h-4" />
            <span>{t('app.social.feed.cookFirstAction')}</span>
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Feed list */}
      <div className="flex flex-col gap-5">
        {items.map((item) => (
          <FeedEventCard
            key={item.cookEventId}
            item={item}
            onReact={toggleReaction}
            onOpenRecipe={(rec) => setPreviewRecipe(rec)}
            onSaveRecipe={saveRecipe}
          />
        ))}
      </div>

      {/* Recipe Preview Modal */}
      {previewRecipe && (
        <PublicRecipePreviewModal
          isOpen={!!previewRecipe}
          onClose={() => setPreviewRecipe(null)}
          recipe={previewRecipe}
          isSaved={isSavedInFeed(previewRecipe.id)}
          onSave={async (r) => {
            if (r.id) await saveRecipe(r.id);
          }}
        />
      )}
    </div>
  );
}
