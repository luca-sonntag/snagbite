import { Clock, Users, Tag, ListChecks } from 'lucide-react';
import { useI18n } from '../../context/I18nContext';
import { getRecipeCategoryLabel } from '../../i18n';
import type { RecipePreviewData } from '../../types';

interface RecipePillTagsProps {
  preview: RecipePreviewData | null;
  compact?: boolean;
}

export default function RecipePillTags({ preview, compact: _compact = false }: RecipePillTagsProps) {
  const { t, language } = useI18n();

  const hasAnyMeta = !!(
    preview?.totalTimeMinutes ||
    preview?.servings ||
    preview?.category ||
    preview?.stepCount
  );

  if (!hasAnyMeta) {
    return (
      <div className="flex flex-wrap items-center content-center gap-1.5 min-h-[54px] max-h-[56px] overflow-hidden">
        <div className="w-20 h-6 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse shrink-0" />
        <div className="w-24 h-6 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse shrink-0" />
        <div className="w-24 h-6 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse shrink-0" />
        <div className="w-20 h-6 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse shrink-0" />
      </div>
    );
  }

  const pills: Array<{ icon: React.ReactNode; text: string; key: string }> = [];

  if (preview?.totalTimeMinutes) {
    pills.push({
      key: 'time',
      icon: <Clock className="w-3.5 h-3.5" />,
      text: `${preview.totalTimeMinutes} ${t('job.preview.timeSuffix')}`,
    });
  }

  if (preview?.servings) {
    const unit = preview.servings === 1 ? t('job.preview.servingsSingle') : t('job.preview.servingsSuffix');
    pills.push({
      key: 'servings',
      icon: <Users className="w-3.5 h-3.5" />,
      text: `${preview.servings} ${unit}`,
    });
  }

  if (preview?.category) {
    pills.push({
      key: 'category',
      icon: <Tag className="w-3.5 h-3.5" />,
      text: getRecipeCategoryLabel(preview.category, language),
    });
  }

  if (preview?.stepCount) {
    pills.push({
      key: 'steps',
      icon: <ListChecks className="w-3.5 h-3.5" />,
      text: t('job.preview.stepsFound', { count: preview.stepCount }),
    });
  }

  return (
    <div className="flex flex-wrap items-center content-center gap-1.5 min-h-[54px] max-h-[56px] overflow-hidden select-none">
      {pills.map((pill, idx) => (
        <span
          key={pill.key}
          style={{ animationDelay: `${idx * 80}ms` }}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 animate-scale-pop shrink-0 whitespace-nowrap"
        >
          <span className="text-gray-400 dark:text-gray-500">{pill.icon}</span>
          <span>{pill.text}</span>
        </span>
      ))}
    </div>
  );
}
