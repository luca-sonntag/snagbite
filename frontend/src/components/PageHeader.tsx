import React from 'react';

export interface PageHeaderProps {
  /** Main title of the page */
  title: React.ReactNode;
  /** Subtitle or description under the title */
  subtitle?: React.ReactNode;
  /** Optional action slot on the right (e.g. buttons, menu, status) */
  action?: React.ReactNode;
  /** Extra container classes */
  className?: string;
}

/**
 * Standardized Page Header for top-level views.
 * Features a bold title, descriptive subtitle, and optional right-aligned action slot.
 */
export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  action,
  className = '',
}) => {
  return (
    <div className={`w-full flex items-center justify-between ${className}`}>
      <div className="min-w-0 flex-1">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-950 dark:text-white tracking-tight truncate">
          {title}
        </h1>
        {subtitle && (
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1 truncate">
            {subtitle}
          </p>
        )}
      </div>
      {action && <div className="shrink-0 ml-3 flex items-center gap-2">{action}</div>}
    </div>
  );
};

export default PageHeader;
