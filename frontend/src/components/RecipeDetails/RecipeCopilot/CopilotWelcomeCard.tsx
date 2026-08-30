import React from 'react';
import {
  Sparkles,
  ChefHat,
  ArrowLeftRight,
  ShoppingCart,
  Timer,
  Loader2,
} from 'lucide-react';
import { hapticLight } from '../../../utils/haptics';
import type { Chip } from './types';

interface CopilotWelcomeCardProps {
  initialChips?: Chip[];
  chipsLoading?: boolean;
  isPending: boolean;
  onSend: (prompt: string) => void;
}

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

export const CopilotWelcomeCard: React.FC<CopilotWelcomeCardProps> = ({
  initialChips,
  chipsLoading,
  isPending,
  onSend,
}) => {
  return (
    <div className="my-auto flex flex-col items-center text-center max-w-sm mx-auto w-full px-2 py-2 animate-in fade-in zoom-in-95 duration-300">
      {/* Crisp Solid Floating Icon Badge */}
      <div className="w-12 h-12 rounded-2xl bg-white dark:bg-gray-800 text-emerald-600 dark:text-emerald-400 shadow-md border border-emerald-500/20 flex items-center justify-center mb-2.5">
        <Sparkles className="w-6 h-6" />
      </div>

      {/* Greeting Typography */}
      <h3 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white tracking-tight mb-1">
        Wie kann ich dir helfen?
      </h3>
      <div className="inline-flex items-center px-3 py-1 rounded-full bg-white/60 dark:bg-gray-900/60 backdrop-blur-md border border-black/5 dark:border-white/10 mb-4 shadow-xs">
        <p className="text-[11px] sm:text-xs text-gray-700 dark:text-gray-300 font-medium">
          Zutaten tauschen, Rezept umwandeln oder Tipps abrufen
        </p>
      </div>

      {/* Proactive Suggestion Pills (Wrapped Flow instead of big white cards) */}
      {chipsLoading ? (
        <div className="w-full flex items-center justify-center py-4 gap-2 text-xs text-gray-500 dark:text-gray-400">
          <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
          <span>Vorschläge werden geladen…</span>
        </div>
      ) : initialChips && initialChips.length > 0 ? (
        <div className="w-full flex flex-wrap justify-center gap-2 max-w-sm">
          {initialChips.slice(0, 4).map((chip, cIdx) => (
            <button
              key={cIdx}
              type="button"
              onClick={() => {
                hapticLight();
                onSend(chip.prompt);
              }}
              disabled={isPending}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-white/85 dark:bg-gray-800/85 backdrop-blur-xl hover:bg-white dark:hover:bg-gray-800 border border-white/60 dark:border-white/10 shadow-[0_2px_10px_rgba(0,0,0,0.04)] text-xs font-semibold text-gray-800 dark:text-gray-200 active:scale-95 transition-all cursor-pointer"
            >
              {getCategoryIcon(chip.category)}
              <span className="truncate max-w-[220px]">{chip.label}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
};

export default CopilotWelcomeCard;
