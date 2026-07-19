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
 * The AdMob plugin can't render "native advanced" ads, so we draw an app-styled
 * glass card with a small "Werbung" label and reserve a centered slot; a native
 * MEDIUM_RECTANGLE (300×250) banner is positioned as an overlay on top of that
 * slot so the whole thing reads as an integrated card rather than a floating ad.
 *
 * Rendering is gated by the parent (active extraction + non-premium user, i.e.
 * free or beta). The banner is torn down automatically when this component
 * unmounts, so the ad disappears the instant extraction finishes — keeping it
 * non-intrusive.
 *
 * The card frame is laid out (so we can measure where to place the native
 * banner) but stays invisible until a real ad actually loads — so a slow load
 * or an empty fill never leaves a blank grey box on screen. If the ad fails to
 * load, the card renders nothing at all.
 *
 * On web there is no native ad, so this renders nothing.
 */
export default function ExtractionAdCard() {
  const { t } = useI18n();
  const slotRef = useRef<HTMLDivElement>(null);
  // Default MREC height (300×250) until the real banner reports its size.
  const [slotHeight, setSlotHeight] = useState(250);
  const [status, setStatus] = useState<'pending' | 'loaded' | 'failed'>('pending');

  const native = isNative();

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
      // Distance from the top of the webview to the top of the slot ≈ the
      // banner's margin-top (both density-independent px on Android).
      showExtractionBanner(rect.top);
    };

    (async () => {
      removeLoadListener = await addBannerLoadListener((next) => {
        if (cancelled) return;
        setStatus(next);
      });
      removeSizeListener = await addBannerSizeListener(({ height }) => {
        if (cancelled || height <= 0) return;
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

  if (!native) return null;
  // No ad filled — don't leave an empty card behind.
  if (status === 'failed') return null;

  return (
    <div
      className={`glass-panel p-4 rounded-2xl border border-black/5 dark:border-white/5 shadow-xl w-full transition-opacity duration-500 ${
        status === 'loaded' ? 'opacity-100' : 'opacity-0'
      }`}
      aria-hidden={status !== 'loaded'}
    >
      <div className="flex items-center mb-2">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-black/40 dark:text-white/40">
          {t('ads.label')}
        </span>
      </div>
      {/* Reserved slot the native banner overlays. Sized to the 300px MREC and
          centered so the banner lines up with it horizontally. */}
      <div
        ref={slotRef}
        className="w-full max-w-[300px] mx-auto flex items-center justify-center rounded-xl bg-black/5 dark:bg-white/5"
        style={{ minHeight: slotHeight }}
      />
    </div>
  );
}
