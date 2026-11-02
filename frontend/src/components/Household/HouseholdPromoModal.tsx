import { Drawer } from '@heroui/react';
import { Users, Sparkles, Check, X } from 'lucide-react';
import { useI18n } from '../../context/I18nContext';
import { hapticLight } from '../../utils/haptics';

interface HouseholdPromoModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenInvite: () => void;
  onOpenUpgrade?: () => void;
}

export default function HouseholdPromoModal({
  isOpen,
  onOpenChange,
  onOpenInvite,
  onOpenUpgrade,
}: HouseholdPromoModalProps) {
  const { t } = useI18n();

  const benefits = [
    t('household.promo.benefit1'),
    t('household.promo.benefit2'),
    t('household.promo.benefit3'),
    t('household.promo.benefit4'),
  ];

  return (
    <div onClick={(e) => e.stopPropagation()}>
      <Drawer.Backdrop
        isOpen={isOpen}
        onOpenChange={(open) => {
          if (!open) onOpenChange(false);
        }}
        className="!z-[110]"
      >
        <Drawer.Content placement="bottom" className="!z-[110]">
          <Drawer.Dialog className="relative !bg-[#faf8f5] dark:!bg-[#0c0b0a] p-5 pb-[calc(1.5rem_+_var(--safe-area-inset-bottom))] rounded-t-3xl border-none shadow-[0_-4px_30px_rgba(0,0,0,0.12)] max-h-[90vh] overflow-y-auto">
            <Drawer.Handle />

            <div className="flex items-center justify-end w-full pb-1">
              <button
                type="button"
                onClick={() => {
                  hapticLight();
                  onOpenChange(false);
                }}
                className="w-10 h-10 min-w-[44px] min-h-[44px] rounded-full bg-black/[0.04] dark:bg-white/[0.06] flex items-center justify-center text-stone-500 hover:text-stone-900 border-none cursor-pointer"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <Drawer.Body className="px-2 pb-4 flex flex-col items-center text-center gap-4">
              <div className="w-16 h-16 rounded-3xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <Users className="w-8 h-8" />
              </div>

              <div className="flex flex-col gap-1">
                <Drawer.Heading className="text-xl font-black text-stone-900 dark:text-stone-100 tracking-tight">
                  {t('household.promo.title')}
                </Drawer.Heading>
                <p className="text-xs text-stone-600 dark:text-stone-400 max-w-xs mx-auto">
                  {t('household.promo.subtitle')}
                </p>
              </div>

              {/* Benefits list */}
              <div className="w-full flex flex-col gap-2.5 p-4 rounded-2xl bg-black/[0.03] dark:bg-white/[0.04] text-left">
                {benefits.map((benefit, i) => (
                  <div key={i} className="flex items-center gap-2.5 text-xs text-stone-700 dark:text-stone-300">
                    <div className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-600 flex items-center justify-center shrink-0">
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    </div>
                    <span>{benefit}</span>
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div className="w-full flex flex-col gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    hapticLight();
                    onOpenChange(false);
                    onOpenInvite();
                  }}
                  className="w-full h-12 rounded-2xl bg-emerald-600 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-sm border-none cursor-pointer active:scale-95 transition-all"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{t('household.promo.ctaInvite')}</span>
                </button>

                {onOpenUpgrade && (
                  <button
                    type="button"
                    onClick={() => {
                      hapticLight();
                      onOpenChange(false);
                      onOpenUpgrade();
                    }}
                    className="w-full h-10 rounded-2xl text-stone-600 dark:text-stone-400 font-semibold text-xs border-none bg-transparent cursor-pointer hover:underline"
                  >
                    <span>{t('household.promo.ctaUpgrade')}</span>
                  </button>
                )}
              </div>
            </Drawer.Body>
          </Drawer.Dialog>
        </Drawer.Content>
      </Drawer.Backdrop>
    </div>
  );
}
