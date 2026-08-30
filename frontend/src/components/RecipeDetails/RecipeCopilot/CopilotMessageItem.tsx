import React from 'react';
import { Button } from '@heroui/react';
import { Sparkles, Bot, RefreshCw, Timer } from 'lucide-react';
import { useI18n } from '../../../context/I18nContext';
import { useTimerManager } from '../../../hooks/useTimerManager';
import { useToast } from '../../../context/ToastContext';
import { hapticLight, hapticMedium } from '../../../utils/haptics';
import CopilotMessageContent from './CopilotMessageContent';
import type { CopilotMessage } from './types';
import type { Recipe } from '../../../types';

interface CopilotSuggestion {
  label: string;
  type: 'prompt' | 'timer';
  payload: string;
}

const SUGGESTION_REGEX = /\[(?:suggest:\s*)?([^\]]+)\](?:\s*\((?:(prompt|timer):\s*)?([^)]+)\))?/gi;

export function parseSuggestions(rawText: string): { cleanText: string; suggestions: CopilotSuggestion[] } {
  if (!rawText) return { cleanText: '', suggestions: [] };
  const suggestions: CopilotSuggestion[] = [];
  const cleanText = rawText
    .replace(SUGGESTION_REGEX, (_, rawLabel, rawType, rawPayload) => {
      const trimmedLabel = String(rawLabel || '').trim();
      const typeStr = (rawType || '').toLowerCase();
      const isTimer = typeStr === 'timer' || trimmedLabel.toLowerCase().includes('timer');
      const trimmedPayload = String(rawPayload || trimmedLabel).trim();

      if (trimmedLabel) {
        suggestions.push({
          label: trimmedLabel,
          type: isTimer ? 'timer' : 'prompt',
          payload: trimmedPayload || trimmedLabel,
        });
      }
      return '';
    })
    .replace(/\n\s*\n\s*\n/g, '\n\n')
    .trim();

  return { cleanText, suggestions };
}

interface CopilotMessageItemProps {
  msg: CopilotMessage;
  idx: number;
  isLatest: boolean;
  isPending: boolean;
  recipeId?: string;
  onSend: (text: string) => void;
  onLoadNewRecipe: (recipe: Recipe, jobId: string) => void;
}

export const CopilotMessageItem: React.FC<CopilotMessageItemProps> = ({
  msg,
  isLatest,
  isPending,
  recipeId,
  onSend,
  onLoadNewRecipe,
}) => {
  const { t } = useI18n();
  const { addTimer } = useTimerManager();
  const toast = useToast();

  const isAI = msg.role === 'model';
  const { cleanText, suggestions } = isAI ? parseSuggestions(msg.text) : { cleanText: msg.text, suggestions: [] };

  return (
    <div
      className={`flex gap-2.5 ${
        isAI
          ? 'self-start items-start max-w-[92%] sm:max-w-[88%]'
          : 'self-end justify-end max-w-[85%]'
      } animate-in fade-in slide-in-from-bottom-1 duration-200`}
    >
      {isAI && (
        <div className="w-8 h-8 rounded-2xl flex items-center justify-center flex-shrink-0 font-bold text-xs bg-white dark:bg-gray-800 text-emerald-600 dark:text-emerald-400 shadow-[0_2px_8px_rgba(0,0,0,0.08)] border border-emerald-500/20 mt-0.5">
          <Bot className="w-4 h-4" />
        </div>
      )}

      <div className="flex flex-col gap-2 min-w-0">
        <div
          className={`p-3.5 sm:p-4 text-[14px] leading-relaxed ${
            isAI
              ? 'bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 rounded-3xl rounded-tl-sm shadow-[0_4px_20px_rgba(0,0,0,0.08)] border border-gray-100 dark:border-gray-800'
              : 'bg-emerald-600 text-white rounded-3xl rounded-tr-sm shadow-[0_4px_20px_rgba(16,185,129,0.25)] font-normal'
          }`}
        >
          <CopilotMessageContent text={cleanText} isAI={isAI} />
        </div>

        {/* Proactive Follow-up Quick Action Pills: Only on latest AI message */}
        {isAI && isLatest && suggestions.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            {suggestions.map((sug, sIdx) => (
              <button
                key={sIdx}
                type="button"
                disabled={isPending}
                onClick={() => {
                  hapticLight();
                  if (sug.type === 'timer') {
                    const [valStr, ...lblParts] = sug.payload.split(':');
                    const num = parseFloat(valStr);
                    const label = lblParts.join(':') || 'Timer';
                    if (!isNaN(num) && num > 0) {
                      const totalSeconds = num <= 60 ? Math.round(num * 60) : Math.round(num);
                      addTimer(totalSeconds, label, recipeId);
                      const displayMins = Math.round(totalSeconds / 60);
                      toast.info(`Timer gestartet: ${label} (${displayMins} Min)`);
                    }
                  } else {
                    onSend(sug.payload);
                  }
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-white dark:bg-gray-800 text-xs font-semibold text-gray-800 dark:text-gray-200 border border-gray-100 dark:border-gray-700 shadow-[0_2px_8px_rgba(0,0,0,0.06)] hover:bg-emerald-500/15 hover:text-emerald-700 dark:hover:text-emerald-300 active:scale-95 transition-all cursor-pointer disabled:opacity-50 min-h-[38px]"
              >
                {sug.type === 'timer' ? (
                  <Timer className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                )}
                <span>{sug.label}</span>
              </button>
            ))}
          </div>
        )}

        {/* Remix system card if recipe was modified */}
        {isAI && msg.isRemixReady && msg.newRecipe && msg.newJobId && (
          <div className="p-4 border border-emerald-500/30 bg-white dark:bg-gray-900 shadow-[0_4px_20px_rgba(16,185,129,0.12)] flex flex-col gap-3 rounded-3xl animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
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
};

export default CopilotMessageItem;
