"use client";

import { useId, useState } from "react";
import type { KeyboardEvent, PointerEvent } from "react";
import { cn } from "../../lib/utils";
import { compact, niceTicks, useWidth } from "./chart-utils";

export interface BarSeries {
  id: string;
  /** Shown in the legend and the tooltip. */
  label: string;
  values: number[];
  /** `accent` is the series the reader is here for. `muted` is context, such as the previous period. */
  tone?: "accent" | "muted";
}

export interface BarChartProps {
  /** One label per group of bars. */
  labels: string[];
  /** One series gives plain columns; two give side-by-side pairs. */
  series: BarSeries[];
  /** With one series: colour only this column and grey the rest, when one period is the story. */
  highlightIndex?: number;
  /** How a value is written in the tooltip. Default: 12,400. */
  format?: (value: number) => string;
  height?: number;
  /** Describes the chart for screen readers, such as "Orders by weekday". */
  ariaLabel: string;
  className?: string;
}

const M = { top: 12, right: 12, bottom: 28, left: 44 };
const MAX_BAR = 24;
const GAP = 2;
const R = 4;

/** Column with a 4px rounded top and a square base, so it grows from one baseline. */
function column(x: number, y: number, w: number, h: number) {
  const r = Math.min(R, w / 2, h);
  return `M${x},${y + h} V${y + r} Q${x},${y} ${x + r},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${y + h} Z`;
}

/**
 * Columns for comparing amounts across categories or periods. Bars are at most 24px wide with rounded tops, hairline grid,
 * and one hue. Hover or arrow keys show every series for one group. A table of the same numbers is included for screen readers.
 */
export function BarChart({ labels, series, highlightIndex, format = (v) => v.toLocaleString("en-US"), height = 240, ariaLabel, className }: BarChartProps) {
  const [boxRef, width] = useWidth<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);
  const tableId = useId();

  const plotW = Math.max(width - M.left - M.right, 10);
  const plotH = height - M.top - M.bottom;
  const n = labels.length;
  const ticks = niceTicks(Math.max(...series.flatMap((s) => s.values), 1));
  const top = ticks[ticks.length - 1]!;
  const y = (v: number) => M.top + plotH - (v / top) * plotH;

  const slot = plotW / n;
  const barW = Math.max(Math.min(MAX_BAR, (slot * 0.7 - GAP * (series.length - 1)) / series.length), 2);
  const groupW = barW * series.length + GAP * (series.length - 1);
  const slotX = (i: number) => M.left + slot * i;
  const labelEvery = Math.max(1, Math.ceil(n / Math.max(Math.floor(plotW / 56), 1)));

  const indexAt = (clientX: number, el: Element) => Math.min(Math.max(Math.floor((clientX - el.getBoundingClientRect().left - M.left) / slot), 0), n - 1);
  const onMove = (e: PointerEvent<SVGRectElement>) => setActive(indexAt(e.clientX, e.currentTarget.ownerSVGElement!));
  const onKey = (e: KeyboardEvent<SVGSVGElement>) => {
    if (e.key === "ArrowRight") setActive((a) => Math.min((a ?? -1) + 1, n - 1));
    else if (e.key === "ArrowLeft") setActive((a) => Math.max((a ?? n) - 1, 0));
    else if (e.key === "Escape") setActive(null);
    else return;
    e.preventDefault();
  };

  const tipLeft = active === null ? 0 : Math.min(Math.max(slotX(active) + slot / 2, 90), Math.max(width - 90, 90));
  const fillFor = (s: BarSeries, i: number) =>
    s.tone === "muted" ? "fill-border-strong" : highlightIndex !== undefined && series.length === 1 && i !== highlightIndex ? "fill-border-strong" : "fill-accent";

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div ref={boxRef} className="relative w-full">
        {width > 0 && (
          <svg
            width={width}
            height={height}
            role="img"
            aria-label={ariaLabel}
            aria-describedby={tableId}
            tabIndex={0}
            onKeyDown={onKey}
            onFocus={() => setActive((a) => a ?? n - 1)}
            onBlur={() => setActive(null)}
            className="block overflow-visible rounded-sm outline-none focus-visible:shadow-focus"
          >
            {ticks.map((t) => (
              <g key={t}>
                <line x1={M.left} x2={width - M.right} y1={y(t)} y2={y(t)} className="stroke-border" strokeWidth={1} />
                <text x={M.left - 8} y={y(t)} textAnchor="end" dominantBaseline="middle" className="fill-text-faint text-[11px]">
                  {compact(t)}
                </text>
              </g>
            ))}

            {active !== null && <rect x={slotX(active)} y={M.top} width={slot} height={plotH} className="fill-surface-2" rx={R} />}

            {labels.map((l, g) => (
              <g key={l + g}>
                {series.map((s, k) => {
                  const v = s.values[g]!;
                  const h = Math.max(plotH - (y(v) - M.top), v > 0 ? 2 : 0);
                  return v > 0 ? (
                    <path key={s.id} d={column(slotX(g) + (slot - groupW) / 2 + k * (barW + GAP), M.top + plotH - h, barW, h)} className={fillFor(s, g)} />
                  ) : null;
                })}
                {g % labelEvery === 0 && (
                  <text x={slotX(g) + slot / 2} y={height - 8} textAnchor="middle" className="fill-text-faint text-[11px]">
                    {l}
                  </text>
                )}
              </g>
            ))}

            {/* Each group is a wide target: the pointer only has to be in its column of the chart. */}
            <rect x={M.left} y={M.top} width={plotW} height={plotH} fill="transparent" onPointerMove={onMove} onPointerLeave={() => setActive(null)} />
          </svg>
        )}

        {active !== null && (
          <div
            role="status"
            className="pointer-events-none absolute top-0 z-10 w-44 -translate-x-1/2 rounded-popover border border-border bg-surface px-3 py-2 shadow"
            style={{ left: tipLeft }}
          >
            <div className="type-body-sm mb-1 text-text-soft">{labels[active]}</div>
            {series.map((s) => (
              <div key={s.id} className="flex items-center justify-between gap-3 py-0.5">
                <span className="flex items-center gap-2">
                  <span className={cn("h-0.5 w-3 rounded-full", s.tone === "muted" ? "bg-border-strong" : "bg-accent")} />
                  <span className="type-body-sm text-text-soft">{s.label}</span>
                </span>
                <span className="type-body font-semibold text-text">{format(s.values[active]!)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {series.length > 1 && (
        <ul className="m-0 flex list-none flex-wrap gap-x-5 gap-y-1 p-0">
          {series.map((s) => (
            <li key={s.id} className="flex items-center gap-2">
              <span className={cn("size-2.5 rounded-sm", s.tone === "muted" ? "bg-border-strong" : "bg-accent")} />
              <span className="type-body-sm text-text-soft">{s.label}</span>
            </li>
          ))}
        </ul>
      )}

      <table id={tableId} className="sr-only">
        <caption>{ariaLabel}</caption>
        <thead>
          <tr>
            <th scope="col">Group</th>
            {series.map((s) => (
              <th key={s.id} scope="col">
                {s.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {labels.map((l, i) => (
            <tr key={l + i}>
              <th scope="row">{l}</th>
              {series.map((s) => (
                <td key={s.id}>{format(s.values[i]!)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
