import type { MouseEvent } from 'react';
import { Button, Drawer } from '@heroui/react';
import { X, ArrowRight } from 'lucide-react';
import type { SavedRecipe } from '../../types';
import { RecipeListItem } from '../RecipeListItem';
import { useI18n } from '../../context/I18nContext';
import { useModalOverlay } from '../../context/OverlayStackContext';
import { hapticLight } from '../../utils/haptics';

export interface HeroThemeSheetProps {
  isOpen: boolean;
  onClose: () => void;
  themeTitle: string;
  themeSubtitle?: string;
  badgeVariant?: 'amber' | 'emerald' | 'indigo' | 'blue' | 'teal' | 'rose';
  recipes: SavedRecipe[];
  formatTotalTime: (recipe: any) => string | null;
  onOpenRecipe: (e: MouseEvent, job: SavedRecipe) => void;
  onOpenCatalog?: () => void;
}

/**
 * Mobile-first bottom drawer showing all recipes matching the active hero theme (Recommendation or Vital Stars).
 * Gives immediate visibility to the full theme selection without leaving the magazine feed.
 */
export default function HeroThemeSheet({
  isOpen,
  onClose,
  themeTitle,
  themeSubtitle,
  badgeVariant = 'amber',
  recipes,
  formatTotalTime,
  onOpenRecipe,
  onOpenCatalog,
}: HeroThemeSheetProps) {
  const { t } = useI18n();
  useModalOverlay(isOpen, onClose);

  if (!isOpen) return null;

  return (
    <div onClick={(e) => e.stopPropagation()}>
      <Drawer>
        <Drawer.Backdrop isOpen={isOpen} onOpenChange={(open) => { if (!open) onClose(); }} className="!z-[100]">
          <Drawer.Content placement="bottom" className="!z-[100]">
            <Drawer.Dialog className="relative !bg-gray-50 dark:!bg-gray-950 max-h-[85vh] flex flex-col p-5 pb-[calc(1.5rem_+_var(--safe-area-inset-bottom))] rounded-t-3xl border-none shadow-[0_-4px_30px_rgba(0,0,0,0.12)]">
              <Drawer.Handle />

              {/* Header: Pure typography with top-right close button */}
              <Drawer.Header className="!p-0 !pb-3 !pt-1 border-none">
                <div className="flex items-start justify-between gap-3 w-full text-left">
                  <div className="flex-1 min-w-0 pr-1">
                    <Drawer.Heading className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white tracking-tight leading-snug">
                      {themeTitle}
                    </Drawer.Heading>
                    <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 font-normal mt-0.5">
                      {themeSubtitle || t('catalog.magazine.themeSheetSubtitle', { count: recipes.length })}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      hapticLight();
                      onClose();
                    }}
                    className="w-9 h-9 min-w-[36px] min-h-[36px] rounded-full bg-gray-200/60 dark:bg-gray-800 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 border-none flex items-center justify-center shrink-0 active:scale-95 transition-all cursor-pointer mt-0.5"
                    aria-label="Schließen"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </Drawer.Header>

              {/* Recipe List */}
              <div className="flex-1 overflow-y-auto space-y-2 py-2 pr-0.5 -mr-0.5">
                {recipes.map((job) => (
                  <RecipeListItem
                    key={job.recipeId}
                    job={job}
                    totalTime={job.recipe ? formatTotalTime(job.recipe) : null}
                    showArrow={true}
                    onClick={(e) => {
                      onClose();
                      onOpenRecipe(e, job);
                    }}
                  />
                ))}
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
                    className={`w-full h-12 rounded-2xl font-bold ${
                      badgeVariant === 'emerald'
                        ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/25'
                        : 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/25'
                    } active:scale-[0.98] text-white border-none shadow-md transition-all text-sm flex items-center justify-center gap-2`}
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
