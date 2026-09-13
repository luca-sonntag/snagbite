import ProBadge from './ProBadge';

/**
 * @deprecated Use `<ProBadge variant="corner" />` directly instead.
 * Kept for backwards compatibility.
 */
export default function PremiumCrownBadge({ className = '' }: { className?: string }) {
  return <ProBadge variant="corner" className={className} />;
}

