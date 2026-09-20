import React, { useState, useEffect } from 'react';
import TimerBanner from './TimerBanner';
import OtaUpdateBanner from './OtaUpdateBanner';
import type { AppTopBannersProps } from '../types/app';

export const AppTopBanners: React.FC<AppTopBannersProps> = () => {
  const [stickyTopEl, setStickyTopEl] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    const root = document.documentElement;
    if (!stickyTopEl) {
      root.style.removeProperty('--app-sticky-top');
      return;
    }
    const publish = () => {
      root.style.setProperty('--app-sticky-top', `${stickyTopEl.offsetHeight}px`);
    };
    publish();
    const observer = new ResizeObserver(publish);
    observer.observe(stickyTopEl);
    return () => {
      observer.disconnect();
      root.style.removeProperty('--app-sticky-top');
    };
  }, [stickyTopEl]);

  return (
    <div ref={setStickyTopEl} className="sticky top-0 z-40 w-full">
      {/* Status bar background filler for devices with safe-area-inset-top */}
      <div className="w-full h-[var(--safe-area-inset-top)] bg-[#064e3b]" />

      {/* Active Cooking Timers Banner */}
      <TimerBanner />

      {/* Instant OTA Update Consent Banner */}
      <OtaUpdateBanner />
    </div>
  );
};
export default AppTopBanners;
