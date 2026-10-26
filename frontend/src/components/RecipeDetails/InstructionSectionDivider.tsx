import { Layers } from 'lucide-react';

interface InstructionSectionDividerProps {
  sectionName: string;
  railColumn: string;
  isLarge?: boolean;
  isFirst?: boolean;
  prevChecked?: boolean;
}

export default function InstructionSectionDivider({
  sectionName,
  railColumn,
  isLarge = false,
  isFirst = false,
  prevChecked = false,
}: InstructionSectionDividerProps) {
  if (!sectionName) return null;

  const railBase = 'w-px shrink-0 transition-colors duration-300';
  const railTone = (done: boolean) => (done ? 'bg-emerald-500/45' : 'bg-black/[0.08] dark:bg-white/10');

  return (
    <div
      className={`flex items-center ${
        isLarge ? 'gap-2.5 sm:gap-3 px-1' : 'gap-3.5 px-1.5'
      } pt-4 pb-1 select-none`}
    >
      {/* Timeline Rail Column — aligned with the steps */}
      <div className={railColumn}>
        <div className={`${railBase} h-3 ${isFirst ? 'invisible' : railTone(prevChecked)}`} />

        <div
          className={`${
            isLarge ? 'w-5.5 h-5.5' : 'w-5 h-5'
          } rounded-lg bg-emerald-500/15 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 shadow-2xs`}
        >
          <Layers className={isLarge ? 'w-3 h-3' : 'w-2.5 h-2.5'} />
        </div>

        <div className={`${railBase} h-3 ${railTone(prevChecked)}`} />
      </div>

      {/* Content Column: Section Name & Subtle Horizontal Rule */}
      <div className="flex-1 flex items-center gap-2 min-w-0">
        <span
          className={`${
            isLarge ? 'text-xs sm:text-sm' : 'text-[11px]'
          } font-extrabold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 truncate`}
        >
          {sectionName}
        </span>
        <div className="h-px bg-black/[0.06] dark:bg-white/[0.08] flex-1 min-w-8" />
      </div>
    </div>
  );
}
