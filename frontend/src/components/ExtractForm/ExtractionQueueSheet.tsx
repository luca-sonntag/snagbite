import React, { useState, useEffect } from 'react';
import { Drawer } from '@heroui/react';
import { X, Bookmark, AlertCircle, Trash2 } from 'lucide-react';
import { useI18n } from '../../context/I18nContext';
import { useExtractionQueue } from '../../context/ExtractionQueueContext';
import { useModalOverlay } from '../../context/OverlayStackContext';
import { hapticLight } from '../../utils/haptics';
import WaitlistItemCard from './WaitlistItemCard';
import FailedJobCard from './FailedJobCard';
import type { ExtractionQueueSheetProps } from './types';

export const ExtractionQueueSheet: React.FC<ExtractionQueueSheetProps> = ({
  isOpen,
  onClose,
  initialTab = 'waitlist',
  canAnalyze,
  onAnalyze,
}) => {
  const { t } = useI18n();
  const {
    waitlist,
    failedJobs,
    removeFromWaitlist,
    clearWaitlist,
    removeFailedJob,
    clearFailedJobs,
    moveFailedToWaitlist,
  } = useExtractionQueue();

  const [activeTab, setActiveTab] = useState<'waitlist' | 'failed'>(initialTab);

  useModalOverlay(isOpen, onClose);

  useEffect(() => {
    if (isOpen) {
      if (initialTab === 'failed' && failedJobs.length > 0) {
        setActiveTab('failed');
      } else if (waitlist.length > 0) {
        setActiveTab('waitlist');
      } else if (failedJobs.length > 0) {
        setActiveTab('failed');
      }
    }
  }, [isOpen, initialTab, waitlist.length, failedJobs.length]);

  if (!isOpen) return null;

  const currentTab =
    activeTab === 'failed' && failedJobs.length === 0 && waitlist.length > 0
      ? 'waitlist'
      : activeTab === 'waitlist' && waitlist.length === 0 && failedJobs.length > 0
        ? 'failed'
        : activeTab;

  const showTabs = waitlist.length > 0 && failedJobs.length > 0;

  return (
    <Drawer>
      <Drawer.Backdrop
        isOpen={isOpen}
        onOpenChange={(open) => {
          if (!open) onClose();
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
                    {t('queue.dock.sheetTitle')}
                  </Drawer.Heading>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {currentTab === 'failed' ? t('queue.failedNotice') : t('queue.waitlistDesc')}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    hapticLight();
                    onClose();
                  }}
                  className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-black/5 dark:hover:bg-white/5 active:scale-95 border-none cursor-pointer transition-all -mr-2 -mt-1 touch-manipulation"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Segmented Tab Switcher */}
              {showTabs && (
                <div className="flex items-center gap-1.5 p-1 bg-gray-200/80 dark:bg-gray-800/80 rounded-2xl mt-3">
                  <button
                    type="button"
                    onClick={() => {
                      hapticLight();
                      setActiveTab('waitlist');
                    }}
                    className={`flex-1 min-h-[44px] rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all border-none cursor-pointer touch-manipulation ${
                      currentTab === 'waitlist'
                        ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-xs'
                        : 'bg-transparent text-gray-500 dark:text-gray-400'
                    }`}
                  >
                    <Bookmark className="w-3.5 h-3.5" />
                    <span>{t('queue.dock.tabWaitlist')}</span>
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">
                      {waitlist.length}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      hapticLight();
                      setActiveTab('failed');
                    }}
                    className={`flex-1 min-h-[44px] rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all border-none cursor-pointer touch-manipulation ${
                      currentTab === 'failed'
                        ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-xs'
                        : 'bg-transparent text-gray-500 dark:text-gray-400'
                    }`}
                  >
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>{t('queue.dock.tabFailed')}</span>
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500/15 text-amber-700 dark:text-amber-400">
                      {failedJobs.length}
                    </span>
                  </button>
                </div>
              )}

              {/* Sub-bar with count & clear all */}
              <div className="flex items-center justify-between px-1 pt-3 pb-1">
                <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {currentTab === 'failed'
                    ? `${failedJobs.length} ${t('queue.dock.tabFailed')}`
                    : `${waitlist.length} ${t('queue.dock.tabWaitlist')}`}
                </span>

                <button
                  type="button"
                  onClick={() => {
                    hapticLight();
                    if (currentTab === 'failed') {
                      clearFailedJobs();
                    } else {
                      clearWaitlist();
                    }
                  }}
                  className="min-h-[44px] px-2.5 py-1 text-xs font-semibold text-gray-400 hover:text-rose-600 dark:hover:text-rose-400 inline-flex items-center gap-1 border-none bg-transparent cursor-pointer touch-manipulation"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{t('queue.btnClearAll')}</span>
                </button>
              </div>
            </Drawer.Header>

            <Drawer.Body className="overflow-y-auto py-1 flex flex-col gap-2.5">
              {currentTab === 'waitlist' ? (
                waitlist.length === 0 ? (
                  <div className="py-8 text-center text-xs text-gray-400 dark:text-gray-500">
                    {t('queue.waitlistEmpty')}
                  </div>
                ) : (
                  waitlist.map((item) => (
                    <WaitlistItemCard
                      key={item.id}
                      item={item}
                      canAnalyze={canAnalyze}
                      onAnalyze={(url) => {
                        onClose();
                        onAnalyze(url);
                      }}
                      onRemove={removeFromWaitlist}
                    />
                  ))
                )
              ) : failedJobs.length === 0 ? (
                <div className="py-8 text-center text-xs text-gray-400 dark:text-gray-500">
                  {t('queue.failedNotice')}
                </div>
              ) : (
                failedJobs.map((job) => (
                  <FailedJobCard
                    key={job.id}
                    entry={job}
                    onRetry={(url) => {
                      onClose();
                      onAnalyze(url);
                    }}
                    onDismiss={removeFailedJob}
                    onMoveToWaitlist={moveFailedToWaitlist}
                  />
                ))
              )}
            </Drawer.Body>
          </Drawer.Dialog>
        </Drawer.Content>
      </Drawer.Backdrop>
    </Drawer>
  );
};

export default ExtractionQueueSheet;
