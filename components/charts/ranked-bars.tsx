import { cn } from "../../lib/utils";

export interface RankedBarItem {
  id: string;
  label: string;
  value: number;
  /** Small text under the label, such as "42% of sales". */
  meta?: string;
}

export interface RankedBarsProps {
  items: RankedBarItem[];
  /** How a value is written at the bar's tip. Default: 12,400. */
  format?: (value: number) => string;
  /** Colour only this bar and grey the rest, when one item is the story. */
  highlightId?: string;
  /** Describes the chart for screen readers, such as "Sales by region". */
  ariaLabel: string;
  className?: string;
}

/**
 * Part-to-whole or ranking as horizontal bars, largest first, one hue. Bars share one baseline, so close values stay
 * easy to tell apart. The value sits at the tip of each bar, so no tooltip is needed.
 */
export function RankedBars({ items, format = (v) => v.toLocaleString("en-US"), highlightId, ariaLabel, className }: RankedBarsProps) {
  const sorted = [...items].sort((a, b) => b.value - a.value);
  const max = Math.max(...sorted.map((i) => i.value), 1);

  return (
    <ul aria-label={ariaLabel} className={cn("m-0 flex list-none flex-col gap-4 p-0", className)}>
      {sorted.map((item) => {
        const muted = highlightId !== undefined && item.id !== highlightId;
        return (
          <li key={item.id} className="flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between gap-3">
              <span className="type-body min-w-0 truncate text-text">{item.label}</span>
              <span className="type-body flex-none font-semibold text-text">{format(item.value)}</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-surface-2" role="presentation">
              <div
                className={cn("h-full rounded-full", muted ? "bg-border-strong" : "bg-accent")}
                style={{ width: `${Math.max((item.value / max) * 100, 1)}%` }}
              />
            </div>
            {item.meta && <span className="type-body-sm text-text-faint">{item.meta}</span>}
          </li>
        );
      })}
    </ul>
  );
}
