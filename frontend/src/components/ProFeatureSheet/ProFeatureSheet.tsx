import { Drawer, Button } from '@heroui/react';
import { X, Check } from 'lucide-react';
import { useI18n } from '../../context/I18nContext';
import { useModalOverlay } from '../../context/OverlayStackContext';
import { hapticLight, hapticMedium } from '../../utils/haptics';
import ProBadge from '../ProBadge';
import { getProFeatureContent } from './proFeaturesData';
import ProFeatureScreenshot from './ProFeatureScreenshot';
import type { ProFeatureSheetProps } from './types';

/**
 * Dynamic Feature-Spotlight Bottom Sheet.
 * Displays targeted copywriting, key bullets, and an asset screenshot for any PRO feature.
 */
export default function ProFeatureSheet({
  isOpen,
  featureId,
  onClose,
  onUpgrade,
}: ProFeatureSheetProps) {
  const { language } = useI18n();
  useModalOverlay(isOpen, onClose);

  if (!featureId) return null;

  const isDe = !language.startsWith('en');
  const feature = getProFeatureContent(featureId, language);
  const Icon = feature.icon;

  const handleUpgrade = () => {
    hapticMedium();
    onClose();
    onUpgrade();
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
          <Drawer.Dialog className="relative !bg-white dark:!bg-gray-900 max-h-[88vh] flex flex-col p-5 sm:p-6 pb-[calc(1.5rem_+_var(--safe-area-inset-bottom))] rounded-t-3xl border-none shadow-[0_-4px_30px_rgba(0,0,0,0.12)]">
            <Drawer.Handle />

            {/* Header: Feature Icon, Title, Badge & Close */}
            <Drawer.Header className="pt-2 pb-3 px-0 border-none">
              <div className="flex items-start justify-between gap-3 w-full">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/10 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 shadow-xs">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-base font-bold text-gray-900 dark:text-white leading-tight">
                        {feature.title}
                      </h2>
                      <ProBadge variant="chip" />
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-snug truncate">
                      {feature.tagline}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleClose}
                  className="w-9 h-9 min-w-[36px] min-h-[36px] rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 active:scale-90 flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-all border-none cursor-pointer shrink-0"
                  aria-label={isDe ? 'Schließen' : 'Close'}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </Drawer.Header>

            {/* Body: Screenshot & Value Bullets */}
            <Drawer.Body className="px-0 py-1 overflow-y-auto flex flex-col gap-4">
              {/* Dynamic Feature Screenshot */}
              <ProFeatureScreenshot
                src={feature.screenshotUrl}
                alt={feature.title}
                icon={feature.icon}
              />

              {/* Feature Value Bullets */}
              <div className="flex flex-col gap-2.5 py-1">
                {feature.bullets.map((bullet, idx) => (
                  <div key={idx} className="flex items-start gap-2.5">
                    <div className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                      <Check className="w-3 h-3 stroke-[2.5]" />
                    </div>
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-200 leading-tight flex-1">
                      {bullet}
                    </span>
                  </div>
                ))}
              </div>
            </Drawer.Body>

            {/* Footer: CTAs */}
            <Drawer.Footer className="pt-3 px-0 flex flex-col gap-2 border-none">
              <Button
                className="w-full h-12 min-h-[48px] rounded-2xl font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20 border-none active:scale-[0.98] transition-all cursor-pointer text-sm flex items-center justify-center gap-2"
                onPress={handleUpgrade}
              >
                <span>{isDe ? 'Snagbite PRO freischalten' : 'Unlock Snagbite PRO'}</span>
              </Button>

              <button
                type="button"
                onClick={handleClose}
                className="w-full h-9 rounded-xl font-medium text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 border-none bg-transparent cursor-pointer active:scale-95 transition-all"
              >
                {isDe ? 'Vielleicht später' : 'Maybe later'}
              </button>
            </Drawer.Footer>
          </Drawer.Dialog>
        </Drawer.Content>
      </Drawer.Backdrop>
    </Drawer>
  );
}
