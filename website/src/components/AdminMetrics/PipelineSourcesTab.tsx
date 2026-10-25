import { useState } from 'react';
import { Globe, Recycle } from 'lucide-react';
import type { AdminMetricsData, SourcePlatformKey } from './types';
import { SpeedAndErrorCards } from './SpeedAndErrorCards';
import { RecentRecipesTable } from './RecentRecipesTable';
import { QueueAndFailedJobsCard } from './QueueAndFailedJobsCard';

interface PipelineSourcesTabProps {
  isDe: boolean;
  metrics: AdminMetricsData;
  rangeLabel: string;
  formatDate: (iso: string) => string;
}

const PLATFORM_META: Record<
  SourcePlatformKey,
  { labelDe: string; labelEn: string; badgeClass: string; barClass: string }
> = {
  instagram: {
    labelDe: 'Instagram Reels',
    labelEn: 'Instagram Reels',
    badgeClass: 'bg-pink-500/10 text-pink-600',
    barClass: 'bg-pink-500',
  },
  tiktok: {
    labelDe: 'TikTok',
    labelEn: 'TikTok',
    badgeClass: 'bg-gray-900/10 text-gray-900',
    barClass: 'bg-gray-800',
  },
  youtube: {
    labelDe: 'YouTube Shorts',
    labelEn: 'YouTube Shorts',
    badgeClass: 'bg-rose-500/10 text-rose-600',
    barClass: 'bg-rose-500',
  },
  website: {
    labelDe: 'Koch-Websites',
    labelEn: 'Recipe Websites',
    badgeClass: 'bg-blue-500/10 text-blue-600',
    barClass: 'bg-blue-500',
  },
  photo: {
    labelDe: 'Foto-Import (OCR)',
    labelEn: 'Photo Import (OCR)',
    badgeClass: 'bg-amber-500/10 text-amber-700',
    barClass: 'bg-amber-500',
  },
  remix: {
    labelDe: 'KI-Remix',
    labelEn: 'AI Remix',
    badgeClass: 'bg-emerald-500/10 text-emerald-700',
    barClass: 'bg-emerald-600',
  },
};

const PLATFORM_BADGES: Record<SourcePlatformKey, string> = {
  instagram: PLATFORM_META.instagram.badgeClass,
  tiktok: PLATFORM_META.tiktok.badgeClass,
  youtube: PLATFORM_META.youtube.badgeClass,
  website: PLATFORM_META.website.badgeClass,
  photo: PLATFORM_META.photo.badgeClass,
  remix: PLATFORM_META.remix.badgeClass,
};

