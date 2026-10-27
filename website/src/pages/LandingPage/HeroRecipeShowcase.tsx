import { useState, useEffect } from 'react';
import { Clock, Check, Play } from 'lucide-react';
import { apiUrl } from '../../api';

interface ShowcaseCover {
  id: string;
  title: string;
  imageUrl: string;
}

const INGREDIENTS = [
  { id: '1', amount: '250 g', name: 'Frische Tagliatelle', checked: true },
  { id: '2', amount: '1 Stk.', name: 'Bio-Zitrone (Abrieb & Saft)', checked: true },
  { id: '3', amount: '2 Zehen', name: 'Knoblauch, fein gehobelt', checked: false },
  { id: '4', amount: '60 g', name: 'Parmigiano Reggiano', checked: false },
];

export default function HeroRecipeShowcase() {
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(
    () => new Set(INGREDIENTS.filter((i) => i.checked).map((i) => i.id))
  );

  useEffect(() => {
    let cancelled = false;
    fetch(apiUrl('/api/public/showcase-covers?limit=6'))
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data || !Array.isArray(data.covers) || data.covers.length === 0) return;
        const firstValid = (data.covers as ShowcaseCover[]).find((c) => Boolean(c.imageUrl));
        if (firstValid?.imageUrl) {
          const url = firstValid.imageUrl.startsWith('http')
            ? firstValid.imageUrl
            : apiUrl(firstValid.imageUrl);
          setCoverUrl(url);
        }
      })
      .catch(() => {
        // Silently keep warm editorial fallback
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const toggleIngredient = (id: string) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="w-full max-w-[400px] mx-auto select-none">
      {/* Authentic Cookbook Sheet Container */}
      <div className="rounded-[28px] overflow-hidden bg-[#fdfbf7] dark:bg-gray-900 shadow-[0_12px_36px_rgba(0,0,0,0.06),0_2px_6px_rgba(0,0,0,0.03)] ring-1 ring-black/[0.05] dark:ring-white/10">
        {/* 1. Editorial 16:10 Cover Header (Matches RecipeHeroCard) */}
        <div className="relative aspect-[16/10] w-full overflow-hidden bg-[#243028]">
          {coverUrl ? (
            <img
              src={coverUrl}
              alt="Gericht Vorschau"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-[radial-gradient(circle_at_70%_25%,rgba(16,185,129,0.28),transparent_60%),linear-gradient(160deg,#1f2924_0%,#141a17_100%)]" />
          )}

          {/* Soft Ambient Scrim */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 via-50% to-transparent" />

          {/* Top Source Pill */}
          <div className="absolute top-3.5 inset-x-3.5 flex items-center justify-between">
            <span className="px-2.5 py-1 rounded-full bg-black/45 backdrop-blur-md text-[10.5px] font-semibold text-white/90">
              @pasta_paradise • Reel
            </span>
            <span className="px-2.5 py-1 rounded-full bg-emerald-500/90 text-white text-[10px] font-bold tracking-wide">
              Fertig angerichtet
            </span>
          </div>

          {/* Bottom Meta & Fraunces Title */}
          <div className="absolute bottom-3.5 inset-x-4 flex flex-col gap-1.5 text-white">
            <div className="flex items-center gap-2 text-xs">
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/90 text-white font-bold text-[10.5px]">
                <Clock className="w-3 h-3" />
                15 Min.
              </span>
              <span className="text-[11.5px] font-semibold text-white/90 tabular-nums">
                480 kcal
              </span>
              <span className="text-white/50">•</span>
              <span
                title="Healthy Score A"
                className="w-4 h-4 rounded-full bg-emerald-600 text-white font-black text-[9.5px] inline-flex items-center justify-center shadow-2xs"
              >
                A
              </span>
            </div>

            <h3 className="font-heading text-lg sm:text-xl font-bold tracking-tight leading-snug text-white">
              Cremige Zitronen-Knoblauch-Pasta
            </h3>
          </div>
        </div>

        {/* 2. Open-Canvas Ingredients & Step Preview */}
        <div className="p-4 sm:p-5 flex flex-col divide-y divide-black/[0.06] dark:divide-white/[0.08]">
          {/* Ingredients Header */}
          <div className="pb-2.5 flex items-baseline justify-between">
            <span className="font-heading text-sm font-bold text-gray-900 dark:text-white">
              Zutaten
            </span>
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
              für 2 Portionen
            </span>
          </div>

          {/* Interactive Tabular Ingredient Rows (Mobile-First >= 44px Touch Targets) */}
          <div className="py-1.5 flex flex-col">
            {INGREDIENTS.map((item) => {
              const isChecked = checkedIds.has(item.id);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => toggleIngredient(item.id)}
                  className={`w-full min-h-[44px] flex items-center gap-3 px-2.5 py-2 rounded-xl text-left transition-all active:scale-[0.99] cursor-pointer border-none ${
                    isChecked
                      ? 'bg-transparent text-gray-400 dark:text-gray-500'
                      : 'hover:bg-black/[0.03] dark:hover:bg-white/[0.04] text-gray-800 dark:text-gray-100'
                  }`}
                >
                  <span
                    className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 transition-colors ${
                      isChecked
                        ? 'bg-emerald-600 text-white'
                        : 'bg-black/[0.06] dark:bg-white/10 text-transparent'
                    }`}
                  >
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </span>
                  <span className="w-16 shrink-0 font-bold text-xs tabular-nums text-gray-900 dark:text-white">
                    {item.amount}
                  </span>
                  <span
                    className={`text-xs sm:text-[13px] font-medium truncate ${
                      isChecked ? 'line-through' : ''
                    }`}
                  >
                    {item.name}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Step 1 with Embedded Timer Chip */}
          <div className="pt-3 flex items-start gap-3 text-left">
            <span className="w-6 h-6 rounded-lg bg-emerald-500/12 text-emerald-700 dark:text-emerald-400 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
              1
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-[13px] text-gray-700 dark:text-gray-300 leading-relaxed m-0">
                Tagliatelle in reichlich Salzwasser bissfest garen, dabei eine Kelle Pastawasser für die Emulsion aufheben.
              </p>
              <div className="mt-2.5 flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[34px] rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[11px] font-bold">
                  <Clock className="w-3.5 h-3.5" />
                  8 Min. Timer
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 min-h-[34px] text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                  <Play className="w-3 h-3 fill-current" />
                  Kochmodus
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
