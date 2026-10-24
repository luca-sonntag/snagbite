import { useState } from 'react';
import { Bug, ChevronDown, Lightbulb, Terminal } from 'lucide-react';
import type { FeedbackItem } from './types';

interface AdminFeedbackPanelProps {
  isDe: boolean;
  feedback: FeedbackItem[];
  onOpenLightbox: (url: string) => void;
  formatDate: (iso: string) => string;
}

export function AdminFeedbackPanel({
  isDe,
  feedback,
  onOpenLightbox,
  formatDate,
}: AdminFeedbackPanelProps) {
  const [expandedFeedbackId, setExpandedFeedbackId] = useState<string | null>(null);

  if (feedback.length === 0) {
    return (
      <p className="text-sm text-gray-500 text-center py-12 font-medium">
        {isDe
          ? 'Bisher kein Feedback eingegangen.'
          : 'No feedback submissions received yet.'}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {feedback.map((item) => {
        const isBug = item.type === 'bug';
        const email =
          item.context?.email || (isDe ? 'Unbekannter Benutzer' : 'Unknown User');
        const isExpanded = expandedFeedbackId === item.id;

        return (
          <div
            key={item.id}
            className="border-none bg-white rounded-2xl md:rounded-3xl shadow-[0_2px_6px_rgba(0,0,0,0.03)] overflow-hidden p-4 sm:p-5"
          >
            <div className="flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex flex-col gap-1.5 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {isBug ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-600 border-none">
                        <Bug className="w-3 h-3" />
                        Bug
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-500/10 text-teal-600 border-none">
                        <Lightbulb className="w-3 h-3" />
                        Idea
                      </span>
                    )}
                    <span className="text-[10px] text-gray-400 font-bold font-mono">
                      {formatDate(item.created_at)}
                    </span>
                  </div>
                  <span className="text-sm font-bold text-gray-900 truncate">{email}</span>
                </div>
              </div>

              <div className="p-4 bg-gray-50 border-none rounded-2xl">
                <p className="text-xs text-gray-800 whitespace-pre-wrap leading-relaxed font-medium">
                  {item.message}
                </p>
              </div>

              {item.screenshot_urls && item.screenshot_urls.length > 0 && (
                <div className="flex flex-col gap-1.5 mt-1">
                  <span className="text-xs font-bold text-gray-400">
                    {isDe ? 'Screenshots / Anhänge:' : 'Screenshots / Attachments:'}
                  </span>
                  <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-none">
                    {item.screenshot_urls.map((url, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => onOpenLightbox(url)}
                        className="w-16 h-16 rounded-xl border-none overflow-hidden shrink-0 active:scale-95 hover:brightness-95 transition-all cursor-pointer bg-gray-100 shadow-[0_2px_6px_rgba(0,0,0,0.03)]"
                      >
                        <img
                          src={url}
                          alt={`Screenshot ${idx}`}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {item.context && (
                <div className="mt-1">
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedFeedbackId((prev) => (prev === item.id ? null : item.id))
                    }
                    className="text-xs font-bold text-emerald-600 hover:text-emerald-500 transition-colors flex items-center gap-1 cursor-pointer outline-none border-none"
                  >
                    <ChevronDown
                      className={`w-3.5 h-3.5 transition-transform ${
                        isExpanded ? 'rotate-180' : ''
                      }`}
                    />
                    <span>
                      {isExpanded
                        ? isDe
                          ? 'Details ausblenden'
                          : 'Hide Details'
                        : isDe
                          ? 'Geräte- & Diagnosedaten anzeigen'
                          : 'Show Device & Diagnostic Data'}
                    </span>
                  </button>

                  {isExpanded && (
                    <div className="mt-3 p-4 bg-gray-50 border-none rounded-2xl flex flex-col gap-2 font-mono text-[11px] text-gray-700 overflow-x-auto">
                      <div>
                        <span className="font-bold text-gray-500">Platform:</span>{' '}
                        {item.context.platform} ({item.context.isNative ? 'Native' : 'Web'})
                      </div>
                      <div>
                        <span className="font-bold text-gray-500">App Version:</span> v
                        {item.context.appVersion} (Build {item.context.appBuild})
                      </div>
                      <div>
                        <span className="font-bold text-gray-500">Tier / Language:</span> lang:{' '}
                        {item.context.language} | tier: {item.context.tier}
                      </div>
                      <div>
                        <span className="font-bold text-gray-500">Viewport:</span>{' '}
                        {item.context.viewport}
                      </div>
                      <div>
                        <span className="font-bold text-gray-500">Route:</span>{' '}
                        {item.context.route}
                      </div>
                      <div className="break-all">
                        <span className="font-bold text-gray-500">User Agent:</span>{' '}
                        {item.context.userAgent}
                      </div>

                      {item.context.logs && item.context.logs.length > 0 && (
                        <div className="mt-2 border-t border-black/5 pt-2 flex flex-col gap-1.5">
                          <div className="font-bold text-gray-500 flex items-center gap-1 text-[10px] mb-1">
                            <Terminal className="w-3.5 h-3.5" />
                            {isDe ? 'Konsolen-Protokoll:' : 'Console Logs:'}
                          </div>
                          <div className="max-h-48 overflow-y-auto bg-gray-950 text-gray-300 p-3 rounded-xl text-[9px] leading-tight space-y-1 font-mono border-none shadow-[0_2px_6px_rgba(0,0,0,0.03)]">
                            {item.context.logs.map((log, idx) => (
                              <div
                                key={idx}
                                className={
                                  log.level === 'error' || log.level === 'warn'
                                    ? 'text-rose-400'
                                    : 'text-emerald-400'
                                }
                              >
                                <span className="text-gray-500 font-semibold">
                                  [{log.level.toUpperCase()}]
                                </span>{' '}
                                {log.text}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
