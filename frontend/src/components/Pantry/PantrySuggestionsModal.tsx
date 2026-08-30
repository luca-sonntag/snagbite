import React from 'react';
import { Drawer } from '@heroui/react';
import { X, Sparkles, AlertCircle, CheckCircle2, ChevronRight, Globe } from 'lucide-react';
import type { PantrySuggestion } from '../../types';
import { useI18n } from '../../context/I18nContext';
import { recipeCategoryEmojis } from '../../i18n';

interface PantrySuggestionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  suggestions: PantrySuggestion[];
  loading: boolean;
  onSelectRecipe: (recipeId: string) => void;
}

export const PantrySuggestionsModal: React.FC<PantrySuggestionsModalProps> = ({
  isOpen,
  onClose,
  suggestions,
  loading,
  onSelectRecipe,
}) => {
  const { t } = useI18n();

  // Strict deduplication by normalized title and recipe id
  const uniqueSuggestions = React.useMemo(() => {
    const seen = new Set<string>();
    return suggestions.filter((sug) => {
      const normTitle = (sug.recipe.title || '').trim().toLowerCase();
      const id = sug.recipe.id;
      if (seen.has(normTitle) || (id && seen.has(id))) return false;
      if (id) seen.add(id);
      if (normTitle) seen.add(normTitle);
      return true;
    });
  }, [suggestions]);

  return (
    <div onClick={(e) => e.stopPropagation()}>
      <Drawer>
        <Drawer.Backdrop
          isOpen={isOpen}
          onOpenChange={(open) => {
            if (!open) onClose();
          }}
          className="!z-[100]"
        >
          <Drawer.Content placement="bottom" className="!z-[100]">
            <Drawer.Dialog className="relative !bg-white dark:!bg-gray-900 max-h-[85vh] flex flex-col p-5 pb-[calc(1.5rem_+_var(--safe-area-inset-bottom))] rounded-t-3xl border-none shadow-[0_-4px_30px_rgba(0,0,0,0.12)]">
              <Drawer.Handle />

              {/* Header */}
              <Drawer.Header className="pb-3 mb-1 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <Drawer.Heading className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
                      {t('pantry.suggestionsTitle')}
                    </Drawer.Heading>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {t('pantry.suggestionsSubtitle')}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label={t('pantry.cancel')}
                  className="w-10 h-10 min-w-[40px] min-h-[40px] rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-700 active:scale-95 transition-all border-none outline-none flex items-center justify-center cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </Drawer.Header>

              {/* Body */}
              <Drawer.Body className="overflow-y-auto py-2 flex-1 flex flex-col gap-2.5 pr-1 -mr-1 overscroll-contain">
                {loading && (
                  <div className="py-16 text-center text-gray-400 dark:text-gray-500 text-sm">
                    <div className="w-7 h-7 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                    Lade Vorschläge...
                  </div>
                )}

                {!loading && uniqueSuggestions.length === 0 && (
                  <div className="py-14 text-center text-gray-400 dark:text-gray-500 space-y-2">
                    <AlertCircle className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600" />
                    <p className="font-bold text-gray-900 dark:text-white text-base">
                      {t('pantry.noSuggestions')}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 max-w-xs mx-auto">
                      {t('pantry.noSuggestionsDesc')}
                    </p>
                  </div>
                )}

                {!loading &&
                  uniqueSuggestions.map((sug) => {
                    const recipeId = sug.recipe.id || '';
                    const emoji =
                      (sug.recipe.category &&
                        recipeCategoryEmojis[sug.recipe.category as keyof typeof recipeCategoryEmojis]) ||
                      '🍲';
                    const img =
                      (sug.recipe as any).thumbnailUrl ||
                      (sug.recipe as any).coverImage ||
                      (sug.recipe as any).imageUrl;

                    return (
                      <div
                        key={recipeId}
                        onClick={() => {
                          if (recipeId) onSelectRecipe(recipeId);
                          onClose();
                        }}
                        className="p-3 bg-gray-50/80 hover:bg-gray-100 dark:bg-gray-800/60 dark:hover:bg-gray-800 rounded-3xl cursor-pointer transition-all border-none shadow-none flex items-center gap-3.5 active:scale-[0.98]"
                      >
                        {/* Thumbnail / Emoji */}
                        <div className="w-20 h-20 rounded-2xl overflow-hidden bg-gray-200 dark:bg-gray-700 shrink-0 flex items-center justify-center relative shadow-xs">
                          {img ? (
                            <img
                              src={img}
                              alt={sug.recipe.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-3xl">{emoji}</span>
                          )}
                          {sug.isPublic && (
                            <div className="absolute top-1.5 left-1.5 bg-black/60 backdrop-blur-xs text-white p-1 rounded-lg">
                              <Globe className="w-3 h-3" />
                            </div>
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap mb-1">
                            <h4 className="font-bold text-sm sm:text-base text-gray-900 dark:text-white truncate max-w-[200px]">
                              {sug.recipe.title}
                            </h4>
                            {sug.isPublic && (
                              <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded-md">
                                Community
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5 flex-wrap text-xs">
                            {sug.expiringIngredients.length > 0 && (
                              <span className="inline-flex items-center gap-1 font-bold text-[11px] bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-lg">
                                🔥{' '}
                                {sug.expiringIngredients.length === 1
                                  ? t('pantry.expiringCountOne')
                                  : t('pantry.expiringCount', { count: sug.expiringIngredients.length })}
                              </span>
                            )}
                            <span className="inline-flex items-center gap-1 font-bold text-[11px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-lg">
                              <CheckCircle2 className="w-3 h-3 shrink-0" />
                              {sug.matchingIngredients.length === 1
                                ? t('pantry.matchingCountOne')
                                : t('pantry.matchingCount', { count: sug.matchingIngredients.length })}
                            </span>
                            {sug.missingIngredientsCount > 0 && (
                              <span className="text-gray-400 dark:text-gray-500 text-[11px] font-medium">
                                {sug.missingIngredientsCount === 1
                                  ? t('pantry.missingCountOne')
                                  : t('pantry.missingCount', { count: sug.missingIngredientsCount })}
                              </span>
                            )}
                          </div>

                          <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 truncate">
                            {sug.matchingIngredients.join(', ')}
                          </p>
                        </div>

                        <ChevronRight className="w-5 h-5 text-gray-400 dark:text-gray-500 shrink-0" />
                      </div>
                    );
                  })}
              </Drawer.Body>
            </Drawer.Dialog>
          </Drawer.Content>
        </Drawer.Backdrop>
      </Drawer>
    </div>
  );
};
