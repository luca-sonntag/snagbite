import { Info } from 'lucide-react';
import { useI18n } from '../../context/I18nContext';

interface IncompleteSourceCardProps {
  className?: string;
}

/**
 * Clean flat informational callout displayed when the recipe was reconstructed
 * because the source post lacked complete recipe specifications.
 */
export default function IncompleteSourceCard({ className = '' }: IncompleteSourceCardProps) {
  const { t } = useI18n();

  return (
    <div
      role="note"
      className={`flex items-start gap-2.5 px-3.5 py-3 rounded-2xl bg-amber-500/10 dark:bg-amber-500/15 text-amber-900 dark:text-amber-100 border-none select-none ${className}`}
    >
      <Info
        className="w-4 h-4 flex-shrink-0 text-amber-600 dark:text-amber-400 mt-0.5"
        aria-hidden="true"
      />
      <p className="text-xs leading-relaxed text-amber-800 dark:text-amber-200/90 font-medium break-words m-0">
        {t('recipe.incompleteSourceNotice')}
      </p>
    </div>
  );
}
