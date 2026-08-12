import { useEffect, useRef, useState } from 'react';
import { useI18n } from '../context/I18nContext';
import { isNative } from '../native';
import {
  showExtractionBanner,
  removeExtractionBanner,
  addBannerSizeListener,
  addBannerLoadListener,
} from '../utils/ads';

/**
 * Ad slot shown in the empty space below the extraction animation.
 *
 * On native (Android/iOS), AdMob displays a MEDIUM_RECTANGLE (300×250) banner overlay
 * on top of the slot.
 *
 * On web (browser), the same styled ad card container (300x250 slot) is rendered
 * to maintain UI parity.
 */
export default function ExtractionAdCard() {
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
    const slot = slotRef.current;
    if (!slot) return;

    let cancelled = false;
    let removeSizeListener: (() => void) | null = null;
    let removeLoadListener: (() => void) | null = null;

    const positionBanner = () => {
      if (cancelled || !slotRef.current) return;
      const rect = slotRef.current.getBoundingClientRect();
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
      removeExtractionBanner();
    };
  }, [native]);

  // No ad filled on native — don't leave an empty card behind.
  if (native && status === 'failed') return null;

  return (
    <div
      className={`glass-panel p-4 mb-4 rounded-2xl border border-black/5 dark:border-white/5 shadow-xl w-full transition-opacity duration-500 ${
        status === 'loaded' ? 'opacity-100' : 'opacity-0'
      }`}
      aria-hidden={status !== 'loaded'}
    >
      <div className="flex items-center mb-2">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-black/40 dark:text-white/40">
          {t('ads.label')}
        </span>
      </div>
      {/* Reserved slot the native AdMob banner overlays (or web ad container box). */}
      <div
        ref={slotRef}
        className="w-full max-w-[300px] mx-auto flex items-center justify-center rounded-xl bg-black/5 dark:bg-white/5"
        style={{ minHeight: slotHeight }}
      />
    </div>
  );
}


