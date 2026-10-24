import {
  Users,
  BookOpen,
  Coins,
  TrendingUp,
  HardDriveDownload,
  Activity,
  GitBranch,
  Cpu,
} from 'lucide-react';
import type { AdminMetricsData, MetricsRange, MetricsSubTab } from './types';

interface MetricsOverviewHeaderProps {
  isDe: boolean;
  metrics: AdminMetricsData | null;
  metricsRange: MetricsRange;
  onSelectRange: (range: MetricsRange) => void;
  subTab: MetricsSubTab;
  onSelectSubTab: (tab: MetricsSubTab) => void;
  onOpenUsersTab: () => void;
  rangeLabel: Record<MetricsRange, string>;
}

function formatDownloadSize(mb: number): string {
  if (!mb || mb <= 0) return '0 MB';
  if (mb >= 1024) return `${(mb / 1024).toFixed(2)} GB`;
  return `${mb.toFixed(mb < 10 ? 2 : 1)} MB`;
}

export function MetricsOverviewHeader({
  isDe,
  metrics,
  metricsRange,
  onSelectRange,
  subTab,
  onSelectSubTab,
  onOpenUsersTab,
  rangeLabel,
}: MetricsOverviewHeaderProps) {
  return (
    <div className="flex flex-col gap-5">
      {/* Timeframe selector */}
      <div className="flex flex-wrap sm:flex-nowrap gap-1 bg-gray-100 p-1 sm:p-1.5 rounded-2xl border-none">
        {(
          [
            { id: 'all', label: isDe ? 'Alle' : 'All' },
            { id: 'today', label: isDe ? 'Heute' : 'Today' },
            { id: '3d', label: isDe ? '3 Tage' : '3 days' },
            { id: '7d', label: isDe ? '7 Tage' : '7 days' },
            { id: '30d', label: isDe ? '30 Tage' : '30 days' },
          ] as const
        ).map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => onSelectRange(id)}
            className={`flex-1 min-w-[30%] sm:min-w-0 px-3 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap border-none ${
              metricsRange === id
                ? 'bg-white text-emerald-600 shadow-[0_2px_6px_rgba(0,0,0,0.03)]'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Top 5 KPI Cards */}
      {metrics && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <div
            className="p-4 rounded-2xl border-none shadow-[0_2px_6px_rgba(0,0,0,0.03)] bg-white flex flex-col gap-2 cursor-pointer active:scale-95 transition-all hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)]"
            onClick={onOpenUsersTab}
          >
            <div className="flex items-center justify-between text-gray-400">
              <span className="text-xs font-semibold text-gray-500">
                {metricsRange === 'all'
                  ? isDe
                    ? 'Nutzer'
                    : 'Users'
                  : isDe
                    ? 'Neue Nutzer'
                    : 'New Users'}
              </span>
              <div className="p-1.5 rounded-xl bg-emerald-500/10 text-emerald-600">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-2xl font-bold tracking-tight text-gray-900 leading-tight">
                {metricsRange === 'all'
                  ? (metrics.users?.total ?? 0)
                  : (metrics.users?.newInRange ?? 0)}
              </span>
              <span className="text-[11px] text-gray-500 mt-0.5 font-medium">
                {metricsRange === 'all'
                  ? isDe
                    ? 'Registriert'
                    : 'Registered'
                  : rangeLabel[metricsRange]}
              </span>
            </div>
          </div>

          <div className="p-4 rounded-2xl border-none shadow-[0_2px_6px_rgba(0,0,0,0.03)] bg-white flex flex-col gap-2">
            <div className="flex items-center justify-between text-gray-400">
              <span className="text-xs font-semibold text-gray-500">
                {isDe ? 'Extraktionen' : 'Extractions'}
              </span>
              <div className="p-1.5 rounded-xl bg-teal-500/10 text-teal-600">
                <BookOpen className="w-4 h-4" />
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-2xl font-bold tracking-tight text-gray-900 leading-tight">
                {metrics.jobs?.total ?? 0}
              </span>
              <span className="text-[11px] text-gray-500 mt-0.5 font-medium">
                {metrics.jobs?.completed ?? 0} {isDe ? 'erfolgreich' : 'completed'}
              </span>
            </div>
          </div>

          <div className="p-4 rounded-2xl border-none shadow-[0_2px_6px_rgba(0,0,0,0.03)] bg-white flex flex-col gap-2">
            <div className="flex items-center justify-between text-gray-400">
              <span className="text-xs font-semibold text-gray-500">
                {isDe ? 'KI-Kosten' : 'AI Costs'}
              </span>
              <div className="p-1.5 rounded-xl bg-amber-500/10 text-amber-600">
                <Coins className="w-4 h-4" />
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-2xl font-bold tracking-tight text-gray-900 leading-tight">
                ${metrics.llm?.totalCostUsd?.toFixed(4) ?? '0.0000'}
              </span>
              <span className="text-[11px] text-gray-500 mt-0.5 font-medium">
                {rangeLabel[metricsRange]}
              </span>
            </div>
          </div>

          <div className="p-4 rounded-2xl border-none shadow-[0_2px_6px_rgba(0,0,0,0.03)] bg-white flex flex-col gap-2">
            <div className="flex items-center justify-between text-gray-400">
              <span className="text-xs font-semibold text-gray-500">
                {isDe ? 'LLM Calls' : 'LLM Calls'}
              </span>
              <div className="p-1.5 rounded-xl bg-blue-500/10 text-blue-600">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-2xl font-bold tracking-tight text-gray-900 leading-tight">
                {metrics.llm?.count ?? 0}
              </span>
              <span className="text-[11px] text-gray-500 mt-0.5 font-medium">
                {(metrics.llm?.totalTokens ?? 0).toLocaleString()} Tokens
              </span>
            </div>
          </div>

          <div className="p-4 rounded-2xl border-none shadow-[0_2px_6px_rgba(0,0,0,0.03)] bg-white flex flex-col gap-2 col-span-2 sm:col-span-1">
            <div className="flex items-center justify-between text-gray-400">
              <span className="text-xs font-semibold text-gray-500">
                {isDe ? 'Medien-Volumen' : 'Media Volume'}
              </span>
              <div className="p-1.5 rounded-xl bg-indigo-500/10 text-indigo-600">
                <HardDriveDownload className="w-4 h-4" />
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-2xl font-bold tracking-tight text-gray-900 leading-tight">
                {formatDownloadSize(metrics.jobs?.mediaMb ?? 0)}
              </span>
              <span className="text-[11px] text-gray-500 mt-0.5 font-medium">
                {rangeLabel[metricsRange]}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Sub-Tabs Navigation */}
      <div className="flex flex-wrap sm:flex-nowrap gap-1.5 bg-gray-100 p-1.5 rounded-2xl border-none">
        {(
          [
            {
              id: 'growth',
              icon: <Activity className="w-4 h-4 shrink-0" />,
              label: isDe ? 'Growth & Retention' : 'Growth & Retention',
            },
            {
              id: 'pipeline',
              icon: <GitBranch className="w-4 h-4 shrink-0" />,
              label: isDe ? 'Pipeline & Quellen' : 'Pipeline & Sources',
            },
            {
              id: 'ai',
              icon: <Cpu className="w-4 h-4 shrink-0" />,
              label: isDe ? 'KI & Katalog' : 'AI & Catalog',
            },
          ] as const
        ).map(({ id, icon, label }) => {
          const isSelected = subTab === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onSelectSubTab(id)}
              className={`flex-1 py-2.5 px-3 text-xs sm:text-sm font-bold rounded-xl transition-all cursor-pointer border-none flex items-center justify-center gap-2 ${
                isSelected
                  ? 'bg-emerald-600 text-white shadow-[0_2px_6px_rgba(16,185,129,0.22)]'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {icon}
              <span>{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
