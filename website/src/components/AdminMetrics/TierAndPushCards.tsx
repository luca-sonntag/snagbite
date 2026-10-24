import { Bell, Crown, Gift } from 'lucide-react';
import type { TierDistributionMetrics, NotificationAnalyticsMetrics } from './types';

interface TierAndPushCardsProps {
  isDe: boolean;
  tiers: TierDistributionMetrics;
  notif: NotificationAnalyticsMetrics;
  rangeLabel: string;
}

export function TierAndPushCards({
  isDe,
  tiers,
  notif,
  rangeLabel,
}: TierAndPushCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Left: Tier Distribution & Bonus Credits */}
      <div className="p-5 sm:p-6 rounded-3xl bg-white shadow-[0_2px_6px_rgba(0,0,0,0.03)] flex flex-col justify-between gap-4">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600">
                <Crown className="w-4 h-4" />
              </div>
              <h3 className="text-base font-bold text-gray-900">
                {isDe ? 'Tier-Verteilung & Credits' : 'Tier Distribution & Credits'}
              </h3>
            </div>
            <span className="text-xs font-semibold text-gray-500">
              {tiers.totalUsers} {isDe ? 'Gesamt' : 'Total'}
            </span>
          </div>

          {/* Stacked progress bar */}
          <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden flex">
            <div
              className="bg-emerald-600 h-full transition-all"
              style={{ width: `${tiers.premiumPct}%` }}
              title={`Premium: ${tiers.premiumPct}%`}
            />
            <div
              className="bg-amber-500 h-full transition-all"
              style={{ width: `${tiers.alphaPct}%` }}
              title={`Alpha: ${tiers.alphaPct}%`}
            />
            <div
              className="bg-gray-300 h-full transition-all"
              style={{ width: `${tiers.freePct}%` }}
              title={`Free: ${tiers.freePct}%`}
            />
          </div>

          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="p-3 rounded-2xl bg-emerald-500/10 flex flex-col gap-0.5">
              <span className="font-semibold text-emerald-700">Premium</span>
              <span className="text-lg font-bold text-emerald-900">{tiers.premiumCount}</span>
              <span className="text-[11px] text-emerald-700 font-mono">{tiers.premiumPct}%</span>
            </div>
            <div className="p-3 rounded-2xl bg-amber-500/10 flex flex-col gap-0.5">
              <span className="font-semibold text-amber-700">Alpha</span>
              <span className="text-lg font-bold text-amber-900">{tiers.alphaCount}</span>
              <span className="text-[11px] text-amber-700 font-mono">{tiers.alphaPct}%</span>
            </div>
            <div className="p-3 rounded-2xl bg-gray-100 flex flex-col gap-0.5">
              <span className="font-semibold text-gray-600">Free</span>
              <span className="text-lg font-bold text-gray-900">{tiers.freeCount}</span>
              <span className="text-[11px] text-gray-600 font-mono">{tiers.freePct}%</span>
            </div>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-gray-50 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-gray-700 font-medium">
            <Gift className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{isDe ? 'Rewarded-Ad Bonus-Credits:' : 'Rewarded Ad Bonus Credits:'}</span>
          </div>
          <span className="font-bold text-gray-900 font-mono">
            {tiers.totalBonusCredits} Credits ({tiers.usersWithBonusCredits} User)
          </span>
        </div>
      </div>

      {/* Right: Push Notifications Opt-in & Delivery */}
      <div className="p-5 sm:p-6 rounded-3xl bg-white shadow-[0_2px_6px_rgba(0,0,0,0.03)] flex flex-col justify-between gap-4">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-teal-500/10 text-teal-600">
                <Bell className="w-4 h-4" />
              </div>
              <h3 className="text-base font-bold text-gray-900">
                {isDe ? 'Notifications Opt-in Quote' : 'Notifications Opt-in Rate'}
              </h3>
            </div>
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-teal-500/10 text-teal-700 font-mono">
              {notif.optInRatePct}%
            </span>
          </div>

          <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="bg-teal-600 h-full rounded-full transition-all"
              style={{ width: `${Math.min(notif.optInRatePct, 100)}%` }}
            />
          </div>

          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="p-3 rounded-2xl bg-gray-50 flex flex-col gap-0.5">
              <span className="text-gray-500 font-medium">
                {isDe ? 'Erreichbare User' : 'Reachable Users'}
              </span>
              <span className="text-lg font-bold text-gray-900">{notif.activePushUsers}</span>
              <span className="text-[11px] text-gray-500">
                {notif.activeTokens} {isDe ? 'Geräte' : 'devices'}
              </span>
            </div>
            <div className="p-3 rounded-2xl bg-gray-50 flex flex-col gap-0.5">
              <span className="text-gray-500 font-medium">
                {isDe ? 'Inaktive Tokens' : 'Expired Tokens'}
              </span>
              <span className="text-lg font-bold text-gray-900">{notif.disabledTokens}</span>
              <span className="text-[11px] text-gray-500">disabled</span>
            </div>
            <div className="p-3 rounded-2xl bg-emerald-500/10 flex flex-col gap-0.5">
              <span className="text-emerald-700 font-medium">
                {isDe ? 'Zugestellt' : 'Delivered'}
              </span>
              <span className="text-lg font-bold text-emerald-900">{notif.deliveredInRange}</span>
              <span className="text-[11px] text-emerald-700 truncate">{rangeLabel}</span>
            </div>
          </div>
        </div>

        {notif.byCategory.length > 0 ? (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {notif.byCategory.map((c) => (
              <span
                key={c.category}
                className="px-2.5 py-1 rounded-xl bg-gray-100 text-gray-700 text-[11px] font-semibold font-mono"
              >
                {c.category}: {c.count}
              </span>
            ))}
          </div>
        ) : (
          <div className="p-3 rounded-2xl bg-gray-50 text-xs text-gray-500 text-center">
            {isDe
              ? `Keine Push-Zustellungen im Zeitraum (${rangeLabel}).`
              : `No push deliveries in timeframe (${rangeLabel}).`}
          </div>
        )}
      </div>
    </div>
  );
}
