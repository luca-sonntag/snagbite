import React, { useState } from 'react';
import { Share2, X, ChevronRight } from 'lucide-react';
import { useI18n } from '../../context/I18nContext';
import { hapticLight } from '../../utils/haptics';
import type { QuickShareTipCardProps } from './types';

export const QuickShareTipCard: React.FC<QuickShareTipCardProps> = ({ onLearnMore }) => {
  const { t } = useI18n();
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className="flex items-center gap-3 p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-gray-900 shadow-[0_2px_6px_rgba(0,0,0,0.03)] border-none">
      <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
        <Share2 className="w-4 h-4" />
      </div>

      <div
        className="flex-1 min-w-0 cursor-pointer"
        onClick={() => {
          hapticLight();
          onLearnMore?.();
        }}
      >
        <span className="text-xs font-bold text-gray-900 dark:text-white block leading-tight">
          {t('form.helpShareTitle')}
        </span>
        <span className="text-[11px] text-gray-500 dark:text-gray-400 leading-snug line-clamp-1 mt-0.5 block">
          {t('form.helpShareTip')}
        </span>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        {onLearnMore && (
          <button
            type="button"
            onClick={() => {
              hapticLight();
              onLearnMore();
            }}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-black/5 dark:hover:bg-white/5 border-none cursor-pointer transition-colors"
            aria-label="Learn more"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
        <button
          type="button"
          onClick={() => {
            hapticLight();
            setDismissed(true);
          }}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-black/5 dark:hover:bg-white/5 border-none cursor-pointer transition-colors"
          aria-label="Dismiss tip"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

export default QuickShareTipCard;
