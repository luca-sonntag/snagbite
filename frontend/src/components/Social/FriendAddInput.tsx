import { useEffect, useState } from 'react';
import { Button } from '@heroui/react';
import { UserPlus } from 'lucide-react';
import { useI18n } from '../../context/I18nContext';
import { useToast } from '../../context/ToastContext';
import { useSocial, SocialError } from '../../context/SocialContext';

interface FriendAddInputProps {
  pendingInviteCode?: string | null;
  onInviteConsumed?: () => void;
}

export default function FriendAddInput({ pendingInviteCode, onInviteConsumed }: FriendAddInputProps) {
  const { t } = useI18n();
  const toast = useToast();
  const { sendRequest } = useSocial();

  const [codeInput, setCodeInput] = useState('');
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null);
  const [busy, setBusy] = useState(false);

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
    <div>
      <h2 className="mb-2.5 text-sm font-bold text-gray-900 dark:text-white font-sans px-0.5">
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
          className="flex h-12 items-center gap-1.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 font-bold text-white border-none active:scale-95 transition-all px-4 disabled:opacity-50 shrink-0"
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
  );
}
