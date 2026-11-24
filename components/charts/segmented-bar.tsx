"use client";

import { useState } from "react";
import { cn } from "../../lib/utils";
import { PART_FILLS as FILLS, useWidth } from "./chart-utils";

export interface SegmentPart {
  id: string;
  label: string;
  value: number;
}

export interface SegmentedBarProps {
  /** Up to six parts. Fold a long tail into one "Other" part. */
  parts: SegmentPart[];
  /** How an amount is written in the tooltip. Default: 12,400. */
  format?: (value: number) => string;
  /** Describes the chart for screen readers, such as "Payments by method". */
  ariaLabel: string;
  className?: string;
}

const MIN_LABEL_PX = 56;

/**
 * One whole split into parts: a 28px bar with a legend of names. Each block prints its share when the text fits, and says
 * nothing when it does not (hover, focus or the legend still give the numbers).
 */
export function SegmentedBar({ parts, format = (v) => v.toLocaleString("en-US"), ariaLabel, className }: SegmentedBarProps) {
  const [boxRef, width] = useWidth<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);
  const total = parts.reduce((s, p) => s + p.value, 0) || 1;
  const visible = parts.filter((p) => p.value > 0);

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div ref={boxRef} className="relative">
        <div role="img" aria-label={ariaLabel} className="flex h-7 w-full gap-0.5">
          {visible.map((p, i) => {
            const share = p.value / total;
            const fill = FILLS[Math.min(parts.indexOf(p), FILLS.length - 1)]!;
            const fits = share * width >= MIN_LABEL_PX;
            return (
              <div
                key={p.id}
                tabIndex={0}
                aria-label={`${p.label}: ${format(p.value)}, ${Math.round(share * 100)}%`}
                onPointerEnter={() => setActive(i)}
                onPointerLeave={() => setActive(null)}
                onFocus={() => setActive(i)}
                onBlur={() => setActive(null)}
                className={cn("flex items-center overflow-hidden rounded-bar px-2 outline-none focus-visible:shadow-focus", fill.ink, active === i && "opacity-85")}
                style={{ width: `${share * 100}%`, background: fill.bg }}
              >
                {fits && <span className="type-body-sm font-semibold">{Math.round(share * 100)}%</span>}
              </div>
            );
          })}
        </div>

        {active !== null && visible[active] && (
          <div
            role="status"
            className="pointer-events-none absolute bottom-full z-10 mb-2 -translate-x-1/2 whitespace-nowrap rounded-popover border border-border bg-surface px-3 py-2 shadow"
            style={{
              left: Math.min(
                Math.max(
                  (visible.slice(0, active).reduce((s, p) => s + p.value, 0) / total + visible[active]!.value / total / 2) * width,
                  70,
                ),
                Math.max(width - 70, 70),
              ),
            }}
          >
            <div className="type-body font-semibold text-text">{format(visible[active]!.value)}</div>
            <div className="type-body-sm text-text-soft">
              {visible[active]!.label} · {Math.round((visible[active]!.value / total) * 100)}%
            </div>
          </div>
        )}
      </div>

      <ul className="m-0 flex list-none flex-wrap gap-x-5 gap-y-1 p-0">
        {parts.map((p, i) => (
          <li key={p.id} className="flex items-center gap-2">
            <span className="size-2.5 rounded-sm" style={{ background: FILLS[Math.min(i, FILLS.length - 1)]!.bg }} />
            <span className="type-body-sm text-text-soft">{p.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
