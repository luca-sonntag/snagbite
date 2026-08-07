import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Flame, Coins, Utensils, Trophy, Lock, Sparkles, X, Camera, Check, ChefHat, UtensilsCrossed, Crown, Award } from 'lucide-react';
import { useI18n } from '../../context/I18nContext';
import { useGamification } from '../../context/GamificationContext';
import { progressPct, xpToNextLevel } from '../../utils/levels';
import { ALL_BADGE_KEYS, badgeEmoji, BADGE_XP } from '../../utils/badges';
import type { CookPhotoItem } from '../../types';

function getCulinaryRankKey(level: number): string {
  if (level <= 1) return 'level_1';
  if (level === 2) return 'level_2';
  if (level === 3) return 'level_3';
  if (level === 4) return 'level_4';
  if (level === 5) return 'level_5';
  return 'level_6';
}

function getRankIcon(level: number): ReactNode {
  if (level <= 1) return <Utensils className="h-6 w-6" />;
  if (level === 2) return <ChefHat className="h-6 w-6" />;
  if (level === 3) return <Sparkles className="h-6 w-6" />;
  if (level === 4) return <UtensilsCrossed className="h-6 w-6" />;
  if (level === 5) return <Trophy className="h-6 w-6" />;
  return <Crown className="h-6 w-6" />;
}

function getBadgeXpReward(key: string): number {
  return BADGE_XP[key] ?? 50;
}

function getBadgeProgressInfo(key: string, stats?: any): { current: number; total: number } | null {
  if (!stats) return null;
  const totalCooks = stats.totalCooks ?? 0;
  const streak = stats.currentStreak ?? 0;
  const distinctRecipes = stats.distinctRecipes ?? Math.min(totalCooks, 1);

  switch (key) {
    case 'first_cook': return { current: Math.min(totalCooks, 1), total: 1 };
    case 'cook_10': return { current: Math.min(totalCooks, 10), total: 10 };
    case 'cook_25': return { current: Math.min(totalCooks, 25), total: 25 };
    case 'cook_50': return { current: Math.min(totalCooks, 50), total: 50 };
    case 'cook_100': return { current: Math.min(totalCooks, 100), total: 100 };
    case 'streak_3': return { current: Math.min(streak, 3), total: 3 };
    case 'streak_7': return { current: Math.min(streak, 7), total: 7 };
    case 'streak_30': return { current: Math.min(streak, 30), total: 30 };
    case 'distinct_5': return { current: Math.min(distinctRecipes, 5), total: 5 };
    case 'distinct_10': return { current: Math.min(distinctRecipes, 10), total: 10 };
    case 'distinct_25': return { current: Math.min(distinctRecipes, 25), total: 25 };
    default: return null;
  }
}

export interface ProgressOverviewProps {
  onSelectRecipe?: (jobId: string) => void;
}

/**
 * Progress overview: level + XP bar, culinary rank, photo gallery, streak/coins/cooks
 * stat tiles and interactive badges grid.
 */
