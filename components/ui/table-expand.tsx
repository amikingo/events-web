"use client";

import type { ReactNode } from "react";
import { cn } from "../../lib/utils";
import { ChevRightIcon } from "./icons";

export interface ExpandColumn {
  key: string;
  header: ReactNode;
  numeric?: boolean;
  primary?: boolean;
}

/** What a row opens into: its own nested data (line items), never the row's own fields — those belong to the detail view. */
export interface TableExpandable<T> {
  /** Columns of the nested table. */
  columns: ExpandColumn[];
  /** The nested rows for a record; each is a map of column key → cell content. */
  rows: (row: T) => Record<string, ReactNode>[];
  /** Summary figures under the nested table ("Subtotal 4,200 · VAT 630 · Total 4,830"). */
  totals?: (row: T) => { label: ReactNode; value: ReactNode }[];
  /** Accessible name of the toggle. Default "Toggle line items". */
  label?: string;
}

/** `.expand-btn` — 28px chevron toggle; the chevron turns 90° and the border goes accent while open. */
export function ExpandButton({ expanded, label, onToggle }: { expanded: boolean; label: string; onToggle: () => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-expanded={expanded}
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      className={cn(
        "inline-flex size-7 cursor-pointer items-center justify-center rounded-btn border bg-surface align-middle hover:bg-surface-2",
        expanded ? "border-accent text-accent" : "border-border text-text-soft",
      )}
    >
      <ChevRightIcon className={cn("size-[13px] transition-transform duration-(--motion-base)", expanded && "rotate-90")} />
    </button>
  );
}

/** `.tbl-detail` — the grey band under an open row holding a small white table and its totals. */
export function ExpandedRow<T>({ row, expandable, colSpan }: { row: T; expandable: TableExpandable<T>; colSpan: number }) {
  const totals = expandable.totals?.(row);
  return (
    <tr>
      <td colSpan={colSpan} className="border-b border-border bg-surface-2 pb-4 pl-14 pr-4 pt-3.5">
        <div className="overflow-hidden rounded-sm border border-border bg-surface">
          <table className="w-full border-separate border-spacing-0">
            <thead>
              <tr>
                {expandable.columns.map((c) => (
                  <th key={c.key} className={cn("border-b border-border bg-surface px-3 py-2 text-[11px] font-bold uppercase tracking-[.5px] text-text-faint", c.numeric ? "text-right" : "text-left")}>
                    {c.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {expandable.rows(row).map((r, i, all) => (
                <tr key={i}>
                  {expandable.columns.map((c) => (
                    <td key={c.key} className={cn("px-3 py-2 text-[12.5px]", i < all.length - 1 && "border-b border-border", c.primary ? "font-medium text-text" : "text-text-soft", c.numeric && "text-right tabular-nums")}>
                      {r[c.key]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {totals && totals.length > 0 && (
            <div className="flex justify-end gap-6 border-t border-border px-3 py-2.5 text-[12.5px] text-text-soft">
              {totals.map((t, i) => (
                <span key={i}>
                  {t.label} <b className="font-semibold tabular-nums text-text">{t.value}</b>
                </span>
              ))}
            </div>
          )}
        </div>
      </td>
    </tr>
  );
}
