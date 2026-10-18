import { useEffect, useState } from 'react';
import { Button } from '@heroui/react';
import { UserPlus, X } from 'lucide-react';
import { useI18n } from '../../context/I18nContext';
import { useToast } from '../../context/ToastContext';
import { useSocial, SocialError } from '../../context/SocialContext';
import FriendsProfileCard from './FriendsProfileCard';
import SharedRecipesSection from './SharedRecipesSection';
import FriendsListSection from './FriendsListSection';
import Avatar from './Avatar';

interface FriendsViewProps {
  pendingInviteCode?: string | null;
  onInviteConsumed?: () => void;
}

export default function FriendsView({ pendingInviteCode, onInviteConsumed }: FriendsViewProps) {
  const { t } = useI18n();
  const toast = useToast();
  const { incomingRequests, refreshFriends, refreshShares, sendRequest, respondRequest } = useSocial();

  const [codeInput, setCodeInput] = useState('');
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    refreshFriends();
    refreshShares();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const localizeError = (code: string) => {
    const key = `error.codes.${code}`;
    const msg = t(key);
    return msg === key ? t('app.social.friends.genericError') : msg;
  };

  const submitCode = async (targetCode: string) => {
    const code = targetCode.trim().toUpperCase();
    if (!code || busy) return;
    setBusy(true);
    setFeedback(null);
    try {
      const status = await sendRequest(code);
      setCodeInput('');
      toast.success(status === 'accepted' ? t('toast.friendRequestAccepted') : t('toast.friendRequestSent'));
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

  const handleAdd = () => submitCode(codeInput);

  useEffect(() => {
    if (pendingInviteCode) {
      const code = pendingInviteCode.toUpperCase();
      setCodeInput(code);
      onInviteConsumed?.();
      submitCode(code);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingInviteCode]);

  return (
    <div className="flex flex-col gap-5">
      {/* 1. Profile & Friend Code Card */}
      <FriendsProfileCard />

      {/* 2. Recommended by Friends (Shared Recipes) */}
      <SharedRecipesSection />

      {/* 3. Add friend by code */}
      <div className="rounded-3xl border-none bg-white p-5 shadow-[0_2px_6px_rgba(0,0,0,0.03)] dark:bg-gray-900">
        <h2 className="mb-3 font-heading text-sm font-bold text-gray-900 dark:text-white">
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

      {/* 4. Incoming friend requests */}
      {incomingRequests.length > 0 && (
        <div className="flex flex-col gap-2.5">
          <h2 className="font-heading text-sm font-bold text-gray-900 dark:text-white px-1">
            {t('app.social.friends.requests')}
          </h2>
          {incomingRequests.map((r) => (
            <div
              key={r.friendshipId}
              className="flex items-center gap-3 rounded-2xl border-none bg-white p-3.5 shadow-[0_2px_6px_rgba(0,0,0,0.03)] dark:bg-gray-900"
            >
              <Avatar name={r.displayName} avatarUrl={r.avatarUrl} size={36} />
              <span className="min-w-0 flex-1 truncate font-bold text-gray-900 dark:text-white">
                {r.displayName}
              </span>
              <Button
                onPress={async () => {
                  await respondRequest(r.friendshipId, true);
                  toast.success(t('toast.friendRequestAccepted'));
                }}
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

      {/* 5. Friends list */}
      <FriendsListSection />
    </div>
  );
}
