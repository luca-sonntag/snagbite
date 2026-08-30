import React from 'react';
import { Sparkles } from 'lucide-react';
import { useI18n } from '../../../context/I18nContext';
import { hapticLight } from '../../../utils/haptics';
import type { Chip } from './types';

interface CopilotWelcomeCardProps {
  initialChips?: Chip[];
  isPending: boolean;
  onSend: (prompt: string) => void;
}

export const CopilotWelcomeCard: React.FC<CopilotWelcomeCardProps> = ({
  initialChips,
  isPending,
  onSend,
}) => {
  const { t } = useI18n();

  return (
    <div className="my-auto flex flex-col items-center text-center max-w-sm mx-auto gap-3.5 py-6 px-5 rounded-3xl bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border border-white/40 dark:border-white/10 shadow-[0_8px_30px_rgba(0,0,0,0.06)] animate-in fade-in zoom-in-95 duration-300">
      <div className="w-12 h-12 rounded-2xl bg-white dark:bg-gray-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-md border border-emerald-500/10">
        <Sparkles className="w-6 h-6 animate-pulse" />
      </div>
      <div>
        <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-1">{t('copilot.title')}</h4>
        <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
          Ich helfe dir, dieses Rezept anzupassen, Zutaten auszutauschen oder einen Timer zu starten.
        </p>
      </div>

      {/* Proactive Initial Recipe Suggestions */}
      {initialChips && initialChips.length > 0 && (
        <div className="w-full flex flex-col gap-2 pt-2 border-t border-black/5 dark:border-white/5">
          <span className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider text-left px-1">
            Vorschläge für dieses Rezept
          </span>
          <div className="flex flex-col gap-1.5 w-full">
            {initialChips.slice(0, 3).map((chip, cIdx) => (
              <button
                key={cIdx}
                type="button"
                onClick={() => {
                  hapticLight();
                  onSend(chip.prompt);
                }}
                disabled={isPending}
                className="w-full text-left px-3.5 py-2.5 rounded-2xl bg-white/80 dark:bg-gray-800/80 hover:bg-emerald-500/15 text-xs font-semibold text-gray-700 dark:text-gray-200 hover:text-emerald-700 dark:hover:text-emerald-300 border border-black/5 dark:border-white/5 shadow-xs flex items-center gap-2 active:scale-98 transition-all cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span className="truncate">{chip.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CopilotWelcomeCard;
