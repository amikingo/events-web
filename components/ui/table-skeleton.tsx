import { Card } from "./card";
import { Skeleton } from "./skeleton";

/** Widths cycled across columns and rows so the placeholder looks like text, not a grid of identical bars. */
const WIDTHS = [62, 78, 54, 70, 46, 66];

export interface TableSkeletonRowsProps {
  columns: { numeric?: boolean; primary?: boolean }[];
  rows?: number;
  selectable?: boolean;
  rowActions?: boolean;
  /** Matches the table's cell padding so the swap to real rows doesn't move anything. */
  padding: string;
}

/** `.skel` rows for a table body — same columns, same padding as the real rows. */
export function TableSkeletonRows({ columns, rows = 5, selectable, rowActions, padding }: TableSkeletonRowsProps) {
  return (
    <>
      {Array.from({ length: rows }, (_, r) => (
        <tr key={r} aria-hidden="true">
          {selectable && (
            <td className={`${padding} w-11 pr-0`}>
              <Skeleton className="size-[18px] rounded-check" />
            </td>
          )}
          {columns.map((c, ci) => (
            <td key={ci} className={padding}>
              <Skeleton shape="line" width={`${WIDTHS[(r + ci) % WIDTHS.length]! - (c.numeric ? 20 : 0)}%`} className={c.numeric ? "ml-auto" : undefined} />
            </td>
          ))}
          {rowActions && (
            <td className={`${padding} w-px`}>
              <Skeleton className="ml-auto size-8" shape="circle" />
            </td>
          )}
        </tr>
      ))}
    </>
  );
}

/** The phone version: skeleton cards matching the stacked rows (title + status on top, three key–value lines). */
export function StackSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-2 p-2.5" aria-hidden="true">
      {Array.from({ length: rows }, (_, i) => (
        <Card key={i} compact className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between gap-2.5">
            <Skeleton width={`${40 + i * 8}%`} />
            <Skeleton shape="pill" />
          </div>
          {[70, 55, 62].map((w, k) => (
            <div key={k} className="flex justify-between gap-3">
              <Skeleton width="28%" height={10} />
              <Skeleton width={`${w * 0.4}%`} height={10} />
            </div>
          ))}
        </Card>
      ))}
    </div>
  );
}
