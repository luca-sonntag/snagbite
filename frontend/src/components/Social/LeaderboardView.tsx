import { useEffect, useState } from 'react';
import { useI18n } from '../../context/I18nContext';
import { useSocial } from '../../context/SocialContext';
import type { LeaderboardEntry, LeaderboardWindow } from '../../types';
import Avatar from './Avatar';

/** Friends-and-me leaderboard with a weekly / all-time toggle. */
export default function LeaderboardView() {
  const { t } = useI18n();
  const { fetchLeaderboard } = useSocial();
  const [range, setRange] = useState<LeaderboardWindow>('weekly');
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetchLeaderboard(range)
      .then((e) => { if (active) setEntries(e); })
      .catch(() => { /* handled in context */ })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [range, fetchLeaderboard]);

  const medal = (rank: number) => (rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : null);
  const onlyMe = !loading && entries.length <= 1;

  return (
    <div className="flex flex-col gap-4">
      {/* Weekly / all-time toggle */}
      <div className="flex rounded-2xl bg-black/5 p-1 dark:bg-white/5">
        {(['weekly', 'all'] as LeaderboardWindow[]).map((w) => (
          <button
            key={w}
            type="button"
            onClick={() => setRange(w)}
            className={`flex-1 rounded-xl py-2 text-sm font-semibold transition-colors ${
              range === w
                ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-800 dark:text-white'
                : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            {t(w === 'weekly' ? 'app.social.leaderboard.weekly' : 'app.social.leaderboard.allTime')}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {entries.map((e) => (
            <div
              key={e.userId}
              className={`flex items-center gap-3 rounded-2xl border p-3 ${
                e.isMe
                  ? 'border-emerald-500/40 bg-emerald-500/5'
                  : 'border-black/5 bg-white dark:border-white/10 dark:bg-gray-900'
              }`}
            >
              <div className="w-7 text-center text-base font-bold text-gray-500 dark:text-gray-400">
                {medal(e.rank) ?? e.rank}
              </div>
              <Avatar name={e.displayName} avatarUrl={e.avatarUrl} size={36} />
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold text-gray-900 dark:text-white">
                  {e.displayName}
                  {e.isMe && (
                    <span className="ml-1 text-xs font-normal text-emerald-600 dark:text-emerald-400">
                      ({t('app.social.leaderboard.you')})
                    </span>
                  )}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {t('app.gamification.level', { level: e.level })}
                </div>
              </div>
              <div className="text-right">
                <div className="font-black text-emerald-600 dark:text-emerald-400">{e.value}</div>
                <div className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                  {t('app.gamification.xp')}
                </div>
              </div>
            </div>
          ))}

          {onlyMe && (
            <p className="mt-3 text-center text-sm text-gray-500 dark:text-gray-400">
              {t('app.social.leaderboard.empty')}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
