import React from 'react';
import { Button } from '@heroui/react';
import { Sparkles, Bot, User, Loader2, RefreshCw } from 'lucide-react';
import { useI18n } from '../../../context/I18nContext';
import { hapticMedium } from '../../../utils/haptics';
import type { CopilotChatListProps } from './types';

export const CopilotChatList: React.FC<CopilotChatListProps> = ({
  history,
  isPending,
  pendingAction,
  error,
  messagesEndRef,
  onLoadNewRecipe,
}) => {
  const { t } = useI18n();

  return (
    <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 flex flex-col gap-3.5 scrollbar-none bg-transparent">
      {/* Welcome message if history is empty */}
      {history.length === 0 && (
        <div className="my-auto flex flex-col items-center text-center max-w-sm mx-auto gap-3 py-6 px-6 rounded-3xl bg-white/40 dark:bg-gray-900/40 backdrop-blur-md border-none shadow-[0_4px_20px_rgba(0,0,0,0.04)] animate-in fade-in zoom-in-95 duration-300">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-xs">
            <Sparkles className="w-6 h-6 animate-pulse" />
          </div>
          <h4 className="text-sm font-bold text-gray-900 dark:text-white">{t('copilot.title')}</h4>
          <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
            Ich helfe dir, dieses Rezept anzupassen, Zutaten auszutauschen oder einen Timer zu starten. Frag mich einfach!
          </p>
        </div>
      )}

      {/* Chat bubbles */}
      {history.map((msg, idx) => {
        const isAI = msg.role === 'model';
        return (
          <div
            key={idx}
            className={`flex gap-2.5 max-w-[90%] sm:max-w-[85%] ${
              isAI ? 'self-start items-end' : 'self-end flex-row-reverse items-end'
            } animate-in fade-in slide-in-from-bottom-1 duration-200`}
          >
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-xs mb-1 shadow-xs ${
                isAI
                  ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 backdrop-blur-xs'
                  : 'bg-white/50 dark:bg-gray-800/50 text-gray-700 dark:text-gray-200 backdrop-blur-xs'
              }`}
            >
              {isAI ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
            </div>

            <div className="flex flex-col gap-2 min-w-0">
              <div
                className={`p-3.5 sm:p-4 rounded-3xl text-sm leading-relaxed ${
                  isAI
                    ? 'bg-white/80 dark:bg-gray-900/80 backdrop-blur-md text-gray-900 dark:text-gray-100 rounded-bl-xs shadow-[0_4px_16px_rgba(0,0,0,0.05)] border-none'
                    : 'bg-emerald-600/90 text-white backdrop-blur-md rounded-br-xs shadow-[0_4px_16px_rgba(16,185,129,0.25)] border-none'
                }`}
              >
                {msg.text}
              </div>

              {/* Remix system card if recipe was modified */}
              {isAI && msg.isRemixReady && msg.newRecipe && msg.newJobId && (
                <div className="p-4 border-none bg-white/80 dark:bg-gray-900/80 backdrop-blur-md shadow-[0_4px_20px_rgba(16,185,129,0.12)] flex flex-col gap-3 rounded-3xl animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                      <Sparkles className="w-3.5 h-3.5 animate-spin-slow" />
                    </div>
                    <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                      {t('copilot.remixReady')}
                    </span>
                  </div>
                  <p className="text-xs text-gray-700 dark:text-gray-300 leading-normal font-medium">
                    Eine neue Version des Rezepts wurde generiert:{' '}
                    <span className="font-bold italic text-gray-900 dark:text-white">„{msg.newRecipe.title}“</span>.
                  </p>
                  <Button
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-2xl h-11 flex items-center justify-center gap-1.5 border-none shadow-none active:scale-95 transition-all text-xs cursor-pointer"
                    onPress={() => {
                      hapticMedium();
                      onLoadNewRecipe(msg.newRecipe!, msg.newJobId!);
                    }}
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    {t('copilot.remixLoadBtn')}
                  </Button>
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* Loader/Pending reply */}
      {isPending && (
        <div className="flex gap-2.5 max-w-[88%] self-start items-end animate-pulse">
          <div className="w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0 mb-1 shadow-xs backdrop-blur-xs">
            <Bot className="w-4 h-4" />
          </div>
          <div className="flex flex-col gap-1.5">
            <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md text-gray-600 dark:text-gray-300 text-xs px-4 py-3 rounded-3xl rounded-bl-xs border-none shadow-[0_4px_16px_rgba(0,0,0,0.05)] flex items-center gap-2.5">
              <Loader2 className="w-4 h-4 animate-spin text-emerald-600 dark:text-emerald-400" />
              <span>{pendingAction || t('copilot.loading')}</span>
            </div>
          </div>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="p-3.5 rounded-2xl bg-red-500/15 backdrop-blur-md border-none text-red-600 dark:text-red-400 text-xs text-center font-medium self-center max-w-[90%] shadow-xs animate-in fade-in duration-200">
          {error}
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
};

export default CopilotChatList;
