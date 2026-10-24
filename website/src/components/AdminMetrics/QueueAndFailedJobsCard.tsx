import { AlertCircle, ChevronDown, ExternalLink, X } from 'lucide-react';
import type { AdminMetricsData } from './types';

interface QueueAndFailedJobsCardProps {
  isDe: boolean;
  metrics: AdminMetricsData;
  rangeLabel: string;
  showFailedJobs: boolean;
  onToggleFailedJobs: () => void;
  selectedErrorCode: string | null;
  onClearErrorCode: () => void;
  formatDate: (iso: string) => string;
}

export function QueueAndFailedJobsCard({
  isDe,
  metrics,
  rangeLabel,
  showFailedJobs,
  onToggleFailedJobs,
  selectedErrorCode,
  onClearErrorCode,
  formatDate,
}: QueueAndFailedJobsCardProps) {
  const allFailedJobs = metrics.jobs?.failedJobs ?? [];
  const filteredFailedJobs = selectedErrorCode
    ? allFailedJobs.filter((j) => (j.errorCode || 'EXTRACTION_FAILED') === selectedErrorCode)
    : allFailedJobs;

  return (
    <div className="flex flex-col gap-5">
      {/* Queue Status Breakdown */}
      <div className="p-5 sm:p-6 rounded-3xl bg-white shadow-[0_2px_6px_rgba(0,0,0,0.03)] flex flex-col gap-4">
        <h3 className="text-base font-bold text-gray-900">
          {isDe ? 'Queue-Status & Fehlgeschlagene Jobs' : 'Queue Status & Failed Jobs'}
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
          <div className="bg-emerald-500/10 rounded-2xl p-4 flex flex-col items-center">
            <span className="text-xs font-semibold text-emerald-700">
              {isDe ? 'Erfolgreich' : 'Succeeded'}
            </span>
            <span className="text-2xl font-bold text-emerald-800 mt-1">
              {metrics.jobs?.completed ?? 0}
            </span>
          </div>

          <button
            type="button"
            onClick={onToggleFailedJobs}
            className={`rounded-2xl p-4 flex flex-col items-center cursor-pointer transition-all border-none active:scale-95 ${
              showFailedJobs
                ? 'bg-rose-500/20 text-rose-700'
                : 'bg-rose-500/10 hover:bg-rose-500/15 text-rose-600'
            }`}
          >
            <div className="flex items-center justify-center gap-1">
              <span className="text-xs font-semibold">
                {isDe ? 'Fehlgeschlagen' : 'Failed'}
              </span>
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform ${
                  showFailedJobs ? 'rotate-180' : ''
                }`}
              />
            </div>
            <span className="text-2xl font-bold mt-1">{metrics.jobs?.failed ?? 0}</span>
            <span className="text-[11px] font-semibold underline mt-0.5">
              {showFailedJobs
                ? isDe
                  ? 'Verbergen'
                  : 'Hide'
                : isDe
                  ? 'Details anzeigen'
                  : 'Show details'}
            </span>
          </button>

          <div className="bg-blue-500/10 rounded-2xl p-4 flex flex-col items-center">
            <span className="text-xs font-semibold text-blue-700">
              {isDe ? 'Aktiv' : 'Processing'}
            </span>
            <span className="text-2xl font-bold text-blue-800 mt-1">
              {metrics.jobs?.processing ?? 0}
            </span>
          </div>

          <div className="bg-amber-500/10 rounded-2xl p-4 flex flex-col items-center">
            <span className="text-xs font-semibold text-amber-700">
              {isDe ? 'Wartend' : 'Pending'}
            </span>
            <span className="text-2xl font-bold text-amber-800 mt-1">
              {metrics.jobs?.pending ?? 0}
            </span>
          </div>
        </div>
      </div>

      {/* Expandable Failed Jobs List */}
      {showFailedJobs && (
        <div className="p-5 sm:p-6 rounded-3xl bg-white shadow-[0_2px_6px_rgba(0,0,0,0.03)] flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-2 rounded-xl bg-rose-500/10 text-rose-600 shrink-0">
                <AlertCircle className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-rose-600">
                  {isDe ? 'Fehlgeschlagene Jobs' : 'Failed Jobs'} ({filteredFailedJobs.length})
                </h3>
                <span className="text-xs text-gray-500">{rangeLabel}</span>
              </div>
              {selectedErrorCode && (
                <button
                  type="button"
                  onClick={onClearErrorCode}
                  className="ml-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-600 text-white cursor-pointer border-none active:scale-95"
                >
                  <span className="font-mono">{selectedErrorCode}</span>
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={onToggleFailedJobs}
              className="p-1.5 rounded-xl text-gray-400 hover:text-gray-600 transition-colors cursor-pointer border-none"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {filteredFailedJobs.length === 0 ? (
            <div className="text-center py-8 px-4 bg-gray-50 rounded-2xl">
              <p className="text-xs text-gray-500 font-medium">
                {isDe
                  ? 'Keine fehlgeschlagenen Jobs für diesen Filter gefunden.'
                  : 'No failed jobs found for this filter.'}
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3 max-h-96 overflow-y-auto pr-1">
              {filteredFailedJobs.map((job) => (
                <div
                  key={job.id}
                  className="p-4 bg-gray-50 rounded-2xl flex flex-col gap-2.5"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                    <div className="flex flex-col gap-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap text-xs">
                        <span
                          className="font-bold text-gray-900 truncate"
                          title={job.email || job.userId}
                        >
                          {job.email || job.userId}
                        </span>
                        {job.errorCode && (
                          <span className="text-[10px] font-mono font-bold text-rose-700 bg-rose-500/10 px-2 py-0.5 rounded-lg">
                            {job.errorCode}
                          </span>
                        )}
                        <span className="text-[10px] font-mono text-gray-500">
                          ID: {job.id.slice(0, 8)}...
                        </span>
                      </div>
                      <span className="text-[11px] text-gray-500 font-mono">
                        {formatDate(job.createdAt)}
                      </span>
                    </div>
                    {job.url && !job.url.startsWith('photo://') && (
                      <a
                        href={job.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-emerald-600 hover:text-emerald-500 shrink-0 self-start bg-emerald-500/10 rounded-xl transition-all active:scale-95"
                      >
                        <span>{isDe ? 'Quelle öffnen' : 'Open source'}</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>

                  <div className="p-3 bg-white rounded-xl text-[11px] font-mono text-rose-600 break-words leading-relaxed whitespace-pre-wrap">
                    {job.error ||
                      (isDe
                        ? 'Keine genauere Fehlermeldung hinterlegt.'
                        : 'No detailed error message provided.')}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Extractions per User */}
      <div className="p-5 sm:p-6 rounded-3xl bg-white shadow-[0_2px_6px_rgba(0,0,0,0.03)] flex flex-col gap-4">
        <h3 className="text-base font-bold text-gray-900">
          {isDe ? 'Extrahierte Rezepte pro Nutzer' : 'Extracted Recipes per User'} ({rangeLabel})
        </h3>
        {metrics.extractionsPerUser && metrics.extractionsPerUser.length > 0 ? (
          <div className="flex flex-col gap-2.5 max-h-64 overflow-y-auto pr-1">
            {metrics.extractionsPerUser.map((entry) => {
              const maxCount = Math.max(
                ...metrics.extractionsPerUser.map((e) => e.count),
                1,
              );
              const pct = (entry.count / maxCount) * 100;
              return (
                <div key={entry.userId} className="flex items-center gap-3 text-xs">
                  <span
                    className="w-32 sm:w-52 truncate text-gray-700 font-semibold shrink-0"
                    title={entry.email || entry.userId}
                  >
                    {entry.email || entry.userId}
                  </span>
                  <div className="flex-1 bg-gray-100 h-2.5 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-600 h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-8 text-right font-bold font-mono text-gray-900 shrink-0">
                    {entry.count}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-center text-xs text-gray-500 py-6 font-medium">
            {isDe ? 'Keine Extraktionen im Zeitraum.' : 'No extractions in timeframe.'}
          </p>
        )}
      </div>
    </div>
  );
}
