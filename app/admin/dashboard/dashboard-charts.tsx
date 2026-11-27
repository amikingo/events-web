"use client";

import type { ReactNode } from "react";
import { Area } from "@/components/bklit/charts/area";
import { AreaChart } from "@/components/bklit/charts/area-chart";
import { Grid } from "@/components/bklit/charts/grid";
import { Line } from "@/components/bklit/charts/line";
import { LineChart } from "@/components/bklit/charts/line-chart";
import { PieCenter } from "@/components/bklit/charts/pie-center";
import { PieChart } from "@/components/bklit/charts/pie-chart";
import { PieSlice } from "@/components/bklit/charts/pie-slice";
import { ChartTooltip } from "@/components/bklit/charts/tooltip/chart-tooltip";
import { XAxis } from "@/components/bklit/charts/x-axis";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { IconTile } from "@/components/ui/icon-tile";
import type { IconTileTone } from "@/components/ui/icon-tile";
import { cn } from "@/lib/utils";

/**
 * The dashboards' charts, all Bklit UI, each in our Card: a coloured icon, a title and one line, an optional headline figure, then the chart. Each chart takes one colour of the palette (globals.css maps Bklit's
 * --chart-1…5 to our tokens: pink, purple, green, amber, wine), so neighbouring cards read apart.
 */

export type ChartTone = "pink" | "purple" | "green" | "amber" | "wine";

export const TONE: Record<ChartTone, { color: string; tile: IconTileTone }> = {
  pink: { color: "var(--chart-1)", tile: "accent" },
  purple: { color: "var(--chart-2)", tile: "charcoal" },
  green: { color: "var(--chart-3)", tile: "success" },
  amber: { color: "var(--chart-4)", tile: "warning" },
  wine: { color: "var(--chart-5)", tile: "danger" },
};

export const PALETTE = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

/** One height for every chart in a row, whatever the card's width, so the cards in a row match. */
export const CHART_HEIGHT = 200;

export interface ChartCardProps {
  title: string;
  subtitle: string;
  icon: ReactNode;
  tone?: ChartTone;
  badge?: ReactNode;
  /** A big figure under the title: a total, the latest value. */
  headline?: { value: ReactNode; label: string };
  className?: string;
}

export function ChartCard({ title, subtitle, icon, tone = "pink", badge, headline, className, children }: ChartCardProps & { children: ReactNode }) {
  return (
    <Card compact className={cn("flex min-w-0 flex-col gap-2.5", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <IconTile tone={TONE[tone].tile} size="sm">
            {icon}
          </IconTile>
          <div className="flex min-w-0 flex-col">
            <h3 className="type-body m-0 font-semibold text-text">{title}</h3>
            <p className="type-body-sm m-0 text-text-soft">{subtitle}</p>
          </div>
        </div>
        {badge}
      </div>
      {headline && (
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-semibold leading-none tracking-tight tabular-nums text-text">{headline.value}</span>
          <span className="type-body-sm text-text-soft">{headline.label}</span>
        </div>
      )}
      {/* The chart fills the rest of the card, centred, so a short chart beside a tall one doesn't sink to the bottom. */}
      <div className="flex min-w-0 flex-1 flex-col justify-center">{children}</div>
    </Card>
  );
}

/** Points over time: one per day or month. */
export interface TimePoint {
  date: Date;
  value: number;
}

/** A filled area over time, with a grid, dates and a hover tooltip. */
export function AreaTrendCard({ data, empty, ...card }: ChartCardProps & { data: TimePoint[]; empty: { title: string; text: string } }) {
  const color = TONE[card.tone ?? "pink"].color;
  return (
    <ChartCard {...card}>
      {data.some((d) => d.value > 0) ? (
        <AreaChart data={data as unknown as Record<string, unknown>[]} aspectRatio="auto" style={{ height: CHART_HEIGHT }}>
          <Grid horizontal />
          <Area dataKey="value" fill={color} stroke={color} fillOpacity={0.35} />
          <XAxis />
          <ChartTooltip />
        </AreaChart>
      ) : (
        <EmptyState size="sm" icon={card.icon} title={empty.title} description={empty.text} />
      )}
    </ChartCard>
  );
}

/** A line over time, with a grid, dates and a hover tooltip. */
export function LineTrendCard({ data, empty, ...card }: ChartCardProps & { data: TimePoint[]; empty: { title: string; text: string } }) {
  const color = TONE[card.tone ?? "pink"].color;
  return (
    <ChartCard {...card}>
      {data.some((d) => d.value > 0) ? (
        <LineChart data={data as unknown as Record<string, unknown>[]} aspectRatio="auto" style={{ height: CHART_HEIGHT }}>
          <Grid horizontal />
          <Line dataKey="value" stroke={color} />
          <XAxis />
          <ChartTooltip />
        </LineChart>
      ) : (
        <EmptyState size="sm" icon={card.icon} title={empty.title} description={empty.text} />
      )}
    </ChartCard>
  );
}

/** A donut with the total in the middle (the hovered slice while hovering) and a coloured legend with shares. */
export function DonutCard({
  parts,
  totalLabel,
  empty,
  ...card
}: ChartCardProps & { parts: { label: string; value: number }[]; totalLabel: string; empty: { title: string; text: string } }) {
  const data = parts.filter((p) => p.value > 0).map((p, i) => ({ ...p, color: PALETTE[i % PALETTE.length] }));
  const total = data.reduce((sum, p) => sum + p.value, 0);
  return (
    <ChartCard {...card}>
      {data.length ? (
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center sm:gap-6">
          <div className="w-[150px] flex-none">
            <PieChart data={data} size={150} innerRadius={48} padAngle={0.03} cornerRadius={4}>
              {data.map((p, i) => (
                <PieSlice key={p.label} index={i} />
              ))}
              <PieCenter defaultLabel={totalLabel} />
            </PieChart>
          </div>
          <ul className="m-0 flex w-full max-w-[240px] list-none flex-col gap-2.5 p-0">
            {data.map((p) => (
              <li key={p.label} className="flex flex-col gap-1">
                <div className="type-body-sm flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2 text-text">
                    <span className="size-2.5 flex-none rounded-full" style={{ background: p.color }} aria-hidden="true" />
                    {p.label}
                  </span>
                  <span className="tabular-nums text-text-soft">{Math.round((p.value / total) * 100)}%</span>
                </div>
                {/* The share as a thin bar in the slice's colour. */}
                <span className="block h-1 w-full overflow-hidden rounded-full bg-surface-2" aria-hidden="true">
                  <span className="block h-full rounded-full" style={{ width: `${(p.value / total) * 100}%`, background: p.color }} />
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <EmptyState size="sm" icon={card.icon} title={empty.title} description={empty.text} />
      )}
    </ChartCard>
  );
}
