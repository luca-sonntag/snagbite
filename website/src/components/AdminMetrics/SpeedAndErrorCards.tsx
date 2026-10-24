import { AlertTriangle, Award, Clock, Sparkles } from 'lucide-react';
import type {
  ErrorReasonRankingItem,
  ExtractionSpeedMetrics,
  SourcePlatformKey,
  TopCreatorItem,
} from './types';

interface SpeedAndErrorCardsProps {
  isDe: boolean;
  rangeLabel: string;
  speed?: ExtractionSpeedMetrics;
  errorRanking: ErrorReasonRankingItem[];
  selectedErrorCode: string | null;
  onSelectErrorCode: (code: string) => void;
  topCreators: TopCreatorItem[];
  platformBadges: Record<SourcePlatformKey, string>;
}

export function SpeedAndErrorCards({
  isDe,
  rangeLabel,
  speed,
  errorRanking,
  selectedErrorCode,
  onSelectErrorCode,
  topCreators,
  platformBadges,
}: SpeedAndErrorCardsProps) {
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Left: Extraction Speed */}
        <div className="p-5 sm:p-6 rounded-3xl bg-white shadow-[0_2px_6px_rgba(0,0,0,0.03)] flex flex-col justify-between gap-4">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600">
                  <Clock className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-gray-900">
                  {isDe ? 'Extraktionsgeschwindigkeit' : 'Extraction Speed'}
                </h3>
              </div>
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-500/10 text-blue-700 font-mono">
                P50: {speed?.overall.p50Seconds ?? 0}s
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5 text-xs">
              {(
                [
                  { label: isDe ? 'Gesamt' : 'Overall', data: speed?.overall },
                  { label: 'Video / URL', data: speed?.url },
                  { label: isDe ? 'Foto-OCR' : 'Photo OCR', data: speed?.photo },
                  { label: isDe ? 'KI-Remix' : 'AI Remix', data: speed?.remix },
                ] as const
              ).map(({ label, data }) => (
                <div key={label} className="p-3 rounded-2xl bg-gray-50 flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-gray-700">{label}</span>
                    <span className="text-[10px] text-gray-400 font-mono">
                      n={data?.count ?? 0}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between font-mono">
                    <span className="text-sm font-bold text-gray-900">
                      P50: {data?.p50Seconds ?? 0}s
                    </span>
                    <span className="text-xs text-gray-500">
                      P90: {data?.p90Seconds ?? 0}s
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-gray-50 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-gray-700 font-medium">
              <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                {isDe
                  ? 'Client-Side Keyframe-Extraktion:'
                  : 'Client-Side Keyframe Extraction:'}
              </span>
            </div>
            <span className="font-bold text-gray-900 font-mono">
              {speed?.clientFrameRatePct ?? 0}% ({speed?.clientFrameCount ?? 0} Jobs)
            </span>
          </div>
        </div>

        {/* Right: Error Reason Ranking */}
        <div className="p-5 sm:p-6 rounded-3xl bg-white shadow-[0_2px_6px_rgba(0,0,0,0.03)] flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-rose-500/10 text-rose-600">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">
                  {isDe ? 'Fehler-Ursachen-Ranking' : 'Error Reason Ranking'}
                </h3>
                <p className="text-[11px] text-gray-500">
                  {isDe
                    ? 'Klicke auf einen Fehlercode, um die Liste unten zu filtern'
                    : 'Click an error code to filter the failed jobs list below'}
                </p>
              </div>
            </div>
          </div>

          {errorRanking.length === 0 ? (
            <div className="py-8 text-center text-xs text-gray-500 bg-gray-50 rounded-2xl">
              {isDe
                ? 'Keine fehlgeschlagenen Jobs im gewählten Zeitraum.'
                : 'No failed jobs in selected timeframe.'}
            </div>
          ) : (
            <div className="flex flex-col gap-2 max-h-56 overflow-y-auto pr-1">
              {errorRanking.map((item) => {
                const isSelected = selectedErrorCode === item.code;
                return (
                  <button
                    key={item.code}
                    type="button"
                    onClick={() => onSelectErrorCode(item.code)}
                    className={`w-full p-2.5 rounded-2xl text-left transition-all cursor-pointer border-none flex flex-col gap-1.5 ${
                      isSelected
                        ? 'bg-rose-500/15 text-rose-900'
                        : 'bg-gray-50 hover:bg-gray-100 text-gray-800'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="font-bold">{item.code}</span>
                      <span className="font-bold text-rose-600">
                        {item.count} ({item.sharePct}%)
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-white rounded-full overflow-hidden">
                      <div
                        className="bg-rose-500 h-full rounded-full transition-all"
                        style={{ width: `${Math.min(item.sharePct, 100)}%` }}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Top 10 Creators */}
      {topCreators.length > 0 && (
        <div className="p-5 sm:p-6 rounded-3xl bg-white shadow-[0_2px_6px_rgba(0,0,0,0.03)] flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600">
                <Award className="w-4 h-4" />
              </div>
              <h3 className="text-base font-bold text-gray-900">
                {isDe
                  ? 'Top 10 Creator (Meistextrahierte Kanäle)'
                  : 'Top 10 Creators (Most Extracted Channels)'}
              </h3>
            </div>
            <span className="text-xs font-semibold text-gray-500">{rangeLabel}</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
            {topCreators.map((creator, idx) => {
              const badgeClass =
                platformBadges[creator.platform] ?? platformBadges.website;
              return (
                <div
                  key={creator.handle}
                  className="p-3 rounded-2xl bg-gray-50 flex flex-col justify-between gap-2"
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[11px] font-bold text-gray-400 font-mono">
                      #{idx + 1}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${badgeClass}`}>
                      {creator.platform}
                    </span>
                  </div>
                  <span className="text-xs font-bold text-gray-900 truncate font-mono">
                    {creator.handle}
                  </span>
                  <span className="text-[11px] font-semibold text-emerald-700">
                    {creator.count} {isDe ? 'Rezepte' : 'recipes'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
