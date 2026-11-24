import Link from "next/link";
import { exploreHref } from "../../lib/marketplace/query";
import { cn } from "../../lib/utils";
import type { EventQuery } from "../../types/marketplace";
import { PagerNextIcon, PagerPrevIcon } from "../ui/icons";

/** Same collapse rule as the table pager: 1 … current-1, current, current+1 … last. */
function pages(current: number, total: number): (number | "…")[] {
  const list: (number | "…")[] = [];
  for (let p = 1; p <= total; p++) {
    if (total <= 6 || p === 1 || p === total || Math.abs(p - current) <= 1) list.push(p);
    else if (list[list.length - 1] !== "…") list.push("…");
  }
  return list;
}

/** Link-based pager for Explore: crawlable, works without JavaScript, keeps every other filter. */
export function Pagination({ query, page, totalPages }: { query: EventQuery; page: number; totalPages: number }) {
  if (totalPages <= 1) return null;
  const cell = "flex h-9 min-w-9 items-center justify-center rounded-btn px-2 type-body-sm font-semibold";
  const link = (p: number) => exploreHref({ ...query, page: p });
  return (
    <nav aria-label="Pagination" className="mt-10 flex items-center justify-center gap-1">
      {page > 1 ? (
        <Link href={link(page - 1)} className={cn(cell, "text-text-soft hover:bg-surface-2")} aria-label="Previous page">
          <PagerPrevIcon className="size-4" />
        </Link>
      ) : (
        <span className={cn(cell, "text-text-faint opacity-50")} aria-hidden="true">
          <PagerPrevIcon className="size-4" />
        </span>
      )}
      {pages(page, totalPages).map((p, i) =>
        p === "…" ? (
          <span key={`gap-${i}`} className={cn(cell, "text-text-faint")} aria-hidden="true">
            …
          </span>
        ) : p === page ? (
          <span key={p} className={cn(cell, "bg-accent-fill text-white")} aria-current="page">
            {p}
          </span>
        ) : (
          <Link key={p} href={link(p)} className={cn(cell, "text-text-soft hover:bg-surface-2")} aria-label={`Page ${p}`}>
            {p}
          </Link>
        ),
      )}
      {page < totalPages ? (
        <Link href={link(page + 1)} className={cn(cell, "text-text-soft hover:bg-surface-2")} aria-label="Next page">
          <PagerNextIcon className="size-4" />
        </Link>
      ) : (
        <span className={cn(cell, "text-text-faint opacity-50")} aria-hidden="true">
          <PagerNextIcon className="size-4" />
        </span>
      )}
    </nav>
  );
}
