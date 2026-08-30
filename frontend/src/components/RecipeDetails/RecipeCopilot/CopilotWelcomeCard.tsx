import React from 'react';
import {
  Sparkles,
  ChefHat,
  ArrowLeftRight,
  ShoppingCart,
  Timer,
  ChevronRight,
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
      return <Sparkles className="w-4 h-4 text-emerald-500 shrink-0" />;
    case 'help':
      return <ChefHat className="w-4 h-4 text-blue-500 shrink-0" />;
    case 'substitute':
      return <ArrowLeftRight className="w-4 h-4 text-amber-500 shrink-0" />;
    case 'shopping':
      return <ShoppingCart className="w-4 h-4 text-purple-500 shrink-0" />;
    case 'timer':
      return <Timer className="w-4 h-4 text-rose-500 shrink-0" />;
    default:
      return <Sparkles className="w-4 h-4 text-emerald-500 shrink-0" />;
  }
};

export const CopilotWelcomeCard: React.FC<CopilotWelcomeCardProps> = ({
  initialChips,
  chipsLoading,
  isPending,
  onSend,
}) => {
  return (
    <div className="my-auto flex flex-col items-center text-center max-w-sm mx-auto w-full px-2 py-4 animate-in fade-in zoom-in-95 duration-300">
      {/* Solid High-Contrast Floating Icon Badge */}
      <div className="w-14 h-14 rounded-3xl bg-white dark:bg-gray-800 text-emerald-600 dark:text-emerald-400 shadow-[0_8px_24px_rgba(0,0,0,0.1)] border border-emerald-500/20 flex items-center justify-center mb-3.5">
        <Sparkles className="w-7 h-7" />
      </div>

      {/* Greeting Typography */}
      <h3 className="text-base font-bold text-gray-900 dark:text-white tracking-tight mb-1">
        Wie kann ich dir helfen?
      </h3>
      <p className="text-xs text-gray-500 dark:text-gray-400 max-w-[260px] leading-relaxed mb-5">
        Zutaten tauschen, Rezept umwandeln oder Zubereitungstipps abrufen.
      </p>

      {/* Proactive Suggestion Cards */}
      {chipsLoading ? (
        <div className="w-full flex items-center justify-center py-6 gap-2 text-xs text-gray-400 dark:text-gray-500">
          <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
          <span>Vorschläge werden vorbereitet…</span>
        </div>
      ) : initialChips && initialChips.length > 0 ? (
        <div className="w-full flex flex-col gap-2">
          {initialChips.slice(0, 3).map((chip, cIdx) => (
            <button
              key={cIdx}
              type="button"
              onClick={() => {
                hapticLight();
                onSend(chip.prompt);
              }}
              disabled={isPending}
              className="w-full text-left px-3.5 py-3 rounded-2xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl hover:bg-white dark:hover:bg-gray-800/95 border border-white/60 dark:border-white/10 shadow-[0_4px_16px_rgba(0,0,0,0.03)] hover:shadow-[0_6px_20px_rgba(16,185,129,0.1)] hover:border-emerald-500/30 flex items-center justify-between gap-3 active:scale-[0.98] transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-xl bg-black/5 dark:bg-white/5 flex items-center justify-center shrink-0">
                  {getCategoryIcon(chip.category)}
                </div>
                <span className="text-xs font-semibold text-gray-800 dark:text-gray-200 group-hover:text-emerald-700 dark:group-hover:text-emerald-300 truncate">
                  {chip.label}
                </span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 shrink-0 transition-transform group-hover:translate-x-0.5" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
};

export default CopilotWelcomeCard;
