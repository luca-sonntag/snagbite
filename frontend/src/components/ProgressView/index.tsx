import { useEffect, useState } from 'react';
import { Button } from '@heroui/react';
import { useI18n } from '../../context/I18nContext';
import ProgressOverview from './ProgressOverview';
import LeaderboardView from '../Social/LeaderboardView';
import FriendsView from '../Social/FriendsView';

import { useSocial } from '../../context/SocialContext';

export type SocialSection = 'overview' | 'leaderboard' | 'friends';

interface ProgressViewProps {
  /** Friend code from an invite link (#/invite/<code>) to prefill in Friends. */
  pendingInviteCode?: string | null;
  onInviteConsumed?: () => void;
  onSelectRecipe?: (jobId: string) => void;
}

/**
 * The "Fortschritt" tab container. A segmented control switches between the
 * personal overview, the friends-and-me leaderboard and the friends list.
 */
export default function ProgressView({ pendingInviteCode, onInviteConsumed, onSelectRecipe }: ProgressViewProps) {
  const { t } = useI18n();
  const { incomingRequests, refreshFriends } = useSocial();
  const [section, setSection] = useState<SocialSection>('overview');

  const incomingCount = incomingRequests.length;

  // Refresh friends and incoming requests when Progress tab is opened
  useEffect(() => {
    refreshFriends();
  }, [refreshFriends]);

  // An incoming invite link jumps straight to the Friends section.
  useEffect(() => {
    if (pendingInviteCode) setSection('friends');
  }, [pendingInviteCode]);

  const tabs: { key: SocialSection; label: string }[] = [
    { key: 'overview', label: t('app.social.sections.overview') },
    { key: 'leaderboard', label: t('app.social.sections.leaderboard') },
    { key: 'friends', label: t('app.social.sections.friends') },
  ];

  return (
    <div className="flex flex-col gap-6 pb-12">
      {/* Header */}
      <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">
        {t('app.gamification.tabTitle')}
      </h1>

      <div className="flex rounded-2xl bg-gray-100 p-1 dark:bg-gray-900 shadow-[0_2px_6px_rgba(0,0,0,0.03)]">
        {tabs.map((tab) => {
          const isActive = section === tab.key;
          return (
            <Button
              key={tab.key}
              onPress={() => setSection(tab.key)}
              className={`relative flex-1 rounded-xl py-2 h-9 text-sm font-semibold border-none transition-all duration-200 cursor-pointer ${
                isActive
                  ? 'bg-white text-gray-900 shadow-[0_2px_6px_rgba(0,0,0,0.03)] dark:bg-gray-800 dark:text-white'
                  : 'bg-transparent text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
              }`}
            >
              <span className="flex items-center justify-center gap-1.5">
                {tab.label}
                {tab.key === 'friends' && incomingCount > 0 && (
                  <span className="flex h-4 min-w-[16px] items-center justify-center text-center leading-none rounded-full bg-rose-500 px-1 text-[10px] font-black text-white shadow-xs">
                    {incomingCount}
                  </span>
                )}
              </span>
            </Button>
          );
        })}
      </div>

      {section === 'overview' && <ProgressOverview onSelectRecipe={onSelectRecipe} />}
      {section === 'leaderboard' && <LeaderboardView />}
      {section === 'friends' && (
        <FriendsView pendingInviteCode={pendingInviteCode} onInviteConsumed={onInviteConsumed} />
      )}
    </div>
  );
}
