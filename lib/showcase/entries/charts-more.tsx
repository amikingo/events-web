"use client";

import { BarChart } from "../../../components/charts/bar-chart";
import { PieChart } from "../../../components/charts/pie-chart";
import { ProgressBar } from "../../../components/ui/progress-bar";
import { ProgressField } from "../../../components/ui/progress-field";
import type { ShowcaseEntry } from "../../showcase/types";

export const chartMoreEntries: ShowcaseEntry[] = [
  {
    id: "bar-chart",
    name: "BarChart",
    category: "Charts",
    summary: "Columns for comparing amounts across days, months or categories.",
    scenario: "Analytics page: orders this week against last week.",
    whenToUse: ["Comparing amounts across categories or periods.", "Two series side by side (this period and the one before)."],
    avoid: ["Change over a long time (use LineChart).", "More than two series (split into separate charts)."],
    source: "components/charts/bar-chart.tsx",
    code: `<BarChart
  ariaLabel="Orders by weekday"
  labels={days}
  series={[
    { id: "prev", label: "Last week", tone: "muted", values: last },
    { id: "now", label: "This week", tone: "accent", values: now },
  ]}
/>`,
    Demo: function Demo() {
      return (
        <BarChart
          ariaLabel="Orders by weekday, this week and last week"
          labels={["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]}
          format={(v) => `${v} orders`}
          series={[
            { id: "prev", label: "Last week", tone: "muted", values: [104, 121, 130, 133, 149, 188, 90] },
            { id: "now", label: "This week", tone: "accent", values: [118, 132, 141, 127, 168, 202, 96] },
          ]}
        />
      );
    },
  },
  {
    id: "pie-chart",
    name: "PieChart",
    category: "Charts",
    summary: "A donut or pie showing how one total splits into a few parts, with a legend of names, amounts and shares.",
    scenario: "Analytics page: bookings by status.",
    whenToUse: ["One total split into six parts or fewer.", "The reader needs the overall split at a glance."],
    avoid: ["Comparing close values or ranking (use RankedBars).", "More than six parts (fold the rest into Other)."],
    source: "components/charts/pie-chart.tsx",
    code: `<PieChart
  ariaLabel="Bookings by status"
  totalLabel="Bookings"
  parts={[{ id: "done", label: "Completed", value: 642 }]}
/>`,
    Demo: function Demo() {
      return (
        <PieChart
          ariaLabel="Bookings by status"
          totalLabel="Bookings"
          parts={[
            { id: "done", label: "Completed", value: 642 },
            { id: "conf", label: "Confirmed", value: 318 },
            { id: "pend", label: "Pending", value: 184 },
            { id: "canc", label: "Cancelled", value: 76 },
          ]}
        />
      );
    },
  },
  {
    id: "progress-field",
    name: "ProgressField",
    category: "Charts",
    summary: "A labelled bar showing progress to a target, with the percent and a note under it.",
    scenario: "Analytics page: monthly goals.",
    whenToUse: ["Progress to a target or limit.", "An upload or export that is running."],
    avoid: ["A single bar with no label (use ProgressBar inside a table or list row)."],
    source: "components/ui/progress-field.tsx",
    code: `<ProgressField label="Revenue" value={78} hint="827,400 of 1,060,000 ETB" />
<ProgressField label="Bookings" value={100} tone="success" hint="Target reached" />`,
    Demo: function Demo() {
      return (
        <div className="flex max-w-md flex-col gap-5">
          <ProgressField label="Revenue" value={78} hint="827,400 of 1,060,000 ETB" />
          <ProgressField label="Bookings" value={100} tone="success" hint="Target reached" />
        </div>
      );
    },
  },
  {
    id: "progress-bar",
    name: "ProgressBar",
    category: "Charts",
    summary: "A thin bar for progress inside a row or card, such as stock level or storage used.",
    scenario: "Inside a table row or a card, next to a number.",
    whenToUse: ["Small progress or level next to a figure.", "An unknown total (indeterminate)."],
    avoid: ["Progress that needs a label and a percent (use ProgressField)."],
    source: "components/ui/progress-bar.tsx",
    code: `<ProgressBar value={64} />
<ProgressBar value={0} indeterminate />`,
    Demo: function Demo() {
      return (
        <div className="flex max-w-md flex-col gap-4">
          <ProgressBar value={64} />
          <ProgressBar value={0} indeterminate />
        </div>
      );
    },
  },
];
