"use client";

import { useState } from "react";
import type { ReactNode } from "react";

export interface BreadcrumbItem {
  label: ReactNode;
  /** Omit on the last item (the current page). */
  href?: string;
  onClick?: () => void;
}

export interface BreadcrumbProps {
  items: BreadcrumbItem[];
  /** Longer paths collapse their middle into a "…" link: Home / … / Branches / Bole Branch. Click it to show the full path. Default 4. */
  maxItems?: number;
  /** Render links through your router: `(item, props) => <Link href={item.href} {...props}>{item.label}</Link>`. */
  renderLink?: (item: BreadcrumbItem, props: { className: string }) => ReactNode;
  className?: string;
}

const linkClass = "text-text-soft hover:text-accent";

/** `.breadcrumb` — 12px, parents as soft links, "/" separators, the current page in 600 text. */
export function Breadcrumb({ items, maxItems = 4, renderLink, className }: BreadcrumbProps) {
  const [expanded, setExpanded] = useState(false);
  const collapsed = !expanded && items.length > maxItems;
  const shown: (BreadcrumbItem | "…")[] = collapsed ? [items[0]!, "…", ...items.slice(-(maxItems - 2))] : items;

  return (
    <nav aria-label="Breadcrumb" className={className}>
      <ol className="m-0 flex list-none flex-wrap items-center gap-1.5 p-0 text-[12px] text-text-faint">
        {shown.map((item, i) => {
          const last = i === shown.length - 1;
          return (
            <li key={i} className="flex items-center gap-1.5">
              {item === "…" ? (
                <button type="button" aria-label="Show full path" onClick={() => setExpanded(true)} className={linkClass}>
                  …
                </button>
              ) : last ? (
                <span aria-current="page" className="font-semibold text-text">
                  {item.label}
                </span>
              ) : renderLink ? (
                renderLink(item, { className: linkClass })
              ) : item.href ? (
                <a href={item.href} onClick={item.onClick} className={linkClass}>
                  {item.label}
                </a>
              ) : (
                <button type="button" onClick={item.onClick} className={linkClass}>
                  {item.label}
                </button>
              )}
              {!last && (
                <span aria-hidden="true" className="text-text-faint">
                  /
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
