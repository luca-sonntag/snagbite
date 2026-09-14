import CollectionStoryBubble from '../../SavedCatalog/CollectionStoryBubble';
import { useI18n } from '../../../context/I18nContext';

export default function CollectionsPreview() {
  const { language } = useI18n();
  const isEn = language.startsWith('en');

  return (
    <div className="w-full bg-white dark:bg-gray-900 rounded-3xl p-3.5 sm:p-4 border-none shadow-[0_2px_6px_rgba(0,0,0,0.03)] flex items-center justify-around gap-2 select-none">
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
