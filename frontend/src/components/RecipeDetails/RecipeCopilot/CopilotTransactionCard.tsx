import React from 'react';
import { Button } from '@heroui/react';
import { ListChecks, X, Trash2, Loader2, Sparkles } from 'lucide-react';
import { useI18n } from '../../../context/I18nContext';
import type { CopilotTransactionCardProps } from './types';
import { hapticMedium, hapticHeavy } from '../../../utils/haptics';

export const CopilotTransactionCard: React.FC<CopilotTransactionCardProps> = ({
  pendingChanges,
  isPending,
  onRemoveChange,
  onDiscardAll,
  onApplyChanges,
}) => {
  const { t } = useI18n();

  if (pendingChanges.length === 0) return null;

  return (
    <div className="p-3.5 sm:p-4 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-[0_8px_30px_rgba(0,0,0,0.12)] flex flex-col gap-3 rounded-3xl animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0">
          <ListChecks className="w-3.5 h-3.5" />
        </div>
        <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
          {t('copilot.changesTitle', { count: pendingChanges.length })}
        </span>
      </div>

      {/* Collected changes list */}
      <div className="flex flex-col gap-1.5 max-h-36 overflow-y-auto scrollbar-none">
        {pendingChanges.map((change, idx) => (
          <div
            key={change.id}
            className="flex items-start gap-2 p-2.5 rounded-2xl bg-black/5 dark:bg-white/5 border-none"
          >
            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 flex-shrink-0 w-4 text-center">
              {idx + 1}.
            </span>
            <span className="text-xs text-gray-800 dark:text-gray-200 leading-snug flex-1 min-w-0 break-words font-medium">
              {change.text}
            </span>
            <button
              type="button"
              onClick={() => {
                hapticHeavy();
                onRemoveChange(change.id);
              }}
              disabled={isPending}
              className="flex-shrink-0 w-7 h-7 min-w-[28px] min-h-[28px] rounded-lg text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-black/5 dark:hover:bg-white/5 active:scale-90 transition-all outline-none border-none flex items-center justify-center cursor-pointer disabled:opacity-40"
              aria-label={t('copilot.changesDeleteAria')}
              title={t('copilot.changesDeleteAria')}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <Button
          size="sm"
          className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-2xl h-11 flex items-center justify-center gap-2 border-none shadow-none active:scale-95 transition-all text-xs flex-1 cursor-pointer"
          onPress={() => {
            hapticMedium();
            onApplyChanges();
          }}
          isDisabled={isPending}
        >
          {isPending ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Sparkles className="w-3.5 h-3.5" />
          )}
          {t('copilot.createRemixBtn') || 'Remix erstellen'}
        </Button>
        <Button
          size="sm"
          className="bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-gray-600 dark:text-gray-300 hover:text-red-500 dark:hover:text-red-400 font-semibold rounded-2xl h-11 px-3.5 flex items-center justify-center gap-1.5 border-none shadow-none active:scale-95 transition-all text-xs cursor-pointer"
          onPress={() => {
            hapticHeavy();
            onDiscardAll();
          }}
          isDisabled={isPending}
        >
          <Trash2 className="w-3.5 h-3.5" />
          {t('copilot.changesDiscardAll')}
        </Button>
      </div>
    </div>
  );
};
export default CopilotTransactionCard;
