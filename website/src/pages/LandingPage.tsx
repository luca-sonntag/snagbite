import LandingHero from './LandingPage/LandingHero';
import LandingEditorialFlow from './LandingPage/LandingEditorialFlow';
import LandingBentoShowcase from './LandingPage/LandingBentoShowcase';
import LandingFaqSection from './LandingPage/LandingFaqSection';

export default function LandingPage() {
  return (
    <div className="w-full max-w-5xl mx-auto px-5 sm:px-8 py-8 sm:py-12 flex flex-col gap-16 sm:gap-24">
      <LandingHero />
      <LandingEditorialFlow />
      <LandingBentoShowcase />
      <LandingFaqSection />
    </div>
  );
}
