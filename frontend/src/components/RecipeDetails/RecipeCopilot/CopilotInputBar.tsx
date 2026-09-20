import React from 'react';
import { Send } from 'lucide-react';
import { useI18n } from '../../../context/I18nContext';
import { hapticMedium } from '../../../utils/haptics';
import type { CopilotInputBarProps } from './types';

export const CopilotInputBar: React.FC<CopilotInputBarProps> = ({
  message,
  setMessage,
  isPending,
  textareaRef,
  onSend,
}) => {
  const { t } = useI18n();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (message.trim()) {
          hapticMedium();
          onSend(message);
        }
      }}
      onClick={() => textareaRef.current?.focus()}
      className="w-full min-h-[56px] p-2 pl-4 rounded-3xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-[0_8px_32px_rgba(0,0,0,0.14)] flex items-center gap-2 cursor-text"
    >
      {/* Text Input with full height & generous touch target */}
      <input
        ref={textareaRef}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder={t('copilot.placeholder')}
        disabled={isPending}
        aria-label={t('copilot.placeholder')}
        className="flex-1 h-full min-h-[44px] bg-transparent px-1 text-[15px] text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none border-none cursor-text"
      />

      {/* Send Button */}
      <button
        type="submit"
        disabled={isPending || !message.trim()}
        className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center active:scale-90 transition-all p-0 border-none shadow-md shadow-emerald-600/25 disabled:opacity-30 disabled:scale-100 disabled:shadow-none cursor-pointer shrink-0"
        aria-label={t('copilot.sendAria')}
      >
        <Send className="w-4.5 h-4.5 text-white" />
      </button>
    </form>
  );
};

export default CopilotInputBar;
