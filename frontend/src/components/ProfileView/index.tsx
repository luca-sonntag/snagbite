import { useEffect, useState } from 'react';
import { Button } from '@heroui/react';
import { Trophy, User, Users, Settings, ArrowLeft, Flame } from 'lucide-react';
import { useI18n } from '../../context/I18nContext';
import { PageHeader } from '../PageHeader';
import ProgressOverview from './ProgressOverview';
import LeaderboardView from '../Social/LeaderboardView';
import FriendsView from '../Social/FriendsView';
import FriendsFeedView from '../Social/FriendsFeedView';
import { hapticSelection, hapticLight } from '../../utils/haptics';
import { useMobileNavigationBack } from '../../hooks/useMobileNavigationBack';
import { useSocial } from '../../context/SocialContext';
import SettingsView from '../SettingsView';

export type ProfileSection = 'overview' | 'feed' | 'leaderboard' | 'friends' | 'settings';

interface ProfileViewProps {
  /** Friend code from an invite link (#/invite/<code>) to prefill in Friends. */
  pendingInviteCode?: string | null;
  onInviteConsumed?: () => void;
  onSelectRecipe?: (recipeId: string) => void;
  /** Pass an explicit section to override the default, e.g. when coming from the Settings tab in the bottom nav */
  defaultSection?: ProfileSection;
}

/**
 * The "Profil & Fortschritt" tab container. A segmented control switches between the
 * personal overview, friend feed, leaderboard, and friends list.
 * App settings are accessible via the gear button in the header.
 */
export default function ProfileView({ pendingInviteCode, onInviteConsumed, onSelectRecipe, defaultSection = 'overview' }: ProfileViewProps) {
  const { t } = useI18n();
  const { incomingRequests, unreadSharesCount, refreshFriends, refreshShares, markSharesSeen } = useSocial();
  const [section, setSection] = useState<ProfileSection>(defaultSection);

  const friendsBadgeCount = incomingRequests.length + unreadSharesCount;

  // Sync section if defaultSection changes from parent navigation
  useEffect(() => {
    setSection(defaultSection);
  }, [defaultSection]);

  // Support Android back gesture/button when in settings
  useMobileNavigationBack(section === 'settings', () => setSection('overview'));

  // Refresh friends and incoming requests when Profile tab is opened
  useEffect(() => {
    refreshFriends();
    refreshShares();
  }, [refreshFriends, refreshShares]);

  // Mark shares as seen when entering friends section
  useEffect(() => {
    if (section === 'friends' && unreadSharesCount > 0) {
      markSharesSeen();
    }
  }, [section, unreadSharesCount, markSharesSeen]);

  // An incoming invite link jumps straight to the Friends section.
  useEffect(() => {
    if (pendingInviteCode) setSection('friends');
  }, [pendingInviteCode]);

  const tabs = [
    { key: 'overview' as const, label: t('app.social.sections.overview'), icon: User },
    { key: 'feed' as const, label: t('app.social.sections.feed') || 'Feed', icon: Flame },
    { key: 'leaderboard' as const, label: t('app.social.sections.leaderboard'), icon: Trophy },
    { key: 'friends' as const, label: t('app.social.sections.friends'), icon: Users },
  ];

  return (
    <div className="flex flex-col gap-6 pb-12">
      {/* Sticky Header & Tabs Container */}
      <div className="sticky top-[var(--app-sticky-top,0px)] z-30 -mx-4 px-4 pt-1 pb-3 bg-[#faf8f5]/95 dark:bg-[#0c0b0a]/95 backdrop-blur-md flex flex-col gap-3 border-none">
        <PageHeader
          title={section === 'settings' ? (t('app.social.sections.settings') || 'Einstellungen') : t('app.gamification.tabTitle')}
          subtitle={section === 'settings' ? t('app.settings.subtitle') : t('app.gamification.subtitle')}
          action={
            section === 'settings' ? (
              <button
                type="button"
                onClick={() => {
                  hapticLight();
                  setSection('overview');
                }}
                aria-label={t('recipe.back') || 'Zurück'}
                className="w-10 h-10 min-w-[40px] min-h-[40px] rounded-2xl flex items-center justify-center bg-black/[0.04] hover:bg-black/[0.08] dark:bg-white/[0.06] dark:hover:bg-white/[0.1] text-gray-600 dark:text-gray-300 active:scale-95 transition-all cursor-pointer border-none outline-none"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  hapticSelection();
                  setSection('settings');
                }}
                aria-label={t('app.social.sections.settings') || 'Einstellungen'}
                className="w-10 h-10 min-w-[40px] min-h-[40px] rounded-2xl flex items-center justify-center bg-black/[0.04] hover:bg-black/[0.08] dark:bg-white/[0.06] dark:hover:bg-white/[0.1] text-gray-600 dark:text-gray-300 active:scale-95 transition-all cursor-pointer border-none outline-none"
              >
                <Settings className="w-5 h-5" />
              </button>
            )
          }
        />

        {section !== 'settings' && (
          <div className="flex rounded-2xl bg-black/[0.04] p-1 dark:bg-white/[0.06] gap-1">
            {tabs.map((tab) => {
              const isActive = section === tab.key;
              const Icon = tab.icon;
              return (
                <Button
                  key={tab.key}
                  onPress={() => {
                    hapticSelection();
                    setSection(tab.key);
                  }}
                  className={`relative flex-1 rounded-xl py-2 px-3 min-h-[44px] text-xs sm:text-sm font-semibold border-none transition-all duration-200 cursor-pointer ${
                    isActive
                      ? 'bg-[#fdfbf7] text-gray-900 shadow-xs dark:bg-gray-800 dark:text-white font-bold'
                      : 'bg-transparent text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white font-medium'
                  }`}
                >
                  <span className="flex items-center justify-center gap-1.5 sm:gap-2">
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="truncate">{tab.label}</span>
                    {tab.key === 'friends' && friendsBadgeCount > 0 && (
                      <span className="flex h-4 min-w-[16px] items-center justify-center text-center leading-none rounded-full bg-rose-500 px-1 text-[10px] font-black text-white shadow-xs shrink-0">
                        {friendsBadgeCount}
                      </span>
                    )}
                  </span>
                </Button>
              );
            })}
          </div>
        )}
      </div>

      {section === 'overview' && <ProgressOverview onSelectRecipe={onSelectRecipe} />}
      {section === 'feed' && (
        <FriendsFeedView
          onGoToFriends={() => setSection('friends')}
          onGoToCookbook={() => {
            window.location.hash = '#/history';
          }}
        />
      )}
      {section === 'leaderboard' && <LeaderboardView />}
      {section === 'friends' && (
        <FriendsView pendingInviteCode={pendingInviteCode} onInviteConsumed={onInviteConsumed} />
      )}
      {section === 'settings' && <SettingsView />}
    </div>
  );
}
