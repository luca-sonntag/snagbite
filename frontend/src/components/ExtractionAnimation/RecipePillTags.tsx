import { Clock, Users, Tag, Sparkles } from 'lucide-react';
import { useI18n } from '../../context/I18nContext';
import type { RecipePreviewData } from '../../types';

interface RecipePillTagsProps {
  preview: RecipePreviewData | null;
  compact?: boolean;
}

export default function RecipePillTags({ preview, compact = false }: RecipePillTagsProps) {
  const { t } = useI18n();

  const hasAnyMeta = !!(
    preview?.totalTimeMinutes ||
    preview?.servings ||
    preview?.category ||
    preview?.stepCount
  );

  if (!hasAnyMeta) {
    return (
      <div className="flex items-center gap-2 py-1 flex-wrap">
        <div className="w-20 h-6 rounded-full bg-gray-100 dark:bg-gray-800 animate-pulse" />
        <div className="w-24 h-6 rounded-full bg-gray-100 dark:bg-gray-800 animate-pulse" />
        <div className="w-18 h-6 rounded-full bg-gray-100 dark:bg-gray-800 animate-pulse" />
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
      text: preview.category,
    });
  }

  if (preview?.stepCount && (!compact || pills.length < 3)) {
    pills.push({
      key: 'steps',
      icon: <Sparkles className="w-3.5 h-3.5" />,
      text: t('job.preview.stepsFound', { count: preview.stepCount }),
    });
  }

  return (
    <div className="flex items-center gap-2 py-1 flex-wrap">
      {pills.map((pill, idx) => (
        <span
          key={pill.key}
          style={{ animationDelay: `${idx * 80}ms` }}
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 animate-scale-pop shadow-xs"
        >
          {pill.icon}
          <span>{pill.text}</span>
        </span>
      ))}
    </div>
  );
}
