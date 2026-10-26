import { useState } from 'react';
import { Button } from '@heroui/react';
import { Copy, Check, Share2, Pencil, X } from 'lucide-react';
import { useI18n } from '../../context/I18nContext';
import { useToast } from '../../context/ToastContext';
import { useSocial, SocialError } from '../../context/SocialContext';
import Avatar from './Avatar';
import FriendAddInput from './FriendAddInput';

interface FriendsProfileCardProps {
  pendingInviteCode?: string | null;
  onInviteConsumed?: () => void;
}

export default function FriendsProfileCard({ pendingInviteCode, onInviteConsumed }: FriendsProfileCardProps) {
  const { t } = useI18n();
  const toast = useToast();
  const { profile, updateDisplayName } = useSocial();

  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const inviteBaseUrl = window.location.origin.includes('localhost')
    ? 'https://snagbite.app'
    : window.location.origin;

  const inviteLink = profile ? `${inviteBaseUrl}/invite/${profile.friendCode}` : '';
  const inviteMessage = profile ? t('app.social.friends.inviteText', { code: profile.friendCode }) : '';
  const fullInviteText = profile ? `${inviteMessage}\n${inviteLink}` : '';

  const handleCopyCode = async () => {
    if (!profile) return;
    try {
      const { Clipboard } = await import('@capacitor/clipboard');
      await Clipboard.write({ string: profile.friendCode });
    } catch {
      try { await navigator.clipboard?.writeText(profile.friendCode); } catch { /* ignore */ }
    }
    setCopied(true);
    toast.success(t('toast.inviteCodeCopied'));
    window.setTimeout(() => setCopied(false), 1500);
  };

  const handleShare = async () => {
    if (!profile) return;
    try {
      const { Share } = await import('@capacitor/share');
      const canShare = await Share.canShare();
      if (canShare.value) {
        await Share.share({
          title: 'Snagbite',
          text: fullInviteText,
          dialogTitle: t('app.social.friends.share'),
        });
        return;
      }
    } catch {
      /* ignore */
    }

    try {
      if (navigator.share) {
        await navigator.share({ title: 'Snagbite', text: fullInviteText });
        return;
      }
    } catch {
      /* ignore */
    }

    try {
      const { Clipboard } = await import('@capacitor/clipboard');
      await Clipboard.write({ string: fullInviteText });
      setCopied(true);
      toast.success(t('toast.inviteCodeCopied'));
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  };

  const startEdit = () => {
    setNameDraft(profile?.displayName ?? '');
    setEditing(true);
    setErrorMsg(null);
  };

  const saveName = async () => {
    const name = nameDraft.trim();
    if (!name) return;
    try {
      await updateDisplayName(name);
      setEditing(false);
    } catch (err) {
      const code = err instanceof SocialError ? err.code : 'INTERNAL_ERROR';
      setErrorMsg(code);
    }
  };

  return (
    <div className="py-2 px-0.5 pb-2">
      <div className="flex items-center gap-3.5">
        <Avatar name={profile?.displayName ?? '?'} avatarUrl={profile?.avatarUrl} size={48} />
        <div className="min-w-0 flex-1">
          {editing ? (
            <div className="flex items-center gap-2">
              <input
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                maxLength={40}
                autoFocus
                className="min-w-0 flex-1 rounded-xl border-none bg-gray-100 dark:bg-gray-800 px-3 py-1.5 text-sm font-semibold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
              />
              <Button
                onPress={saveName}
                isIconOnly
                aria-label={t('app.social.friends.saveName') || 'Speichern'}
                className="h-8 w-8 min-w-0 p-0 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-xl border-none"
              >
                <Check className="h-4 w-4" />
              </Button>
              <Button
                onPress={() => setEditing(false)}
                isIconOnly
                aria-label={t('dialog.cancelDefault') || 'Abbrechen'}
                className="h-8 w-8 min-w-0 p-0 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 bg-gray-100 dark:bg-gray-800 rounded-xl border-none"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="truncate text-lg font-bold text-gray-900 dark:text-white">
                {profile?.displayName ?? '…'}
              </span>
              <Button
                onPress={startEdit}
                isIconOnly
                aria-label={t('app.social.friends.editName')}
                className="h-7 w-7 min-w-0 p-0 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg border-none"
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
          {errorMsg && <p className="mt-1 text-xs text-rose-500">{errorMsg}</p>}
        </div>
      </div>

      <div className="mt-5">
        <h2 className="text-xs font-medium text-gray-500 dark:text-gray-400 font-sans mb-2 px-0.5">
          {t('app.social.friends.yourCode')}
        </h2>
        <div className="flex items-center gap-2">
        <Button
          onPress={handleCopyCode}
          className="flex flex-1 items-center justify-between rounded-2xl border-2 border-dashed border-emerald-500/40 bg-emerald-500/5 px-4 py-3 h-auto min-h-[52px] text-left transition-all active:scale-[0.98]"
        >
          <span className="font-mono text-lg font-extrabold tracking-[0.3em] text-emerald-700 dark:text-emerald-300">
            {profile?.friendCode ?? '••••••'}
          </span>
          {copied ? (
            <Check className="h-5 w-5 text-emerald-500 shrink-0" />
          ) : (
            <Copy className="h-5 w-5 text-emerald-500 shrink-0" />
          )}
        </Button>
        <Button
          onPress={handleShare}
          isIconOnly
          aria-label={t('app.social.friends.share')}
          className="flex h-13 w-13 items-center justify-center rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_2px_6px_rgba(0,0,0,0.03)] border-none active:scale-95 transition-all shrink-0"
        >
          <Share2 className="h-5 w-5" />
        </Button>
        </div>
      </div>

      {/* Divider */}
      <div className="mt-5" />

      {/* Add friend by code */}
      <FriendAddInput
        pendingInviteCode={pendingInviteCode}
        onInviteConsumed={onInviteConsumed}
      />
    </div>
  );
}
