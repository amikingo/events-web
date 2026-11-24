"use client";

import { useState } from "react";
import { cn } from "../../lib/utils";

export interface HeatmapProps {
  /** One label per row, such as days. */
  rows: string[];
  /** One label per column, such as hours. */
  columns: string[];
  /** values[row][column]. */
  values: number[][];
  /** How a value is written in the tooltip, with its unit. Default: 12,400. */
  format?: (value: number) => string;
  /** Describes the chart for screen readers, such as "Orders by day and hour". */
  ariaLabel: string;
  className?: string;
}

/**
 * A grid where the darker the cell, the higher the value: one hue, light to dark. Use it to find busy and quiet times.
 * Every cell has its own hover and keyboard tooltip.
 */
export function Heatmap({ rows, columns, values, format = (v) => v.toLocaleString("en-US"), ariaLabel, className }: HeatmapProps) {
  const [active, setActive] = useState<{ r: number; c: number } | null>(null);
  const max = Math.max(...values.flat(), 1);

  // 10% to 100% of the accent mixed into the surface, so dark mode follows the tokens.
  const tint = (v: number) => `color-mix(in srgb, var(--color-accent) ${Math.round(8 + (v / max) * 92)}%, var(--color-surface))`;

  return (
    <div className={cn("relative flex flex-col gap-2", className)}>
      <div role="grid" aria-label={ariaLabel} className="grid gap-0.5" style={{ gridTemplateColumns: `auto repeat(${columns.length}, minmax(0, 1fr))` }}>
        <span />
        {columns.map((c) => (
          <span key={c} role="columnheader" className="type-body-sm truncate text-center text-text-faint">
            {c}
          </span>
        ))}
        {rows.map((row, r) => (
          <div key={row} role="row" className="contents">
            <span role="rowheader" className="type-body-sm flex items-center pr-2 text-text-faint">
              {row}
            </span>
            {columns.map((col, c) => {
              const v = values[r]?.[c] ?? 0;
              const on = active?.r === r && active.c === c;
              return (
                <div
                  key={col}
                  role="gridcell"
                  tabIndex={0}
                  aria-label={`${row}, ${col}: ${format(v)}`}
                  onPointerEnter={() => setActive({ r, c })}
                  onPointerLeave={() => setActive(null)}
                  onFocus={() => setActive({ r, c })}
                  onBlur={() => setActive(null)}
                  className={cn("relative h-7 rounded-bar outline-none focus-visible:shadow-focus", on && "ring-2 ring-text-soft")}
                  style={{ background: tint(v) }}
                >
                  {on && (
                    <div
                      role="status"
                      className={cn(
                        "pointer-events-none absolute bottom-full z-10 mb-2 whitespace-nowrap rounded-popover border border-border bg-surface px-3 py-2 shadow",
                        c > columns.length / 2 ? "right-0" : "left-0",
                      )}
                    >
                      <div className="type-body font-semibold text-text">{format(v)}</div>
                      <div className="type-body-sm text-text-soft">
                        {row}, {col}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2" aria-hidden="true">
        <span className="type-body-sm text-text-faint">Fewer</span>
        {[0, 0.25, 0.5, 0.75, 1].map((s) => (
          <span key={s} className="h-2.5 w-6 rounded-bar" style={{ background: tint(s * max) }} />
        ))}
        <span className="type-body-sm text-text-faint">More</span>
      </div>
    </div>
  );
}
