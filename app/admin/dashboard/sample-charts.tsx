"use client";

import { Activity, Banknote, Building2, CalendarDays, Clock, Filter, Gauge as GaugeIcon, Share2, Target, Ticket } from "lucide-react";
import { useState } from "react";
import type { ReactNode } from "react";
import { Bar } from "@/components/bklit/charts/bar";
import { BarChart } from "@/components/bklit/charts/bar-chart";
import { BarXAxis } from "@/components/bklit/charts/bar-x-axis";
import { ComposedChart } from "@/components/bklit/charts/composed-chart";
import { FunnelChart } from "@/components/bklit/charts/funnel-chart";
import { Gauge } from "@/components/bklit/charts/gauge";
import { Grid } from "@/components/bklit/charts/grid";
import { HeatmapCells } from "@/components/bklit/charts/heatmap/heatmap-cells";
import { HeatmapChart } from "@/components/bklit/charts/heatmap/heatmap-chart";
import { HeatmapInteractionBoundary, HeatmapInteractionProvider } from "@/components/bklit/charts/heatmap/heatmap-context";
import { HeatmapLegend } from "@/components/bklit/charts/heatmap/heatmap-legend";
import { HeatmapTooltip } from "@/components/bklit/charts/heatmap/heatmap-tooltip";
import { HeatmapXAxis } from "@/components/bklit/charts/heatmap/heatmap-x-axis";
import { HeatmapYAxis } from "@/components/bklit/charts/heatmap/heatmap-y-axis";
import { Line } from "@/components/bklit/charts/line";
import { RadarArea } from "@/components/bklit/charts/radar-area";
import { RadarAxis } from "@/components/bklit/charts/radar-axis";
import { RadarChart } from "@/components/bklit/charts/radar-chart";
import { RadarGrid } from "@/components/bklit/charts/radar-grid";
import { RadarLabels } from "@/components/bklit/charts/radar-labels";
import { RadialAxis } from "@/components/bklit/charts/radial-axis";
import { RadialBar } from "@/components/bklit/charts/radial-bar";
import { RadialCenter } from "@/components/bklit/charts/radial-center";
import { RadialChart } from "@/components/bklit/charts/radial-chart";
import { RadialScrubber } from "@/components/bklit/charts/radial-scrubber";
import { Ring } from "@/components/bklit/charts/ring";
import { RingCenter } from "@/components/bklit/charts/ring-center";
import { RingChart } from "@/components/bklit/charts/ring-chart";
import { SankeyChart } from "@/components/bklit/charts/sankey/sankey-chart";
import { SankeyLink } from "@/components/bklit/charts/sankey/sankey-link";
import { SankeyNode } from "@/components/bklit/charts/sankey/sankey-node";
import { SankeyTooltip } from "@/components/bklit/charts/sankey/sankey-tooltip";
import { SeriesBar } from "@/components/bklit/charts/series-bar";
import { buildArcs } from "@/components/bklit/charts/sunburst";
import { SunburstCenter } from "@/components/bklit/charts/sunburst-center";
import { SunburstChart } from "@/components/bklit/charts/sunburst-chart";
import { SunburstSegment } from "@/components/bklit/charts/sunburst-segment";
import { ChartTooltip } from "@/components/bklit/charts/tooltip/chart-tooltip";
import { XAxis } from "@/components/bklit/charts/x-axis";
import type { YDomainOverride } from "@/components/bklit/charts/y-domain-utils";
import { Pill } from "@/components/ui/pill";
import { CHART_HEIGHT, ChartCard, PALETTE } from "./dashboard-charts";

/**
 * The other Bklit chart types, as examples: every figure here is made up and every card says "Sample data". They sit
 * apart from the real charts, in one file, so each can be replaced with real data (or the section removed) once the API
 * reports it.
 */

const badge = (
  <Pill tone="warning" size="sm">
    Sample data
  </Pill>
);

const HOURS = ["8 AM", "10 AM", "12 PM", "2 PM", "4 PM", "6 PM", "8 PM", "10 PM"].map((time, i) => ({ time, value: [18, 34, 62, 48, 71, 118, 96, 31][i]! }));
const DAY_TICKETS = [42, 58, 51, 77, 96, 140, 118, 64, 81, 99, 92, 120, 151, 138];
const DAY_REVENUE = [12600, 17400, 15300, 23100, 28800, 42000, 35400, 19200, 24300, 29700, 27600, 36000, 45300, 41400];

