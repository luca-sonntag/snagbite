import { useState, useCallback } from 'react';
import { Button } from '@heroui/react';
import { Bookmark, BookmarkCheck, ExternalLink, Sparkles } from 'lucide-react';
import { useI18n } from '../../context/I18nContext';
import { hapticLight, hapticMedium } from '../../utils/haptics';
import Avatar from './Avatar';
import type { FriendFeedItem, FeedReactionEmoji, Recipe } from '../../types';

interface FeedEventCardProps {
  item: FriendFeedItem;
  onReact: (cookEventId: string, emoji: FeedReactionEmoji) => void;
  onOpenRecipe: (recipe: Recipe) => void;
  onSaveRecipe: (recipeId: string) => Promise<void>;
}

function formatRelativeTime(dateIso: string, t: (k: string, p?: any) => string): string {
  const d = new Date(dateIso);
  const now = Date.now();
  const diffSec = Math.floor((now - d.getTime()) / 1000);

  if (diffSec < 60) return t('app.social.feed.cookedJustNow');
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return t('app.social.feed.minutesAgo', { count: diffMin });
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return t('app.social.feed.hoursAgo', { count: diffHours });
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays <= 7) return t('app.social.feed.daysAgo', { count: diffDays });
  return d.toLocaleDateString();
}

export default function FeedEventCard({
  item,
  onReact,
  onOpenRecipe,
  onSaveRecipe,
}: FeedEventCardProps) {
  const { t } = useI18n();
  const [saving, setSaving] = useState(false);

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

  return (
    <article className="flex flex-col gap-3 rounded-3xl bg-white dark:bg-gray-900 p-4 shadow-[0_2px_12px_rgba(0,0,0,0.04)] border-none">
      {/* Header: Author & Time */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Avatar name={item.user.displayName} avatarUrl={item.user.avatarUrl} size={42} />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-heading font-bold text-gray-900 dark:text-white text-sm truncate">
                {item.user.displayName}
              </span>
              <span className="shrink-0 text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                {t('app.gamification.level', { level: item.user.level })}
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {formatRelativeTime(item.cookedAt, t)}
            </p>
          </div>
        </div>

        {item.xpAwarded > 0 && (
          <div className="flex items-center gap-1 text-xs font-black text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 dark:bg-emerald-500/15 px-2.5 py-1 rounded-full shrink-0">
            <Sparkles className="w-3.5 h-3.5" />
            <span>+{item.xpAwarded} XP</span>
          </div>
        )}
      </div>

      {/* Hero Cooked Dish Photo */}
      <div className="relative aspect-4/3 sm:aspect-16/10 w-full rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-800 shadow-2xs">
        <img
          src={item.photoUrl}
          alt={item.recipe.title}
          loading="lazy"
          className="w-full h-full object-cover"
        />

        {/* Integrated Recipe Scrim Dock at bottom */}
        <div className="absolute inset-x-0 bottom-0 p-3.5 pt-10 bg-gradient-to-t from-black/85 via-black/40 via-55% to-transparent flex items-end justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="font-heading font-bold text-white text-sm sm:text-base line-clamp-1 leading-snug drop-shadow-sm">
              {item.recipe.title}
            </h3>
            {item.recipe.prepTime && (
              <span className="text-[11px] font-medium text-white/80">
                {item.recipe.prepTime} Min.
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              onPress={() => {
                hapticLight();
                onOpenRecipe(item.recipe);
              }}
              className="h-9 px-3 rounded-xl bg-white/95 hover:bg-white text-gray-950 font-bold text-xs border-none cursor-pointer active:scale-95 transition-all shadow-sm flex items-center gap-1.5"
            >
              <ExternalLink className="w-3.5 h-3.5 text-gray-950" />
              <span>{t('app.social.feed.viewRecipe')}</span>
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

      {/* Tactile Emoji Reaction Pills */}
      <div className="flex items-center gap-2 pt-0.5">
        {item.reactions.map((r) => {
          const isReacted = r.reactedByMe;
          return (
            <button
              key={r.emoji}
              type="button"
              onClick={() => onReact(item.cookEventId, r.emoji)}
              className={`min-h-[40px] px-3.5 py-1.5 rounded-full text-xs font-bold border-none transition-all duration-150 cursor-pointer flex items-center gap-1.5 select-none active:scale-90 ${
                isReacted
                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 shadow-2xs font-black'
                  : 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 font-semibold'
              }`}
            >
              <span className="text-sm leading-none">{r.emoji}</span>
              {r.count > 0 && <span>{r.count}</span>}
            </button>
          );
        })}
      </div>
    </article>
  );
}
