import LandingHero from './LandingPage/LandingHero';
import LandingEditorialFlow from './LandingPage/LandingEditorialFlow';
import LandingBentoShowcase from './LandingPage/LandingBentoShowcase';
import LandingFaqSection from './LandingPage/LandingFaqSection';

export default function LandingPage() {
  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-8 py-4 sm:py-12 flex flex-col divide-y divide-black/[0.08] dark:divide-white/[0.1]">
      <div className="pb-10 sm:pb-16">
        <LandingHero />
      </div>
      <div className="py-10 sm:py-16">
        <LandingEditorialFlow />
      </div>
      <div className="py-10 sm:py-16">
        <LandingBentoShowcase />
      </div>
      <div className="pt-10 sm:pt-16">
        <LandingFaqSection />
      </div>
    </div>
  );
}
