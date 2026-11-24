"use client";

import { useEffect, useState } from "react";
import { Button } from "../../../components/ui/button";
import { Card, CardGrid, CardHeader } from "../../../components/ui/card";
import { BarChart } from "../../../components/charts/bar-chart";
import { Heatmap } from "../../../components/charts/heatmap";
import { LineChart } from "../../../components/charts/line-chart";
import { RankedBars } from "../../../components/charts/ranked-bars";
import { PieChart } from "../../../components/charts/pie-chart";
import { DateRangePicker } from "../../../components/ui/date-range-picker";
import type { DateRange } from "../../../components/ui/date-range-picker";
import { DownloadIcon, UserIcon, CardIcon, ScheduleIcon } from "../../../components/ui/icons";
import { KpiCard } from "../../../components/ui/kpi-card";
import { ProgressField } from "../../../components/ui/progress-field";
import { Pill } from "../../../components/ui/pill";
import { Table } from "../../../components/ui/table";
import type { ColumnDef } from "../../../components/ui/table";
import { toast } from "../../../components/ui/toaster";
import { formatCurrency, formatDate } from "../../../lib/format";

// Mock data — replace with your own queries.
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov"];
const REVENUE_NOW = [42000, 51000, 47000, 63000, 58000, 74000, 69000, 82000, 88000, 95000, 112000];
const REVENUE_LAST = [38000, 40000, 44000, 46000, 52000, 55000, 59000, 61000, 64000, 70000, 76000];

const REGIONS = [
  { id: "aa", label: "Addis Ababa", value: 412000, meta: "42% of sales" },
  { id: "or", label: "Oromia", value: 226000, meta: "23% of sales" },
  { id: "am", label: "Amhara", value: 167000, meta: "17% of sales" },
  { id: "ti", label: "Tigray", value: 78000, meta: "8% of sales" },
  { id: "ot", label: "Other regions", value: 98000, meta: "10% of sales" },
];

const WEEK_NOW = [118, 132, 141, 127, 168, 202, 96];
const WEEK_LAST = [104, 121, 130, 133, 149, 188, 90];

const BOOKING_STATUS = [
  { id: "done", label: "Completed", value: 642 },
  { id: "conf", label: "Confirmed", value: 318 },
  { id: "pend", label: "Pending", value: 184 },
  { id: "canc", label: "Cancelled", value: 76 },
];

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const HOURS = ["8", "10", "12", "14", "16", "18", "20"];
const ORDERS_BY_TIME = [
  [6, 14, 22, 18, 20, 12, 5],
  [7, 15, 24, 19, 21, 13, 6],
  [8, 16, 26, 22, 23, 15, 6],
  [8, 17, 25, 21, 24, 16, 7],
  [10, 21, 33, 28, 31, 24, 12],
  [14, 28, 40, 36, 38, 30, 18],
  [4, 9, 16, 14, 12, 8, 3],
];

interface Report {
  id: string;
  name: string;
  period: string;
  format: "PDF" | "CSV" | "Excel";
  created: string;
}

const REPORTS: Report[] = [
  { id: "r1", name: "Monthly revenue summary", period: "October 2026", format: "PDF", created: "2026-11-01" },
  { id: "r2", name: "Customer growth", period: "Q3 2026", format: "Excel", created: "2026-10-04" },
  { id: "r3", name: "Payment methods breakdown", period: "October 2026", format: "CSV", created: "2026-11-01" },
  { id: "r4", name: "Weekly operations review", period: "Oct 26 – Nov 1", format: "PDF", created: "2026-11-02" },
];

