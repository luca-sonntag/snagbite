import { Button } from '@heroui/react';
import { Trash2, Users, Share2 } from 'lucide-react';
import { useI18n } from '../../context/I18nContext';
import { useSocial } from '../../context/SocialContext';
import { useToast } from '../../context/ToastContext';
import { shareInviteCode } from '../../utils/invite';
import Avatar from './Avatar';

function getCulinaryRankKey(level: number): string {
  if (level <= 1) return 'level_1';
  if (level === 2) return 'level_2';
  if (level === 3) return 'level_3';
  if (level === 4) return 'level_4';
  if (level === 5) return 'level_5';
  return 'level_6';
}

export default function FriendsListSection() {
  const { t } = useI18n();
  const toast = useToast();
  const { friends, profile, removeFriend } = useSocial();

  const handleShare = async () => {
    if (!profile) return;
    await shareInviteCode({
      friendCode: profile.friendCode,
      inviteText: t('app.social.friends.inviteText', { code: profile.friendCode }),
      dialogTitle: t('app.social.friends.share'),
      onCopied: () => toast.success(t('toast.inviteCodeCopied')),
    });
  };

  return (
    <div>
      <h2 className="text-xs font-medium text-gray-500 dark:text-gray-400 font-sans px-0.5 mb-2">
        {t('app.social.friends.yourFriends')}
      </h2>

      {friends.length === 0 ? (
        <div className="flex flex-col items-center text-center py-6 px-4 gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-600">
            <Users className="w-6 h-6" />
          </div>
          <div className="max-w-xs">
            <p className="text-sm font-bold text-gray-900 dark:text-white">
              {t('app.social.friends.none')}
            </p>
          </div>
          <Button
            size="sm"
            onPress={handleShare}
            className="h-9 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs border-none active:scale-95 transition-all flex items-center gap-1.5"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>{t('app.social.friends.share')}</span>
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {friends.map((f) => {
            const rankKey = getCulinaryRankKey(f.level);
            const rankTitle = t(`app.gamification.ranks.${rankKey}`);
            const totalCooks = f.totalCooks ?? 0;

            return (
              <div
                key={f.friendshipId}
                className="flex items-center gap-3.5 py-3.5 px-1 bg-transparent transition-all"
              >
                <Avatar name={f.displayName} avatarUrl={f.avatarUrl} size={44} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="truncate font-bold text-gray-900 dark:text-white text-base">
                      {f.displayName}
                    </span>
                    <span className="shrink-0 text-gray-400 dark:text-gray-500 text-[10px]">·</span>
                    <span className="shrink-0 text-xs font-semibold text-gray-500 dark:text-gray-400">
                      {t('app.gamification.level', { level: f.level })}
                    </span>
                    <span className="shrink-0 text-gray-400 dark:text-gray-500 text-[10px]">·</span>
                    <span className="shrink-0 text-xs font-semibold text-gray-500 dark:text-gray-400">
                      {rankTitle}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-gray-500 dark:text-gray-400 font-medium">
                    {f.currentStreak > 0 && (
                      <span className="text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1">
                        🔥 {f.currentStreak}{' '}
                        {f.currentStreak === 1
                          ? t('app.gamification.weekSingle')
                          : t('app.gamification.weekPlural')}
                      </span>
                    )}
                    <span>
                      {totalCooks} {totalCooks === 1 ? 'Gericht' : 'Gerichte'}
                    </span>
                    {f.xp !== undefined && <span>{f.xp} XP</span>}
                  </div>
                </div>
                <Button
                  onPress={() => removeFriend(f.friendshipId)}
                  isIconOnly
                  aria-label={t('app.social.friends.remove')}
                  className="h-9 w-9 min-w-0 p-0 text-gray-400 hover:text-rose-500 bg-transparent hover:bg-rose-500/10 rounded-xl border-none active:scale-95 transition-all shrink-0"
                >
                  <Trash2 className="h-4.5 w-4.5" />
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
