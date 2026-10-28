import { Drawer } from '@heroui/react';
import { Users, X } from 'lucide-react';
import { useHousehold } from './useHousehold';
import HouseholdActiveCard from './HouseholdActiveCard';
import HouseholdInviteCard from './HouseholdInviteCard';
import { useI18n } from '../../context/I18nContext';
import { hapticLight } from '../../utils/haptics';

interface HouseholdSheetProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenUpgrade?: () => void;
}

export default function HouseholdSheet({
  isOpen,
  onOpenChange,
  onOpenUpgrade,
}: HouseholdSheetProps) {
  const { status } = useHousehold();
  const { t } = useI18n();

  const isConnected = status === 'active' || status === 'paused';

  return (
    <div onClick={(e) => e.stopPropagation()}>
      <Drawer.Backdrop
        isOpen={isOpen}
        onOpenChange={(open) => {
          if (!open) onOpenChange(false);
        }}
        className="!z-[100]"
      >
        <Drawer.Content placement="bottom" className="!z-[100]">
          <Drawer.Dialog className="relative !bg-[#faf8f5] dark:!bg-[#0c0b0a] p-5 pb-[calc(1.5rem_+_var(--safe-area-inset-bottom))] rounded-t-3xl border-none shadow-[0_-4px_30px_rgba(0,0,0,0.12)] max-h-[90vh] overflow-y-auto">
            <Drawer.Handle />

            {/* Header */}
            <Drawer.Header className="pb-3 mb-2">
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <Drawer.Heading className="text-base font-bold text-stone-900 dark:text-stone-100">
                      {t('household.modal.title')}
                    </Drawer.Heading>
                    <p className="text-xs text-stone-500 dark:text-stone-400">
                      {isConnected ? t('household.modal.subtitleActive') : t('household.modal.subtitleInvite')}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  className="w-10 h-10 min-w-[44px] min-h-[44px] rounded-full bg-black/[0.04] dark:bg-white/[0.06] text-stone-400 hover:text-stone-900 dark:hover:text-white border-none flex items-center justify-center active:scale-95 transition-all cursor-pointer"
                  onClick={() => {
                    hapticLight();
                    onOpenChange(false);
                  }}
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </Drawer.Header>

            <Drawer.Body className="py-2">
              {isConnected ? (
                <HouseholdActiveCard onOpenUpgrade={onOpenUpgrade} onClose={() => onOpenChange(false)} />
              ) : (
                <HouseholdInviteCard onSuccess={() => onOpenChange(false)} />
              )}
            </Drawer.Body>
          </Drawer.Dialog>
        </Drawer.Content>
      </Drawer.Backdrop>
    </div>
  );
}
