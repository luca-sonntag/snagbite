import {
  Sparkles,
  ShoppingCart,
  ChefHat,
  Timer,
  MessageCircle,
  Check,
  Users,
  Heart,
} from 'lucide-react';
import { ShareStep2Mockup } from './ShareMockups';

export const ExtractHeroArt = () => (
  <div className="flex items-center justify-center gap-3.5 select-none">
    <div className="relative">
      <div className="absolute inset-0 rounded-[2rem] bg-emerald-500/25 blur-2xl" />
      <div className="relative w-24 h-24 rounded-[2rem] bg-white dark:bg-gray-900 border-none flex items-center justify-center shadow-xl">
        <img src="/icon-512.png" alt="" className="w-14 h-14 object-contain rounded-2xl" />
      </div>
      <div className="absolute -top-1.5 -right-1.5 w-8 h-8 rounded-full bg-amber-400 flex items-center justify-center shadow-lg shadow-amber-500/30">
        <Sparkles className="w-4 h-4 text-white fill-white" />
      </div>
    </div>
    <ShareStep2Mockup />
  </div>
);

export const ShoppingArt = () => (
  <div className="w-60 rounded-2xl bg-white dark:bg-gray-900 border-none shadow-sm p-3.5 flex flex-col gap-3 select-none">
    <div className="flex items-center gap-2">
      <ShoppingCart className="w-4 h-4 text-emerald-500" />
      <div className="h-2 w-16 rounded bg-black/15 dark:bg-white/15" />
    </div>
    {[true, false, false].map((checked, i) => (
      <div key={i} className="flex items-center gap-2.5">
        <div
          className={`w-4 h-4 rounded-md border-none flex items-center justify-center shrink-0 ${
            checked ? 'bg-emerald-500' : 'bg-black/10 dark:bg-white/15'
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

export const CookingArt = () => {
  const tiles = [
    { icon: ChefHat, label: 'Mode' },
    { icon: Timer, label: 'Timer' },
    { icon: MessageCircle, label: 'Copilot' },
  ];
  return (
    <div className="flex items-center justify-center gap-3 select-none">
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

export const HouseholdArt = () => (
  <div className="w-64 rounded-2xl bg-white dark:bg-gray-900 border-none shadow-sm p-4 flex flex-col gap-3 select-none">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2.5">
        <div className="flex -space-x-2">
          <div className="w-9 h-9 rounded-2xl bg-amber-500/15 text-amber-700 dark:text-amber-300 flex items-center justify-center font-bold text-xs ring-2 ring-white dark:ring-gray-900">
            DU
          </div>
          <div className="w-9 h-9 rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xs ring-2 ring-white dark:ring-gray-900">
            <Users className="w-4 h-4" />
          </div>
        </div>
        <div className="flex flex-col">
          <div className="h-2 w-16 rounded bg-black/20 dark:bg-white/20" />
          <div className="h-1.5 w-10 rounded bg-black/10 dark:bg-white/10 mt-1" />
        </div>
      </div>
      <div className="w-7 h-7 rounded-full bg-rose-500/15 flex items-center justify-center">
        <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
      </div>
    </div>
    <div className="p-2.5 rounded-xl bg-emerald-500/10 flex items-center justify-between">
      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
        <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
        <span>1 PRO = 2 Personen</span>
      </div>
      <div className="h-2 w-12 rounded bg-emerald-500/30" />
    </div>
  </div>
);
