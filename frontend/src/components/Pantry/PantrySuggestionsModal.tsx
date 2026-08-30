import React from 'react';
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-content1 rounded-3xl w-full max-w-lg p-6 shadow-xl relative max-h-[85vh] flex flex-col animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between pb-3 border-b border-divider mb-4 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-warning-100 text-warning-700 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground">{t('pantry.suggestionsTitle')}</h3>
              <p className="text-xs text-default-500">{t('pantry.suggestionsSubtitle')}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('pantry.cancel')}
            className="p-2 rounded-full text-default-400 hover:text-foreground hover:bg-default-100 min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 space-y-3 pr-1">
          {loading && (
            <div className="py-12 text-center text-default-400 text-sm">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              Lade Vorschläge...
            </div>
          )}

          {!loading && suggestions.length === 0 && (
            <div className="py-12 text-center text-default-400 space-y-2">
              <AlertCircle className="w-10 h-10 mx-auto text-default-300" />
              <p className="font-semibold text-foreground">{t('pantry.noSuggestions')}</p>
              <p className="text-xs text-default-500 max-w-xs mx-auto">
                {t('pantry.noSuggestionsDesc')}
              </p>
            </div>
          )}

          {!loading &&
            suggestions.map((sug) => {
              const recipeId = sug.recipe.id || '';
              const emoji =
                (sug.recipe.category && recipeCategoryEmojis[sug.recipe.category as keyof typeof recipeCategoryEmojis]) || '🍲';
              const img = (sug.recipe as any).thumbnailUrl || (sug.recipe as any).coverImage || (sug.recipe as any).imageUrl;

              return (
                <div
                  key={recipeId}
                  onClick={() => {
                    if (recipeId) onSelectRecipe(recipeId);
                    onClose();
                  }}
                  className="p-3.5 bg-default-50 hover:bg-default-100 rounded-2xl cursor-pointer transition-all border border-divider/40 flex items-center gap-3.5"
                >
                  {/* Thumbnail / Emoji */}
                  <div className="w-14 h-14 rounded-xl overflow-hidden bg-default-200 shrink-0 flex items-center justify-center relative">
                    {img ? (
                      <img
                        src={img}
                        alt={sug.recipe.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-2xl">{emoji}</span>
                    )}
                    {sug.isPublic && (
                      <div className="absolute top-1 left-1 bg-black/60 text-white p-0.5 rounded-sm">
                        <Globe className="w-2.5 h-2.5" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap mb-1">
                      <h4 className="font-bold text-sm text-foreground truncate max-w-[200px]">
                        {sug.recipe.title}
                      </h4>
                      {sug.isPublic && (
                        <span className="text-[10px] font-semibold bg-primary/10 text-primary px-1.5 py-0.5 rounded-md">
                          Community
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 flex-wrap text-xs">
                      {sug.expiringIngredients.length > 0 && (
                        <span className="inline-flex items-center gap-1 text-warning-700 font-semibold bg-warning-50 px-1.5 py-0.5 rounded">
                          🔥 {t('pantry.expiringCount', { count: sug.expiringIngredients.length })}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1 text-success-700 font-medium bg-success-50 px-1.5 py-0.5 rounded">
                        <CheckCircle2 className="w-3 h-3" />
                        {t('pantry.matchingCount', { count: sug.matchingIngredients.length })}
                      </span>
                      {sug.missingIngredientsCount > 0 && (
                        <span className="text-default-400">
                          {t('pantry.missingCount', { count: sug.missingIngredientsCount })}
                        </span>
                      )}
                    </div>

                    <p className="text-[11px] text-default-400 mt-1 truncate">
                      {sug.matchingIngredients.join(', ')}
                    </p>
                  </div>

                  <ChevronRight className="w-5 h-5 text-default-400 shrink-0" />
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
};
