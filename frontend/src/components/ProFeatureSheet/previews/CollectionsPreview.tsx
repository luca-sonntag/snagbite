import CollectionStoryBubble from '../../SavedCatalog/CollectionStoryBubble';
import { useI18n } from '../../../context/I18nContext';

export default function CollectionsPreview() {
  const { language } = useI18n();
  const isEn = language.startsWith('en');

  return (
    <div className="w-full bg-gray-50/75 dark:bg-gray-800/35 rounded-3xl p-3.5 sm:p-4 border border-black/[0.04] dark:border-white/[0.06] shadow-xs flex items-center justify-around gap-2 select-none">
      <CollectionStoryBubble
        title="Meal Prep"
        count={8}
        onClick={() => {}}
      />
      <CollectionStoryBubble
        title="High Protein"
        count={14}
        onClick={() => {}}
      />
      <CollectionStoryBubble
        title={isEn ? 'Favorites' : 'Schnelle Küche'}
        count={6}
        onClick={() => {}}
      />
      <CollectionStoryBubble
        title={isEn ? 'New folder' : 'Neu'}
        isAddButton={true}
        onClick={() => {}}
      />
    </div>
  );
}
