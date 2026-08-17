import { Crown } from 'lucide-react';

interface PremiumHintProps {
  onClick: () => void;
  /** Main hint text. */
  label: string;
  /** Optional trailing call-to-action label (banner variant only), e.g. "Upgrade". */
  cta?: string;
  /** `banner` = full-width row surface, `inline` = compact text link. */
  variant?: 'banner' | 'inline';
  className?: string;
}

/**
 * Unified premium upsell hint. Every touchpoint (catalog banner, extract-form
 * link, …) shares one "gold crown on emerald" language so they read as the same
 * system as the PremiumModal and the Settings upgrade card. This is the single
 * source of truth for that style — do not restyle the hints at the call sites.
 */
export default function PremiumHint({
  onClick,
  label,
  cta,
  variant = 'banner',
  className = ''
}: PremiumHintProps) {
  if (variant === 'inline') {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`inline-flex items-center gap-1.5 text-[11px] font-bold text-amber-600 dark:text-amber-400 hover:text-amber-500 dark:hover:text-amber-300 transition-colors ${className}`}
      >
        <Crown className="w-3 h-3" />
        <span>{label}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full cursor-pointer flex items-center gap-3 px-4 py-3 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/15 border-none shadow-[0_2px_6px_rgba(0,0,0,0.03)] active:scale-[0.98] transition-all text-left ${className}`}
    >
      <span className="w-9 h-9 rounded-2xl bg-amber-500/10 flex items-center justify-center shrink-0">
        <Crown className="w-5 h-5 text-amber-500 fill-amber-500" />
      </span>
      <span className="flex-1 min-w-0 text-xs font-semibold text-gray-900 dark:text-white leading-snug">
        {label}
      </span>
      {cta && (
        <span className="text-[11px] font-extrabold text-white bg-emerald-600 hover:bg-emerald-500 px-3 py-1.5 rounded-xl shrink-0 transition-colors">
          {cta}
        </span>
      )}
    </button>
  );
}
