import { useEffect, useRef, useState } from 'react';
import { Sparkles, ArrowRight } from 'lucide-react';
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
 * On web (browser), a styled web ad box is rendered in the 300x250 slot,
 * maintaining consistent layout and UX across platforms.
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
      className={`glass-panel p-4 rounded-2xl border border-black/5 dark:border-white/5 shadow-xl w-full transition-opacity duration-500 ${
        status === 'loaded' ? 'opacity-100' : 'opacity-0'
      }`}
      aria-hidden={status !== 'loaded'}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-black/40 dark:text-white/40">
          {t('ads.label')}
        </span>
        {!native && (
          <span className="text-[9px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 dark:bg-emerald-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider">
            Anzeige
          </span>
        )}
      </div>
      {native ? (
        /* Reserved slot the native AdMob banner overlays. Sized to the 300px MREC and
            centered so the banner lines up with it horizontally. */
        <div
          ref={slotRef}
          className="w-full max-w-[300px] mx-auto flex items-center justify-center rounded-xl bg-black/5 dark:bg-white/5"
          style={{ minHeight: slotHeight }}
        />
      ) : (
        /* Web ad box fallback */
        <div
          ref={slotRef}
          className="w-full max-w-[300px] h-[250px] mx-auto flex flex-col justify-between p-5 rounded-xl bg-gradient-to-br from-emerald-600 via-teal-600 to-emerald-800 text-white shadow-lg relative overflow-hidden group cursor-pointer"
        >
          {/* Background decorative glow */}
          <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-emerald-400/25 rounded-full blur-xl group-hover:scale-110 transition-transform duration-500 pointer-events-none" />
          <div className="absolute -left-6 -top-6 w-24 h-24 bg-teal-300/20 rounded-full blur-lg pointer-events-none" />

          <div className="relative z-10 flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-white/15 backdrop-blur-md shrink-0">
              <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-emerald-200 uppercase tracking-wider block">
                Snagbite Pro
              </span>
              <h4 className="font-bold text-sm leading-snug text-white">
                Schneller kochen ohne Wartezeit
              </h4>
            </div>
          </div>

          <div className="relative z-10 my-auto">
            <p className="text-xs text-emerald-100/90 leading-relaxed">
              Unbegrenzte KI-Rezept-Extraktionen, Offline-Modus & automatischer Einkaufszettel.
            </p>
          </div>

          <div className="relative z-10 flex items-center justify-between pt-2.5 border-t border-white/15">
            <span className="text-[11px] font-medium text-emerald-200">
              7 Tage kostenlos
            </span>
            <div className="flex items-center gap-1 text-xs font-bold bg-white text-emerald-900 px-3 py-1.5 rounded-lg shadow-sm hover:bg-emerald-50 active:scale-95 transition-all">
              <span>Jetzt entdecken</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

