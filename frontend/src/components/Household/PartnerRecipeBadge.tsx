import { useHousehold } from './useHousehold';

interface PartnerRecipeBadgeProps {
  source?: string | null;
  className?: string;
  size?: 'sm' | 'md';
}

export default function PartnerRecipeBadge({
  source,
  className = '',
  size = 'md',
}: PartnerRecipeBadgeProps) {
  const { partnerProfile } = useHousehold();

  // Avatar badge is strictly reserved for recipes originating from the partner
  if (source !== 'household') {
    return null;
  }

  const name = partnerProfile?.displayName || 'Partner';
  const initial = name.charAt(0).toUpperCase();
  const avatarUrl = partnerProfile?.avatarUrl;

  const hasPosition = /\b(absolute|relative|fixed|sticky)\b/.test(className);
  const positionClass = hasPosition ? '' : 'relative';
  const sizeClasses = size === 'sm' ? 'w-5 h-5 text-[9px]' : 'w-6 h-6 text-[11px]';

  return (
    <div
      className={`z-20 ${sizeClasses} rounded-full ring-2 ring-white/95 dark:ring-gray-900/95 shadow-md overflow-hidden flex items-center justify-center shrink-0 select-none bg-emerald-600 ${positionClass} ${className}`}
      title={`Von ${name} hinzugefügt`}
      aria-label={`Von ${name} hinzugefügt`}
    >
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={name}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      ) : (
        <span className="font-bold text-white tracking-tight leading-none">
          {initial}
        </span>
      )}
    </div>
  );
}
