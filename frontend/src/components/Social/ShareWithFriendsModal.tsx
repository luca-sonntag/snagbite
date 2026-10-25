import { useState, useCallback } from 'react';
import { Button } from '@heroui/react';
import { X, Send, Check, Users, Share2, ExternalLink } from 'lucide-react';
import { useI18n } from '../../context/I18nContext';
import { useSocial } from '../../context/SocialContext';
import { useToast } from '../../context/ToastContext';
import { useModalOverlay } from '../../context/OverlayStackContext';
import { hapticLight, hapticNotification, hapticSelection } from '../../utils/haptics';
import { shareRecipeExternally } from '../../utils/shareRecipeExternally';
import Avatar from './Avatar';
import type { Recipe } from '../../types';

interface ShareWithFriendsModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipe: Recipe;
  reelUrl?: string;
}

export default function ShareWithFriendsModal({
  isOpen,
  onClose,
  recipe,
  reelUrl,
}: ShareWithFriendsModalProps) {
  const { t } = useI18n();
  const toast = useToast();
  const { friends, profile, shareRecipeWithFriends } = useSocial();
  const [selectedFriendIds, setSelectedFriendIds] = useState<Set<string>>(new Set());
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sharingExternally, setSharingExternally] = useState(false);

  useModalOverlay(isOpen, onClose);

  const handleExternalShare = async () => {
    hapticLight();
    setSharingExternally(true);
    try {
      const result = await shareRecipeExternally({
        recipe,
        reelUrl,
        friendCode: profile?.friendCode,
        t,
      });
      if (result === 'copied') {
        hapticNotification('success');
        toast.success(t('app.social.share.externalShareCopied'));
      } else if (result === 'shared') {
        hapticNotification('success');
      }
    } catch (err) {
      console.warn('External share error:', err);
    } finally {
      setSharingExternally(false);
    }
  };

  const toggleFriend = useCallback((friendId: string) => {
    hapticSelection();
    setSelectedFriendIds((prev) => {
      const next = new Set(prev);
      if (next.has(friendId)) next.delete(friendId);
      else next.add(friendId);
      return next;
    });
  }, []);

  const handleShareCode = async () => {
    if (!profile) return;
    hapticLight();
    const websiteBase = import.meta.env.VITE_WEBSITE_URL
      ? String(import.meta.env.VITE_WEBSITE_URL).replace(/\/+$/, '')
      : 'https://snagbite.app';
    const url = `${websiteBase}/invite/${profile.friendCode}`;
    const text = t('app.social.friends.inviteText', { code: profile.friendCode }) + '\n' + url;
    try {
      const { Share } = await import('@capacitor/share');
      const can = await Share.canShare();
      if (can.value) {
        await Share.share({ title: 'Snagbite', text });
        return;
      }
    } catch {
      /* ignore */
    }
    if (navigator.share) {
      try { await navigator.share({ title: 'Snagbite', text }); return; } catch { /* ignore */ }
    }
    try { await navigator.clipboard.writeText(text); toast.success(t('toast.inviteCodeCopied')); } catch { /* ignore */ }
  };

  const handleSend = async () => {
    if (!recipe.id || selectedFriendIds.size === 0 || submitting) return;
    setSubmitting(true);
    try {
      await shareRecipeWithFriends(recipe.id, Array.from(selectedFriendIds), note);
      hapticNotification('success');
      toast.success(t('app.social.share.sentSuccess'));
      onClose();
    } catch {
      hapticNotification('error');
      toast.danger(t('app.social.friends.genericError'));
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-xs transition-opacity duration-200">
      <div className="w-full sm:max-w-md max-h-[90vh] flex flex-col rounded-t-3xl sm:rounded-3xl bg-gray-50 dark:bg-gray-950 shadow-2xl border border-black/5 dark:border-white/5 overflow-hidden animate-in slide-in-from-bottom-6 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 pb-3 border-none">
          <div className="min-w-0 flex-1">
            <h2 className="font-serif font-bold text-gray-900 dark:text-white text-base">
              {t('app.social.share.title')}
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
              {recipe.title}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Schließen"
            className="w-9 h-9 rounded-full flex items-center justify-center bg-black/[0.04] dark:bg-white/[0.06] hover:bg-black/[0.08] dark:hover:bg-white/[0.10] text-gray-400 hover:text-gray-900 dark:hover:text-white border-none cursor-pointer active:scale-95 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 py-2 flex flex-col gap-4">
          {/* 1. External Share Action Card */}
          <button
            type="button"
            onClick={handleExternalShare}
            disabled={sharingExternally}
            className="w-full p-3.5 rounded-2xl bg-gradient-to-br from-emerald-500/10 via-teal-500/10 to-emerald-500/5 dark:from-emerald-500/20 dark:via-teal-500/15 dark:to-emerald-500/10 border border-emerald-500/20 flex items-center justify-between gap-3 cursor-pointer active:scale-[0.98] transition-all group select-none shadow-2xs text-left"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-emerald-600/30 group-hover:scale-105 transition-transform">
                <Share2 className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="font-bold text-sm text-gray-900 dark:text-white block leading-snug">
                  {t('app.social.share.externalTitle')}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400 block truncate mt-0.5">
                  {t('app.social.share.externalSubtitle')}
                </span>
              </div>
            </div>
            <div className="w-8 h-8 rounded-full bg-black/[0.04] dark:bg-white/[0.06] flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0 shadow-2xs group-hover:translate-x-0.5 transition-transform">
              <ExternalLink className="w-4 h-4" />
            </div>
          </button>

          {/* Section Divider */}
          <div className="relative flex items-center py-0.5">
            <div className="flex-grow border-t border-black/5 dark:border-white/5" />
            <span className="flex-shrink mx-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
              {t('app.social.share.orWithFriends')}
            </span>
            <div className="flex-grow border-t border-black/5 dark:border-white/5" />
          </div>

          {friends.length === 0 ? (
            <div className="flex flex-col items-center text-center p-6 rounded-2xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/5 dark:border-white/5 gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-gray-900 dark:text-white">
                  {t('app.social.share.emptyTitle')}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {t('app.social.share.emptySubtitle')}
                </p>
              </div>
              <Button
                size="sm"
                onPress={handleShareCode}
                className="h-10 px-4 rounded-xl bg-emerald-600 text-white font-bold text-xs border-none active:scale-95 transition-all flex items-center gap-1.5"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>{t('app.social.friends.share')}</span>
              </Button>
            </div>
          ) : (
            <>
              {/* Friends Selection */}
              <div className="flex flex-col gap-2">
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                  {t('app.social.share.subtitle')}
                </span>
                <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto pr-1">
                  {friends.map((f) => {
                    const isSelected = selectedFriendIds.has(f.userId);
                    return (
                      <button
                        key={f.userId}
                        type="button"
                        onClick={() => toggleFriend(f.userId)}
                        className={`flex items-center gap-3 p-2.5 rounded-2xl border-none transition-all cursor-pointer text-left select-none active:scale-[0.98] ${
                          isSelected
                            ? 'bg-emerald-500/10 dark:bg-emerald-500/15'
                            : 'bg-black/[0.02] hover:bg-black/[0.05] dark:bg-white/[0.03] dark:hover:bg-white/[0.06] border border-black/5 dark:border-white/5'
                        }`}
                      >
                        <Avatar name={f.displayName} avatarUrl={f.avatarUrl} size={36} />
                        <div className="min-w-0 flex-1">
                          <span className="font-bold text-sm text-gray-900 dark:text-white truncate block">
                            {f.displayName}
                          </span>
                          <span className="text-[10px] font-semibold text-gray-400">
                            {t('app.gamification.level', { level: f.level })}
                          </span>
                        </div>
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center border-none transition-all ${
                            isSelected
                              ? 'bg-emerald-600 text-white shadow-2xs'
                              : 'bg-black/10 dark:bg-white/10 text-transparent'
                          }`}
                        >
                          <Check className="w-3.5 h-3.5" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Personal Note Input */}
              <div className="flex flex-col gap-1.5">
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value.slice(0, 140))}
                  placeholder={t('app.social.share.notePlaceholder')}
                  className="w-full h-11 px-3.5 rounded-xl border border-black/5 dark:border-white/10 bg-black/[0.03] dark:bg-white/[0.05] text-sm font-medium text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                />
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {friends.length > 0 && (
          <div className="p-4 pt-2 border-none">
            <Button
              onPress={handleSend}
              isDisabled={selectedFriendIds.size === 0 || submitting}
              className="w-full h-12 rounded-2xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-sm border-none shadow-xs cursor-pointer active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <Send className="w-4 h-4" />
              <span>
                {t('app.social.share.sendButton')} ({selectedFriendIds.size})
              </span>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
