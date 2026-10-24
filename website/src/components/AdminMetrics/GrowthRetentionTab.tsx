import { Activity, Users } from 'lucide-react';
import type { AdminMetricsData } from './types';
import { TierAndPushCards } from './TierAndPushCards';

interface GrowthRetentionTabProps {
  isDe: boolean;
  metrics: AdminMetricsData;
  rangeLabel: string;
}

function getHeatmapCellClass(pct: number | null): string {
  if (pct === null || pct === undefined) {
    return 'bg-gray-50 text-gray-400';
  }
  if (pct >= 40) return 'bg-emerald-600 text-white font-bold';
  if (pct >= 25) return 'bg-emerald-500/25 text-emerald-900 font-bold';
  if (pct >= 12) return 'bg-emerald-500/15 text-emerald-800 font-semibold';
  if (pct > 0) return 'bg-emerald-500/8 text-emerald-700 font-medium';
  return 'bg-gray-100 text-gray-500 font-medium';
}

function formatCell(pct: number | null): string {
  if (pct === null || pct === undefined) return '—';
  return `${pct.toFixed(0)}%`;
}

export function GrowthRetentionTab({
  isDe,
  metrics,
  rangeLabel,
}: GrowthRetentionTabProps) {
  const growth = metrics.growth;
  const active = growth?.activeUsers ?? { dau: 0, wau: 0, mau: 0, stickinessPct: 0 };
  const tiers = growth?.tiers ?? {
    totalUsers: metrics.users?.total ?? 0,
    freeCount: 0,
    premiumCount: 0,
    alphaCount: 0,
    freePct: 100,
    premiumPct: 0,
    alphaPct: 0,
    usersWithBonusCredits: 0,
    totalBonusCredits: 0,
    customLimitUsers: 0,
  };
  const cohorts = growth?.cohorts ?? [];
  const notif = growth?.notifications ?? {
    totalUsers: tiers.totalUsers,
    notificationsEnabledUsers: 0,
    activePushUsers: 0,
    optInRatePct: 0,
    activeTokens: 0,
    disabledTokens: 0,
    deliveredInRange: 0,
    byCategory: [],
  };

  return (
    <div className="flex flex-col gap-5">
      {/* 1. Active Users Row (DAU / WAU / MAU / Stickiness) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-white shadow-[0_2px_6px_rgba(0,0,0,0.03)] flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500">DAU (24h)</span>
            <Activity className="w-4 h-4 text-emerald-600" />
          </div>
          <span className="text-2xl font-bold tracking-tight text-gray-900">{active.dau}</span>
          <span className="text-[11px] text-gray-500">
            {isDe ? 'Täglich aktive Nutzer' : 'Daily active users'}
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white shadow-[0_2px_6px_rgba(0,0,0,0.03)] flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500">WAU (7d)</span>
            <Users className="w-4 h-4 text-teal-600" />
          </div>
          <span className="text-2xl font-bold tracking-tight text-gray-900">{active.wau}</span>
          <span className="text-[11px] text-gray-500">
            {isDe ? 'Wöchentlich aktive Nutzer' : 'Weekly active users'}
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white shadow-[0_2px_6px_rgba(0,0,0,0.03)] flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500">MAU (30d)</span>
            <Users className="w-4 h-4 text-blue-600" />
          </div>
          <span className="text-2xl font-bold tracking-tight text-gray-900">{active.mau}</span>
          <span className="text-[11px] text-gray-500">
            {isDe ? 'Monatlich aktive Nutzer' : 'Monthly active users'}
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white shadow-[0_2px_6px_rgba(0,0,0,0.03)] flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500">Stickiness (DAU/MAU)</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-700">
              Habit
            </span>
          </div>
          <span className="text-2xl font-bold tracking-tight text-emerald-600">
            {active.stickinessPct}%
          </span>
          <span className="text-[11px] text-gray-500">
            {isDe ? 'Anteil täglicher Rückkehrer' : 'Daily return ratio'}
          </span>
        </div>
      </div>

      {/* 2. Cohort Retention Matrix (8 weeks) */}
      <div className="p-5 sm:p-6 rounded-3xl bg-white shadow-[0_2px_6px_rgba(0,0,0,0.03)] flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-gray-900">
              {isDe
                ? 'Kohorten-Retention (Letzte 8 Registrierungs-Wochen)'
                : 'Cohort Retention (Last 8 Registration Weeks)'}
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {isDe
                ? 'Anteil der Nutzer einer Start-Woche, die nach X Tagen erneut aktiv waren (Session, Extraktion, Kochbuch, Planer oder Einkaufsliste).'
                : 'Share of users from a registration week active again on/after day X.'}
            </p>
          </div>
          <span className="self-start sm:self-center px-2.5 py-1 rounded-full text-[10px] font-bold bg-gray-100 text-gray-600 shrink-0">
            Global Snapshot
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="text-gray-500 font-semibold">
                <th className="py-2 pr-3">{isDe ? 'Woche ab' : 'Week of'}</th>
                <th className="py-2 px-3 text-right">{isDe ? 'Neue User' : 'New Users'}</th>
                <th className="py-2 px-2 text-center">Tag 1 (D1)</th>
                <th className="py-2 px-2 text-center">Tag 7 (D7)</th>
                <th className="py-2 px-2 text-center">Tag 14 (D14)</th>
                <th className="py-2 pl-2 text-center">Tag 30 (D30)</th>
              </tr>
            </thead>
            <tbody className="space-y-1.5">
              {cohorts.map((row) => (
                <tr key={row.cohortWeekStart} className="text-gray-900">
                  <td className="py-1.5 pr-3 font-mono font-semibold text-gray-700 whitespace-nowrap">
                    {row.cohortLabel}
                  </td>
                  <td className="py-1.5 px-3 text-right font-bold text-gray-900">{row.size}</td>
                  <td className="py-1 px-1.5">
                    <div
                      className={`py-1.5 px-2 rounded-xl text-center font-mono transition-colors ${getHeatmapCellClass(
                        row.d1Pct,
                      )}`}
                    >
                      {formatCell(row.d1Pct)}
                    </div>
                  </td>
                  <td className="py-1 px-1.5">
                    <div
                      className={`py-1.5 px-2 rounded-xl text-center font-mono transition-colors ${getHeatmapCellClass(
                        row.d7Pct,
                      )}`}
                    >
                      {formatCell(row.d7Pct)}
                    </div>
                  </td>
                  <td className="py-1 px-1.5">
                    <div
                      className={`py-1.5 px-2 rounded-xl text-center font-mono transition-colors ${getHeatmapCellClass(
                        row.d14Pct,
                      )}`}
                    >
                      {formatCell(row.d14Pct)}
                    </div>
                  </td>
                  <td className="py-1 pl-1.5">
                    <div
                      className={`py-1.5 px-2 rounded-xl text-center font-mono transition-colors ${getHeatmapCellClass(
                        row.d30Pct,
                      )}`}
                    >
                      {formatCell(row.d30Pct)}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. Side-by-side: Tier Distribution & Push Notifications */}
      <TierAndPushCards
        isDe={isDe}
        tiers={tiers}
        notif={notif}
        rangeLabel={rangeLabel}
      />
    </div>
  );
}
