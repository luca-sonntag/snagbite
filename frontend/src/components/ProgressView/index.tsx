import { useEffect, useState } from 'react';
import { useI18n } from '../../context/I18nContext';
import ProgressOverview from './ProgressOverview';
import LeaderboardView from '../Social/LeaderboardView';
import FriendsView from '../Social/FriendsView';

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
  const [section, setSection] = useState<SocialSection>('overview');

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

      <div className="flex rounded-2xl bg-black/5 p-1 dark:bg-white/5">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setSection(tab.key)}
            className={`flex-1 rounded-xl py-2 text-sm font-semibold transition-colors ${
              section === tab.key
                ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-800 dark:text-white'
                : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {section === 'overview' && <ProgressOverview onSelectRecipe={onSelectRecipe} />}
      {section === 'leaderboard' && <LeaderboardView />}
      {section === 'friends' && (
        <FriendsView pendingInviteCode={pendingInviteCode} onInviteConsumed={onInviteConsumed} />
      )}
    </div>
  );
}
