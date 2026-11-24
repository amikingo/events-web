"use client";

import type { ReactNode } from "react";
import { cn } from "../../lib/utils";
import { AppShell } from "./app-shell";
import { Card } from "./card";
import { Topbar } from "./topbar";
import { Skeleton } from "./skeleton";

export interface ShellSkeletonProps {
  /** The real `<Sidebar>` — admin apps never splash: navigation stays live while the page's data loads. */
  sidebar: ReactNode;
  /** KPI-card skeletons in the first row. Default 3. */
  stats?: number;
  /** Rows in the list skeleton under it. Default 2. */
  rows?: number;
  className?: string;
}

/**
 * The admin app while it loads: the sidebar and top bar frame appear immediately (the sidebar fully usable), and only
 * the main area is skeletoned — a row of stat cards and a list. Swap it for the real page when the data arrives.
 */
export function ShellSkeleton({ sidebar, stats = 3, rows = 2, className }: ShellSkeletonProps) {
  return (
    <div className={cn("overflow-hidden rounded-md border border-border bg-surface-2", className)}>
    <AppShell
      sidebar={sidebar}
      topbar={
        <Topbar aria-busy="true" className="h-14" search={false} notifications={false} themeSwitch={false} trailing={<Skeleton shape="avatar" className="shrink-0" />}>
          <Skeleton width={140} height={14} className="shrink-0" />
        </Topbar>
      }
    >
      <div className="-mx-0.5 flex flex-col gap-3.5" aria-busy="true">
        <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${stats}, minmax(0, 1fr))` }}>
          {Array.from({ length: stats }, (_, i) => (
            <Card key={i} compact>
              <Skeleton width="50%" className="mb-2.5" />
              <Skeleton shape="num" height={22} />
            </Card>
          ))}
        </div>
        <Card className="p-0">
          {Array.from({ length: rows }, (_, i) => (
            <div key={i} className="flex items-center gap-3 border-t border-border px-[18px] py-[11px] first:border-t-0">
              <Skeleton className="size-[30px] rounded-cell" />
              <div className="flex flex-1 flex-col gap-[5px]">
                <Skeleton width="55%" />
                <Skeleton width="35%" height={9} />
              </div>
              <Skeleton shape="pill" />
            </div>
          ))}
        </Card>
      </div>
    </AppShell>
    </div>
  );
}
