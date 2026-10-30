import { Star, Clock, Folder, Tag } from 'lucide-react';
import type { Collection, RecipeCategory } from '../../types';
import type { CatalogFilterState } from '../../hooks/useSavedCatalog';
import { getRecipeCategoryLabel, getRecipeCategoryEmoji } from '../../i18n';
import { useI18n } from '../../context/I18nContext';
import { hapticLight } from '../../utils/haptics';
import ActiveChip from './ActiveChip';

interface ActiveChipsRowProps {
  filters: CatalogFilterState;
  collections: Collection[];
  partnerName: string;
  avatarUrl?: string | null;
  onRemoveFavorites: () => void;
  onRemovePartner: () => void;
  onRemoveTime: () => void;
  onRemoveCategory: (cat: RecipeCategory) => void;
  onRemoveCollection: (id: string) => void;
  onRemoveFlag: (flag: string) => void;
  onResetAll: () => void;
}

export default function ActiveChipsRow({
  filters,
  collections,
  partnerName,
  avatarUrl,
  onRemoveFavorites,
  onRemovePartner,
  onRemoveTime,
  onRemoveCategory,
  onRemoveCollection,
  onRemoveFlag,
  onResetAll,
}: ActiveChipsRowProps) {
  const { t, language } = useI18n();

  const collectionName = (id: string) =>
    collections.find((c) => c.id === id)?.name ?? id;

  return (
    <div className="flex gap-2 overflow-x-auto scrollbar-none -mx-4 px-4 md:-mx-6 md:px-6 scroll-smooth">
      {filters.favoritesOnly && (
        <ActiveChip
          onRemove={onRemoveFavorites}
          icon={<Star className="w-3.5 h-3.5 fill-current" />}
          label={t('catalog.favoritesFilter')}
        />
      )}

      {filters.partnerOnly && (
        <ActiveChip
          onRemove={onRemovePartner}
          icon={
            <div className="w-4 h-4 rounded-full overflow-hidden bg-white/20 flex items-center justify-center shrink-0">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={partnerName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-[9px] font-bold text-white">
                  {partnerName.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
          }
          label={partnerName}
        />
      )}

      {filters.maxTime > 0 && (
        <ActiveChip
          onRemove={onRemoveTime}
          icon={<Clock className="w-3.5 h-3.5" />}
          label={t('catalog.timeUnder', { count: filters.maxTime })}
        />
      )}

      {filters.categories?.map((cat) => (
        <ActiveChip
          key={cat}
          onRemove={() => onRemoveCategory(cat)}
          icon={
            <span className="text-base leading-none">
              {getRecipeCategoryEmoji(cat)}
            </span>
          }
          label={getRecipeCategoryLabel(cat, language)}
        />
      ))}

      {filters.collectionIds.map((id) => (
        <ActiveChip
          key={id}
          onRemove={() => onRemoveCollection(id)}
          icon={<Folder className="w-3.5 h-3.5" />}
          label={collectionName(id)}
        />
      ))}

      {filters.flags.map((flag) => (
        <ActiveChip
          key={flag}
          onRemove={() => onRemoveFlag(flag)}
          icon={<Tag className="w-3.5 h-3.5" />}
          label={flag}
          accent="amber"
        />
      ))}

      <button
        type="button"
        onClick={() => {
          hapticLight();
          onResetAll();
        }}
        className="min-h-[44px] px-3.5 py-2 text-xs font-semibold rounded-2xl border-none bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 whitespace-nowrap shrink-0 active:scale-95 transition-all duration-200 ease-out cursor-pointer select-none"
      >
        {t('catalog.resetFilters')}
      </button>
    </div>
  );
}
