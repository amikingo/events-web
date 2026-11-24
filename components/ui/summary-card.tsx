import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "../../lib/utils";

export interface SummaryRow {
  label: ReactNode;
  value: ReactNode;
}

export interface SummaryCardProps extends HTMLAttributes<HTMLDivElement> {
  rows: SummaryRow[];
  /** The bottom line (dashed rule above it): label + big accent amount. */
  total?: SummaryRow;
}

/** `.summary-card` rows — label left, value right (tabular), and a dashed-rule total. Add a surrounding card from the Cards set for a bordered box. */
export function SummaryCard({ rows, total, className, ...props }: SummaryCardProps) {
  return (
    <div className={cn("w-full", className)} {...props}>
      {rows.map((r, i) => (
        <div key={i} className="flex justify-between gap-3 py-[7px] text-[13px] text-text-soft">
          <span>{r.label}</span>
          <b className="font-medium tabular-nums text-text">{r.value}</b>
        </div>
      ))}
      {total && (
        <div className="mt-2 flex items-baseline justify-between border-t border-dashed border-border-strong pt-3 text-[14px] font-bold">
          <span>{total.label}</span>
          <span className="text-[18px] tabular-nums text-accent">{total.value}</span>
        </div>
      )}
    </div>
  );
}
