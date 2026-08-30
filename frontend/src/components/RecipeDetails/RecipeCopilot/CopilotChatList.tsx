import React from 'react';
import {
  Sparkles,
  Bot,
  Loader2,
  ChefHat,
  ArrowLeftRight,
  ShoppingCart,
  Timer,
} from 'lucide-react';
import { useI18n } from '../../../context/I18nContext';
import { hapticLight } from '../../../utils/haptics';
import CopilotMessageItem, { parseSuggestions } from './CopilotMessageItem';
import type { CopilotChatListProps } from './types';

export { parseSuggestions };

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

export const CopilotChatList: React.FC<CopilotChatListProps> = ({
  history,
  isPending,
  pendingAction,
  error,
  messagesEndRef,
  onLoadNewRecipe,
  onSend,
  recipeId,
  initialChips,
  chipsLoading,
}) => {
  const { t } = useI18n();

  return (
    <div className="flex-1 overflow-y-auto pt-1 pb-4 px-4 sm:px-6 flex flex-col gap-3.5 scrollbar-none bg-transparent">
      {/* Initial Welcome Greeting Turn (Always at the top of the chat) */}
      <div className="flex gap-2.5 self-start items-start max-w-[92%] sm:max-w-[88%] animate-in fade-in slide-in-from-bottom-1 duration-200">
        <div className="w-8 h-8 rounded-2xl flex items-center justify-center flex-shrink-0 font-bold text-xs bg-white dark:bg-gray-800 text-emerald-600 dark:text-emerald-400 shadow-[0_2px_8px_rgba(0,0,0,0.08)] border border-emerald-500/20 mt-0.5">
          <Bot className="w-4 h-4" />
        </div>

        <div className="flex flex-col gap-2 min-w-0">
          <div className="p-3.5 sm:p-4 text-[14px] leading-relaxed bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 rounded-3xl rounded-tl-sm shadow-[0_4px_20px_rgba(0,0,0,0.08)] border border-gray-100 dark:border-gray-800">
            Hi! Wie kann ich dir bei diesem Rezept helfen? Frag mich nach Zutaten-Tausch, Schritten oder Garzeiten.
          </div>

          {/* Proactive Initial Recipe Suggestion Pills */}
          {chipsLoading ? (
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 text-xs font-medium border border-gray-100 dark:border-gray-700 shadow-xs self-start">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-500" />
              <span>Vorschläge werden vorbereitet…</span>
            </div>
          ) : initialChips && initialChips.length > 0 ? (
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {initialChips.slice(0, 4).map((chip, cIdx) => (
                <button
                  key={cIdx}
                  type="button"
                  disabled={isPending}
                  onClick={() => {
                    hapticLight();
                    onSend(chip.prompt);
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-white dark:bg-gray-800 text-xs font-semibold text-gray-800 dark:text-gray-200 border border-gray-100 dark:border-gray-700 shadow-[0_2px_8px_rgba(0,0,0,0.06)] hover:bg-emerald-500/15 hover:text-emerald-700 dark:hover:text-emerald-300 active:scale-95 transition-all cursor-pointer disabled:opacity-50 min-h-[38px]"
                >
                  {getCategoryIcon(chip.category)}
                  <span>{chip.label}</span>
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      {/* Chat message bubbles */}
      {history.map((msg, idx) => (
        <CopilotMessageItem
          key={idx}
          msg={msg}
          idx={idx}
          isLatest={idx === history.length - 1}
          isPending={isPending}
          recipeId={recipeId}
          onSend={onSend}
          onLoadNewRecipe={onLoadNewRecipe}
        />
      ))}

      {/* Loader/Pending reply */}
      {isPending && (
        <div className="flex gap-2.5 max-w-[88%] self-start items-start animate-pulse">
          <div className="w-8 h-8 rounded-2xl bg-white dark:bg-gray-800 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0 shadow-[0_2px_8px_rgba(0,0,0,0.08)] border border-emerald-500/20 mt-0.5">
            <Bot className="w-4 h-4" />
          </div>
          <div className="flex flex-col gap-1.5">
            <div className="bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 text-xs px-4 py-3 rounded-3xl rounded-tl-sm border border-gray-100 dark:border-gray-800 shadow-[0_4px_16px_rgba(0,0,0,0.06)] flex items-center gap-2.5">
              <Loader2 className="w-4 h-4 animate-spin text-emerald-600 dark:text-emerald-400" />
              <span>{pendingAction || t('copilot.loading')}</span>
            </div>
          </div>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="p-3.5 rounded-2xl bg-white dark:bg-gray-900 border border-red-500/30 text-red-600 dark:text-red-400 text-xs text-center font-medium self-center max-w-[90%] shadow-md animate-in fade-in duration-200">
          {error}
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
};

export default CopilotChatList;
