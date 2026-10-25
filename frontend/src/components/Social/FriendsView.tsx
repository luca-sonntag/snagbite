import { useEffect } from 'react';
import { Button } from '@heroui/react';
import { X } from 'lucide-react';
import { useI18n } from '../../context/I18nContext';
import { useToast } from '../../context/ToastContext';
import { useSocial } from '../../context/SocialContext';
import FriendsProfileCard from './FriendsProfileCard';
import SharedRecipesSection from './SharedRecipesSection';
import FriendsListSection from './FriendsListSection';
import Avatar from './Avatar';

interface FriendsViewProps {
  pendingInviteCode?: string | null;
  onInviteConsumed?: () => void;
}

export default function FriendsView({ pendingInviteCode, onInviteConsumed }: FriendsViewProps) {
  const { t } = useI18n();
  const toast = useToast();
  const { incomingRequests, refreshFriends, refreshShares, respondRequest } = useSocial();

  useEffect(() => {
    refreshFriends();
    refreshShares();
    const interval = setInterval(() => {
      void refreshFriends({ silent: true });
      void refreshShares();
    }, 3000);
    return () => clearInterval(interval);
  }, [refreshFriends, refreshShares]);

  return (
    <div className="flex flex-col gap-5">
      {/* 1. Combined Profile, Friend Code & Add Friend Card */}
      <FriendsProfileCard
        pendingInviteCode={pendingInviteCode}
        onInviteConsumed={onInviteConsumed}
      />

      {/* 2. Recommended by Friends (Shared Recipes) */}
      <SharedRecipesSection />

      {/* 3. Incoming friend requests */}
      {incomingRequests.length > 0 && (
        <div className="flex flex-col gap-2">
          <h2 className="font-heading text-sm font-bold text-gray-900 dark:text-white px-1">
            {t('app.social.friends.requests')}
          </h2>
          <div className="divide-y divide-black/[0.06] dark:divide-white/[0.08] border-y border-black/[0.06] dark:border-white/[0.08]">
          {incomingRequests.map((r) => (
            <div
              key={r.friendshipId}
              className="flex items-center gap-3 py-3 px-1 bg-transparent"
            >
              <Avatar name={r.displayName} avatarUrl={r.avatarUrl} size={36} />
              <span className="min-w-0 flex-1 truncate font-bold text-gray-900 dark:text-white">
                {r.displayName}
              </span>
              <Button
                onPress={async () => {
                  await respondRequest(r.friendshipId, true);
                  toast.success(t('toast.friendRequestAccepted'));
                }}
                className="rounded-xl bg-emerald-600 hover:bg-emerald-500 px-3 py-1.5 h-8 text-xs font-bold text-white border-none active:scale-95 transition-all"
              >
                {t('app.social.friends.accept')}
              </Button>
              <Button
                onPress={() => respondRequest(r.friendshipId, false)}
                isIconOnly
                aria-label={t('app.social.friends.decline')}
                className="h-8 w-8 min-w-0 p-0 text-gray-400 hover:text-rose-500 bg-transparent hover:bg-rose-500/10 rounded-xl border-none active:scale-95 transition-all"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          ))}
          </div>
        </div>
      )}

      {/* 4. Friends list */}
      <FriendsListSection />
    </div>
  );
}
