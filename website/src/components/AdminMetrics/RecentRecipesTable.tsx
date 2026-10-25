import { useState, useMemo } from 'react';
import {
  Search,
  X,
  ExternalLink,
  ChevronDown,
  Clock,
  Utensils,
  Flame,
  User,
  Bookmark,
} from 'lucide-react';
import type { RecentExtractedRecipeItem, SourcePlatformKey } from './types';
import { RecipeThumbnail } from './RecipeThumbnail';

interface RecentRecipesTableProps {
  isDe: boolean;
  recipes: RecentExtractedRecipeItem[];
  rangeLabel: string;
  formatDate: (iso: string) => string;
  platformBadges: Record<SourcePlatformKey, string>;
}

export function RecentRecipesTable({
  isDe,
  recipes,
  rangeLabel,
  formatDate,
  platformBadges,
}: RecentRecipesTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedRecipeId, setExpandedRecipeId] = useState<string | null>(null);

  const filteredRecipes = useMemo(() => {
    if (!searchQuery.trim()) return recipes;
    const q = searchQuery.trim().toLowerCase();
    return recipes.filter((r) => {
      const matchTitle = r.title.toLowerCase().includes(q);
      const matchHandle = (r.sourceHandle || '').toLowerCase().includes(q);
      const matchEmail = (r.user?.email || '').toLowerCase().includes(q);
      const matchPlatform = r.platform.toLowerCase().includes(q);
      return matchTitle || matchHandle || matchEmail || matchPlatform;
    });
  }, [recipes, searchQuery]);

  const toggleExpand = (id: string) => {
    setExpandedRecipeId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="p-5 sm:p-6 rounded-3xl bg-white shadow-[0_2px_6px_rgba(0,0,0,0.03)] flex flex-col gap-4">
      {/* Header with Title and Search Input */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-gray-900">
              {isDe ? 'Zuletzt extrahierte Rezepte' : 'Recently Extracted Recipes'}
            </h3>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-700 font-mono">
              {filteredRecipes.length}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            {isDe
              ? `Chronologische Übersicht der Extraktionen im Zeitraum (${rangeLabel}) inkl. Ersteller-User`
              : `Chronological list of extractions in timeframe (${rangeLabel}) with extractor users`}
          </p>
        </div>

        {/* Search input */}
        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={isDe ? 'Titel, User oder @Handle suchen...' : 'Search title, user, @handle...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-gray-100 pl-8 pr-7 py-2 text-xs rounded-xl border-none font-medium text-gray-900 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition-all placeholder:text-gray-400"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer border-none p-0.5"
              aria-label="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {filteredRecipes.length === 0 ? (
        <div className="py-12 text-center text-xs text-gray-500 bg-gray-50 rounded-2xl font-medium">
          {searchQuery
            ? isDe
              ? 'Keine Rezepte für diese Suche gefunden.'
              : 'No recipes matching your search query.'
            : isDe
              ? 'Keine Rezepte im gewählten Zeitraum vorhanden.'
              : 'No recipes found in the selected timeframe.'}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="text-[11px] font-semibold text-gray-400 border-b border-black/5">
                <th className="pb-2.5 pr-2">{isDe ? 'Datum' : 'Date'}</th>
                <th className="pb-2.5 px-2">{isDe ? 'Rezept & Titel' : 'Recipe & Title'}</th>
                <th className="pb-2.5 px-2">{isDe ? 'Plattform' : 'Platform'}</th>
                <th className="pb-2.5 px-2">Creator</th>
                <th className="pb-2.5 px-2">{isDe ? 'Extrahierender User' : 'Extractor User'}</th>
                <th className="pb-2.5 px-2 text-center">{isDe ? 'Im Kochbuch' : 'In Library'}</th>
                <th className="pb-2.5 pl-2 text-right">{isDe ? 'Aktion' : 'Action'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {filteredRecipes.map((recipe) => {
                const isExpanded = expandedRecipeId === recipe.id;
                const badgeClass = platformBadges[recipe.platform] || 'bg-gray-100 text-gray-700';
                const totalMinutes = (recipe.prepTime || 0) + (recipe.cookTime || 0);

                return (
                  <tr key={recipe.id} className="group hover:bg-gray-50/70 transition-colors">
                    <td colSpan={7} className="p-0">
                      <div
                        className="py-3 flex items-center justify-between gap-2 cursor-pointer"
                        onClick={() => toggleExpand(recipe.id)}
                      >
                        {/* 1. Date */}
                        <div className="w-24 shrink-0 text-gray-500 font-mono text-[11px] whitespace-nowrap">
                          {formatDate(recipe.createdAt).replace(/, \d{4}/, '')}
                        </div>

                        {/* 2. Cover Thumbnail & Title */}
                        <div className="flex-1 min-w-[180px] flex items-center gap-3 pr-2">
                          <div className="w-10 h-10 rounded-xl bg-gray-100 overflow-hidden shrink-0 flex items-center justify-center shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
                            <RecipeThumbnail
                              imageUrl={recipe.imageUrl}
                              title={recipe.title}
                              emoji={recipe.emoji}
                            />
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="font-bold text-gray-900 truncate text-xs leading-snug group-hover:text-emerald-700 transition-colors">
                              {recipe.emoji ? `${recipe.emoji} ` : ''}
                              {recipe.title}
                            </span>
                            <div className="flex items-center gap-2 text-[10px] text-gray-400 mt-0.5 font-medium">
                              {totalMinutes > 0 && <span>{totalMinutes} Min</span>}
                              {recipe.calories && <span>{recipe.calories} kcal</span>}
                              <span>{recipe.ingredientsCount} {isDe ? 'Zutaten' : 'items'}</span>
                            </div>
                          </div>
                        </div>

                        {/* 3. Platform Badge */}
                        <div className="w-24 shrink-0 px-2">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${badgeClass}`}>
                            {recipe.platform}
                          </span>
                        </div>

                        {/* 4. Creator Handle */}
                        <div className="w-28 shrink-0 px-2 text-xs font-mono font-medium text-gray-700 truncate">
                          {recipe.sourceHandle || '—'}
                        </div>

                        {/* 5. Extractor User Badge */}
                        <div className="w-44 shrink-0 px-2 flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-700 flex items-center justify-center font-bold text-[10px] shrink-0">
                            {recipe.user?.email ? recipe.user.email.charAt(0).toUpperCase() : <User className="w-3 h-3" />}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="text-xs font-semibold text-gray-900 truncate" title={recipe.user?.email || '—'}>
                              {recipe.user?.email || (isDe ? 'Unbekannt' : 'Unknown')}
                            </span>
                            {recipe.user?.tier && (
                              <span className="text-[9px] uppercase tracking-wider text-gray-400 font-mono">
                                {recipe.user.tier}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* 6. Saved / Reused Count */}
                        <div className="w-20 shrink-0 text-center px-1">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold font-mono ${
                              recipe.savedCount > 1
                                ? 'bg-amber-500/10 text-amber-800'
                                : 'bg-gray-100 text-gray-600'
                            }`}
                            title={isDe ? `${recipe.savedCount}× in Kochbüchern gespeichert` : `Saved in ${recipe.savedCount} libraries`}
                          >
                            <Bookmark className="w-2.5 h-2.5" />
                            {recipe.savedCount}×
                          </span>
                        </div>

                        {/* 7. Action / Links & Accordion Chevron */}
                        <div className="w-24 shrink-0 pl-2 flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                          {recipe.sourceUrl && !recipe.sourceUrl.startsWith('photo://') && !recipe.sourceUrl.startsWith('remix://') && (
                            <a
                              href={recipe.sourceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 transition-all cursor-pointer border-none"
                              title={isDe ? 'Original-Quelle öffnen' : 'Open source post'}
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                          <button
                            type="button"
                            onClick={() => toggleExpand(recipe.id)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 transition-colors cursor-pointer border-none"
                            aria-label={isExpanded ? 'Details verbergen' : 'Details anzeigen'}
                          >
                            <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                          </button>
                        </div>
                      </div>

                      {/* Accordion Detail View */}
                      {isExpanded && (
                        <div className="my-2 p-4 bg-gray-50 rounded-2xl flex flex-col gap-3.5 text-xs border-none animate-in fade-in duration-200">
                          {/* Recipe Key Metrics Bar */}
                          <div className="flex flex-wrap items-center gap-4 text-gray-600 pb-2 border-b border-black/5 font-medium">
                            <div className="flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-emerald-600" />
                              <span>{isDe ? 'Zubereitung:' : 'Prep:'} {recipe.prepTime ?? 0}m | {isDe ? 'Kochen:' : 'Cook:'} {recipe.cookTime ?? 0}m</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Utensils className="w-3.5 h-3.5 text-teal-600" />
                              <span>{recipe.servings ?? 2} {isDe ? 'Portionen' : 'servings'}</span>
                            </div>
                            {(recipe.calories !== null || recipe.proteinG !== null) && (
                              <div className="flex items-center gap-2 font-mono text-gray-800 bg-white px-2.5 py-1 rounded-xl shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                                <Flame className="w-3.5 h-3.5 text-amber-500" />
                                <span>{recipe.calories ?? '—'} kcal</span>
                                <span className="text-gray-300">|</span>
                                <span>P: {recipe.proteinG ?? '—'}g</span>
                                <span>C: {recipe.carbsG ?? '—'}g</span>
                                <span>F: {recipe.fatG ?? '—'}g</span>
                              </div>
                            )}
                          </div>

                          {/* Ingredients & Instructions Grid */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Ingredients */}
                            <div className="flex flex-col gap-1.5">
                              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                                {isDe ? `Zutaten (${recipe.ingredients.length})` : `Ingredients (${recipe.ingredients.length})`}
                              </span>
                              <div className="max-h-48 overflow-y-auto space-y-1 pr-1 bg-white p-3 rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
                                {recipe.ingredients.map((ing, i) => (
                                  <div key={i} className="flex items-baseline justify-between text-[11px] py-0.5 border-b border-black/5 last:border-0">
                                    <span className="text-gray-800 font-medium">{ing.name}</span>
                                    <span className="text-gray-500 font-mono text-[10px]">
                                      {ing.amount ?? ''} {ing.unit ?? ''}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Instructions */}
                            <div className="flex flex-col gap-1.5">
                              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                                {isDe ? `Schritte (${recipe.instructions.length})` : `Instructions (${recipe.instructions.length})`}
                              </span>
                              <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 bg-white p-3 rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
                                {recipe.instructions.map((step, idx) => (
                                  <div key={idx} className="flex gap-2 text-[11px] leading-relaxed text-gray-700">
                                    <span className="font-bold text-emerald-600 font-mono shrink-0">{idx + 1}.</span>
                                    <span>{step}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
