"use client";

import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "../../lib/utils";
import { Button } from "./button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "./dropdown-menu";
import { MoreIcon } from "./icons";
import { Skeleton } from "./skeleton";

/** Everything a record's panel and its full page share: identity, actions, stats, key–value facts, rows, side rail. */

export interface RecordAction {
  label: ReactNode;
  onClick?: () => void;
}
export interface RecordMenuItem {
  label: ReactNode;
  onClick?: () => void;
  /** Red, always last, below a divider — archive / delete / block. Opens a confirm modal; never acts directly. */
  destructive?: boolean;
}

export interface RecordIdentityProps {
  /** `<Avatar size={48}>` or an icon tile. */
  avatar: ReactNode;
  name: ReactNode;
  /** A status pill beside the name. */
  status?: ReactNode;
  /** Mono ID, kind, since-date — one muted line. */
  meta?: ReactNode;
  /** One primary, one secondary, everything else in the ⋯ menu. */
  primary?: RecordAction;
  secondary?: RecordAction;
  menu?: RecordMenuItem[];
}

/** `.dv-id` — avatar, name + status, meta, actions. Always first and never moves between panel and page. */
export function RecordIdentity({ avatar, name, status, meta, primary, secondary, menu }: RecordIdentityProps) {
  const safe = menu?.filter((m) => !m.destructive) ?? [];
  const danger = menu?.filter((m) => m.destructive) ?? [];
  return (
    <div className="flex flex-wrap items-start gap-3.5 px-5 pt-[18px]">
      {avatar}
      <div className="min-w-0 flex-[1_1_180px]">
        <h4 className="m-0 flex flex-wrap items-center gap-2 text-[18px] font-bold leading-[1.25] text-text">
          {name}
          {status}
        </h4>
        {meta && <div className="mt-[3px] text-[12px] text-text-faint [&_code]:font-mono [&_code]:text-[11.5px]">{meta}</div>}
      </div>
      <div className="ml-auto flex items-center gap-2 @max-[560px]/dv:ml-0 @max-[560px]/dv:w-full @max-[560px]/dv:[&>button:first-child]:flex-1">
        {primary && <Button onClick={primary.onClick}>{primary.label}</Button>}
        {secondary && (
          <Button variant="secondary" onClick={secondary.onClick}>
            {secondary.label}
          </Button>
        )}
        {menu && menu.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger aria-label="More actions" className="inline-flex size-9 items-center justify-center rounded-btn border border-border bg-surface-2 text-text hover:bg-border">
              <MoreIcon className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[190px]">
              {safe.map((m, i) => (
                <DropdownMenuItem key={i} onClick={m.onClick}>
                  {m.label}
                </DropdownMenuItem>
              ))}
              {safe.length > 0 && danger.length > 0 && <DropdownMenuSeparator />}
              {danger.map((m, i) => (
                <DropdownMenuItem key={i} destructive onClick={m.onClick}>
                  {m.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}

export interface RecordStat {
  label: ReactNode;
  value: ReactNode;
  unit?: ReactNode;
}

/** `.dv-stats` — the few numbers the list already has. 2×2 in a narrow panel, four across on a page. */
export function RecordStats({ stats }: { stats: RecordStat[] }) {
  return (
    <div className="mx-5 mt-4 grid grid-cols-4 overflow-hidden rounded-sm border border-border @max-[560px]/dv:grid-cols-2">
      {stats.map((s, i) => (
        <div key={i} className={cn("min-w-0 border-l border-border px-3.5 py-2.5", i === 0 && "border-l-0", "@max-[560px]/dv:[&:nth-child(3)]:border-l-0 @max-[560px]/dv:[&:nth-child(n+3)]:border-t")}>
          <span className="block text-[11px] font-medium text-text-faint">{s.label}</span>
          <b className="block truncate text-[15px] font-semibold tabular-nums text-text">
            {s.value}
            {s.unit && <small className="ml-[3px] text-[11px] font-medium text-text-faint">{s.unit}</small>}
          </b>
        </div>
      ))}
    </div>
  );
}

/** `.dv-h` — 12/700 block heading inside the body. */
export function RecordHeading({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h5 className={cn("m-0 mb-2 text-[12px] font-bold text-text", className)} {...props} />;
}

/** `.dv-kv` — label over value pairs, two columns (one in the rail or when narrow). */
export function RecordKv({ items, single = false }: { items: { label: ReactNode; value: ReactNode }[]; single?: boolean }) {
  return (
    <div className={cn("grid gap-x-5 gap-y-3 @max-[400px]/dv:grid-cols-1", single ? "grid-cols-1 gap-y-2.5" : "grid-cols-2")}>
      {items.map((it, i) => (
        <div key={i} className="min-w-0">
          <span className="block text-[11px] text-text-faint">{it.label}</span>
          <b className="block break-words text-[13px] font-medium text-text [overflow-wrap:anywhere]">{it.value}</b>
        </div>
      ))}
    </div>
  );
}

export interface RecordRowItem {
  title: ReactNode;
  meta?: ReactNode;
  /** Right-aligned figure; `positive` turns it success green. */
  amount?: ReactNode;
  positive?: boolean;
  trailing?: ReactNode;
}

/** `.dv-rows` — bordered list of the record's transactions, documents or activity. */
export function RecordRows({ rows }: { rows: RecordRowItem[] }) {
  return (
    <div className="overflow-hidden rounded-sm border border-border">
      {rows.map((r, i) => (
        <div key={i} className={cn("flex min-w-0 items-center gap-3 px-3 py-2.5 text-[12.5px] text-text-soft", i > 0 && "border-t border-border")}>
          <div className="min-w-0 flex-1">
            <b className="block truncate text-[13px] font-medium text-text">{r.title}</b>
            {r.meta && <small className="text-[11.5px] text-text-faint">{r.meta}</small>}
          </div>
          {r.amount && <span className={cn("whitespace-nowrap font-medium tabular-nums", r.positive ? "text-success-text" : "text-text")}>{r.amount}</span>}
          {r.trailing}
        </div>
      ))}
    </div>
  );
}

/** `.dv-body` — the page's two-column body: main on the left, a 250px rail on the right (stacked when narrow). Panels use `light`: one column, less padding. */
export function RecordBody({ light = false, rail, children }: { light?: boolean; rail?: ReactNode; children: ReactNode }) {
  if (light) return <div className="px-5 pb-1 pt-[18px]"><div className="flex min-w-0 flex-col gap-4">{children}</div></div>;
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_250px] items-start gap-5 px-5 pb-7 pt-[18px] @max-[760px]/dv:grid-cols-[minmax(0,1fr)]">
      <div className="flex min-w-0 flex-col gap-4">{children}</div>
      {rail && <aside className="flex min-w-0 flex-col gap-3 @max-[760px]/dv:grid @max-[760px]/dv:grid-cols-[repeat(auto-fit,minmax(200px,1fr))]">{rail}</aside>}
    </div>
  );
}

/** A side-rail card: 14px padding, no resting shadow. */
export function RecordRailCard({ title, children }: { title: ReactNode; children: ReactNode }) {
  return (
    <div className="min-w-0 rounded-md border border-border bg-surface p-3.5">
      <RecordHeading>{title}</RecordHeading>
      {children}
    </div>
  );
}

/** The record page while its own data loads: identity, stats, tabs and body in the same shapes. */
export function RecordSkeleton() {
  return (
    <div aria-busy="true">
      <div className="flex items-start gap-3.5 px-5 pt-[18px]">
        <Skeleton className="size-12 rounded-md" />
        <div className="flex-1">
          <Skeleton shape="title" width="50%" />
        </div>
      </div>
      <div className="mx-5 mt-4 grid grid-cols-4 overflow-hidden rounded-sm border border-border @max-[560px]/dv:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="border-l border-border px-3.5 py-2.5 first:border-l-0">
            <Skeleton width="50%" />
            <Skeleton width="70%" height={16} className="mt-1" />
          </div>
        ))}
      </div>
      <div className="mt-3.5 flex gap-5 px-5">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} width={60} />
        ))}
      </div>
      <div className="px-5 pb-7 pt-[18px]">
        <Skeleton width="30%" className="mb-2.5" />
        <Skeleton width="90%" />
        <Skeleton width="80%" className="mt-1.5" />
      </div>
    </div>
  );
}
