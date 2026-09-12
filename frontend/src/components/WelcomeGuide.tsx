import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  Sparkles,
  ShoppingCart,
  ChefHat,
  Timer,
  MessageCircle,
  Check,
  ChevronRight,
  ArrowLeft,
  Folder,
  Star,
  Tag,
} from 'lucide-react';
import { useI18n } from '../context/I18nContext';
import { useModalOverlay } from '../context/OverlayStackContext';
import { ShareStep2Mockup, ShareStep3Mockup } from './ShareMockups';
import { hapticLight, hapticSelection, hapticMedium } from '../utils/haptics';

interface WelcomeGuideProps {
  /** Called on skip and on the final CTA. */
  onClose: () => void;
}

// ── Per-slide illustrations (purely decorative, no real data) ───────────────

const WelcomeArt = () => (
  <div className="relative">
    <div className="absolute inset-0 rounded-[2rem] bg-emerald-500/25 blur-2xl" />
    <div className="relative w-28 h-28 rounded-[2rem] bg-white dark:bg-gray-900 border-none flex items-center justify-center shadow-xl">
      <img src="/icon-512.png" alt="" className="w-16 h-16 object-contain rounded-2xl" />
    </div>
    <div className="absolute -top-2 -right-2 w-9 h-9 rounded-full bg-amber-400 flex items-center justify-center shadow-lg shadow-amber-500/30">
      <Sparkles className="w-5 h-5 text-white fill-white" />
    </div>
  </div>
);

const ImportArt = () => (
  <div className="flex items-center justify-center gap-3">
    <ShareStep2Mockup />
    <ShareStep3Mockup />
  </div>
);

const CookbookArt = () => (
  <div className="grid grid-cols-2 gap-3 w-60">
    {[0, 1].map((i) => (
      <div
        key={i}
        className="rounded-2xl bg-white dark:bg-gray-900 border-none shadow-sm overflow-hidden"
      >
        <div className="h-20 bg-gradient-to-br from-emerald-500/25 to-teal-500/10 flex items-center justify-center">
          <ChefHat className="w-7 h-7 text-emerald-500/50" />
        </div>
        <div className="p-2.5 flex flex-col gap-1.5">
          <div className="h-2 w-3/4 rounded bg-black/10 dark:bg-white/10" />
          <div className="h-1.5 w-1/2 rounded bg-black/5 dark:bg-white/5" />
        </div>
      </div>
    ))}
  </div>
);

const OrganizeArt = () => {
  const chips = [
    { icon: Folder, label: 'w-14', tint: 'bg-emerald-500/15 text-emerald-500' },
    { icon: Star, label: 'w-10', tint: 'bg-amber-500/15 text-amber-500' },
    { icon: Tag, label: 'w-12', tint: 'bg-teal-500/15 text-teal-500' },
    { icon: Folder, label: 'w-9', tint: 'bg-purple-500/15 text-purple-500' },
  ];
  return (
    <div className="w-60 flex flex-wrap justify-center gap-2.5">
      {chips.map(({ icon: Icon, label, tint }, i) => (
        <div
          key={i}
          className={`flex items-center gap-2 px-3.5 py-2.5 rounded-full border-none shadow-sm ${tint}`}
        >
          <Icon className="w-4 h-4 shrink-0" strokeWidth={2} />
          <div className={`h-2 rounded bg-current opacity-40 ${label}`} />
        </div>
      ))}
    </div>
  );
};

