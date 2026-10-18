import { useState, useCallback } from 'react';
import { Button } from '@heroui/react';
import { X, Send, Check, Users, Share2 } from 'lucide-react';
import { useI18n } from '../../context/I18nContext';
import { useSocial } from '../../context/SocialContext';
import { useToast } from '../../context/ToastContext';
import { useModalOverlay } from '../../context/OverlayStackContext';
import { hapticLight, hapticNotification, hapticSelection } from '../../utils/haptics';
import Avatar from './Avatar';
import type { Recipe } from '../../types';

interface ShareWithFriendsModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipe: Recipe;
}

export default function ShareWithFriendsModal({
  isOpen,
  onClose,
  recipe,
}: ShareWithFriendsModalProps) {
  const { t } = useI18n();
  const toast = useToast();
  const { friends, profile, shareRecipeWithFriends } = useSocial();
  const [selectedFriendIds, setSelectedFriendIds] = useState<Set<string>>(new Set());
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useModalOverlay(isOpen, onClose);

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
    const url = `${window.location.origin}/invite/${profile.friendCode}`;
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
      <div className="w-full sm:max-w-md max-h-[90vh] flex flex-col rounded-t-3xl sm:rounded-3xl bg-white dark:bg-gray-900 shadow-2xl border-none overflow-hidden animate-in slide-in-from-bottom-6 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 pb-3 border-none">
          <div className="min-w-0 flex-1">
            <h2 className="font-heading font-extrabold text-gray-900 dark:text-white text-base">
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
            className="w-9 h-9 rounded-full flex items-center justify-center bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white border-none cursor-pointer active:scale-95 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 py-2 flex flex-col gap-4">
          {friends.length === 0 ? (
            <div className="flex flex-col items-center text-center p-6 rounded-2xl bg-gray-50 dark:bg-gray-800/50 gap-3">
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
                            : 'bg-gray-50 hover:bg-gray-100 dark:bg-gray-800/60 dark:hover:bg-gray-800'
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
                              : 'bg-gray-200 dark:bg-gray-700 text-transparent'
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
                  className="w-full h-11 px-3.5 rounded-xl border-none bg-gray-100 dark:bg-gray-800 text-sm font-medium text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
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
