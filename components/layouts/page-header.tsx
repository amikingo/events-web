"use client";

import type { ReactNode } from "react";

export interface PageHeaderProps {
  /** Primary page title (rendered as .type-h1) */
  title: ReactNode;
  /** Subtitle / descriptive summary line */
  description?: ReactNode;
  /** Action buttons, date pickers, or export triggers */
  actions?: ReactNode;
  /** Optional status pill or badge beside the title */
  badge?: ReactNode;
  className?: string;
}

/**
 * Standardized reusable page header for dashboard modules.
 * Renders title (.type-h1), description (.type-body-sm text-text-soft), and responsive action cluster.
 */
export function PageHeader({
  title,
  description,
  actions,
  badge,
  className = "",
}: PageHeaderProps) {
  return (
    <div
      className={`flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between ${className}`}
    >
      <div>
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="type-h1 text-text m-0">{title}</h1>
          {badge}
        </div>
        {description && (
          <p className="type-body-sm text-text-soft m-0 mt-1">{description}</p>
        )}
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      )}
    </div>
  );
}