const FLOW = {
  nodes: [
    { name: "Online", category: "source" as const },
    { name: "Staff", category: "source" as const },
    { name: "Regular", category: "landing" as const },
    { name: "VIP", category: "landing" as const },
    { name: "Came", category: "outcome" as const },
    { name: "Didn't come", category: "outcome" as const },
  ],
  links: [
    { source: 0, target: 2, value: 260 },
    { source: 0, target: 3, value: 52 },
    { source: 1, target: 2, value: 64 },
    { source: 1, target: 3, value: 22 },
    { source: 2, target: 4, value: 271 },
    { source: 2, target: 5, value: 53 },
    { source: 3, target: 4, value: 68 },
    { source: 3, target: 5, value: 6 },
  ],
};

const FUNNEL = [
  { label: "Saw the page", value: 4200 },
  { label: "Started", value: 1890 },
  { label: "Paid", value: 940 },
  { label: "Came", value: 760 },
];

/** What differs between the two dashboards: the names of what's compared. */
const SCOPES = {
  organization: {
    bars: { title: "Tickets per event", subtitle: "The best-selling events." },
    items: [
      { name: "Tech Summit", value: 412, capacity: 500 },
      { name: "Music Night", value: 286, capacity: 300 },
      { name: "Food Fair", value: 198, capacity: 400 },
      { name: "Art Expo", value: 124, capacity: 250 },
      { name: "Run for All", value: 96, capacity: 300 },
    ],
    rings: { title: "How full they are", subtitle: "Sold against capacity." },
    tree: { title: "Tickets by event and type", subtitle: "Click a ring to look inside.", root: "Tickets" },
    radar: { title: "Event against your average", first: "Tech Summit", second: "Your average" },
    calendar: { title: "Busy days", subtitle: "Ticket sales by day, the last six months." },
    gauge: { title: "Checked in", subtitle: "Guests let in at the latest event.", value: 76, count: 313, label: "of 412 guests" },
  },
  platform: {
    bars: { title: "Events per organization", subtitle: "The busiest organizations." },
    items: [
      { name: "Selam", value: 42, capacity: 50 },
      { name: "Abay", value: 31, capacity: 40 },
      { name: "Tana", value: 24, capacity: 50 },
      { name: "Awash", value: 17, capacity: 30 },
      { name: "Omo", value: 9, capacity: 25 },
    ],
    rings: { title: "Plan used", subtitle: "Events run against planned." },
    tree: { title: "Organizations and their events", subtitle: "Click a ring to look inside.", root: "Events" },
    radar: { title: "Organization against average", first: "Selam", second: "Average" },
    calendar: { title: "Busy days", subtitle: "Activity by day, the last six months." },
    gauge: { title: "Active organizations", subtitle: "Share of organizations switched on.", value: 86, count: 24, label: "of 28 active" },
  },
};

const METRICS = [
  { key: "sold", label: "Sold" },
  { key: "arrived", label: "Arrived" },
  { key: "online", label: "Online" },
  { key: "repeat", label: "Repeat" },
  { key: "revenue", label: "Revenue" },
];

const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

/** Charts with names along an edge need room: on a narrow screen they keep this width and scroll sideways. */
function Wide({ children }: { children: ReactNode }) {
  return (
    <div className="w-full overflow-x-auto">
      <div className="min-w-[520px]">{children}</div>
    </div>
  );
}

