"use client";

import { useState } from "react";
import { cn } from "../../lib/utils";
import { PART_FILLS } from "./chart-utils";

export interface PiePart {
  id: string;
  label: string;
  value: number;
}

export interface PieChartProps {
  /** Up to six parts. Fold a long tail into one "Other" part. */
  parts: PiePart[];
  /** How an amount is written. Default: 12,400. */
  format?: (value: number) => string;
  /** Leave a hole in the middle that shows the total, or the part you hover. Default true. */
  donut?: boolean;
  /** Small text above the total in the middle, such as "Total". */
  totalLabel?: string;
  size?: number;
  /** `row` puts the legend beside the chart on wide screens (default). `stacked` always puts it underneath, for a narrow card. */
  layout?: "row" | "stacked";
  /** Describes the chart for screen readers, such as "Tickets by status". */
  ariaLabel: string;
  className?: string;
}

const TAU = Math.PI * 2;

function arc(cx: number, cy: number, r0: number, r1: number, a0: number, a1: number) {
  const p = (r: number, a: number) => `${(cx + r * Math.sin(a)).toFixed(2)},${(cy - r * Math.cos(a)).toFixed(2)}`;
  const large = a1 - a0 > Math.PI ? 1 : 0;
  return r0 > 0
    ? `M${p(r1, a0)} A${r1},${r1} 0 ${large} 1 ${p(r1, a1)} L${p(r0, a1)} A${r0},${r0} 0 ${large} 0 ${p(r0, a0)} Z`
    : `M${cx},${cy} L${p(r1, a0)} A${r1},${r1} 0 ${large} 1 ${p(r1, a1)} Z`;
}

/**
 * A pie or donut for one whole split into a few parts. One hue, light to dark, with 2px surface gaps between slices.
 * The legend carries the name, amount and share of every part, so the reader never has to match colours alone.
 * For comparing close values or more than six parts, use RankedBars instead.
 */
export function PieChart({ parts, format = (v) => v.toLocaleString("en-US"), donut = true, totalLabel = "Total", size = 184, layout = "row", ariaLabel, className }: PieChartProps) {
  const [active, setActive] = useState<string | null>(null);
  const total = parts.reduce((s, p) => s + p.value, 0) || 1;
  const r = size / 2 - 2;
  const hole = donut ? r * 0.62 : 0;
  const cx = size / 2;

  const slices = parts.map((p, i) => {
    const before = parts.slice(0, i).reduce((sum, x) => sum + x.value, 0);
    return { part: p, index: i, a0: (before / total) * TAU, a1: ((before + p.value) / total) * TAU };
  });
  const shown = parts.find((p) => p.id === active);

  return (
    <div className={cn("flex flex-col items-center gap-5", layout === "row" && "sm:flex-row sm:items-center sm:gap-8", className)}>
      <div className="relative flex-none" style={{ width: size, height: size }}>
        <svg width={size} height={size} role="img" aria-label={ariaLabel} className="block">
          {slices
            .filter((s) => s.part.value > 0)
            .map((s) => {
              const full = s.a1 - s.a0 >= TAU - 0.0001;
              const fill = PART_FILLS[Math.min(s.index, PART_FILLS.length - 1)]!.bg;
              const dim = active !== null && active !== s.part.id;
              return full ? (
                <circle key={s.part.id} cx={cx} cy={cx} r={r} fill={fill} />
              ) : (
                <path
                  key={s.part.id}
                  d={arc(cx, cx, hole, r, s.a0, s.a1)}
                  tabIndex={0}
                  aria-label={`${s.part.label}: ${format(s.part.value)}, ${Math.round((s.part.value / total) * 100)}%`}
                  onPointerEnter={() => setActive(s.part.id)}
                  onPointerLeave={() => setActive(null)}
                  onFocus={() => setActive(s.part.id)}
                  onBlur={() => setActive(null)}
                  className="stroke-surface outline-none transition-opacity focus-visible:stroke-text-soft"
                  strokeWidth={2}
                  strokeLinejoin="round"
                  style={{ fill, opacity: dim ? 0.45 : 1 }}
                />
              );
            })}
        </svg>
        {donut && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center" style={{ padding: size * 0.2 }} role="status">
            <span className="type-body-sm text-text-soft">{shown ? shown.label : totalLabel}</span>
            <span className="type-h3 text-text">{format(shown ? shown.value : total)}</span>
            {shown && <span className="type-body-sm text-text-faint">{Math.round((shown.value / total) * 100)}%</span>}
          </div>
        )}
      </div>

      <ul className="m-0 flex w-full min-w-0 list-none flex-col p-0">
        {parts.map((p, i) => (
          <li
            key={p.id}
            onPointerEnter={() => setActive(p.id)}
            onPointerLeave={() => setActive(null)}
            className={cn("flex items-center gap-3 rounded-btn px-2 py-1.5", active === p.id && "bg-surface-2")}
          >
            <span className="size-2.5 flex-none rounded-sm" style={{ background: PART_FILLS[Math.min(i, PART_FILLS.length - 1)]!.bg }} />
            <span className="type-body min-w-0 flex-1 truncate text-text-soft">{p.label}</span>
            <span className="type-body flex-none font-semibold text-text">{format(p.value)}</span>
            <span className="type-body-sm w-10 flex-none text-right text-text-faint">{Math.round((p.value / total) * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
