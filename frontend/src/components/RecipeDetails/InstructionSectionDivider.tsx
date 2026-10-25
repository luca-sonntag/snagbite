import { Layers } from 'lucide-react';

interface InstructionSectionDividerProps {
  sectionName: string;
}

export default function InstructionSectionDivider({ sectionName }: InstructionSectionDividerProps) {
  if (!sectionName) return null;

  return (
    <div className="px-1 pt-3 pb-1.5 mt-1 border-t border-black/[0.06] dark:border-white/[0.08] flex items-center gap-2">
      <div className="w-4.5 h-4.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
        <Layers className="w-2.5 h-2.5" />
      </div>
      <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 truncate">
        {sectionName}
      </span>
    </div>
  );
}
