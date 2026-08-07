import { useEffect, useState } from 'react';
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

  const inviteLink = profile ? `${window.location.origin}/#/invite/${profile.friendCode}` : '';
  const inviteText = profile
    ? `${t('app.social.friends.inviteText', { code: profile.friendCode })}\n${inviteLink}`
    : '';

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
      if (navigator.share) {
        await navigator.share({ title: 'Snagbite', text: inviteText });
        return;
      }
    } catch { /* user cancelled or unsupported → fall through to copy */ }
    try {
      const { Clipboard } = await import('@capacitor/clipboard');
      await Clipboard.write({ string: inviteText });
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch { /* ignore */ }
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
      <div className="rounded-3xl border border-black/5 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-gray-900">
        <div className="flex items-center gap-3">
          <Avatar name={profile?.displayName ?? '?'} avatarUrl={profile?.avatarUrl} size={48} />
          <div className="min-w-0 flex-1">
            {editing ? (
              <div className="flex items-center gap-2">
                <input
                  value={nameDraft}
                  onChange={(e) => setNameDraft(e.target.value)}
                  maxLength={40}
                  autoFocus
                  className="min-w-0 flex-1 rounded-lg border border-black/10 bg-transparent px-2 py-1 text-sm dark:border-white/15"
                />
                <button type="button" onClick={saveName} className="text-emerald-600 dark:text-emerald-400">
                  <Check className="h-5 w-5" />
                </button>
                <button type="button" onClick={() => setEditing(false)} className="text-gray-400">
                  <X className="h-5 w-5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="truncate text-lg font-bold text-gray-900 dark:text-white">
                  {profile?.displayName ?? '…'}
                </span>
                <button type="button" onClick={startEdit} aria-label={t('app.social.friends.editName')} className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
                  <Pencil className="h-4 w-4" />
                </button>
              </div>
            )}
            <div className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              {t('app.social.friends.yourCode')}
            </div>
          </div>
        </div>

        {/* Friend code + share */}
        <div className="mt-4 flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopyCode}
            className="flex flex-1 items-center justify-between rounded-2xl border border-dashed border-emerald-500/40 bg-emerald-500/5 px-4 py-3"
          >
            <span className="font-mono text-lg font-bold tracking-[0.3em] text-emerald-700 dark:text-emerald-300">
              {profile?.friendCode ?? '••••••'}
            </span>
            {copied ? <Check className="h-5 w-5 text-emerald-500" /> : <Copy className="h-5 w-5 text-emerald-500" />}
          </button>
          <button
            type="button"
            onClick={handleShare}
            aria-label={t('app.social.friends.share')}
            className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-500 text-white shadow-lg active:scale-95"
          >
            <Share2 className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Add by code */}
      <div className="rounded-3xl border border-black/5 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-gray-900">
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
            className="min-w-0 flex-1 rounded-2xl border border-black/10 bg-transparent px-4 py-3 font-mono uppercase tracking-widest dark:border-white/15"
          />
          <button
            type="button"
            onClick={handleAdd}
            disabled={busy || !codeInput.trim()}
            className="flex h-12 items-center gap-1.5 rounded-2xl bg-emerald-600 px-4 font-semibold text-white disabled:opacity-50"
          >
            <UserPlus className="h-5 w-5" />
            {t('app.social.friends.add')}
          </button>
        </div>
        {feedback && (
          <p className={`mt-2 text-xs ${feedback.ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>
            {feedback.msg}
          </p>
        )}
      </div>

      {/* Incoming requests */}
      {incomingRequests.length > 0 && (
        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-bold text-gray-900 dark:text-white">
            {t('app.social.friends.requests')}
          </h2>
          {incomingRequests.map((r) => (
            <div key={r.friendshipId} className="flex items-center gap-3 rounded-2xl border border-black/5 bg-white p-3 dark:border-white/10 dark:bg-gray-900">
              <Avatar name={r.displayName} avatarUrl={r.avatarUrl} size={36} />
              <span className="min-w-0 flex-1 truncate font-semibold text-gray-900 dark:text-white">
                {r.displayName}
              </span>
              <button
                type="button"
                onClick={() => respondRequest(r.friendshipId, true)}
                className="rounded-xl bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white"
              >
                {t('app.social.friends.accept')}
              </button>
              <button
                type="button"
                onClick={() => respondRequest(r.friendshipId, false)}
                aria-label={t('app.social.friends.decline')}
                className="text-gray-400 hover:text-rose-500"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Friends list */}
      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-bold text-gray-900 dark:text-white">
          {t('app.social.friends.yourFriends')}
        </h2>
        {friends.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-black/10 py-8 text-center text-sm text-gray-400 dark:border-white/10">
            {t('app.social.friends.none')}
          </p>
        ) : (
          friends.map((f) => (
            <div key={f.friendshipId} className="flex items-center gap-3 rounded-2xl border border-black/5 bg-white p-3 dark:border-white/10 dark:bg-gray-900">
              <Avatar name={f.displayName} avatarUrl={f.avatarUrl} size={36} />
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold text-gray-900 dark:text-white">{f.displayName}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {t('app.gamification.level', { level: f.level })}
                  {f.currentStreak > 0 && ` · 🔥 ${f.currentStreak}`}
                </div>
              </div>
              <button
                type="button"
                onClick={() => removeFriend(f.friendshipId)}
                aria-label={t('app.social.friends.remove')}
                className="text-gray-400 hover:text-rose-500"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
