import React from 'react';
import { Drawer } from '@heroui/react';
import { X, Trash2 } from 'lucide-react';
import { useI18n } from '../../context/I18nContext';
import { useExtractionQueue } from '../../context/ExtractionQueueContext';
import { useModalOverlay } from '../../context/OverlayStackContext';
import { hapticLight } from '../../utils/haptics';
import WaitlistItemCard from './WaitlistItemCard';
import type { ExtractionQueueSheetProps } from './types';

export const ExtractionQueueSheet: React.FC<ExtractionQueueSheetProps> = ({
  isOpen,
  onClose,
  canAnalyze,
  onAnalyze,
}) => {
  const { t } = useI18n();
  const { items, removeFromQueue, clearQueue } = useExtractionQueue();

  useModalOverlay(isOpen, onClose);

  if (!isOpen) return null;

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
                    {items.length === 1
                      ? t('queue.dock.waitlistOne')
                      : t('queue.dock.waitlistMultiple', { count: items.length })}
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

              {/* Sub-bar with count & clear all */}
              {items.length > 0 && (
                <div className="flex items-center justify-between px-1 pt-3 pb-1">
                  <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {items.length === 1
                      ? t('queue.dock.waitlistOne')
                      : t('queue.dock.waitlistMultiple', { count: items.length })}
                  </span>

                  <button
                    type="button"
                    onClick={() => {
                      hapticLight();
                      clearQueue();
                    }}
                    className="min-h-[44px] px-2.5 py-1 text-xs font-semibold text-gray-400 hover:text-rose-600 dark:hover:text-rose-400 inline-flex items-center gap-1 border-none bg-transparent cursor-pointer touch-manipulation"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{t('queue.btnClearAll')}</span>
                  </button>
                </div>
              )}
            </Drawer.Header>

            <Drawer.Body className="overflow-y-auto py-1 flex flex-col gap-2.5">
              {items.length === 0 ? (
                <div className="py-8 text-center text-xs text-gray-400 dark:text-gray-500">
                  {t('queue.waitlistEmpty')}
                </div>
              ) : (
                items.map((item) => (
                  <WaitlistItemCard
                    key={item.id}
                    item={item}
                    canAnalyze={canAnalyze}
                    onAnalyze={(url) => {
                      onClose();
                      onAnalyze(url);
                    }}
                    onRemove={removeFromQueue}
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
