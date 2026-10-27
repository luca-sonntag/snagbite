import { useState, useEffect } from 'react';
import { Clock, Check } from 'lucide-react';
import { apiUrl } from '../../api';

interface ShowcaseCover {
  id: string;
  title: string;
  imageUrl: string;
}

const INGREDIENTS = [
  { id: '1', amount: '250 g', name: 'Frische Tagliatelle', checked: true },
  { id: '2', amount: '1 Stk.', name: 'Bio-Zitrone (Abrieb & Saft)', checked: false },
  { id: '3', amount: '60 g', name: 'Parmigiano Reggiano', checked: false },
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
    <div className="w-full max-w-[330px] sm:max-w-[360px] mx-auto select-none">
      {/* Compact Editorial Recipe Card */}
      <div className="rounded-2xl overflow-hidden bg-[#fdfbf7] dark:bg-gray-900 shadow-[0_6px_24px_rgba(0,0,0,0.05)] ring-1 ring-black/[0.08] dark:ring-white/10 p-3.5 sm:p-4 flex flex-col gap-3">
        {/* Top Row: Compact Thumbnail + Title & Meta */}
        <div className="flex items-center gap-3">
          <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-xl overflow-hidden bg-[#243028] shrink-0 ring-1 ring-black/[0.06]">
            {coverUrl ? (
              <img
                src={coverUrl}
                alt="Gericht Vorschau"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-[radial-gradient(circle_at_70%_25%,rgba(16,185,129,0.28),transparent_60%),linear-gradient(160deg,#1f2924_0%,#141a17_100%)]" />
            )}
          </div>

          <div className="flex flex-col gap-1 min-w-0 flex-1 text-left">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-500 dark:text-gray-400">
              <span>@pasta_paradise</span>
              <span>•</span>
              <span className="inline-flex items-center gap-0.5 text-emerald-700 dark:text-emerald-400 font-bold">
                <Clock className="w-3 h-3" />
                15 Min.
              </span>
              <span>•</span>
              <span className="tabular-nums">480 kcal</span>
            </div>

            <h3 className="font-heading text-[15px] sm:text-base font-bold tracking-tight leading-snug text-gray-900 dark:text-white m-0 line-clamp-2">
              Cremige Zitronen-Knoblauch-Pasta
            </h3>
          </div>
        </div>

        {/* Compact 3-Row Ingredient Checklist */}
        <div className="border-t border-black/[0.06] dark:border-white/[0.08] pt-2 flex flex-col">
          <div className="px-1 pb-1 flex items-baseline justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
              Zutaten (2 Portionen)
            </span>
            <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
              zum Abhaken
            </span>
          </div>

          {INGREDIENTS.map((item) => {
            const isChecked = checkedIds.has(item.id);
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => toggleIngredient(item.id)}
                className={`w-full min-h-[38px] flex items-center gap-2.5 px-1.5 py-1 rounded-lg text-left transition-colors cursor-pointer border-none ${
                  isChecked
                    ? 'bg-transparent text-gray-400 dark:text-gray-500'
                    : 'hover:bg-black/[0.03] dark:hover:bg-white/[0.04] text-gray-800 dark:text-gray-100'
                }`}
              >
                <span
                  className={`w-4 h-4 rounded flex items-center justify-center shrink-0 transition-colors ${
                    isChecked
                      ? 'bg-emerald-600 text-white'
                      : 'bg-black/[0.07] dark:bg-white/10 text-transparent'
                  }`}
                >
                  <Check className="w-3 h-3 stroke-[3]" />
                </span>
                <span className="w-14 shrink-0 font-bold text-xs tabular-nums text-gray-900 dark:text-white">
                  {item.amount}
                </span>
                <span
                  className={`text-xs font-medium truncate ${
                    isChecked ? 'line-through' : ''
                  }`}
                >
                  {item.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
