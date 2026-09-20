import React from 'react';
import { Drawer, Button } from '@heroui/react';
import { HeartHandshake, Sparkles, ShieldCheck, CheckCircle2, X } from 'lucide-react';
import ProBadge from '../ProBadge';
import { useI18n } from '../../context/I18nContext';
import { useModalOverlay } from '../../context/OverlayStackContext';
import { hapticLight, hapticMedium } from '../../utils/haptics';
import { markPreAdNoticeSeen } from '../../utils/ads';

export interface PreAdTransparencySheetProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm?: () => void;
  onOpenPremium?: () => void;
}

export const PreAdTransparencySheet: React.FC<PreAdTransparencySheetProps> = ({
  isOpen,
  onClose,
  onConfirm,
  onOpenPremium,
}) => {
  const { t } = useI18n();
  useModalOverlay(isOpen, onClose);

  const handleConfirm = () => {
    hapticMedium();
    markPreAdNoticeSeen();
    onConfirm?.();
    onClose();
  };

  const handleOpenPremium = () => {
    hapticLight();
    onClose();
    onOpenPremium?.();
  };

  const handleClose = () => {
    hapticLight();
    onClose();
  };

  return (
    <Drawer>
      <Drawer.Backdrop
        isOpen={isOpen}
        onOpenChange={(open) => {
          if (!open) handleClose();
        }}
        className="!z-[110]"
      >
        <Drawer.Content placement="bottom" className="!z-[110]">
          <Drawer.Dialog className="relative !bg-gray-50 dark:!bg-gray-950 max-h-[85vh] flex flex-col p-6 pb-[calc(1.5rem_+_var(--safe-area-inset-bottom))] rounded-t-3xl border-none shadow-[0_-4px_30px_rgba(0,0,0,0.12)]">
            <Drawer.Handle />

            {/* Header: Badge & Close Button */}
            <Drawer.Header className="pt-2 pb-0 flex flex-col items-start gap-2">
              <div className="w-full flex items-center justify-between">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold select-none">
                  <HeartHandshake className="w-3.5 h-3.5" />
                  <span>{t('preAdNotice.badge')}</span>
                </div>

                <button
                  type="button"
                  onClick={handleClose}
                  className="w-10 h-10 min-w-[44px] min-h-[44px] rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-black/5 dark:hover:bg-white/5 border-none cursor-pointer transition-colors active:scale-95"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <Drawer.Heading className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white tracking-tight leading-snug mt-1">
                {t('preAdNotice.title')}
              </Drawer.Heading>

              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 leading-relaxed font-normal">
                {t('preAdNotice.description')}
              </p>
            </Drawer.Header>

            {/* Body: 3 Value Pillars */}
            <Drawer.Body className="py-4 px-0">
              <div className="flex flex-col gap-2.5 bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-3.5 border-none">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-gray-900 dark:text-white leading-tight">
                      {t('preAdNotice.features.ai.title')}
                    </p>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-tight mt-0.5">
                      {t('preAdNotice.features.ai.desc')}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-gray-900 dark:text-white leading-tight">
                      {t('preAdNotice.features.free.title')}
                    </p>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-tight mt-0.5">
                      {t('preAdNotice.features.free.desc')}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-gray-900 dark:text-white leading-tight">
                      {t('preAdNotice.features.respect.title')}
                    </p>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-tight mt-0.5">
                      {t('preAdNotice.features.respect.desc')}
                    </p>
                  </div>
                </div>
              </div>
            </Drawer.Body>

            {/* Footer: Primary & Secondary Action */}
            <Drawer.Footer className="pt-2 px-0 flex flex-col gap-2">
              <Button
                className="w-full h-12 min-h-[44px] rounded-2xl font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-none border-none active:scale-95 transition-all cursor-pointer text-sm flex items-center justify-center"
                onPress={handleConfirm}
              >
                {t('preAdNotice.confirm')}
              </Button>

              <button
                type="button"
                onClick={handleOpenPremium}
                className="w-full h-11 min-h-[44px] rounded-2xl font-semibold bg-transparent hover:bg-black/5 dark:hover:bg-white/5 text-gray-600 hover:text-emerald-600 dark:text-gray-400 dark:hover:text-emerald-400 border-none active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2 text-xs select-none"
              >
                <ProBadge variant="chip" />
                <span>{t('preAdNotice.goPremium')}</span>
              </button>
            </Drawer.Footer>
          </Drawer.Dialog>
        </Drawer.Content>
      </Drawer.Backdrop>
    </Drawer>
  );
};

export default PreAdTransparencySheet;
