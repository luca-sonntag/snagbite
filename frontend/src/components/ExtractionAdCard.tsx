import { useEffect, useRef, useState } from 'react';
import { Spinner } from '@heroui/react';
import { BannerAdSize } from '@capacitor-community/admob';
import { useI18n } from '../context/I18nContext';
import { isNative } from '../native';
import {
  showExtractionBanner,
  removeExtractionBanner,
  addBannerSizeListener,
  addBannerLoadListener,
} from '../utils/ads';

/**
 * Ad slot shown in the space below the extraction animation or in the cookbook catalog.
 *
 * On native (Android/iOS), AdMob displays a banner overlay (300×250 MREC or 320x50 Banner)
 * on top of the slot.
 */
interface ExtractionAdCardProps {
  isActive?: boolean;
  variant?: 'mrec' | 'banner';
  embedded?: boolean;
}

export default function ExtractionAdCard({
  isActive = true,
  variant = 'mrec',
  embedded = false,
}: ExtractionAdCardProps) {
  const { t } = useI18n();
  const slotRef = useRef<HTMLDivElement>(null);
  const defaultHeight = variant === 'banner' ? 50 : 250;
  const [slotHeight, setSlotHeight] = useState(defaultHeight);
  const native = isNative();
  const [status, setStatus] = useState<'pending' | 'loaded' | 'failed'>(
    native ? 'pending' : 'loaded',
  );

  useEffect(() => {
    setSlotHeight(variant === 'banner' ? 50 : 250);
  }, [variant]);

  useEffect(() => {
    if (!native) return;
    if (!isActive) {
      void removeExtractionBanner();
      return;
    }
    setStatus('pending');
    const slot = slotRef.current;
    if (!slot) return;

    let cancelled = false;
    let removeSizeListener: (() => void) | null = null;
    let removeLoadListener: (() => void) | null = null;

    const positionBanner = () => {
      if (cancelled || !slotRef.current || !isActive) return;
      const rect = slotRef.current.getBoundingClientRect();

      // Do not position until the container has completed its CSS expansion transition (>45px height)
      const minRequiredHeight = variant === 'banner' ? 45 : 150;
      if (rect.height < minRequiredHeight) return;

      const bottomMargin = Math.max(0, Math.round(window.innerHeight - rect.bottom));

      const adSize = variant === 'banner' ? BannerAdSize.BANNER : BannerAdSize.MEDIUM_RECTANGLE;
      console.log(
        `[AdMob] slot rect top=${Math.round(rect.top)} bottom=${Math.round(rect.bottom)} ` +
        `height=${Math.round(rect.height)} innerH=${window.innerHeight} ` +
        `marginBottom=${bottomMargin} dpr=${window.devicePixelRatio}`,
      );
      void showExtractionBanner(bottomMargin, adSize);
    };

    let timerId: ReturnType<typeof setTimeout> | null = null;

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
      // Measure single clean position after 350ms CSS transition settles
      timerId = setTimeout(positionBanner, 350);
    })();

    // Reposition on viewport changes (rotation / keyboard / resize) and CSS transition completion
    const onResize = () => requestAnimationFrame(positionBanner);
    window.addEventListener('resize', onResize);

    const parentBar = slot.closest('.fixed') || slot.parentElement;
    if (parentBar) {
      parentBar.addEventListener('transitionend', onResize);
    }

    return () => {
      cancelled = true;
      if (timerId) clearTimeout(timerId);
      window.removeEventListener('resize', onResize);
      if (parentBar) {
        parentBar.removeEventListener('transitionend', onResize);
      }
      removeLoadListener?.();
      removeSizeListener?.();
      void removeExtractionBanner();
    };
  }, [native, isActive, variant]);

  // No ad filled on native — don't leave empty MREC card frame behind for MREC variant.
  if (native && status === 'failed' && variant === 'mrec') return null;

  if (embedded) {
    return (
      <div className="w-full flex flex-col items-center justify-center transition-all duration-300">
        <div className="flex items-center justify-center mb-1">
          <span className="text-[9px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
            {t('ads.label')}
          </span>
        </div>
        {/* Reserved slot the native AdMob banner overlays (or web ad container box). */}
        <div
          ref={slotRef}
          className="w-full max-w-[320px] mx-auto flex flex-col items-center justify-center rounded-xl bg-gray-100/80 dark:bg-gray-800/50 transition-all"
          style={{ minHeight: slotHeight }}
        >
          {status === 'pending' && (
            <Spinner size="sm" color="success" />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white dark:bg-gray-900 ${variant === 'banner' ? 'p-3' : 'p-5'} rounded-3xl border-none shadow-[0_2px_6px_rgba(0,0,0,0.03)] w-full transition-all duration-300`}>
      <div className="flex items-center mb-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
          {t('ads.label')}
        </span>
      </div>
      {/* Reserved slot the native AdMob banner overlays (or web ad container box). */}
      <div
        ref={slotRef}
        className="w-[300px] h-[250px] mx-auto flex flex-col items-center justify-center rounded-2xl bg-gray-100 dark:bg-gray-800/60 transition-all overflow-hidden"
      >
        {status === 'pending' && (
          <Spinner size="sm" color="success" />
        )}
      </div>
    </div>
  );
}