const reportColumns: ColumnDef<Report>[] = [
  { key: "name", header: "Report", primary: true, sortable: true, accessor: (r) => r.name },
  { key: "period", header: "Period", accessor: (r) => r.period },
  { key: "format", header: "Format", filterValue: (r) => r.format, render: (r) => <Pill>{r.format}</Pill> },
  { key: "created", header: "Created", sortable: true, accessor: (r) => formatDate(r.created) },
];

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [dates, setDates] = useState<DateRange>({ start: "2026-10-01", end: "2026-10-31" });

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 400);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h1 className="type-h1 m-0 text-text">Analytics</h1>
        <div className="flex items-center gap-2">
          <DateRangePicker className="w-64" value={dates} onValueChange={setDates} align="end" />
          <Button className="flex-none" onClick={() => toast.success("Export started", { body: "Your file will download when it is ready." })}>
            <DownloadIcon className="size-4" />
            <span>Export</span>
          </Button>
        </div>
      </div>

      <CardGrid size="narrow">
        <KpiCard
          label="Revenue"
          value="827,400"
          unit="ETB"
          trend={{ direction: "up", value: "14.2%", label: "vs previous period" }}
          icon={<CardIcon />}
          spark={[4, 5, 4, 6, 5, 7, 6, 9]}
          loading={loading}
        />
        <KpiCard
          label="New customers"
          value="962"
          trend={{ direction: "up", value: "29%", label: "vs previous period" }}
          icon={<UserIcon />}
          spark={[3, 4, 3, 5, 4, 6, 5, 8]}
          loading={loading}
        />
        <KpiCard
          label="Bookings"
          value="1,489"
          trend={{ direction: "down", value: "3.1%", label: "vs previous period" }}
          icon={<ScheduleIcon />}
          spark={[9, 8, 9, 7, 8, 6, 7, 6]}
          loading={loading}
        />
        <KpiCard
          label="Average order"
          value="1,240"
          unit="ETB"
          trend={{ label: "No change" }}
          icon={<CardIcon />}
          spark={[5, 5, 6, 5, 5, 6, 5, 5]}
          loading={loading}
        />
      </CardGrid>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Revenue" subtitle="Monthly, ETB. This year against last year." />
          <LineChart
            ariaLabel="Revenue by month, this year and last year"
            labels={MONTHS}
            format={(v) => formatCurrency(v)}
            series={[
              { id: "prev", label: "Last year", tone: "muted", values: REVENUE_LAST },
              { id: "now", label: "This year", tone: "accent", values: REVENUE_NOW },
            ]}
          />
        </Card>
        <Card>
          <CardHeader title="Sales by region" subtitle="Share of this period" />
          <RankedBars
            ariaLabel="Sales by region"
            format={(v) => formatCurrency(v)}
            items={REGIONS}
          />
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Orders this week" subtitle="Compared with the week before" />
          <BarChart
            ariaLabel="Orders by weekday, this week and last week"
            labels={DAYS}
            format={(v) => `${v} orders`}
            series={[
              { id: "prev", label: "Last week", tone: "muted", values: WEEK_LAST },
              { id: "now", label: "This week", tone: "accent", values: WEEK_NOW },
            ]}
          />
        </Card>
        <Card>
          <CardHeader title="Goals this month" subtitle="Progress to target" />
          <div className="flex flex-col gap-5">
            <ProgressField label="Revenue" value={78} hint="827,400 of 1,060,000 ETB" />
            <ProgressField label="New customers" value={64} hint="962 of 1,500" />
            <ProgressField label="Bookings" value={100} tone="success" hint="Target reached" />
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Bookings by status" subtitle="This period" />
          <PieChart ariaLabel="Bookings by status" totalLabel="Bookings" parts={BOOKING_STATUS} />
        </Card>
        <Card>
          <CardHeader title="Busiest times" subtitle="Orders by day and hour" />
          <Heatmap ariaLabel="Orders by day and hour" rows={DAYS} columns={HOURS} values={ORDERS_BY_TIME} format={(v) => `${v} orders`} />
        </Card>
      </div>

      <Table
        title="Saved reports"
        columns={reportColumns}
        data={REPORTS}
        getRowId={(r) => r.id}
        loading={loading}
        filters={false}
        pagination={false}
        onRowClick={(r) => toast.info(`${r.name}`, { body: `${r.format} · ${r.period}` })}
      />
    </div>
  );
}
