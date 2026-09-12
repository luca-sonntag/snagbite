import { Sparkles } from 'lucide-react';

interface HealthScoreSmartTipProps {
  tip: string;
  isEn?: boolean;
}

export default function HealthScoreSmartTip({ tip, isEn = false }: HealthScoreSmartTipProps) {
  const cleanTip = tip.replace(/^Tipp:\s*/i, '').replace(/^Tip:\s*/i, '');

  return (
    <div className="bg-emerald-500/[0.08] dark:bg-emerald-500/10 text-emerald-950 dark:text-emerald-100 rounded-2xl p-3.5 sm:p-4 flex items-start gap-3 border-none shadow-[0_2px_6px_rgba(0,0,0,0.02)] select-none">
      <div className="w-8 h-8 rounded-xl bg-emerald-500/15 dark:bg-emerald-500/25 flex items-center justify-center shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5">
        <Sparkles className="w-4.5 h-4.5" />
      </div>
      <div className="flex flex-col gap-0.5 min-w-0 flex-1">
        <span className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
          {isEn ? 'Smart Upgrade Tip' : 'Smarter Upgrade-Tipp'}
        </span>
        <span className="text-xs text-emerald-800/90 dark:text-emerald-300/90 leading-relaxed font-normal">
          {cleanTip}
        </span>
      </div>
    </div>
  );
}
