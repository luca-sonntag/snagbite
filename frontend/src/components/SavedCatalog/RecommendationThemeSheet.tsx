import type { MouseEvent } from 'react';
import { Button, Drawer } from '@heroui/react';
import { X, Clock, Sparkles, ArrowRight } from 'lucide-react';
import type { SavedRecipe } from '../../types';
import CachedImage from '../CachedImage';
import { useI18n } from '../../context/I18nContext';
import { useModalOverlay } from '../../context/OverlayStackContext';
import { hapticLight } from '../../utils/haptics';
import { getRecipeCalories } from '../../utils/formatNutrition';
import { getHealthScoreLetter, getHealthScoreColor } from '../RecipeDetails/HealthScoreBadge';

export interface RecommendationThemeSheetProps {
  isOpen: boolean;
  onClose: () => void;
  themeTitle: string;
  recipes: SavedRecipe[];
  formatTotalTime: (recipe: any) => string | null;
  onOpenRecipe: (e: MouseEvent, job: SavedRecipe) => void;
  onOpenCatalog?: () => void;
}

/**
 * Mobile-first bottom drawer showing all recipes matching the active hero recommendation theme.
 * Gives immediate visibility to the full theme selection without leaving the magazine feed.
 */
export default function RecommendationThemeSheet({
  isOpen,
  onClose,
  themeTitle,
  recipes,
  formatTotalTime,
  onOpenRecipe,
  onOpenCatalog,
}: RecommendationThemeSheetProps) {
  const { t } = useI18n();
  useModalOverlay(isOpen, onClose);

  if (!isOpen) return null;

  return (
    <div onClick={(e) => e.stopPropagation()}>
      <Drawer>
        <Drawer.Backdrop isOpen={isOpen} onOpenChange={(open) => { if (!open) onClose(); }} className="!z-[100]">
          <Drawer.Content placement="bottom" className="!z-[100]">
            <Drawer.Dialog className="relative !bg-white dark:!bg-gray-900 max-h-[85vh] flex flex-col p-5 pb-[calc(1.5rem_+_var(--safe-area-inset-bottom))] rounded-t-3xl border-none shadow-[0_-4px_30px_rgba(0,0,0,0.12)]">
              <Drawer.Handle />

              {/* Header */}
              <Drawer.Header className="pb-3 pt-1 flex items-center justify-between gap-3 border-none">
                <div className="flex-1 min-w-0">
                  <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-400 font-bold text-[10px] tracking-tight mb-1">
                    <Sparkles className="w-2.5 h-2.5 text-amber-500 shrink-0" />
                    <span>{themeTitle}</span>
                  </div>
                  <Drawer.Heading className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">
                    {themeTitle}
                  </Drawer.Heading>
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-normal mt-0.5">
                    {t('catalog.magazine.themeSheetSubtitle', { count: recipes.length })}
                  </p>
                </div>

                <Button
                  isIconOnly
                  size="sm"
                  variant="flat"
                  onPress={onClose}
                  className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 border-none shrink-0"
                  aria-label="Schließen"
                >
                  <X className="w-4 h-4" />
                </Button>
              </Drawer.Header>

              {/* Recipe List */}
              <div className="flex-1 overflow-y-auto space-y-2 py-2 pr-0.5 -mr-0.5">
                {recipes.map((job) => {
                  const r = job.recipe;
                  if (!r) return null;
                  const totalTime = formatTotalTime(r);
                  const calories = getRecipeCalories(r);
                  const score = r.healthScore ?? null;
                  const scoreLetter = score !== null ? getHealthScoreLetter(score) : null;
                  const scoreColors = score !== null ? getHealthScoreColor(score) : null;

                  return (
                    <article
                      key={job.recipeId}
                      onClick={(e) => {
                        hapticLight();
                        onClose();
                        onOpenRecipe(e, job);
                      }}
                      className="flex items-center gap-3 p-2.5 rounded-2xl bg-gray-50/90 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 active:scale-[0.99] transition-all cursor-pointer border-none"
                    >
                      <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 bg-gray-200 dark:bg-gray-700 relative">
                        <CachedImage
                          src={r.imageUrl}
                          emoji={r.emoji}
                          alt={r.title}
                          className="w-full h-full object-cover pointer-events-none"
                        />
                      </div>

                      <div className="flex-1 min-w-0 flex flex-col justify-center">
                        <h4 className="text-sm font-bold text-gray-900 dark:text-white line-clamp-1 leading-snug">
                          {r.title}
                        </h4>
                        {r.sourceHandle && (
                          <p className="text-[11px] text-gray-400 dark:text-gray-500 font-medium truncate mt-0.5">
                            {`@${r.sourceHandle.replace(/^@/, '')}`}
                          </p>
                        )}

                        <div className="flex items-center gap-2 mt-1 text-[11px] font-medium text-gray-500 dark:text-gray-400">
                          {totalTime && (
                            <span className="flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                              <Clock className="w-3 h-3 shrink-0" />
                              <span>{totalTime}</span>
                            </span>
                          )}

                          {calories !== undefined && calories !== null && (
                            <span>{Math.round(calories)} kcal</span>
                          )}

                          {score !== null && scoreLetter && scoreColors && (
                            <span
                              className={`w-3.5 h-3.5 rounded-full ${scoreColors.pillBg} text-white font-black text-[9px] flex items-center justify-center leading-none`}
                            >
                              {scoreLetter}
                            </span>
                          )}
                        </div>
                      </div>

                      <ArrowRight className="w-4 h-4 text-gray-300 dark:text-gray-600 shrink-0 mr-1" />
                    </article>
                  );
                })}
              </div>

              {/* Footer CTA: Open in Full Catalog */}
              {onOpenCatalog && (
                <div className="pt-3">
                  <Button
                    onPress={() => {
                      hapticLight();
                      onClose();
                      onOpenCatalog();
                    }}
                    className="w-full h-12 rounded-2xl font-bold bg-amber-500 hover:bg-amber-600 active:scale-[0.98] text-white border-none shadow-md shadow-amber-500/25 transition-all text-sm flex items-center justify-center gap-2"
                  >
                    <span>{t('catalog.magazine.themeSheetOpenCatalog')}</span>
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </Drawer.Dialog>
          </Drawer.Content>
        </Drawer.Backdrop>
      </Drawer>
    </div>
  );
}
