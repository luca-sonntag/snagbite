import React from 'react';
import { Bot, X, Trash2 } from 'lucide-react';
import { useI18n } from '../../../context/I18nContext';
import { hapticLight, hapticMedium } from '../../../utils/haptics';
import type { CopilotHeaderProps } from './types';

export const CopilotHeader: React.FC<CopilotHeaderProps> = ({
  historyLength,
  isPending,
  onClear,
  onClose,
}) => {
  const { t } = useI18n();

  return (
    <header className="pt-[calc(0.75rem_+_var(--safe-area-inset-top))] px-4 pb-2 flex items-center justify-between flex-shrink-0 select-none z-10">
      {/* Left: Clear button or empty placeholder */}
      <div className="w-10 flex justify-start">
        {historyLength > 0 ? (
          <button
            type="button"
            onClick={() => {
              hapticMedium();
              onClear();
            }}
            disabled={isPending}
            className="w-10 h-10 rounded-2xl bg-white/50 dark:bg-gray-800/50 backdrop-blur-md hover:bg-red-500/15 text-gray-600 hover:text-red-500 dark:text-gray-300 dark:hover:text-red-400 active:scale-95 transition-all outline-none border-none cursor-pointer flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_2px_8px_rgba(0,0,0,0.04)]"
            aria-label={t('copilot.clearAria')}
            title={t('copilot.clearAria')}
          >
            <Trash2 className="w-4.5 h-4.5" />
          </button>
        ) : (
          <div className="w-10" />
        )}
      </div>

      {/* Center: Floating Bot Pill & Live Indicator */}
      <div className="px-4 py-2 rounded-2xl bg-white/60 dark:bg-gray-900/60 backdrop-blur-md shadow-[0_2px_12px_rgba(0,0,0,0.06)] border-none flex items-center gap-2 max-w-[65%]">
        <div className="w-6 h-6 rounded-full bg-emerald-500/15 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
          <Bot className="w-3.5 h-3.5" />
        </div>
        <span className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white flex items-center gap-1.5 leading-none truncate">
          {t('copilot.title')}
          <span className="flex h-2 w-2 relative shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
        </span>
      </div>

      {/* Right: Close button */}
      <div className="w-10 flex justify-end">
        <button
          type="button"
          onClick={() => {
            hapticLight();
            onClose();
          }}
          className="w-10 h-10 rounded-2xl bg-white/50 dark:bg-gray-800/50 backdrop-blur-md hover:bg-white/80 dark:hover:bg-gray-700/80 text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white active:scale-95 transition-all outline-none border-none cursor-pointer flex items-center justify-center shadow-[0_2px_8px_rgba(0,0,0,0.04)]"
          aria-label={t('dialog.closeAria')}
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
};

export default CopilotHeader;
