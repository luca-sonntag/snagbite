import { useEffect, useState } from 'react';
import { Button, Spinner } from '@heroui/react';
import { UserPlus, Clock, Check } from 'lucide-react';
import { useI18n } from '../../context/I18nContext';
import { useSocial } from '../../context/SocialContext';
import type { LeaderboardEntry, LeaderboardWindow, LeaderboardScope } from '../../types';
import Avatar from './Avatar';

function medal(rank: number): string | null {
  if (rank === 1) return '🥇';
  if (rank === 2) return '🥈';
  if (rank === 3) return '🥉';
  return null;
}

export default function LeaderboardView() {
  const { t } = useI18n();
  const { fetchLeaderboard, sendRequestByUserId, respondRequest } = useSocial();
  const [scope, setScope] = useState<LeaderboardScope>('friends');
  const [range, setRange] = useState<LeaderboardWindow>('monthly');
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionBusyMap, setActionBusyMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetchLeaderboard(range, scope)
      .then((data) => { if (active) setEntries(data); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [fetchLeaderboard, range, scope]);

  const handleSendRequest = async (targetUserId: string) => {
    setActionBusyMap((prev) => ({ ...prev, [targetUserId]: true }));
    try {
      const status = await sendRequestByUserId(targetUserId);
      setEntries((prev) =>
        prev.map((e) =>
          e.userId === targetUserId
            ? { ...e, friendshipStatus: status === 'accepted' ? 'friends' : 'pending_sent' }
            : e,
        ),
      );
    } catch (err) {
      console.warn('Failed to send friend request from leaderboard:', err);
    } finally {
      setActionBusyMap((prev) => ({ ...prev, [targetUserId]: false }));
    }
  };

  const handleAcceptRequest = async (friendshipId: string, targetUserId: string) => {
    setActionBusyMap((prev) => ({ ...prev, [targetUserId]: true }));
    try {
      await respondRequest(friendshipId, true);
      setEntries((prev) =>
        prev.map((e) =>
          e.userId === targetUserId
            ? { ...e, friendshipStatus: 'friends' }
            : e,
        ),
      );
    } catch (err) {
      console.warn('Failed to accept request from leaderboard:', err);
    } finally {
      setActionBusyMap((prev) => ({ ...prev, [targetUserId]: false }));
    }
  };

  const onlyMe = !loading && entries.length <= 1 && scope === 'friends';
  const emptyGlobal = !loading && entries.length === 0 && scope === 'global';

  return (
    <div className="flex flex-col gap-4">
      {/* Toggles (Scope & Range) */}
      <div className="grid grid-cols-2 gap-2">
        {/* Scope: Friends vs Global */}
        <div className="flex rounded-2xl bg-gray-100 p-1 dark:bg-gray-900 shadow-[0_2px_6px_rgba(0,0,0,0.03)]">
          {(['friends', 'global'] as LeaderboardScope[]).map((s) => {
            const isActive = scope === s;
            return (
              <Button
                key={s}
                onPress={() => setScope(s)}
                className={`flex-1 rounded-xl py-2 h-9 text-xs sm:text-sm font-semibold border-none transition-all duration-200 cursor-pointer ${
                  isActive
                    ? 'bg-white text-gray-900 shadow-[0_2px_6px_rgba(0,0,0,0.03)] dark:bg-gray-800 dark:text-white'
                    : 'bg-transparent text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
                }`}
              >
                {t(s === 'friends' ? 'app.social.leaderboard.scopeFriends' : 'app.social.leaderboard.scopeGlobal')}
              </Button>
            );
          })}
        </div>

        {/* Range: Monthly vs All-Time */}
        <div className="flex rounded-2xl bg-gray-100 p-1 dark:bg-gray-900 shadow-[0_2px_6px_rgba(0,0,0,0.03)]">
          {(['monthly', 'all'] as LeaderboardWindow[]).map((w) => {
            const isActive = range === w;
            return (
              <Button
                key={w}
                onPress={() => setRange(w)}
                className={`flex-1 rounded-xl py-2 h-9 text-xs sm:text-sm font-semibold border-none transition-all duration-200 cursor-pointer ${
                  isActive
                    ? 'bg-white text-gray-900 shadow-[0_2px_6px_rgba(0,0,0,0.03)] dark:bg-gray-800 dark:text-white'
                    : 'bg-transparent text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
                }`}
              >
                {t(w === 'monthly' ? 'app.social.leaderboard.monthly' : 'app.social.leaderboard.allTime')}
              </Button>
            );
          })}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner size="md" color="success" />
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {entries.map((e) => {
            const isBusy = !!actionBusyMap[e.userId];

            return (
              <div
                key={e.userId}
                className={`flex items-center gap-3 rounded-2xl border-none p-3.5 transition-all shadow-[0_2px_6px_rgba(0,0,0,0.03)] ${
                  e.isMe
                    ? 'bg-emerald-500/10 dark:bg-emerald-500/15'
                    : 'bg-white dark:bg-gray-900'
                }`}
              >
                <div className="w-7 text-center text-base font-extrabold text-gray-500 dark:text-gray-400 shrink-0">
                  {medal(e.rank) ?? e.rank}
                </div>
                <Avatar name={e.displayName} avatarUrl={e.avatarUrl} size={40} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="truncate font-bold text-gray-900 dark:text-white text-sm">
                      {e.displayName}
                    </span>
                    {e.isMe && (
                      <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/15 px-1.5 py-0.5 rounded-full shrink-0">
                        {t('app.social.leaderboard.you')}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                    <span>{t('app.gamification.level', { level: e.level })}</span>

                    {/* Friend action / status in global mode */}
                    {scope === 'global' && !e.isMe && (
                      <div className="flex items-center">
                        {e.friendshipStatus === 'friends' && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 dark:bg-emerald-500/15 px-2 py-0.5 rounded-full">
                            <Check className="w-2.5 h-2.5" />
                            {t('app.social.leaderboard.friends')}
                          </span>
                        )}
                        {e.friendshipStatus === 'pending_sent' && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
                            <Clock className="w-2.5 h-2.5" />
                            {t('app.social.leaderboard.requested')}
                          </span>
                        )}
                        {e.friendshipStatus === 'pending_received' && e.friendshipId && (
                          <Button
                            size="sm"
                            onPress={() => handleAcceptRequest(e.friendshipId!, e.userId)}
                            isDisabled={isBusy}
                            className="h-5 px-2 text-[10px] font-bold rounded-full bg-emerald-600 hover:bg-emerald-500 text-white border-none cursor-pointer active:scale-95 transition-all"
                          >
                            {isBusy ? <Spinner size="sm" color="current" /> : t('app.social.leaderboard.accept')}
                          </Button>
                        )}
                        {(!e.friendshipStatus || e.friendshipStatus === 'none') && (
                          <Button
                            size="sm"
                            onPress={() => handleSendRequest(e.userId)}
                            isDisabled={isBusy}
                            className="h-5 px-2 text-[10px] font-bold rounded-full bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-none cursor-pointer active:scale-95 transition-all flex items-center gap-0.5"
                          >
                            {isBusy ? (
                              <Spinner size="sm" color="current" />
                            ) : (
                              <>
                                <UserPlus className="w-2.5 h-2.5" />
                                {t('app.social.leaderboard.addFriend')}
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-base font-black text-emerald-600 dark:text-emerald-400">{e.value}</div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">
                    {t('app.gamification.xp')}
                  </div>
                </div>
              </div>
            );
          })}

          {onlyMe && (
            <p className="mt-3 text-center text-sm text-gray-500 dark:text-gray-400">
              {t('app.social.leaderboard.empty')}
            </p>
          )}

          {emptyGlobal && (
            <p className="mt-3 text-center text-sm text-gray-500 dark:text-gray-400">
              {t('app.social.leaderboard.emptyGlobal')}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