export default function ProgressOverview({ onSelectRecipe }: ProgressOverviewProps) {
  const { t } = useI18n();
  const { snapshot, refresh } = useGamification();

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [selectedBadgeKey, setSelectedBadgeKey] = useState<string | null>(null);
  const [showCoinsNotice, setShowCoinsNotice] = useState(false);
  const [showLeaderboardNotice, setShowLeaderboardNotice] = useState(false);

  const stats = snapshot?.stats;
  const thresholds = snapshot?.levelThresholds ?? [];
  const earnedMap = new Map((snapshot?.badges ?? []).map((b) => [b.key, b.earnedAt]));

  const level = stats?.level ?? 1;
  const xp = stats?.xp ?? 0;
  const fill = progressPct(xp, level, thresholds);
  const toNext = xpToNextLevel(xp, level, thresholds);
  const rankKey = getCulinaryRankKey(level);
  const rankTitle = t(`app.gamification.ranks.${rankKey}`);

  const recentPhotos: CookPhotoItem[] = snapshot?.recentPhotos ?? [];

  return (
    <div className="flex flex-col gap-6">
      {/* 1. Hero Level & Culinary Rank Card */}
      <div className="rounded-3xl bg-white dark:bg-gray-900 p-5 border-none shadow-[0_2px_6px_rgba(0,0,0,0.03)]">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-sm shrink-0">
              {getRankIcon(level)}
            </div>
            <div>
              <div className="text-xs font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                {rankTitle}
              </div>
              <h2 className="text-lg font-extrabold text-gray-900 dark:text-white">
                {t('app.gamification.level', { level })}
              </h2>
            </div>
          </div>

          <div className="text-right">
            <div className="text-2xl font-black tracking-tight text-emerald-600 dark:text-emerald-400">{xp}</div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
              {t('app.gamification.xp')}
            </div>
          </div>
        </div>

        <div className="mt-4 space-y-1.5">
          <div className="flex justify-between text-xs font-semibold text-gray-500 dark:text-gray-400">
            <span>{t('app.gamification.progressLabel') !== 'app.gamification.progressLabel' ? t('app.gamification.progressLabel') : 'Fortschritt'}</span>
            <span>
              {toNext == null
                ? t('app.gamification.maxLevel')
                : t('app.gamification.xpToNext', { xp: toNext, level: level + 1 })}
            </span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-emerald-500/15">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-[width] duration-700 ease-out"
              style={{ width: `${fill}%` }}
            />
          </div>
        </div>
      </div>

      {/* Stat Tiles (3 equal columns) */}
      <div className="grid grid-cols-3 gap-3">
        <StatTile
          icon={<Flame className="h-5 w-5" />}
          value={stats?.currentStreak ?? 0}
          label="W-Serie"
          accent="text-orange-500 bg-orange-500/10 dark:bg-orange-500/20"
        />

        <div className="relative h-full">
          <StatTile
            icon={<Coins className="h-5 w-5" />}
            value={stats?.coins ?? 0}
            label="Punkte"
            accent="text-amber-500 bg-amber-500/10 dark:bg-amber-500/20"
            onClick={() => {
              setShowCoinsNotice(true);
              setTimeout(() => setShowCoinsNotice(false), 3000);
            }}
          />

          {showCoinsNotice && (
            <div className="absolute left-1/2 -bottom-10 -translate-x-1/2 z-20 whitespace-nowrap rounded-xl bg-gray-900 dark:bg-gray-100 px-3 py-1.5 text-xs font-bold text-white dark:text-gray-900 shadow-lg animate-in fade-in zoom-in-95 duration-150">
              {t('app.gamification.coinsNotice')}
            </div>
          )}
        </div>

        <StatTile
          icon={<Utensils className="h-5 w-5" />}
          value={stats?.totalCooks ?? 0}
          label="Gekocht"
          accent="text-emerald-500 bg-emerald-500/10 dark:bg-emerald-500/20"
        />
      </div>

      {/* Leaderboard teaser */}
      <div className="relative">
        <button
          type="button"
          onClick={() => {
            setShowLeaderboardNotice(true);
            setTimeout(() => setShowLeaderboardNotice(false), 3000);
          }}
          className="w-full flex items-center gap-3.5 rounded-3xl bg-white dark:bg-gray-900 p-4 text-left border-none shadow-[0_2px_6px_rgba(0,0,0,0.03)] transition-all active:scale-[0.98] cursor-pointer outline-none"
        >
          <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl text-amber-500 bg-amber-500/10 dark:bg-amber-500/20">
            <Trophy className="h-5 w-5" />
            <div className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-white">
              <Lock className="h-2.5 w-2.5" />
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-bold text-gray-900 dark:text-white">
              {t('app.gamification.leaderboardTitle')}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
              {t('app.gamification.leaderboardSubtitle', { xp })}
            </div>
          </div>
          <div className="shrink-0 text-[10px] font-extrabold text-amber-600 dark:text-amber-400 bg-amber-500/10 dark:bg-amber-500/20 px-2.5 py-1 rounded-full leading-tight">
            {t('app.gamification.leaderboardComingSoon')}
          </div>
        </button>

        {showLeaderboardNotice && (
          <div className="absolute left-1/2 -bottom-10 -translate-x-1/2 z-20 max-w-[90%] w-max text-center rounded-xl bg-gray-900 dark:bg-gray-100 px-3 py-1.5 text-xs font-bold text-white dark:text-gray-900 shadow-lg animate-in fade-in zoom-in-95 duration-150">
            {t('app.gamification.leaderboardNotice')}
          </div>
        )}
      </div>

      {/* 2. "Deine Koch-Galerie" (Food Photo Feed) */}
      <div className="rounded-3xl bg-white dark:bg-gray-900 p-5 border-none shadow-[0_2px_6px_rgba(0,0,0,0.03)] space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Camera className="h-4.5 w-4.5 text-emerald-500" />
            <span>{t('app.gamification.galleryTitle')}</span>
          </h2>
          {recentPhotos.length > 0 && (
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
              {recentPhotos.length} {recentPhotos.length === 1 ? 'Foto' : 'Fotos'}
            </span>
          )}
        </div>

        {recentPhotos.length > 0 ? (
          <div className="flex gap-3 overflow-x-auto pb-1 pt-1 scrollbar-none">
            {recentPhotos.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectRecipe?.(item.jobId)}
                className="group relative h-40 w-32 shrink-0 overflow-hidden rounded-2xl bg-gray-100 dark:bg-gray-800 transition-transform active:scale-95 text-left cursor-pointer outline-none border-none"
              >
                <img
                  src={item.photoUrl}
                  alt={item.recipeTitle || 'Dish'}
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-2.5 flex flex-col justify-end text-white">
                  <p className="text-xs font-bold line-clamp-2 leading-tight">
                    {item.recipeTitle}
                  </p>
                  <p className="text-[10px] text-gray-300 mt-0.5">
                    {new Date(item.cookedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </p>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl bg-emerald-500/5 dark:bg-emerald-500/10 p-4 text-center space-y-1">
            <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
              {t('app.gamification.galleryEmpty')}
            </p>
          </div>
        )}
      </div>

      {/* 3. Badges Grid (Flat & Clean) */}
      <div className="rounded-3xl bg-white dark:bg-gray-900 p-5 border-none shadow-[0_2px_6px_rgba(0,0,0,0.03)] space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Award className="h-4.5 w-4.5 text-emerald-500" />
            <span>{t('app.gamification.badgesTitle')}</span>
          </h2>
          <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
            {earnedMap.size} / {ALL_BADGE_KEYS.length}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {ALL_BADGE_KEYS.map((key) => {
            const isEarned = earnedMap.has(key);
            const progress = getBadgeProgressInfo(key, stats);

            return (
              <button
                key={key}
                type="button"
                onClick={() => setSelectedBadgeKey(key)}
                className={`flex flex-col items-center justify-center min-h-[115px] gap-1.5 p-3 text-center transition-all cursor-pointer outline-none active:scale-95 rounded-2xl ${isEarned
                  ? 'bg-emerald-500/10 dark:bg-emerald-500/15 text-emerald-800 dark:text-emerald-200'
                  : 'bg-gray-100 dark:bg-white/5 opacity-65 hover:opacity-85 text-gray-400'
                  }`}
              >
                <div className="relative">
                  <div className={`text-2xl ${!isEarned ? 'grayscale opacity-75' : ''}`}>
                    {badgeEmoji(key)}
                  </div>
                  {!isEarned && (
                    <div className="absolute -bottom-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-gray-400 text-white">
                      <Lock className="h-2 w-2" />
                    </div>
                  )}
                </div>

                <span className={`text-[10.5px] font-bold leading-tight ${isEarned ? 'text-emerald-950 dark:text-emerald-100' : 'text-gray-500 dark:text-gray-400'}`}>
                  {t(`app.gamification.badges.${key}`)}
                </span>

                {!isEarned && progress && progress.total > 1 && (
                  <span className="text-[9px] font-extrabold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 dark:bg-emerald-500/20 px-1.5 py-0.5 rounded-full">
                    {progress.current}/{progress.total}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Interactive Badge Details Sheet */}
      {selectedBadgeKey && (
        <BadgeDetailModal
          badgeKey={selectedBadgeKey}
          earnedAt={earnedMap.get(selectedBadgeKey)}
          stats={stats}
          onClose={() => setSelectedBadgeKey(null)}
        />
      )}
    </div>
  );
}

function StatTile({
  icon,
  value,
  label,
  accent,
  onClick,
}: {
  icon: ReactNode;
  value: number;
  label: string;
  accent: string;
  onClick?: () => void;
}) {
  const content = (
    <>
      <div className={`flex h-9 w-9 items-center justify-center rounded-2xl ${accent}`}>
        {icon}
      </div>
      <div className="text-lg font-black text-gray-900 dark:text-white">{value}</div>
      <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 truncate w-full">{label}</div>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="flex flex-col items-center justify-between gap-1.5 rounded-3xl bg-white dark:bg-gray-900 p-4 text-center border-none shadow-[0_2px_6px_rgba(0,0,0,0.03)] transition-all active:scale-95 cursor-pointer w-full h-full"
      >
        {content}
      </button>
    );
  }

  return (
    <div className="flex flex-col items-center justify-between gap-1.5 rounded-3xl bg-white dark:bg-gray-900 p-4 text-center border-none shadow-[0_2px_6px_rgba(0,0,0,0.03)] w-full h-full">
      {content}
    </div>
  );
}

function BadgeDetailModal({
  badgeKey,
  earnedAt,
  stats,
  onClose,
}: {
  badgeKey: string;
  earnedAt?: string;
  stats?: any;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const isEarned = !!earnedAt;
  const progress = getBadgeProgressInfo(badgeKey, stats);
  const xpReward = getBadgeXpReward(badgeKey);

  const title = t(`app.gamification.badges.${badgeKey}`);
  const description = t(`app.gamification.badgeDesc.${badgeKey}`);

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4 sm:p-6 transition-opacity animate-in fade-in duration-200">
      <div className="relative w-full max-w-sm rounded-3xl bg-white dark:bg-gray-900 p-6 text-gray-900 dark:text-white shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 text-center space-y-4">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-full bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Badge Icon */}
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 text-4xl shadow-inner">
          <span className={!isEarned ? 'grayscale opacity-75' : ''}>
            {badgeEmoji(badgeKey)}
          </span>
        </div>

        <div>
          <div className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider mb-1">
            {isEarned ? (
              <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <Check className="w-3.5 h-3.5" />
                {t('app.gamification.badgeDetail.statusUnlocked')}
              </span>
            ) : (
              <span className="text-gray-400 flex items-center gap-1">
                <Lock className="w-3.5 h-3.5" />
                {t('app.gamification.badgeDetail.statusLocked')}
              </span>
            )}
          </div>
          <h3 className="text-xl font-extrabold">{title}</h3>
          <p className="mt-2 text-xs text-gray-600 dark:text-gray-300 leading-relaxed max-w-xs mx-auto">
            {description}
          </p>
        </div>

        {/* Progress or Earned Date */}
        {!isEarned && progress && (
          <div className="rounded-2xl bg-gray-100 dark:bg-white/5 p-3.5 space-y-2">
            <div className="flex justify-between text-xs font-semibold text-gray-600 dark:text-gray-300">
              <span>{t('app.gamification.badgeDetail.progressLabel', { current: progress.current, total: progress.total })}</span>
              <span>{Math.round((progress.current / progress.total) * 100)}%</span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-white/10">
              <div
                className="h-full rounded-full bg-emerald-500 transition-[width] duration-500"
                style={{ width: `${(progress.current / progress.total) * 100}%` }}
              />
            </div>
          </div>
        )}

        {isEarned && earnedAt && (
          <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
            {t('app.gamification.badgeDetail.unlockedOn', { date: new Date(earnedAt).toLocaleDateString() })}
          </p>
        )}

        {/* Reward info */}
        <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-4 py-1.5 text-xs font-extrabold text-amber-600 dark:text-amber-400">
          <Sparkles className="w-4 h-4 text-amber-500" />
          <span>{t('app.gamification.badgeDetail.reward', { xp: xpReward })}</span>
        </div>
      </div>
    </div>,
    document.body,
  );
}