export function SampleCharts({ scope }: { scope: keyof typeof SCOPES }) {
  const text = SCOPES[scope];

  // Dated sample series, ending today, made once.
  const [combo] = useState(() => {
    const end = new Date();
    return DAY_TICKETS.map((tickets, i) => ({ date: new Date(end.getFullYear(), end.getMonth(), end.getDate() - (DAY_TICKETS.length - 1 - i)), tickets, revenue: DAY_REVENUE[i]! }));
  });
  // 26 week columns, Sunday first, with a fixed made-up pattern (levels 0–4).
  const [calendar] = useState(() => {
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - today.getDay() - 25 * 7);
    return Array.from({ length: 26 }, (_, week) => ({
      bin: week,
      bins: Array.from({ length: 7 }, (_, day) => {
        const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + week * 7 + day);
        const future = date > today && dayKey(date) !== dayKey(today);
        const mix = (week * 5 + day * 3 + ((week * day) % 7)) % 11;
        return { bin: day, date, count: future || mix > 6 ? 0 : (mix % 4) + 1 };
      }),
    }));
  });

  const rings = text.items.slice(0, 4).map((it, i) => ({ label: it.name, value: it.value, maxValue: it.capacity, color: PALETTE[i % PALETTE.length]! }));
  const tree = {
    name: text.tree.root,
    children: text.items.slice(0, 4).map((it) => ({
      name: it.name,
      children: [
        { name: "Regular", value: Math.round(it.value * 0.7) },
        { name: "VIP", value: it.value - Math.round(it.value * 0.7) },
      ],
    })),
  };
  const { arcs } = buildArcs(tree);
  const radar = [
    { label: text.radar.first, color: PALETTE[0]!, values: { sold: 82, arrived: 76, online: 70, repeat: 38, revenue: 74 } },
    { label: text.radar.second, color: PALETTE[1]!, values: { sold: 61, arrived: 84, online: 52, repeat: 57, revenue: 55 } },
  ];
  const yDomains: Record<string, YDomainOverride> = { bars: ([, max]) => [0, max * 2.2] };

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-col">
        <h2 className="type-h3 m-0 text-text">More charts</h2>
        <p className="type-body-sm m-0 text-text-soft">Examples with sample data. These are not your figures.</p>
      </div>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <ChartCard className="xl:col-span-3" title="Tickets and revenue" subtitle="Tickets per day (bars) with revenue (line)." icon={<Banknote />} tone="pink" badge={badge}>
          <ComposedChart aspectRatio="auto" style={{ height: CHART_HEIGHT }} data={combo as unknown as Record<string, unknown>[]} maxBarSize={14} yDomains={yDomains}>
            <Grid horizontal />
            <SeriesBar dataKey="tickets" fill="color-mix(in oklch, var(--chart-3) 35%, transparent)" stroke="var(--chart-3)" radius={3} yAxisId="bars" />
            <Line dataKey="revenue" stroke="var(--chart-1)" strokeWidth={2.5} />
            <ChartTooltip />
            <XAxis />
          </ComposedChart>
        </ChartCard>

        <ChartCard className="xl:col-span-2" title={text.bars.title} subtitle={text.bars.subtitle} icon={<Ticket />} tone="green" badge={badge}>
          <Wide>
            <BarChart data={text.items} xDataKey="name" aspectRatio="auto" className="h-[200px]">
              <Grid horizontal />
              <Bar dataKey="value" fill="var(--chart-3)" />
              <BarXAxis />
              <ChartTooltip />
            </BarChart>
          </Wide>
        </ChartCard>
        <ChartCard title={text.rings.title} subtitle={text.rings.subtitle} icon={<Target />} tone="pink" badge={badge}>
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <div className="w-[160px] flex-none">
              <RingChart data={rings} size={160}>
                {rings.map((r, i) => (
                  <Ring key={r.label} index={i} />
                ))}
                <RingCenter defaultLabel="Total" />
              </RingChart>
            </div>
            <ul className="m-0 flex w-full max-w-[200px] list-none flex-col gap-2 p-0">
              {rings.map((r) => (
                <li key={r.label} className="type-body-sm flex items-center justify-between gap-3">
                  <span className="flex min-w-0 items-center gap-2 text-text">
                    <span className="size-2.5 flex-none rounded-full" style={{ background: r.color }} aria-hidden="true" />
                    <span className="truncate">{r.label}</span>
                  </span>
                  <span className="flex-none tabular-nums text-text-soft">{Math.round((r.value / r.maxValue) * 100)}%</span>
                </li>
              ))}
            </ul>
          </div>
        </ChartCard>

        <ChartCard className="xl:col-span-2" title={text.calendar.title} subtitle={text.calendar.subtitle} icon={<CalendarDays />} tone="green" badge={badge}>
          <Wide>
            <HeatmapInteractionProvider>
              <HeatmapInteractionBoundary>
                <HeatmapChart data={calendar} layout="fluid">
                  <HeatmapCells />
                  <HeatmapXAxis />
                  <HeatmapYAxis />
                  <HeatmapTooltip />
                </HeatmapChart>
                <HeatmapLegend />
              </HeatmapInteractionBoundary>
            </HeatmapInteractionProvider>
          </Wide>
        </ChartCard>
        <ChartCard title={text.gauge.title} subtitle={text.gauge.subtitle} icon={<GaugeIcon />} tone="green" badge={badge}>
          {/* The gauge fills its box: the box sets its size. */}
          <div className="mx-auto w-[290px] max-w-full">
            <Gauge value={text.gauge.value} centerValue={text.gauge.count} defaultLabel={text.gauge.label} spacing={25} inactiveFillOpacity={0.35} activeFill="var(--chart-3)" minWidth={200} />
          </div>
        </ChartCard>

        <ChartCard className="xl:col-span-2" title="Where tickets go" subtitle="How they were bought, the ticket type, and who came." icon={<Share2 />} tone="purple" badge={badge}>
          <Wide>
            <SankeyChart data={FLOW} aspectRatio="auto" className="h-[220px]">
              <SankeyLink />
              {/* Names beside the nodes; the built-in value line says "sessions", so the figures stay in the tooltip. */}
              <SankeyNode lineCap={4} showValueLabels={false} />
              <SankeyTooltip />
            </SankeyChart>
          </Wide>
        </ChartCard>
        <ChartCard title="From page to door" subtitle="Where people drop off." icon={<Filter />} tone="purple" badge={badge}>
          {/* The funnel draws the bands only; the stage, count and share are listed underneath so they can be read. */}
          <FunnelChart data={FUNNEL} color="var(--chart-2)" layers={3} showLabels={false} showPercentage={false} showValues={false} style={{ height: 130 }} />
          <dl className="m-0 mt-3 grid grid-cols-4 gap-1">
            {FUNNEL.map((stage) => (
              <div key={stage.label} className="flex min-w-0 flex-col items-center text-center">
                <dd className="type-body m-0 font-semibold tabular-nums text-text">{stage.value.toLocaleString("en-US")}</dd>
                <dt className="type-body-sm text-text-soft">{stage.label}</dt>
                <dd className="type-body-sm m-0 tabular-nums text-text-faint">{Math.round((stage.value / FUNNEL[0]!.value) * 100)}%</dd>
              </div>
            ))}
          </dl>
        </ChartCard>

        <ChartCard title={text.tree.title} subtitle={text.tree.subtitle} icon={<Building2 />} tone="pink" badge={badge}>
          <div className="mx-auto w-full max-w-[240px]">
            <SunburstChart data={tree} size={240}>
              {arcs.map((arc) => (
                <SunburstSegment index={arc.arcIndex} key={arc.id} />
              ))}
              <SunburstCenter />
            </SunburstChart>
          </div>
        </ChartCard>
        <ChartCard title="Sales by hour" subtitle="When people buy tickets." icon={<Clock />} tone="amber" badge={badge}>
          <div className="mx-auto w-full max-w-[250px]">
            <RadialChart data={HOURS} xDataKey="time" series={[{ dataKey: "value", label: "Tickets", color: "var(--chart-4)" }]} angleType="band">
              <RadialAxis />
              <RadialBar cornerRadius={4} />
              <RadialScrubber />
              <RadialCenter />
            </RadialChart>
          </div>
        </ChartCard>
        <ChartCard title={text.radar.title} subtitle="Scored out of 100." icon={<Activity />} tone="wine" badge={badge}>
          <div className="flex flex-col items-center gap-2">
            <div className="w-full max-w-[290px]">
              <RadarChart data={radar} metrics={METRICS} size={290}>
                <RadarGrid />
                <RadarAxis />
                <RadarLabels />
                {radar.map((r, i) => (
                  <RadarArea key={r.label} index={i} />
                ))}
              </RadarChart>
            </div>
            <ul className="m-0 flex list-none flex-wrap justify-center gap-x-4 gap-y-1 p-0">
              {radar.map((r) => (
                <li key={r.label} className="type-body-sm flex items-center gap-2 text-text">
                  <span className="size-2.5 rounded-full" style={{ background: r.color }} aria-hidden="true" />
                  {r.label}
                </li>
              ))}
            </ul>
          </div>
        </ChartCard>
      </div>
    </section>
  );
}
