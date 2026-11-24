import type { ReactNode } from "react";
import { cn } from "../../lib/utils";
import { Card, CardFooter, CardHeader } from "./card";
import type { CardProps } from "./card";
import { Skeleton } from "./skeleton";

export interface ListCardRow {
  /** 36px avatar, a payment logo or a small icon tile. */
  leading?: ReactNode;
  name: ReactNode;
  meta?: ReactNode;
  /** Tabular figure on the right. */
  amount?: ReactNode;
  /** Refunds and reversals: the amount goes soft grey. */
  negative?: boolean;
  /** A status pill on the far right. */
  status?: ReactNode;
}

export interface ListCardProps extends Omit<CardProps, "title"> {
  title: ReactNode;
  subtitle?: ReactNode;
  /** A `CardLink` or icon button at the header's right. */
  action?: ReactNode;
  rows: ListCardRow[];
  /** Centered link under the rows ("Load more"). */
  footer?: ReactNode;
  loading?: boolean;
  /** How many skeleton rows to show while loading. Default 3. */
  loadingRows?: number;
}

/** Header plus divided rows: leading tile, name and meta, trailing amount and status. Rows tint on hover; the header has no divider. */
export function ListCard({ title, subtitle, action, rows, footer, loading, loadingRows = 3, className, ...props }: ListCardProps) {
  return (
    <Card aria-busy={loading || undefined} className={cn("p-0", className)} {...props}>
      <CardHeader title={title} subtitle={subtitle} action={action} className="mb-2 px-[18px] pt-4" />
      {loading
        ? Array.from({ length: loadingRows }, (_, i) => (
            <div key={i} className="flex items-center gap-3 border-t border-border px-[18px] py-[11px] first:border-t-0">
              <Skeleton shape="avatar" />
              <div className="flex-1 space-y-1.5">
                <Skeleton width="55%" />
                <Skeleton width="35%" />
              </div>
            </div>
          ))
        : rows.map((r, i) => (
            <div key={i} className="flex items-center gap-3 border-t border-border px-[18px] py-[11px] first:border-t-0 hover:bg-surface-2">
              {r.leading}
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-semibold text-text">{r.name}</div>
                {r.meta && <div className="break-words text-[11.5px] text-text-faint">{r.meta}</div>}
              </div>
              {r.amount && <span className={cn("whitespace-nowrap text-[13px] font-semibold tabular-nums", r.negative ? "text-text-soft" : "text-text")}>{r.amount}</span>}
              {r.status}
            </div>
          ))}
      {footer && <CardFooter className="m-0 justify-center px-[18px] py-3">{footer}</CardFooter>}
    </Card>
  );
}
