import { useEffect, useRef, useState } from 'react';
import { Spinner } from '@heroui/react';
import { BannerAdSize } from '@capacitor-community/admob';
import { useI18n } from '../context/I18nContext';
import { isNative } from '../native';
import {
  showAdBanner,
  removeAdBanner,
  hideAdBanner,
  resumeAdBanner,
  addBannerSizeListener,
  addBannerLoadListener,
  isAdLoaded,
  RESUME_DELAY_MS,
} from '../utils/ads';

/**
 * Ad slot shown in the space below the extraction animation or in the cookbook catalog.
 *
 * On native (Android/iOS), AdMob displays a banner overlay (300×250 MREC or 320x50 Banner)
 * on top of the slot.
 */
interface ExtractionAdCardProps {
  isActive?: boolean;
  /**
   * Temporarily hide the native banner without destroying it (e.g. while the
   * bottom bar is slid away by an overlay, select mode, or a running extraction).
   * Drives hideBanner/resumeBanner so the ad is preserved in memory and resumed
   * cleanly instead of being reloaded.
   */
  hidden?: boolean;
  variant?: 'mrec' | 'banner';
  embedded?: boolean;
  onStatusChange?: (status: 'pending' | 'loaded' | 'failed') => void;
}

export default function ExtractionAdCard({
  isActive = true,
  hidden = false,
  variant = 'mrec',
  embedded = false,
  onStatusChange,
}: ExtractionAdCardProps) {
  const { t } = useI18n();
  const slotRef = useRef<HTMLDivElement>(null);
  const defaultHeight = variant === 'banner' ? 50 : 250;
  const [slotHeight, setSlotHeight] = useState(defaultHeight);
  const native = isNative();
  const [status, setStatusState] = useState<'pending' | 'loaded' | 'failed'>(
    native ? 'pending' : 'loaded',
  );
  // Bumped to force the main effect to re-measure and re-show this card's banner
  // when it becomes visible but no banner exists to resume (e.g. it was removed
  // by an extraction handoff while this card was hidden).
  const [showNonce, setShowNonce] = useState(0);

  const setStatus = (next: 'pending' | 'loaded' | 'failed') => {
    setStatusState(next);
    onStatusChange?.(next);
  };

  useEffect(() => {
    setSlotHeight(variant === 'banner' ? 50 : 250);
  }, [variant]);

  useEffect(() => {
    if (!native) return;
    if (!isActive) {
      void removeAdBanner();
      return;
    }

    // Always show the loading spinner on (re)activation until THIS slot's ad
    // actually loads (resolved by the load listener below). The shared global
    // isAdLoaded() flag is unreliable across the two ad slots (bottom bar vs
    // extraction form) and could wrongly suppress the spinner on an empty slot.
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

      // For embedded bottom dock banner, bottomMargin MUST be above the bottom menu buttons (> 45dp)
      // Ignore transient near-zero margin measurements during translate-y slide-up transitions.
      if (embedded && bottomMargin < 45) return;

      const adSize = variant === 'banner' ? BannerAdSize.BANNER : BannerAdSize.MEDIUM_RECTANGLE;
      console.log(
        `[AdMob] slot rect top=${Math.round(rect.top)} bottom=${Math.round(rect.bottom)} ` +
        `height=${Math.round(rect.height)} innerH=${window.innerHeight} ` +
        `marginBottom=${bottomMargin} dpr=${window.devicePixelRatio}`,
      );
      void showAdBanner(bottomMargin, adSize);
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
      // Measure clean position after 350ms translate-y slide-up transition settles
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
    };
  }, [native, isActive, variant, showNonce]);

  // Temporarily hide/resume the banner (without destroying it) while `hidden`
  // toggles — e.g. an overlay opened, select mode, or an extraction is running.
  // Keeps the loaded ad in memory so it resumes cleanly instead of reloading.
  const wasHidden = useRef(false);
  useEffect(() => {
    if (!native || !isActive) return;
    if (hidden) {
      wasHidden.current = true;
      void hideAdBanner();
      return;
    }
    // Only act on a genuine un-hide transition (not the initial mount, which the
    // main effect already handles with its own loading state).
    if (!wasHidden.current) return;
    wasHidden.current = false;
    setStatus('pending');

    if (!isAdLoaded()) {
      // No banner in memory to resume (e.g. it was removed by an extraction
      // handoff while we were hidden). Re-run the main effect to measure and
      // show this card's own banner fresh — resuming would no-op and leave the
      // slot stuck on the spinner forever.
      setShowNonce((n) => n + 1);
      return;
    }

    // A banner is in memory: the resume is deferred by RESUME_DELAY_MS and fires
    // no load event — so the slot would sit empty during the gap. Keep the
    // spinner until the ad is actually back.
    void resumeAdBanner();
    const revealTimer = setTimeout(() => {
      if (isAdLoaded()) setStatus('loaded');
    }, RESUME_DELAY_MS + 100);
    return () => clearTimeout(revealTimer);
  }, [native, isActive, hidden]);

  // Only destroy the native AdMob banner when the component actually unmounts on page exit
  useEffect(() => {
    return () => {
      void removeAdBanner();
    };
  }, []);

  // No ad filled on native — don't leave empty card frame behind.
  if (native && status === 'failed') return null;

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


