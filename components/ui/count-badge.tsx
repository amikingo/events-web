import type { HTMLAttributes } from "react";
import { cn } from "../../lib/utils";

export interface CountBadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: "accent" | "danger" | "neutral";
  /** `inline` sits in the text flow (after a label, 6px left margin). Default floats on the top-right corner of a `relative` parent. */
  inline?: boolean;
  /** `soft` — tinted accent instead of solid fill (inline only; used on the Filters button and inside segmented items). */
  soft?: boolean;
  /** A 10px dot with no number, for "something new". */
  dotOnly?: boolean;
  /** Pop (scale 0.6 → 1.2 → 1) whenever the content changes — a live notification counter. */
  pop?: boolean;
}

/** `.count` — the small pill number: solid accent by default, `danger` / `neutral` tones, `inline`, `soft`, `dotOnly`. */
export function CountBadge({ tone = "accent", inline = false, soft = false, dotOnly = false, pop = false, className, children, ...props }: CountBadgeProps) {
  return (
    <span
      key={pop ? String(children) : undefined}
      className={cn(
        pop && "animate-count-pop",
        "flex items-center justify-center rounded-full text-[10px] font-bold leading-none tabular-nums text-white box-border",
        "h-[18px] min-w-[18px] px-[5px]",
        tone === "accent" && "bg-accent-fill",
        tone === "danger" && "bg-danger-fill",
        tone === "neutral" && "bg-charcoal text-surface",
        inline ? "ml-1.5 inline-flex" : "absolute -right-1.5 -top-1.5 border-2 border-surface",
        inline && soft && "bg-[color-mix(in_srgb,var(--color-accent)_14%,transparent)] text-accent-text",
        dotOnly && (inline ? "size-2.5 min-w-0 p-0" : "-right-0.5 -top-0.5 size-2.5 min-w-0 p-0"),
        className,
      )}
      {...props}
    >
      {dotOnly ? null : children}
    </span>
  );
}