export function PipelineSourcesTab({
  isDe,
  metrics,
  rangeLabel,
  formatDate,
}: PipelineSourcesTabProps) {
  const [showFailedJobs, setShowFailedJobs] = useState(false);
  const [selectedErrorCode, setSelectedErrorCode] = useState<string | null>(null);

  const pipeline = metrics.pipeline;
  const platforms = pipeline?.platforms ?? [];
  const reuse = pipeline?.reuseAndQuality ?? {
    reusedCount: 0,
    freshUrlExtractions: 0,
    reuseRatePct: 0,
    estimatedSavedUsd: 0,
    totalRecipesInRange: 0,
    incompleteCaptionCount: 0,
    incompleteCaptionPct: 0,
    aiCoverCount: 0,
    aiCoverPct: 0,
    explicitNutritionCount: 0,
    explicitNutritionPct: 0,
  };
  const speed = pipeline?.speed;
  const errorRanking = pipeline?.errorRanking ?? [];
  const topCreators = pipeline?.topCreators ?? [];

  const handleSelectErrorCode = (code: string) => {
    if (selectedErrorCode === code) {
      setSelectedErrorCode(null);
    } else {
      setSelectedErrorCode(code);
      setShowFailedJobs(true);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Row 1: Platform Mix & 0-Quota Reuse / Source Quality */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Left: Platform / Source Mix */}
        <div className="p-5 sm:p-6 rounded-3xl bg-white shadow-[0_2px_6px_rgba(0,0,0,0.03)] flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600">
                <Globe className="w-4 h-4" />
              </div>
              <h3 className="text-base font-bold text-gray-900">
                {isDe ? 'Plattformen & Quellen-Mix' : 'Platforms & Source Mix'}
              </h3>
            </div>
            <span className="text-xs font-semibold text-gray-500">{rangeLabel}</span>
          </div>

          <div className="flex flex-col gap-3">
            {platforms.map((item) => {
              const meta = PLATFORM_META[item.platform] ?? PLATFORM_META.website;
              return (
                <div key={item.platform} className="flex flex-col gap-1.5 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-gray-800">
                      {isDe ? meta.labelDe : meta.labelEn}
                    </span>
                    <div className="flex items-center gap-2 font-mono">
                      <span className="text-gray-900 font-bold">
                        {item.total} ({item.sharePct}%)
                      </span>
                      {item.total > 0 && (
                        <span className="px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-700 text-[10px] font-bold">
                          {item.successRatePct}% ✓
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`${meta.barClass} h-full rounded-full transition-all`}
                      style={{ width: `${Math.min(item.sharePct, 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: 0-Quota Recipe Reuse & Source Quality */}
        <div className="p-5 sm:p-6 rounded-3xl bg-white shadow-[0_2px_6px_rgba(0,0,0,0.03)] flex flex-col justify-between gap-4">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-teal-500/10 text-teal-600">
                  <Recycle className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-gray-900">
                  {isDe ? '0-Quota Reuse & Quellen-Qualität' : '0-Quota Reuse & Source Quality'}
                </h3>
              </div>
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-700 font-mono">
                {reuse.reuseRatePct}% Cache-Hit
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="p-3.5 rounded-2xl bg-emerald-500/10 flex flex-col gap-0.5">
                <span className="text-xs font-semibold text-emerald-700">
                  {isDe ? 'Wiederverwendet (0 Quota)' : 'Reused (0 Quota)'}
                </span>
                <span className="text-xl font-bold text-emerald-900 font-mono">
                  {reuse.reusedCount}
                </span>
                <span className="text-[11px] text-emerald-700">
                  vs. {reuse.freshUrlExtractions} {isDe ? 'neue URL-Jobs' : 'fresh URL jobs'}
                </span>
              </div>
              <div className="p-3.5 rounded-2xl bg-amber-500/10 flex flex-col gap-0.5">
                <span className="text-xs font-semibold text-amber-700">
                  {isDe ? 'Gesparte KI-Kosten' : 'Saved AI Costs'}
                </span>
                <span className="text-xl font-bold text-amber-900 font-mono">
                  ~${reuse.estimatedSavedUsd.toFixed(4)}
                </span>
                <span className="text-[11px] text-amber-700">
                  {isDe ? 'durch URL-Deduplizierung' : 'via URL deduplication'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2.5 pt-1 text-xs">
            <span className="font-bold text-gray-500">
              {isDe ? 'Quellen-Qualität' : 'Source Quality'} ({reuse.totalRecipesInRange}{' '}
              {isDe ? 'Rezepte' : 'recipes'}):
            </span>
            <div className="grid grid-cols-3 gap-2">
              <div className="p-3 rounded-2xl bg-gray-50 flex flex-col gap-0.5">
                <span className="text-[11px] text-gray-500">
                  {isDe ? 'Unvollst. Caption' : 'Incomplete Caption'}
                </span>
                <span className="text-sm font-bold text-gray-900 font-mono">
                  {reuse.incompleteCaptionPct}%
                </span>
                <span className="text-[10px] text-gray-400">
                  ({reuse.incompleteCaptionCount})
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-gray-50 flex flex-col gap-0.5">
                <span className="text-[11px] text-gray-500">
                  {isDe ? 'KI-Cover (Flux)' : 'AI Cover (Flux)'}
                </span>
                <span className="text-sm font-bold text-gray-900 font-mono">
                  {reuse.aiCoverPct}%
                </span>
                <span className="text-[10px] text-gray-400">({reuse.aiCoverCount})</span>
              </div>
              <div className="p-3 rounded-2xl bg-gray-50 flex flex-col gap-0.5">
                <span className="text-[11px] text-gray-500">
                  {isDe ? 'Creator-Makros' : 'Creator Macros'}
                </span>
                <span className="text-sm font-bold text-gray-900 font-mono">
                  {reuse.explicitNutritionPct}%
                </span>
                <span className="text-[10px] text-gray-400">
                  ({reuse.explicitNutritionCount})
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Rows 2 & 3: Speed, Error Ranking & Top 10 Creators */}
      <SpeedAndErrorCards
        isDe={isDe}
        rangeLabel={rangeLabel}
        speed={speed}
        errorRanking={errorRanking}
        selectedErrorCode={selectedErrorCode}
        onSelectErrorCode={handleSelectErrorCode}
        topCreators={topCreators}
        platformBadges={PLATFORM_BADGES}
      />

      {/* Row 4: Recent Extracted Recipes with Extractor User */}
      <RecentRecipesTable
        isDe={isDe}
        recipes={pipeline?.recentRecipes ?? []}
        rangeLabel={rangeLabel}
        formatDate={formatDate}
        platformBadges={PLATFORM_BADGES}
      />

      {/* Row 5: Queue Status & Failed Jobs + Extractions per User */}
      <QueueAndFailedJobsCard
        isDe={isDe}
        metrics={metrics}
        rangeLabel={rangeLabel}
        showFailedJobs={showFailedJobs}
        onToggleFailedJobs={() => setShowFailedJobs((prev) => !prev)}
        selectedErrorCode={selectedErrorCode}
        onClearErrorCode={() => setSelectedErrorCode(null)}
        formatDate={formatDate}
      />
    </div>
  );
}