const ShoppingArt = () => (
  <div className="w-60 rounded-2xl bg-white dark:bg-gray-900 border-none shadow-sm p-3.5 flex flex-col gap-3">
    <div className="flex items-center gap-2">
      <ShoppingCart className="w-4 h-4 text-emerald-500" />
      <div className="h-2 w-16 rounded bg-black/15 dark:bg-white/15" />
    </div>
    {[true, false, false].map((checked, i) => (
      <div key={i} className="flex items-center gap-2.5">
        <div
          className={`w-4 h-4 rounded-md border-none flex items-center justify-center shrink-0 ${
            checked
              ? 'bg-emerald-500'
              : 'bg-black/10 dark:bg-white/15'
          }`}
        >
          {checked && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
        </div>
        <div
          className={`h-2 rounded bg-black/10 dark:bg-white/10 ${
            checked ? 'w-20 opacity-40' : i === 1 ? 'w-32' : 'w-24'
          }`}
        />
      </div>
    ))}
  </div>
);

const CookingArt = () => {
  const tiles = [
    { icon: ChefHat, label: 'Mode' },
    { icon: Timer, label: 'Timer' },
    { icon: MessageCircle, label: 'Copilot' },
  ];
  return (
    <div className="flex items-center justify-center gap-3">
      {tiles.map(({ icon: Icon, label }) => (
        <div
          key={label}
          className="w-20 h-24 rounded-2xl bg-white dark:bg-gray-900 border-none shadow-sm flex flex-col items-center justify-center gap-2"
        >
          <div className="w-11 h-11 rounded-xl bg-emerald-500/10 flex items-center justify-center">
            <Icon className="w-6 h-6 text-emerald-500" strokeWidth={1.75} />
          </div>
          <div className="h-1.5 w-10 rounded bg-black/10 dark:bg-white/10" />
        </div>
      ))}
    </div>
  );
};

const SLIDES = [
  { key: 'welcome', Art: WelcomeArt },
  { key: 'import', Art: ImportArt },
  { key: 'cookbook', Art: CookbookArt },
  { key: 'organize', Art: OrganizeArt },
  { key: 'shopping', Art: ShoppingArt },
  { key: 'cooking', Art: CookingArt },
] as const;

export default function WelcomeGuide({ onClose }: WelcomeGuideProps) {
  const { t } = useI18n();
  const [index, setIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);

  const isLast = index === SLIDES.length - 1;

  // Swipe/keyboard advance stops at the last slide; only the CTA button closes.
  const advance = useCallback(() => {
    hapticSelection();
    setIndex((i) => Math.min(i + 1, SLIDES.length - 1));
  }, []);
  const back = useCallback(() => {
    hapticSelection();
    setIndex((i) => Math.max(i - 1, 0));
  }, []);
  const handleNext = useCallback(() => {
    if (isLast) {
      hapticMedium();
      onClose();
    } else {
      advance();
    }
  }, [isLast, advance, onClose]);

  useModalOverlay(true, () => {
    if (index > 0) {
      back();
    } else {
      onClose();
    }
  });

  // Scroll-lock + keyboard controls (mirrors PremiumModal's overlay behavior).
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight') advance();
      else if (e.key === 'ArrowLeft') back();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose, advance, back]);

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (dx <= -50) advance();
    else if (dx >= 50) back();
    touchStartX.current = null;
  };

  const { key, Art } = SLIDES[index];

  const overlay = (
    <div
      className="fixed inset-0 z-[200] flex flex-col bg-gray-50 dark:bg-gray-950"
      role="dialog"
      aria-modal="true"
      aria-label={t('onboarding.slides.welcome.title')}
    >
      {/* Ambient premium glows */}
      <div className="absolute top-[-12%] left-1/2 -translate-x-1/2 w-80 h-80 bg-emerald-400/15 dark:bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-12%] right-[-15%] w-72 h-72 bg-teal-400/10 dark:bg-teal-600/10 rounded-full blur-3xl pointer-events-none" />

      <div
        className="relative flex flex-col h-full w-full max-w-md mx-auto px-6 select-none"
        style={{
          paddingTop: 'max(var(--safe-area-inset-top, 0px), 20px)',
          paddingBottom: 'max(var(--safe-area-inset-bottom, 0px), 24px)',
        }}
      >
        {/* Top bar: Skip */}
        <div className="flex justify-end items-center h-10 shrink-0">
          {!isLast && (
            <button
              onClick={() => {
                hapticLight();
                onClose();
              }}
              className="text-sm font-semibold text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white px-3 py-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
            >
              {t('onboarding.skip')}
            </button>
          )}
        </div>

        {/* Slide body (swipeable) */}
        <div
          className="flex-1 flex flex-col items-center justify-center gap-9"
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          <div key={index} className="w-full flex flex-col items-center gap-9 animate-fade-in-up">
            <div className="h-56 flex items-center justify-center">
              <Art />
            </div>
            <div className="flex flex-col items-center text-center gap-3">
              <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                {t(`onboarding.slides.${key}.title`)}
              </h2>
              <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-300 max-w-xs">
                {t(`onboarding.slides.${key}.desc`)}
              </p>
            </div>
          </div>
        </div>

        {/* Footer: progress dots + navigation */}
        <div className="shrink-0 flex flex-col gap-6 pt-4">
          <div className="flex justify-center gap-2">
            {SLIDES.map((s, i) => (
              <button
                key={s.key}
                onClick={() => {
                  hapticSelection();
                  setIndex(i);
                }}
                aria-label={`${i + 1}`}
                className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                  i === index ? 'w-6 bg-emerald-500' : 'w-2 bg-gray-300 dark:bg-gray-700'
                }`}
              />
            ))}
          </div>

          <div className="flex items-center justify-between gap-3">
            <button
              onClick={back}
              className={`flex items-center gap-1 text-sm font-semibold px-4 py-3 rounded-xl transition-all ${
                index === 0
                  ? 'opacity-0 pointer-events-none'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer'
              }`}
            >
              <ArrowLeft className="w-4 h-4" />
              {t('onboarding.back')}
            </button>

            <button
              onClick={handleNext}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-sm font-semibold px-6 py-3 rounded-xl shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
            >
              {isLast ? (
                <>
                  <Check className="w-4 h-4" strokeWidth={2.5} />
                  {t('onboarding.cta')}
                </>
              ) : (
                <>
                  {t('onboarding.next')}
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(overlay, document.body);
}
