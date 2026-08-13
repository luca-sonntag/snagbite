import { useEffect, useRef, useState } from 'react';
import { Spinner } from '@heroui/react';
import { useI18n } from '../context/I18nContext';
import { isNative } from '../native';
import {
  showExtractionBanner,
  removeExtractionBanner,
  addBannerSizeListener,
  addBannerLoadListener,
} from '../utils/ads';

/**
 * Ad slot shown in the space below the extraction animation.
 *
 * On native (Android/iOS), AdMob displays a MEDIUM_RECTANGLE (300×250) banner overlay
 * on top of the slot.
 *
 * On web (browser), the same styled ad card container (300x250 slot) is rendered
 * to maintain UI parity.
 */
interface ExtractionAdCardProps {
  isActive?: boolean;
}

export default function ExtractionAdCard({ isActive = true }: ExtractionAdCardProps) {
  const { t } = useI18n();
  const slotRef = useRef<HTMLDivElement>(null);
  // Default MREC height (300×250) until the real banner reports its size.
  const [slotHeight, setSlotHeight] = useState(250);
  const native = isNative();
  const [status, setStatus] = useState<'pending' | 'loaded' | 'failed'>(
    native ? 'pending' : 'loaded',
  );

  useEffect(() => {
    if (!native) return;
    if (!isActive) {
      void removeExtractionBanner();
      return;
    }
    const slot = slotRef.current;
    if (!slot) return;

    let cancelled = false;
    let removeSizeListener: (() => void) | null = null;
    let removeLoadListener: (() => void) | null = null;

    const positionBanner = () => {
      if (cancelled || !slotRef.current || !isActive) return;
      const rect = slotRef.current.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) return;
      // BOTTOM_CENTER expects the distance from the viewport's bottom edge to
      // the banner's bottom edge. CSS px map to the plugin's logical dp units.
      const bottomMargin = Math.max(0, Math.round(window.innerHeight - rect.bottom));
      console.log(
        `[AdMob] slot rect top=${Math.round(rect.top)} bottom=${Math.round(rect.bottom)} ` +
        `height=${Math.round(rect.height)} innerH=${window.innerHeight} ` +
        `marginBottom=${bottomMargin} dpr=${window.devicePixelRatio}`,
      );
      void showExtractionBanner(bottomMargin);
    };

    (async () => {
      removeLoadListener = await addBannerLoadListener((next) => {
        if (cancelled) return;
        setStatus(next);
      });
      removeSizeListener = await addBannerSizeListener(({ width, height }) => {
        if (cancelled || height <= 0) return;
        console.log(`[AdMob] banner size w=${width} h=${height}`);
        setSlotHeight(height);
      });
      if (cancelled) {
        removeLoadListener?.();
        removeSizeListener?.();
        return;
      }
      // Wait a frame so layout has settled before measuring the slot.
      requestAnimationFrame(positionBanner);
    })();

    // Reposition on viewport changes (rotation / keyboard / resize).
    const onResize = () => requestAnimationFrame(positionBanner);
    window.addEventListener('resize', onResize);

    return () => {
      cancelled = true;
      window.removeEventListener('resize', onResize);
      removeLoadListener?.();
      removeSizeListener?.();
      void removeExtractionBanner();
    };
  }, [native, isActive]);

  // No ad filled on native — don't leave an empty card behind.
  if (native && status === 'failed') return null;

  return (
    <div className="bg-white dark:bg-gray-900 p-5 rounded-3xl border-none shadow-[0_2px_6px_rgba(0,0,0,0.03)] w-full transition-all duration-300">
      <div className="flex items-center mb-3">
        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
          {t('ads.label')}
        </span>
      </div>
      {/* Reserved slot the native AdMob banner overlays (or web ad container box). */}
      <div
        ref={slotRef}
        className="w-full max-w-[300px] mx-auto flex flex-col items-center justify-center rounded-2xl bg-gray-100 dark:bg-gray-800/60 transition-all"
        style={{ minHeight: slotHeight }}
      >
        {status === 'pending' && (
          <div className="flex flex-col items-center justify-center gap-2.5 p-4 text-center">
            <Spinner size="sm" color="success" />
            <span className="text-xs font-semibold text-gray-400 dark:text-gray-500">
              {t('ads.rewardedLoading')}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}


