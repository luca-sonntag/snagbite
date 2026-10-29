import React from 'react';
import { X } from 'lucide-react';
import { hapticLight } from '../../utils/haptics';

interface ActiveChipProps {
  label: string;
  icon?: React.ReactNode;
  onRemove: () => void;
  accent?: 'emerald' | 'amber';
}

export default function ActiveChip({
  label,
  icon,
  onRemove,
  accent = 'emerald',
}: ActiveChipProps) {
  const tone =
    accent === 'amber'
      ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20'
      : 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20';

  return (
    <button
      type="button"
      onClick={() => {
        hapticLight();
        onRemove();
      }}
      className={`min-h-[44px] px-3.5 py-2 text-xs font-bold rounded-2xl border-none whitespace-nowrap shrink-0 active:scale-95 transition-all duration-200 ease-out cursor-pointer flex items-center gap-2 select-none ${tone}`}
    >
      {icon}
      <span className="max-w-[9rem] truncate">{label}</span>
      <X className="w-3.5 h-3.5 opacity-80 shrink-0" />
    </button>
  );
}
