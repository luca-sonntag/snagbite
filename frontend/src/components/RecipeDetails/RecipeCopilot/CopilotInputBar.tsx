import React from 'react';
import {
  Send,
  Sparkles,
  Loader2,
  ChefHat,
  ArrowLeftRight,
  ShoppingCart,
  Timer,
} from 'lucide-react';
import { useI18n } from '../../../context/I18nContext';
import type { CopilotInputBarProps } from './types';
import { hapticLight, hapticMedium } from '../../../utils/haptics';

export const CopilotInputBar: React.FC<CopilotInputBarProps> = ({
  message,
  setMessage,
  isPending,
  showChips,
  setShowChips,
  chips,
  chipsLoading,
  textareaRef,
  onSend,
}) => {
  const { t } = useI18n();

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'remix':
        return <Sparkles className="w-3.5 h-3.5 text-emerald-500 shrink-0" />;
      case 'help':
        return <ChefHat className="w-3.5 h-3.5 text-blue-500 shrink-0" />;
      case 'substitute':
        return <ArrowLeftRight className="w-3.5 h-3.5 text-amber-500 shrink-0" />;
      case 'shopping':
        return <ShoppingCart className="w-3.5 h-3.5 text-purple-500 shrink-0" />;
      case 'timer':
        return <Timer className="w-3.5 h-3.5 text-rose-500 shrink-0" />;
      default:
        return <Sparkles className="w-3.5 h-3.5 text-emerald-500 shrink-0" />;
    }
  };

  return (
    <div className="flex flex-col gap-2.5">
      {/* Quick Chips Scroll Container */}
      {showChips && (
        <div className="flex flex-col gap-1.5 animate-in fade-in duration-200">
          {chipsLoading ? (
            <div className="flex items-center justify-center py-1">
              <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
            </div>
          ) : chips.length > 0 ? (
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-1 px-1 touch-pan-x">
              {chips.map((chip, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    hapticLight();
                    onSend(chip.prompt);
                  }}
                  disabled={isPending}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold rounded-2xl border border-white/30 dark:border-white/10 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl text-gray-800 dark:text-gray-200 hover:bg-emerald-500/15 hover:text-emerald-700 dark:hover:bg-emerald-500/25 dark:hover:text-emerald-300 active:scale-95 transition-all whitespace-nowrap flex-shrink-0 cursor-pointer shadow-[0_2px_8px_rgba(0,0,0,0.04)] disabled:opacity-50 min-h-[42px]"
                >
                  {getCategoryIcon(chip.category)}
                  <span>{chip.label}</span>
                </button>
              ))}
            </div>
          ) : null}
        </div>
      )}

      {/* Unified Generous Input Dock */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (message.trim()) {
            hapticMedium();
            onSend(message);
          }
        }}
        onClick={() => textareaRef.current?.focus()}
        className="w-full min-h-[56px] p-2 rounded-3xl bg-white/85 dark:bg-gray-900/85 backdrop-blur-xl border border-white/40 dark:border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.12)] flex items-center gap-2 cursor-text"
      >
        {/* Toggle Suggestions button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            hapticLight();
            setShowChips(!showChips);
          }}
          className={`w-11 h-11 min-w-[44px] min-h-[44px] rounded-2xl border-none transition-all flex items-center justify-center cursor-pointer active:scale-95 shrink-0 ${
            showChips
              ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
              : 'bg-emerald-500/10 hover:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
          }`}
          aria-label={t('copilot.showSuggestionsAria')}
        >
          <Sparkles className="w-5 h-5" />
        </button>

        {/* Text Input with full height & generous touch target */}
        <input
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={t('copilot.placeholder')}
          disabled={isPending}
          aria-label={t('copilot.placeholder')}
          className="flex-1 h-full min-h-[44px] bg-transparent px-2 text-[15px] text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none border-none cursor-text"
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
    </div>
  );
};
export default CopilotInputBar;
