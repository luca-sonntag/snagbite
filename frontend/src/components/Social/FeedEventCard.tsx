import { useState, useCallback } from 'react';
import { Button } from '@heroui/react';
import { Bookmark, BookmarkCheck, ExternalLink } from 'lucide-react';
import { useI18n } from '../../context/I18nContext';
import { useSocial } from '../../context/SocialContext';
import { hapticLight, hapticMedium, hapticSelection } from '../../utils/haptics';
import Avatar from './Avatar';
import CachedImage from '../CachedImage';
import { formatSmartDate } from './socialFormatters';
import type { FriendFeedItem, FeedReactionEmoji, Recipe } from '../../types';

interface FeedEventCardProps {
  item: FriendFeedItem;
  onReact: (cookEventId: string, emoji: FeedReactionEmoji) => void;
  onOpenRecipe: (recipe: Recipe) => void;
  onSaveRecipe: (recipeId: string) => Promise<void>;
}

export default function FeedEventCard({
  item,
  onReact,
  onOpenRecipe,
  onSaveRecipe,
}: FeedEventCardProps) {
  const { t, language } = useI18n();
  const { profile } = useSocial();
  const [saving, setSaving] = useState(false);
  const [bouncingEmoji, setBouncingEmoji] = useState<string | null>(null);

  const recipeCoverUrl = item.recipe.imageUrl || item.recipe.imageUrls?.[0];
  const totalTime = (item.recipe.prepTime || 0) + (item.recipe.cookTime || 0) || item.recipe.prepTime;
  const rawCalories = item.recipe.nutritionalValues?.calories ?? item.recipe.sourceNutritionalValues?.calories;
  const calories = rawCalories ? Math.round(Number(rawCalories)) : null;

  const metaParts: string[] = [];
  if (totalTime) metaParts.push(`${totalTime} Min.`);
  if (calories && calories > 0) metaParts.push(`${calories} kcal`);

  const handleSave = useCallback(async () => {
    if (!item.recipe?.id || item.isRecipeSaved || saving) return;
    hapticMedium();
    setSaving(true);
    try {
      await onSaveRecipe(item.recipe.id);
    } finally {
      setSaving(false);
    }
  }, [item.isRecipeSaved, item.recipe?.id, onSaveRecipe, saving]);

  const handleReactionClick = (emoji: FeedReactionEmoji) => {
    hapticSelection();
    setBouncingEmoji(emoji);
    setTimeout(() => setBouncingEmoji((prev) => (prev === emoji ? null : prev)), 350);
    onReact(item.cookEventId, emoji);
  };

  const getReactorAvatars = (emoji: FeedReactionEmoji, reactedByMe: boolean) => {
    const list: { key: string; displayName: string; avatarUrl: string | null }[] = [];
    if (reactedByMe && profile) {
      list.push({
        key: `me-${profile.userId || 'self'}`,
        displayName: profile.displayName || 'Ich',
        avatarUrl: profile.avatarUrl || null,
      });
    }
    for (const r of item.recentReactors || []) {
      if (r.emoji === emoji && r.userId !== profile?.userId) {
        if (!list.some((existing) => existing.key === r.userId)) {
          list.push({
            key: r.userId,
            displayName: r.displayName,
            avatarUrl: r.avatarUrl,
          });
        }
      }
    }
    return list.slice(0, 3);
  };

  return (
    <article className="flex flex-col">
      {/* Header: Author & Time */}
      <div className="px-1 pt-1 pb-2.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Avatar name={item.user.displayName} avatarUrl={item.user.avatarUrl} size={42} />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="font-bold text-gray-900 dark:text-white text-sm truncate font-sans">
                {item.user.displayName}
              </span>
              <span className="shrink-0 text-gray-400 dark:text-gray-500 text-[10px]">·</span>
              <span className="shrink-0 text-xs font-semibold text-gray-500 dark:text-gray-400">
                {t('app.gamification.level', { level: item.user.level })}
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 font-medium">
              {formatSmartDate(item.cookedAt, language)}
            </p>
          </div>
        </div>
      </div>

      {/* Hero Cooked Dish Photo — Soft Rounded Corners */}
      <div>
        <div className="relative aspect-4/3 sm:aspect-16/10 w-full rounded-2xl overflow-hidden bg-black/5 dark:bg-white/5 shadow-[0_4px_14px_rgba(0,0,0,0.06)]">
          <CachedImage
            src={item.photoUrl}
            alt={item.recipe.title}
            className="w-full h-full object-cover"
          />

          {/* Original Recipe Cover Thumbnail (PiP top right, 2x size) */}
          {recipeCoverUrl ? (
            <button
              type="button"
              onClick={() => {
                hapticLight();
                onOpenRecipe(item.recipe);
              }}
              aria-label={item.recipe.title}
              className="absolute top-3 right-3 z-10 w-[88px] h-[88px] sm:w-[96px] sm:h-[96px] rounded-full ring-[2.5px] ring-white/95 dark:ring-gray-900/95 shadow-xl overflow-hidden bg-gray-100 dark:bg-gray-800 p-0 border-none cursor-pointer active:scale-95 transition-transform"
            >
              <CachedImage
                src={recipeCoverUrl}
                alt={item.recipe.title}
                emoji={item.recipe.emoji}
                className="w-full h-full object-cover"
              />
            </button>
          ) : item.recipe.emoji ? (
            <button
              type="button"
              onClick={() => {
                hapticLight();
                onOpenRecipe(item.recipe);
              }}
              aria-label={item.recipe.title}
              className="absolute top-3 right-3 z-10 w-[88px] h-[88px] sm:w-[96px] sm:h-[96px] rounded-full ring-[2.5px] ring-white/95 dark:ring-gray-900/95 shadow-xl overflow-hidden bg-white/90 dark:bg-gray-800/90 backdrop-blur-md p-0 border-none cursor-pointer active:scale-95 transition-transform flex items-center justify-center text-3xl"
            >
              <span>{item.recipe.emoji}</span>
            </button>
          ) : null}

          {/* Integrated Recipe Scrim Dock at bottom */}
          <div className="absolute inset-x-0 bottom-0 p-3.5 pt-12 bg-gradient-to-t from-black/90 via-black/45 via-50% to-transparent flex items-end justify-between gap-3">
            <div
              className="min-w-0 flex-1 cursor-pointer select-none pr-1"
              onClick={() => {
                hapticLight();
                onOpenRecipe(item.recipe);
              }}
            >
              <h3 className="font-heading font-bold text-white text-sm sm:text-base line-clamp-2 break-words leading-snug drop-shadow-sm">
                {item.recipe.title}
              </h3>
              {metaParts.length > 0 && (
                <p className="text-[11px] sm:text-xs font-semibold text-white/90 drop-shadow-xs mt-0.5 flex items-center gap-1.5">
                  {metaParts.map((part, idx) => (
                    <span key={idx} className="flex items-center gap-1.5">
                      {idx > 0 && <span className="opacity-60 text-[9px]">·</span>}
                      <span>{part}</span>
                    </span>
                  ))}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                size="sm"
                isIconOnly
                onPress={() => {
                  hapticLight();
                  onOpenRecipe(item.recipe);
                }}
                aria-label={t('app.social.feed.viewRecipe')}
                className="h-9 w-9 min-w-[36px] rounded-xl bg-white/95 hover:bg-white text-gray-950 border-none cursor-pointer active:scale-95 transition-all shadow-sm flex items-center justify-center backdrop-blur-md"
              >
                <ExternalLink className="w-4 h-4 text-gray-950" />
              </Button>

              <Button
                size="sm"
                isIconOnly
                onPress={handleSave}
                isDisabled={item.isRecipeSaved || saving}
                aria-label={t('app.social.feed.saveRecipe')}
                className={`h-9 w-9 min-w-[36px] rounded-xl border-none cursor-pointer active:scale-95 transition-all shadow-sm flex items-center justify-center ${
                  item.isRecipeSaved
                    ? 'bg-emerald-600 text-white'
                    : 'bg-black/60 hover:bg-black/80 text-white backdrop-blur-md'
                }`}
              >
                {item.isRecipeSaved ? (
                  <BookmarkCheck className="w-4 h-4 text-white" />
                ) : (
                  <Bookmark className="w-4 h-4 text-white" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Social Footer: Emoji Reactions with Dynamic Usericon Badges */}
      <div className="px-1 pt-3 pb-1 flex items-center gap-3">
        {item.reactions.map((r) => {
          const isReacted = r.reactedByMe;
          const isBouncing = bouncingEmoji === r.emoji;
          const reactorAvatars = getReactorAvatars(r.emoji, isReacted);

          return (
            <button
              key={r.emoji}
              type="button"
              onClick={() => handleReactionClick(r.emoji)}
              className={`relative min-h-[40px] px-4 py-1.5 rounded-full text-xs font-bold border-none transition-all duration-150 cursor-pointer flex items-center gap-1.5 select-none active:scale-90 ${
                isReacted
                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 shadow-2xs font-black'
                  : 'bg-black/[0.04] hover:bg-black/[0.08] dark:bg-white/[0.06] dark:hover:bg-white/[0.1] text-gray-600 dark:text-gray-300 font-semibold'
              }`}
            >
              <span
                className={`text-sm leading-none transition-transform duration-200 inline-block ${
                  isBouncing ? 'scale-140 -translate-y-0.5' : ''
                }`}
              >
                {r.emoji}
              </span>
              {r.count > 0 && <span>{r.count}</span>}

              {/* Overlapping reactor avatars (max 3) in top right corner */}
              {reactorAvatars.length > 0 && (
                <span className="absolute -top-1.5 -right-2 z-10 flex items-center -space-x-1.5 pointer-events-none transition-all duration-200">
                  {reactorAvatars.map((u, idx) => (
                    <span
                      key={u.key}
                      className="rounded-full ring-2 ring-white dark:ring-gray-900 shadow-2xs overflow-hidden inline-flex"
                      style={{ zIndex: idx + 1 }}
                    >
                      <Avatar
                        name={u.displayName}
                        avatarUrl={u.avatarUrl}
                        size={16}
                      />
                    </span>
                  ))}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </article>
  );
}
