import { Drawer } from '@heroui/react';
import ExtractionAdCard from './ExtractionAdCard';

interface ExtractionAdSheetProps {
  isOpen: boolean;
}

/**
 * Non-dismissible bottom sheet displaying an MREC AdMob banner during foreground
 * recipe extractions for Free-tier users.
 *
 * Automatically stays open while the extraction job is active and cannot be
 * dismissed via backdrop clicks, gestures, or close buttons.
 */
export default function ExtractionAdSheet({ isOpen }: ExtractionAdSheetProps) {
  if (!isOpen) return null;

  return (
    <Drawer>
      <Drawer.Backdrop
        isOpen={isOpen}
        onOpenChange={() => {
          // Explicitly non-dismissible: ignore backdrop open change events
        }}
        className="!z-[100] bg-black/40 backdrop-blur-[2px]"
      >
        <Drawer.Content placement="bottom" className="!z-[100] outline-none">
          <Drawer.Dialog className="relative !bg-white dark:!bg-gray-900 px-4 pt-4 pb-[calc(1rem_+_var(--safe-area-inset-bottom))] rounded-t-3xl border-none shadow-[0_-8px_32px_rgba(0,0,0,0.16)] flex flex-col items-center justify-center outline-none">
            <div className="w-full flex items-center justify-center min-h-[250px]">
              <ExtractionAdCard isActive={isOpen} variant="mrec" />
            </div>
          </Drawer.Dialog>
        </Drawer.Content>
      </Drawer.Backdrop>
    </Drawer>
  );
}
