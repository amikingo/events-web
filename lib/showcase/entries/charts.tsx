"use client";

import { Heatmap } from "../../../components/charts/heatmap";
import { LineChart } from "../../../components/charts/line-chart";
import { RankedBars } from "../../../components/charts/ranked-bars";
import { SegmentedBar } from "../../../components/charts/segmented-bar";
import { formatCurrency } from "../../format";
import type { ShowcaseEntry } from "../../showcase/types";

const MONTHS = ["Jun", "Jul", "Aug", "Sep", "Oct", "Nov"];

export const chartEntries: ShowcaseEntry[] = [
  {
    id: "line-chart",
    name: "LineChart",
    category: "Charts",
    summary: "Shows how a number changes over time, with the previous period as grey context.",
    scenario: "Analytics page: revenue this year against last year.",
    whenToUse: ["Change over time.", "Comparing this period with the last one (one accent line, one grey line)."],
    avoid: ["A single current number (use KpiCard).", "More than three lines (split into separate charts)."],
    source: "components/charts/line-chart.tsx",
    code: `<LineChart
  ariaLabel="Revenue by month"
  labels={months}
  format={(v) => formatCurrency(v)}
  series={[
    { id: "prev", label: "Last year", tone: "muted", values: last },
    { id: "now", label: "This year", tone: "accent", values: now },
  ]}
/>`,
    Demo: function Demo() {
      return (
        <LineChart
          ariaLabel="Revenue by month, this year and last year"
          labels={MONTHS}
          format={(v) => formatCurrency(v)}
          series={[
            { id: "prev", label: "Last year", tone: "muted", values: [44000, 46000, 52000, 55000, 59000, 61000] },
            { id: "now", label: "This year", tone: "accent", values: [58000, 74000, 69000, 82000, 88000, 112000] },
          ]}
        />
      );
    },
  },
  {
    id: "ranked-bars",
    name: "RankedBars",
    category: "Charts",
    summary: "Ranks items from largest to smallest, one bar each, with the value at the tip.",
    scenario: "Analytics page: sales by region.",
    whenToUse: ["Comparing parts of a whole or ranking items.", "More than six parts."],
    avoid: ["Change over time (use LineChart)."],
    source: "components/charts/ranked-bars.tsx",
    code: `<RankedBars
  ariaLabel="Sales by region"
  format={(v) => formatCurrency(v)}
  items={[{ id: "aa", label: "Addis Ababa", value: 412000, meta: "42% of sales" }]}
/>`,
    Demo: function Demo() {
      return (
        <div className="max-w-md">
          <RankedBars
            ariaLabel="Sales by region"
            format={(v) => formatCurrency(v)}
            items={[
              { id: "aa", label: "Addis Ababa", value: 412000, meta: "42% of sales" },
              { id: "or", label: "Oromia", value: 226000, meta: "23% of sales" },
              { id: "am", label: "Amhara", value: 167000, meta: "17% of sales" },
            ]}
          />
        </div>
      );
    },
  },
  {
    id: "segmented-bar",
    name: "SegmentedBar",
    category: "Charts",
    summary: "One whole split into a few parts, shown as a single bar with a legend.",
    scenario: "Analytics page: how paid amounts split across payment methods.",
    whenToUse: ["One total split into six parts or fewer, read at a glance."],
    avoid: ["Ranking or comparing close values (use RankedBars).", "A donut or pie chart. Use this instead."],
    source: "components/charts/segmented-bar.tsx",
    code: `<SegmentedBar
  ariaLabel="Payments by method"
  format={(v) => formatCurrency(v)}
  parts={[{ id: "tb", label: "Telebirr", value: 468000 }]}
/>`,
    Demo: function Demo() {
      return (
        <SegmentedBar
          ariaLabel="Payments by method"
          format={(v) => formatCurrency(v)}
          parts={[
            { id: "tb", label: "Telebirr", value: 468000 },
            { id: "cbe", label: "CBE Birr", value: 262000 },
            { id: "wal", label: "Wallet", value: 154000 },
            { id: "cash", label: "Cash", value: 97000 },
          ]}
        />
      );
    },
  },
  {
    id: "heatmap",
    name: "Heatmap",
    category: "Charts",
    summary: "A grid where darker cells mean higher values, to find busy and quiet times.",
    scenario: "Analytics page: orders by day and hour.",
    whenToUse: ["Patterns across two things, such as day and hour."],
    avoid: ["A few numbers (use a table)."],
    source: "components/charts/heatmap.tsx",
    code: `<Heatmap ariaLabel="Orders by day and hour" rows={days} columns={hours} values={orders} format={(v) => \`\${v} orders\`} />`,
    Demo: function Demo() {
      return (
        <Heatmap
          ariaLabel="Orders by day and hour"
          rows={["Mon", "Tue", "Wed", "Thu", "Fri"]}
          columns={["8", "10", "12", "14", "16", "18"]}
          values={[
            [6, 14, 22, 18, 20, 12],
            [7, 15, 24, 19, 21, 13],
            [8, 16, 26, 22, 23, 15],
            [8, 17, 25, 21, 24, 16],
            [10, 21, 33, 28, 31, 24],
          ]}
          format={(v) => `${v} orders`}
        />
      );
    },
  },
];
