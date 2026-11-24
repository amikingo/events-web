import type { ReactNode } from "react";
import { cn } from "../../lib/utils";
import { Card } from "./card";
import type { CardProps } from "./card";
import { IconTile } from "./icon-tile";
import type { IconTileTone } from "./icon-tile";
import { Skeleton } from "./skeleton";

export interface KpiCardProps extends Omit<CardProps, "title" | "children"> {
  label: ReactNode;
  value: ReactNode;
  /** Small unit after the number ("ETB"). */
  unit?: ReactNode;
  /** `up` is green, `down` red; omit `direction` for a flat grey trend ("No change"). */
  trend?: { direction?: "up" | "down"; value?: ReactNode; label: ReactNode };
  /** An icon (`<svg>`) shown on a small tile at top right. */
  icon?: ReactNode;
  iconTone?: IconTileTone;
  /** Sparkline points (any scale); drawn bottom-right at 84×30, never competing with the number. */
  spark?: number[];
  /** Skeleton in the card's exact shape. */
  loading?: boolean;
}

function Sparkline({ points }: { points: number[] }) {
  const max = Math.max(...points);
  const min = Math.min(...points);
  const span = max - min || 1;
  const step = 84 / (points.length - 1);
  const pts = points.map((p, i) => `${(i * step).toFixed(1)} ${(26 - ((p - min) / span) * 22).toFixed(1)}`);
  const line = `M${pts.join(" L")}`;
  return (
    <svg aria-hidden="true" viewBox="0 0 84 30" fill="none" className="absolute bottom-4 right-[18px] h-[30px] w-[84px] opacity-90">
      <path d={line} stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d={`${line} V30 H0 Z`} fill="var(--color-accent)" opacity=".12" />
    </svg>
  );
}

const arrowUp = "M7 17L17 7M9 7h8v8";
const arrowDown = "M7 7l10 10M15 17H7V9";

/** Stat card: label, big tabular number, trend (green up / red down / grey flat), optional icon tile and sparkline. */
export function KpiCard({ label, value, unit, trend, icon, iconTone = "accent", spark, loading, compact, className, ...props }: KpiCardProps) {
  if (loading) {
    return (
      <Card compact={compact} aria-busy="true" className={className} {...props}>
        <Skeleton width="50%" className="mb-3" />
        <Skeleton shape="num" />
        <Skeleton width="70%" className="mt-3" />
      </Card>
    );
  }
  return (
    <Card compact={compact} className={className} {...props}>
      <div className={cn("flex items-center justify-between gap-2.5", compact ? "mb-1" : "mb-2.5")}>
        <span className="text-[12.5px] font-medium text-text-soft">{label}</span>
        {icon && (
          <IconTile size="sm" tone={iconTone}>
            {icon}
          </IconTile>
        )}
      </div>
      <div className={cn("font-bold tracking-[-0.4px] text-text tabular-nums", compact ? "text-[22px]" : "text-[28px]", "leading-[1.1]")}>
        {value}
        {unit && <small className="ml-1 text-[13px] font-semibold tracking-normal text-text-faint">{unit}</small>}
      </div>
      {trend && (
        <div className={cn("mt-2 flex items-center gap-[5px] text-[12px] font-semibold", trend.direction === "up" && "text-success-text", trend.direction === "down" && "text-danger-text")}>
          {trend.direction && (
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="size-3.5">
              <path d={trend.direction === "up" ? arrowUp : arrowDown} />
            </svg>
          )}
          {trend.value}
          <span className="font-normal text-text-faint">{trend.label}</span>
        </div>
      )}
      {spark && spark.length > 1 && <Sparkline points={spark} />}
    </Card>
  );
}
