"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Card } from "./card";
import { Checkbox } from "./checkbox";
import { LoadMore } from "./load-more";
import { cn } from "../../lib/utils";
import { ChevIcon } from "./icons";
import type { TableExpandable } from "./table-expand";

/** How a column appears when a table stacks into cards on a phone. */
export type StackRole = "title" | "badge" | "hidden";

export interface StackColumn<T> {
  key: string;
  header: ReactNode;
  mobile?: StackRole;
  primary?: boolean;
  accessor?: (row: T) => ReactNode;
  render?: (row: T) => ReactNode;
}

export interface StackRowsProps<T> {
  rows: T[];
  columns: StackColumn<T>[];
  getRowId: (row: T) => string | number;
  selectable?: boolean;
  isSelected: (id: string | number) => boolean;
  onToggle: (row: T, checked: boolean) => void;
  /** The row's view button / "⋯" menu, rendered in the card's top row. */
  renderActions?: (row: T) => ReactNode;
  /** More rows exist beyond `rows` — shows the "Loading more…" line and calls `onEndReached` when it scrolls into view. */
  /** Rows that open into nested data get a "Line items" toggle at the bottom of their card. */
  expandable?: TableExpandable<T>;
  /** A tap on a card (not on a control inside it). */
  onRowClick?: (row: T, e: { ctrlKey: boolean; metaKey: boolean }) => void;
  activeRowId?: string | number;
  highlightIds?: Set<string | number>;
  hasMore: boolean;
  /** The next page is being fetched: the "Loading more…" line shows only then; otherwise an invisible marker waits for the end of the list. */
  loadingMore?: boolean;
  onEndReached: () => void;
}

/**
 * `.stack-rows` — the guideline's phone layout: each row becomes a compact card with its title and status on top and
 * key–value lines below; more rows load as you scroll (infinite scroll, not numbered pages).
 */
export function StackRows<T>({ rows, columns, getRowId, selectable, isSelected, onToggle, renderActions, expandable, onRowClick, activeRowId, highlightIds, hasMore, loadingMore = false, onEndReached }: StackRowsProps<T>) {
  const [openId, setOpenId] = useState<string | number | null>(null);
  const title = columns.find((c) => c.mobile === "title") ?? columns.find((c) => c.primary) ?? columns[0];
  const badge = columns.find((c) => c.mobile === "badge");
  const kv = columns.filter((c) => c !== title && c !== badge && c.mobile !== "hidden");
  const cell = (c: StackColumn<T> | undefined, row: T) => (c ? (c.render ? c.render(row) : c.accessor?.(row)) : null);

  const sentinel = useRef<HTMLDivElement>(null);
  const endRef = useRef(onEndReached);
  endRef.current = onEndReached;
  useEffect(() => {
    const el = sentinel.current;
    // Not while a page is already coming; when it lands the marker is observed again, so a short list keeps filling.
    if (!el || !hasMore || loadingMore) return;
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) endRef.current();
    });
    io.observe(el);
    return () => io.disconnect();
  }, [hasMore, loadingMore, rows.length]);

  return (
    <div>
      <div className="flex flex-col gap-2 p-2.5">
        {rows.map((row) => {
          const id = getRowId(row);
          const checked = isSelected(id);
          return (
            <Card
              key={id}
              compact
              selected={checked || activeRowId === id}
              hoverable={!!onRowClick}
              tabIndex={onRowClick ? 0 : undefined}
              onClick={onRowClick ? (e) => !(e.target as HTMLElement).closest("button, a, input, [role=menu]") && onRowClick(row, e) : undefined}
              onKeyDown={onRowClick ? (e) => e.target === e.currentTarget && (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onRowClick(row, e)) : undefined}
              className={cn("flex flex-col gap-1.5", highlightIds?.has(id) && "animate-flash-new")}
            >
              <div className="flex flex-wrap items-center justify-between gap-x-2.5 gap-y-1.5">
                <div className="flex min-w-24 flex-1 items-center gap-2.5">
                  {selectable && <Checkbox aria-label={`Select row ${id}`} checked={checked} onCheckedChange={(next) => onToggle(row, next)} />}
                  <b className="min-w-0 text-[13px] font-semibold text-text">{cell(title, row)}</b>
                </div>
                <div className="ml-auto flex flex-none items-center gap-2">
                  {badge && cell(badge, row)}
                  {renderActions?.(row)}
                </div>
              </div>
              {kv.map((c) => (
                <div key={c.key} className="flex justify-between gap-3 text-[12px] text-text-faint">
                  <span>{c.header}</span>
                  <b className="font-medium tabular-nums text-text">{cell(c, row)}</b>
                </div>
              ))}
              {expandable && (
                <>
                  <button
                    type="button"
                    aria-expanded={openId === id}
                    onClick={() => setOpenId(openId === id ? null : id)}
                    className="mt-0.5 flex items-center justify-between border-t border-border pt-2 text-[12px] font-semibold text-accent"
                  >
                    {expandable.label ?? "Line items"}
                    <ChevIcon className={cn("size-3.5 transition-transform", openId === id && "rotate-180")} />
                  </button>
                  {openId === id && (
                    <div className="flex flex-col gap-1.5 rounded-sm bg-surface-2 p-2.5">
                      {expandable.rows(row).map((r, i) => (
                        <div key={i} className="flex justify-between gap-3 text-[12px] text-text-soft">
                          <span className="min-w-0">
                            <b className="font-medium text-text">{r[expandable.columns[0]!.key]}</b>
                            {expandable.columns.slice(1, -1).map((c) => (
                              <span key={c.key}> · {r[c.key]}</span>
                            ))}
                          </span>
                          <b className="font-medium tabular-nums text-text">{r[expandable.columns[expandable.columns.length - 1]!.key]}</b>
                        </div>
                      ))}
                      {expandable.totals?.(row).map((t, i) => (
                        <div key={i} className="flex justify-between gap-3 border-t border-border pt-1.5 text-[12px] text-text-soft first:border-t-0">
                          <span>{t.label}</span>
                          <b className="font-semibold tabular-nums text-text">{t.value}</b>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </Card>
          );
        })}
      </div>
      {hasMore && (loadingMore ? <LoadMore ref={sentinel} /> : <div ref={sentinel} aria-hidden="true" className="h-12" />)}
    </div>
  );
}
