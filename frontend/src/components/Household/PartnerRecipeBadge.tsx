import { useHousehold } from './useHousehold';

interface PartnerRecipeBadgeProps {
  source?: string | null;
  className?: string;
}

export default function PartnerRecipeBadge({ source, className = '' }: PartnerRecipeBadgeProps) {
  const { partnerProfile } = useHousehold();

  // Avatar badge is strictly reserved for recipes originating from the partner
  if (source !== 'household') {
    return null;
  }

  const name = partnerProfile?.displayName || 'Partner';
  const initial = name.charAt(0).toUpperCase();
  const avatarUrl = partnerProfile?.avatarUrl;

  return (
    <div
      className={`relative z-10 w-5.5 h-5.5 rounded-full ring-1.5 ring-white/95 dark:ring-gray-900/95 shadow-xs overflow-hidden flex items-center justify-center shrink-0 select-none bg-emerald-600 ${className}`}
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
        <span className="text-[10px] font-bold text-white tracking-tight leading-none">
          {initial}
        </span>
      )}
    </div>
  );
}
