import React, { useState } from 'react';
import { Drawer } from '@heroui/react';
import { Play, Clock, X, Globe } from 'lucide-react';
import { useI18n } from '../../context/I18nContext';
import { useAuth } from '../../context/AuthContext';
import { useExtractionQueue } from '../../context/ExtractionQueueContext';
import { useModalOverlay } from '../../context/OverlayStackContext';
import { hapticLight, hapticMedium } from '../../utils/haptics';
import { getSourceChannel } from '../../utils/sourceLabel';
import type { LimitStatus } from '../../types';

interface SmartResumeSheetProps {
  limitStatus?: LimitStatus | null;
  onAnalyze: (url: string) => void;
  onNavigateToWaitlist: () => void;
}

export const SmartResumeSheet: React.FC<SmartResumeSheetProps> = ({
  limitStatus,
  onAnalyze,
  onNavigateToWaitlist,
}) => {
  const { t } = useI18n();
  const { isPremium } = useAuth();
  const { waitlist, removeFromWaitlist } = useExtractionQueue();

  const [dismissed, setDismissed] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem('kb_smart_resume_seen') === '1';
    } catch {
      return false;
    }
  });

  const hasQuota = isPremium || (!!limitStatus && limitStatus.remaining > 0 && !limitStatus.cookbookFull);
  const isOpen = !dismissed && waitlist.length > 0 && hasQuota;

  const handleDismiss = () => {
    hapticLight();
    try {
      sessionStorage.setItem('kb_smart_resume_seen', '1');
    } catch {
      /* ignore */
    }
    setDismissed(true);
  };

  useModalOverlay(isOpen, handleDismiss);

  if (!isOpen) return null;

  const nextItem = waitlist[0];
  const channel = getSourceChannel(nextItem.url);

  const handleStartAnalysis = () => {
    hapticMedium();
    try {
      sessionStorage.setItem('kb_smart_resume_seen', '1');
    } catch {
      /* ignore */
    }
    setDismissed(true);
    removeFromWaitlist(nextItem.id);
    onAnalyze(nextItem.url);
  };

  const handleViewWaitlist = () => {
    hapticLight();
    try {
      sessionStorage.setItem('kb_smart_resume_seen', '1');
    } catch {
      /* ignore */
    }
    setDismissed(true);
    onNavigateToWaitlist();
  };

  const title =
    waitlist.length > 1
      ? t('queue.smartResume.titleMultiple', { count: waitlist.length })
      : t('queue.smartResume.title');

  const subtitle =
    waitlist.length > 1
      ? t('queue.smartResume.subtitleMultiple')
      : t('queue.smartResume.subtitle');

  return (
    <Drawer>
      <Drawer.Backdrop
        isOpen={isOpen}
        onOpenChange={(open) => {
          if (!open) handleDismiss();
        }}
        className="!z-[100]"
      >
        <Drawer.Content placement="bottom" className="!z-[100]">
          <Drawer.Dialog className="relative !bg-gray-50 dark:!bg-gray-950 max-h-[85vh] flex flex-col p-5 pb-[calc(1.5rem_+_var(--safe-area-inset-bottom))] rounded-t-3xl border-none shadow-[0_-4px_30px_rgba(0,0,0,0.12)]">
            <Drawer.Handle />

            <Drawer.Header className="pb-2 mb-1">
              <div className="flex items-center justify-between">
                <div>
                  <Drawer.Heading className="text-base font-bold text-gray-900 dark:text-white">
                    {title}
                  </Drawer.Heading>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-snug">
                    {subtitle}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleDismiss}
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-black/5 dark:hover:bg-white/5 active:scale-95 border-none cursor-pointer transition-all shrink-0"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </Drawer.Header>

            <Drawer.Body className="py-2 flex flex-col gap-3">
              {/* Recipe Preview Card */}
              <div className="flex items-center gap-3 p-3.5 bg-white dark:bg-gray-900 rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border-none">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  {channel === 'web' ? <Globe className="w-5 h-5" /> : <Play className="w-4 h-4 fill-current" />}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-gray-900 dark:text-white truncate">
                    {nextItem.sourceLabel}
                  </p>
                  <p className="text-[11px] text-gray-400 dark:text-gray-500 truncate mt-0.5">
                    {nextItem.url}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleStartAnalysis}
                  className="w-full h-12 py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white font-bold text-sm border-none shadow-none flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>{t('queue.smartResume.analyzeNow')}</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleViewWaitlist}
                    className="flex-1 h-10 py-2 px-3 rounded-xl bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-semibold text-xs active:scale-[0.98] border-none cursor-pointer flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>{t('queue.smartResume.manageWaitlist')}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDismiss}
                    className="h-10 px-4 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 font-medium text-xs border-none bg-transparent active:scale-95 cursor-pointer transition-all"
                  >
                    {t('queue.smartResume.later')}
                  </button>
                </div>
              </div>
            </Drawer.Body>
          </Drawer.Dialog>
        </Drawer.Content>
      </Drawer.Backdrop>
    </Drawer>
  );
};

export default SmartResumeSheet;
