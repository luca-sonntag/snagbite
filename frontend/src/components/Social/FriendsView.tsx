import { useEffect, useState } from 'react';
import { Button } from '@heroui/react';
import { Copy, Check, Share2, UserPlus, X, Pencil, Trash2 } from 'lucide-react';
import { useI18n } from '../../context/I18nContext';
import { useSocial, SocialError } from '../../context/SocialContext';
import Avatar from './Avatar';

interface FriendsViewProps {
  pendingInviteCode?: string | null;
  onInviteConsumed?: () => void;
}

/** Friends section: your profile + code, add-by-code, incoming requests, list. */
export default function FriendsView({ pendingInviteCode, onInviteConsumed }: FriendsViewProps) {
  const { t } = useI18n();
  const {
    profile, friends, incomingRequests,
    refreshFriends, updateDisplayName, sendRequest, respondRequest, removeFriend,
  } = useSocial();

  const [codeInput, setCodeInput] = useState('');
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const [nameDraft, setNameDraft] = useState('');

  useEffect(() => {
    refreshFriends();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Prefill the code from an invite link, then clear it so it doesn't re-apply.
  useEffect(() => {
    if (pendingInviteCode) {
      setCodeInput(pendingInviteCode.toUpperCase());
      onInviteConsumed?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingInviteCode]);

  const localizeError = (code: string) => {
    const key = `error.codes.${code}`;
    const msg = t(key);
    return msg === key ? t('app.social.friends.genericError') : msg;
  };

  const inviteLink = profile ? `snagbite://invite/${profile.friendCode}` : '';
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
          text: inviteMessage,
          url: inviteLink,
          dialogTitle: t('app.social.friends.share'),
        });
        return;
      }
    } catch {
      /* user cancelled or unsupported → fall through */
    }

    try {
      if (navigator.share) {
        await navigator.share({ title: 'Snagbite', text: inviteMessage, url: inviteLink });
        return;
      }
    } catch {
      /* user cancelled or unsupported → fall through to copy */
    }

    try {
      const { Clipboard } = await import('@capacitor/clipboard');
      await Clipboard.write({ string: fullInviteText });
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  };

  const handleAdd = async () => {
    const code = codeInput.trim();
    if (!code || busy) return;
    setBusy(true);
    setFeedback(null);
    try {
      const status = await sendRequest(code);
      setCodeInput('');
      setFeedback({
        ok: true,
        msg: status === 'accepted'
          ? t('app.social.friends.requestAccepted')
          : t('app.social.friends.requestSent'),
      });
    } catch (err) {
      const code2 = err instanceof SocialError ? err.code : 'INTERNAL_ERROR';
      setFeedback({ ok: false, msg: localizeError(code2) });
    } finally {
      setBusy(false);
    }
  };

  const startEdit = () => {
    setNameDraft(profile?.displayName ?? '');
    setEditing(true);
  };

  const saveName = async () => {
    const name = nameDraft.trim();
    if (!name) return;
    try {
      await updateDisplayName(name);
      setEditing(false);
    } catch (err) {
      const code = err instanceof SocialError ? err.code : 'INTERNAL_ERROR';
      setFeedback({ ok: false, msg: localizeError(code) });
    }
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Profile card */}
      <div className="rounded-3xl border-none bg-white p-5 shadow-[0_2px_6px_rgba(0,0,0,0.03)] dark:bg-gray-900">
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
            <div className="mt-0.5 text-xs font-medium text-gray-500 dark:text-gray-400">
              {t('app.social.friends.yourCode')}
            </div>
          </div>
        </div>

        {/* Friend code + share */}
        <div className="mt-4 flex items-center gap-2">
          <Button
            onPress={handleCopyCode}
            className="flex flex-1 items-center justify-between rounded-2xl border-2 border-dashed border-emerald-500/40 bg-emerald-500/5 px-4 py-3 h-auto min-h-[52px] text-left transition-all active:scale-[0.98]"
          >
            <span className="font-mono text-lg font-extrabold tracking-[0.3em] text-emerald-700 dark:text-emerald-300">
              {profile?.friendCode ?? '••••••'}
            </span>
            {copied ? <Check className="h-5 w-5 text-emerald-500 shrink-0" /> : <Copy className="h-5 w-5 text-emerald-500 shrink-0" />}
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

      {/* Add by code */}
      <div className="rounded-3xl border-none bg-white p-5 shadow-[0_2px_6px_rgba(0,0,0,0.03)] dark:bg-gray-900">
        <h2 className="mb-3 text-sm font-bold text-gray-900 dark:text-white">
          {t('app.social.friends.addTitle')}
        </h2>
        <div className="flex items-center gap-2">
          <input
            value={codeInput}
            onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            placeholder={t('app.social.friends.addPlaceholder')}
            maxLength={12}
            className="min-w-0 flex-1 rounded-2xl border-none bg-gray-100 dark:bg-gray-800 px-4 py-3 font-mono uppercase tracking-widest text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 shadow-[0_2px_6px_rgba(0,0,0,0.03)] focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition-all"
          />
          <Button
            onPress={handleAdd}
            isDisabled={busy || !codeInput.trim()}
            className="flex h-12 items-center gap-1.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 font-bold text-white border-none active:scale-95 transition-all px-4 disabled:opacity-50"
          >
            <UserPlus className="h-5 w-5" />
            {t('app.social.friends.add')}
          </Button>
        </div>
        {feedback && (
          <p className={`mt-2 text-xs font-semibold ${feedback.ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>
            {feedback.msg}
          </p>
        )}
      </div>

      {/* Incoming requests */}
      {incomingRequests.length > 0 && (
        <div className="flex flex-col gap-2.5">
          <h2 className="text-sm font-bold text-gray-900 dark:text-white">
            {t('app.social.friends.requests')}
          </h2>
          {incomingRequests.map((r) => (
            <div key={r.friendshipId} className="flex items-center gap-3 rounded-2xl border-none bg-white p-3.5 shadow-[0_2px_6px_rgba(0,0,0,0.03)] dark:bg-gray-900">
              <Avatar name={r.displayName} avatarUrl={r.avatarUrl} size={36} />
              <span className="min-w-0 flex-1 truncate font-bold text-gray-900 dark:text-white">
                {r.displayName}
              </span>
              <Button
                onPress={() => respondRequest(r.friendshipId, true)}
                className="rounded-xl bg-emerald-600 hover:bg-emerald-500 px-3 py-1.5 h-8 text-xs font-bold text-white border-none active:scale-95 transition-all"
              >
                {t('app.social.friends.accept')}
              </Button>
              <Button
                onPress={() => respondRequest(r.friendshipId, false)}
                isIconOnly
                aria-label={t('app.social.friends.decline')}
                className="h-8 w-8 min-w-0 p-0 text-gray-400 hover:text-rose-500 bg-transparent hover:bg-rose-500/10 rounded-xl border-none active:scale-95 transition-all"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Friends list */}
      <div className="flex flex-col gap-2.5">
        <h2 className="text-sm font-bold text-gray-900 dark:text-white">
          {t('app.social.friends.yourFriends')}
        </h2>
        {friends.length === 0 ? (
          <p className="rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-800 bg-white/50 dark:bg-gray-900/50 py-8 text-center text-sm font-semibold text-gray-400 dark:text-gray-500">
            {t('app.social.friends.none')}
          </p>
        ) : (
          friends.map((f) => (
            <div key={f.friendshipId} className="flex items-center gap-3 rounded-2xl border-none bg-white p-3.5 shadow-[0_2px_6px_rgba(0,0,0,0.03)] dark:bg-gray-900">
              <Avatar name={f.displayName} avatarUrl={f.avatarUrl} size={36} />
              <div className="min-w-0 flex-1">
                <div className="truncate font-bold text-gray-900 dark:text-white">{f.displayName}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {t('app.gamification.level', { level: f.level })}
                  {f.currentStreak > 0 && ` · 🔥 ${f.currentStreak}`}
                </div>
              </div>
              <Button
                onPress={() => removeFriend(f.friendshipId)}
                isIconOnly
                aria-label={t('app.social.friends.remove')}
                className="h-8 w-8 min-w-0 p-0 text-gray-400 hover:text-rose-500 bg-transparent hover:bg-rose-500/10 rounded-xl border-none active:scale-95 transition-all"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

