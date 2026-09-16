import { Popover, Button } from '@heroui/react';
import {
  MoreVertical,
  Check,
  Copy,
  ShoppingCart,
  Trash2,
  Folder,
  Tag,
  Star,
  RefreshCw,
} from 'lucide-react';
import { useI18n } from '../../context/I18nContext';
import { hapticLight, hapticNotification } from '../../utils/haptics';
import { devReExtractRecipe } from '../../utils/dev';

interface RecipeHeaderActionsProps {
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
  isMenuOpen: boolean;
  setIsMenuOpen: (open: boolean) => void;
  onAssignCollections?: () => void;
  onManageFlags?: () => void;
  onCopyRecipe: () => void;
  isCopied: boolean;
  onNavigateToShoppingList?: () => void;
  onDelete?: () => void;
  reelUrl?: string;
  sourceUrl?: string | null;
  createdAt?: string;
}

export default function RecipeHeaderActions({
  isFavorite,
  onToggleFavorite,
  isMenuOpen,
  setIsMenuOpen,
  onAssignCollections,
  onManageFlags,
  onCopyRecipe,
  isCopied,
  onNavigateToShoppingList,
  onDelete,
  reelUrl,
  sourceUrl,
  createdAt,
}: RecipeHeaderActionsProps) {
  const { t, language } = useI18n();

  return (
    <>
      {onToggleFavorite && (
        <Button
          isIconOnly
          onClick={() => {
            hapticLight();
            onToggleFavorite();
          }}
          className={`w-11 h-11 min-w-[44px] min-h-[44px] flex-shrink-0 rounded-full flex items-center justify-center backdrop-blur-md border border-white/10 shadow-lg transition-all cursor-pointer active:scale-95 ${
            isFavorite
              ? 'bg-black/65 text-amber-400 hover:bg-black/80'
              : 'bg-black/65 hover:bg-black/80 text-white'
          }`}
          aria-label="Toggle Favorite"
        >
          <Star className={`w-5 h-5 ${isFavorite ? 'fill-amber-400 text-amber-400' : ''}`} />
        </Button>
      )}

      <Popover isOpen={isMenuOpen} onOpenChange={setIsMenuOpen}>
        <Popover.Trigger>
          <Button
            isIconOnly
            onClick={() => hapticLight()}
            className="w-11 h-11 min-w-[44px] min-h-[44px] flex-shrink-0 bg-black/65 hover:bg-black/80 text-white backdrop-blur-md border border-white/10 shadow-lg rounded-full flex items-center justify-center transition-all cursor-pointer active:scale-95"
            aria-label="Options"
          >
            <MoreVertical className="w-5 h-5" />
          </Button>
        </Popover.Trigger>
        <Popover.Content placement="bottom end" className="p-1.5 min-w-[200px] bg-white dark:bg-gray-950 border-none rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
          <div className="flex flex-col w-full">
            {onAssignCollections && (
              <button
                onClick={() => {
                  hapticLight();
                  setIsMenuOpen(false);
                  onAssignCollections();
                }}
                className="flex items-center gap-3 w-full px-4 py-3.5 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-black/5 dark:hover:bg-white/5 active:scale-[0.98] rounded-xl text-left transition-all cursor-pointer outline-none border-none"
              >
                <Folder className="w-4 h-4 text-gray-500 dark:text-gray-400 shrink-0" />
                <span>{t('catalog.bulkAddToCollection') || 'Zu Sammlung hinzufügen'}</span>
              </button>
            )}

            {onManageFlags && (
              <button
                onClick={() => {
                  hapticLight();
                  setIsMenuOpen(false);
                  onManageFlags();
                }}
                className="flex items-center gap-3 w-full px-4 py-3.5 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-black/5 dark:hover:bg-white/5 active:scale-[0.98] rounded-xl text-left transition-all cursor-pointer outline-none border-none"
              >
                <Tag className="w-4 h-4 text-gray-500 dark:text-gray-400 shrink-0" />
                <span>{t('catalog.manageRecipeFlagsTitle') || 'Labels verwalten'}</span>
              </button>
            )}

            <button
              onClick={() => {
                hapticNotification('success');
                onCopyRecipe();
                setIsMenuOpen(false);
              }}
              className="flex items-center gap-3 w-full px-4 py-3.5 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-black/5 dark:hover:bg-white/5 active:scale-[0.98] rounded-xl text-left transition-all cursor-pointer outline-none border-none"
            >
              {isCopied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span className="text-emerald-500 font-bold">{t('recipe.copied')}</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-gray-500 dark:text-gray-400 shrink-0" />
                  <span>{t('recipe.copyRecipe')}</span>
                </>
              )}
            </button>

            {onNavigateToShoppingList && (
              <button
                onClick={() => {
                  hapticLight();
                  setIsMenuOpen(false);
                  onNavigateToShoppingList();
                }}
                className="flex items-center gap-3 w-full px-4 py-3.5 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-black/5 dark:hover:bg-white/5 active:scale-[0.98] rounded-xl text-left transition-all cursor-pointer outline-none border-none"
              >
                <ShoppingCart className="w-4 h-4 text-gray-500 dark:text-gray-400 shrink-0" />
                <span>{t('recipe.goToShoppingList')}</span>
              </button>
            )}

            {onDelete && (
              <button
                onClick={() => {
                  hapticLight();
                  setIsMenuOpen(false);
                  onDelete();
                }}
                className="flex items-center gap-3 w-full px-4 py-3.5 text-sm font-semibold text-red-600 dark:text-red-400 hover:bg-red-500/10 active:scale-[0.98] rounded-xl text-left transition-all cursor-pointer outline-none border-none"
              >
                <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
                <span>{t('recipe.delete')}</span>
              </button>
            )}

            {import.meta.env.DEV && (reelUrl || sourceUrl) && (
              <button
                onClick={() => {
                  hapticNotification('success');
                  setIsMenuOpen(false);
                  const targetUrl = reelUrl || sourceUrl;
                  if (targetUrl) {
                    devReExtractRecipe(targetUrl);
                  }
                }}
                className="flex items-center gap-3 w-full px-4 py-3.5 text-sm font-semibold text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 active:scale-[0.98] rounded-xl text-left transition-all cursor-pointer outline-none border-none"
              >
                <RefreshCw className="w-4 h-4 text-amber-500 shrink-0" />
                <span>[DEV] Neu extrahieren</span>
              </button>
            )}

            {createdAt && (
              <div className="px-4 pt-2 pb-1.5 mt-1 text-[11px] font-medium text-gray-400 dark:text-gray-500 select-none">
                {t('catalog.savedOn', { date: new Date(createdAt).toLocaleDateString(language) })}
              </div>
            )}
          </div>
        </Popover.Content>
      </Popover>
    </>
  );
}
