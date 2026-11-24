"use client";

import { useId, useState } from "react";
import type { KeyboardEvent, PointerEvent } from "react";
import { cn } from "../../lib/utils";
import { compact, niceTicks, useWidth } from "./chart-utils";

export interface LineSeries {
  id: string;
  /** Shown in the legend and the tooltip. */
  label: string;
  values: number[];
  /** `accent` is the series the reader is here for. `muted` is context, such as the previous period. */
  tone?: "accent" | "muted";
}

export interface LineChartProps {
  /** One label per point, oldest first. */
  labels: string[];
  series: LineSeries[];
  /** How a value is written in the tooltip. Default: 12,400. */
  format?: (value: number) => string;
  height?: number;
  /** Describes the chart for screen readers, such as "Revenue by month". */
  ariaLabel: string;
  className?: string;
}

const M = { top: 12, right: 20, bottom: 28, left: 44 };

/**
 * A line chart for change over time. The first `accent` series is the story (drawn last, with a soft area wash and an end dot);
 * `muted` series are context. Marks follow the guideline: 2px lines, 8px end dots with a surface ring, hairline grid.
 * Hover or arrow keys read every series at one point. A table of the same numbers is included for screen readers.
 */
export function LineChart({ labels, series, format = (v) => v.toLocaleString("en-US"), height = 240, ariaLabel, className }: LineChartProps) {
  const [boxRef, width] = useWidth<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);
  const tableId = useId();

  const plotW = Math.max(width - M.left - M.right, 10);
  const plotH = height - M.top - M.bottom;
  const max = Math.max(...series.flatMap((s) => s.values), 1);
  const ticks = niceTicks(max);
  const top = ticks[ticks.length - 1]!;
  const n = labels.length;

  const x = (i: number) => M.left + (n === 1 ? plotW / 2 : (i / (n - 1)) * plotW);
  const y = (v: number) => M.top + plotH - (v / top) * plotH;
  const path = (values: number[]) => values.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");

  // Muted series first so the accent line sits on top.
  const ordered = [...series].sort((a, b) => Number(a.tone === "accent") - Number(b.tone === "accent"));
  const story = series.find((s) => s.tone === "accent") ?? series[0]!;
  const labelEvery = Math.max(1, Math.ceil(n / Math.max(Math.floor(plotW / 64), 1)));

  function indexAt(clientX: number, el: Element) {
    const px = clientX - el.getBoundingClientRect().left;
    const i = Math.round(((px - M.left) / plotW) * (n - 1));
    return Math.min(Math.max(i, 0), n - 1);
  }
  const onMove = (e: PointerEvent<SVGRectElement>) => setActive(indexAt(e.clientX, e.currentTarget.ownerSVGElement!));
  const onKey = (e: KeyboardEvent<SVGSVGElement>) => {
    if (e.key === "ArrowRight") setActive((a) => Math.min((a ?? -1) + 1, n - 1));
    else if (e.key === "ArrowLeft") setActive((a) => Math.max((a ?? n) - 1, 0));
    else if (e.key === "Escape") setActive(null);
    else return;
    e.preventDefault();
  };

  const tipLeft = active === null ? 0 : Math.min(Math.max(x(active), 90), Math.max(width - 90, 90));

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
            {labels.map((l, i) =>
              i % labelEvery === 0 ? (
                <text key={l + i} x={x(i)} y={height - 8} textAnchor="middle" className="fill-text-faint text-[11px]">
                  {l}
                </text>
              ) : null,
            )}

            {/* Soft wash under the story line only. */}
            <path d={`${path(story.values)} L${x(n - 1)},${y(0)} L${x(0)},${y(0)} Z`} className="fill-accent" fillOpacity={0.1} />

            {ordered.map((s) => (
              <path
                key={s.id}
                d={path(s.values)}
                fill="none"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                className={s.tone === "muted" ? "stroke-border-strong" : "stroke-accent"}
              />
            ))}

            {/* End dot on the story, with a surface ring so it reads over the line. */}
            <circle cx={x(n - 1)} cy={y(story.values[n - 1]!)} r={4} className="fill-accent stroke-surface" strokeWidth={2} />

            {active !== null && (
              <g pointerEvents="none">
                <line x1={x(active)} x2={x(active)} y1={M.top} y2={M.top + plotH} className="stroke-border-strong" strokeWidth={1} />
                {ordered.map((s) => (
                  <circle key={s.id} cx={x(active)} cy={y(s.values[active]!)} r={4} strokeWidth={2} className={cn("stroke-surface", s.tone === "muted" ? "fill-border-strong" : "fill-accent")} />
                ))}
              </g>
            )}

            {/* Wide invisible target: the pointer only has to be near a date, not on the line. */}
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
              <span className={cn("h-0.5 w-4 rounded-full", s.tone === "muted" ? "bg-border-strong" : "bg-accent")} />
              <span className="type-body-sm text-text-soft">{s.label}</span>
            </li>
          ))}
        </ul>
      )}

      <table id={tableId} className="sr-only">
        <caption>{ariaLabel}</caption>
        <thead>
          <tr>
            <th scope="col">Point</th>
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
