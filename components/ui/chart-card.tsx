"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { cn } from "../../lib/utils";
import { Card, CardHeader } from "./card";
import type { CardProps } from "./card";
import { Select } from "./select";
import { Skeleton } from "./skeleton";

export interface ChartRange {
  /** Option label ("Last 7 days"). */
  label: string;
  value: string;
  /** One bar per value, oldest first; the last bar is the current period. */
  values: number[];
  /** Axis labels spread under the bars. */
  axis: string[];
}

export interface ChartCardProps extends Omit<CardProps, "title"> {
  title: ReactNode;
  subtitle?: ReactNode;
  /** The headline figure above the bars. */
  value: ReactNode;
  /** Change next to the figure ("↑ 12.4%"), green. */
  change?: ReactNode;
  /** One entry per selectable range; the first is shown initially. */
  ranges: ChartRange[];
  /** Legend labels under the divider. */
  legend?: [current: string, previous: string];
  loading?: boolean;
  /** Called when the user switches range, so the figure can follow. */
  onRangeChange?: (value: string) => void;
}

/** Analytics shell: title with the standard select as range filter, headline value, bar chart (current period in full accent), axis and legend. */
export function ChartCard({ title, subtitle, value, change, ranges, legend = ["Today", "Previous days"], loading, onRangeChange, className, ...props }: ChartCardProps) {
  const [range, setRange] = useState(ranges[0]?.value ?? "");
  const [grown, setGrown] = useState(false);
  const current = ranges.find((r) => r.value === range) ?? ranges[0];
  // Bars start at their minimum and grow on the next frame, so switching range animates like the guideline's.
  useEffect(() => {
    setGrown(false);
    const id = requestAnimationFrame(() => setGrown(true));
    return () => cancelAnimationFrame(id);
  }, [range]);

  if (loading || !current) {
    return (
      <Card aria-busy="true" className={className}>
        <CardHeader title={<Skeleton shape="title" className="w-32" />} subtitle={<Skeleton width={90} className="mt-1.5" />} action={<Skeleton width={96} height={32} />} />
        <Skeleton shape="num" className="mb-3" />
        <Skeleton shape="block" height={96} />
        <div className="mt-2 flex justify-between">
          <Skeleton width={30} />
          <Skeleton width={30} />
          <Skeleton width={30} />
        </div>
      </Card>
    );
  }
  const max = Math.max(...current.values);
  return (
    <Card className={className} {...props}>
      <CardHeader
        title={title}
        subtitle={subtitle}
        action={
          <Select
            size="sm"
            value={range}
            onValueChange={(v) => {
              setRange(v);
              onRangeChange?.(v);
            }}
            options={ranges.map((r) => ({ label: r.label, value: r.value }))}
          />
        }
      />
      <div className="mb-3 text-[22px] font-bold tracking-[-0.3px] tabular-nums text-text">
        {value}
        {change && <small className="ml-2 text-[12px] font-semibold tracking-normal text-success-text">{change}</small>}
      </div>
      <div role="img" aria-label={`${title}: ${current.values.join(", ")}`} className="flex h-24 items-end gap-1.5 pt-1">
        {current.values.map((v, i) => (
          <div
            key={i}
            data-v={v}
            style={{ height: grown ? `${Math.round((v / max) * 100)}%` : "4px" }}
            className={cn(
              "group/bar relative min-h-1 flex-1 rounded-t-bar rounded-b-key transition-[height,background-color] duration-(--motion-slow) ease-[cubic-bezier(0.2,0.7,0.2,1)] hover:bg-accent",
              i === current.values.length - 1 ? "bg-accent" : "bg-[color-mix(in_srgb,var(--color-accent)_22%,var(--color-surface))]",
            )}
          >
            <span className="pointer-events-none absolute bottom-[calc(100%+4px)] left-1/2 -translate-x-1/2 whitespace-nowrap rounded-check border border-border bg-surface px-[5px] py-px text-[10px] font-semibold text-text opacity-0 transition-opacity group-hover/bar:opacity-100">{v}</span>
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-between text-[11px] font-medium text-text-faint">
        {current.axis.map((a) => (
          <span key={a}>{a}</span>
        ))}
      </div>
      <div className="mt-3 flex gap-3.5 border-t border-border pt-3 text-[11.5px] text-text-soft">
        <span className="flex items-center gap-1.5">
          <i className="size-2 rounded-key bg-accent" />
          {legend[0]}
        </span>
        <span className="flex items-center gap-1.5">
          <i className="size-2 rounded-key bg-[color-mix(in_srgb,var(--color-accent)_22%,var(--color-surface))]" />
          {legend[1]}
        </span>
      </div>
    </Card>
  );
}
