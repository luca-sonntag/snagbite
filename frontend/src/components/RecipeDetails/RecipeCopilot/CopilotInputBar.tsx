import React from 'react';
import { Button } from '@heroui/react';
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
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-1 px-0.5 touch-pan-x -mx-1">
              {chips.map((chip, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    hapticLight();
                    onSend(chip.prompt);
                  }}
                  disabled={isPending}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-full border-none bg-white/60 dark:bg-gray-900/60 backdrop-blur-md text-gray-800 dark:text-gray-200 hover:bg-emerald-500/20 hover:text-emerald-700 dark:hover:bg-emerald-500/30 dark:hover:text-emerald-300 active:scale-95 transition-all whitespace-nowrap flex-shrink-0 cursor-pointer shadow-[0_2px_8px_rgba(0,0,0,0.04)] disabled:opacity-50 min-h-[38px]"
                >
                  {getCategoryIcon(chip.category)}
                  <span>{chip.label}</span>
                </button>
              ))}
            </div>
          ) : null}
        </div>
      )}

      {/* Message Input Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (message.trim()) {
            hapticMedium();
            onSend(message);
          }
        }}
        className="flex items-center gap-2 w-full"
      >
        {!showChips && (
          <button
            type="button"
            onClick={() => {
              hapticLight();
              setShowChips(true);
            }}
            className="flex-shrink-0 h-12 w-11 rounded-2xl bg-white/60 dark:bg-gray-900/60 backdrop-blur-md border-none hover:bg-white/80 dark:hover:bg-gray-800/80 active:scale-95 transition-all flex items-center justify-center cursor-pointer shadow-[0_4px_16px_rgba(0,0,0,0.06)]"
            aria-label={t('copilot.showSuggestionsAria')}
          >
            <Sparkles className="w-4.5 h-4.5 text-emerald-600 dark:text-emerald-400" />
          </button>
        )}
        <div className="relative flex-1 flex items-center bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl border-none rounded-2xl focus-within:ring-2 focus-within:ring-emerald-500/40 pr-1.5 h-12 shadow-[0_4px_20px_rgba(0,0,0,0.06)]">
          <input
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={t('copilot.placeholder')}
            disabled={isPending}
            aria-label={t('copilot.placeholder')}
            className="w-full h-full bg-transparent pl-4 pr-11 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none border-none"
          />
          <div className="absolute right-1.5 top-1/2 -translate-y-1/2">
            <Button
              type="submit"
              isDisabled={isPending || !message.trim()}
              className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl h-9 w-9 min-w-9 shadow-none flex items-center justify-center active:scale-90 transition-all p-0 border-none disabled:opacity-40"
              aria-label={t('copilot.sendAria')}
            >
              <Send className="w-4 h-4 fill-white ml-0.5" />
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
};
export default CopilotInputBar;
