"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "../../../components/ui/button";
import { CardHeader, Card, CardLink } from "../../../components/ui/card";
import { LineChart } from "../../../components/charts/line-chart";
import { ChartCard } from "../../../components/ui/chart-card";
import type { ChartRange } from "../../../components/ui/chart-card";
import { CardIcon, PlusIcon, UserIcon, ScheduleIcon } from "../../../components/ui/icons";
import { DateRangePicker } from "../../../components/ui/date-range-picker";
import type { DateRange } from "../../../components/ui/date-range-picker";
import { KpiCard } from "../../../components/ui/kpi-card";
import { ListCard } from "../../../components/ui/list-card";
import { Table } from "../../../components/ui/table";
import type { ColumnDef } from "../../../components/ui/table";
import { StatusPill } from "../../../components/ui/status-pill";
import { formatCurrency } from "../../../lib/format";

// Mock data — replace with your own queries.
const KPIS = [
  { id: "sales", label: "Total sales", value: "248,780", unit: "ETB", trend: { direction: "up" as const, value: "49%", label: "vs last week" }, spark: [4, 5, 4, 6, 5, 7, 6, 9, 8, 10] },
  { id: "orders", label: "Orders", value: "1,489", trend: { direction: "down" as const, value: "14%", label: "vs last week" }, spark: [9, 8, 9, 7, 8, 6, 7, 5, 6, 5] },
  { id: "customers", label: "New customers", value: "962", trend: { direction: "up" as const, value: "29%", label: "vs last week" }, spark: [3, 4, 3, 5, 4, 6, 5, 7, 8, 9] },
  { id: "average", label: "Average order", value: "1,240", unit: "ETB", trend: { direction: "up" as const, value: "3.4%", label: "vs last week" }, spark: [5, 5, 6, 5, 6, 6, 7, 7, 8, 8] },
];

const RANGES_REVENUE: ChartRange[] = [
  { label: "Last 6 months", value: "6", values: [32, 48, 41, 66, 58, 82], axis: ["Jun", "Jul", "Aug", "Sep", "Oct", "Nov"] },
  { label: "Last 12 months", value: "12", values: [22, 30, 28, 36, 32, 48, 41, 52, 58, 66, 70, 82], axis: ["Dec", "Mar", "Jun", "Nov"] },
];

const WEEK_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const ORDERS_THIS_WEEK = [118, 132, 141, 127, 168, 202, 96];
const ORDERS_LAST_WEEK = [104, 121, 130, 133, 149, 188, 90];

interface Channel {
  id: string;
  source: string;
  visitors: number;
  revenue: number;
  sales: number;
  status: string;
}

const CHANNELS: Channel[] = [
  { id: "c1", source: "Website", visitors: 2400, revenue: 387700, sales: 267, status: "paid" },
  { id: "c2", source: "Mobile app", visitors: 2200, revenue: 342600, sales: 249, status: "paid" },
  { id: "c3", source: "Telegram", visitors: 1800, revenue: 218400, sales: 192, status: "pending" },
  { id: "c4", source: "Referrals", visitors: 1200, revenue: 124000, sales: 98, status: "paid" },
];

const REGIONS = [
  { id: "r1", name: "Addis Ababa", meta: "42% of sales", amount: "104,500 ETB" },
  { id: "r2", name: "Oromia", meta: "23% of sales", amount: "57,200 ETB" },
  { id: "r3", name: "Amhara", meta: "17% of sales", amount: "42,300 ETB" },
  { id: "r4", name: "Tigray", meta: "8% of sales", amount: "19,900 ETB" },
];

const channelColumns: ColumnDef<Channel>[] = [
  { key: "source", header: "Source", primary: true, sortable: true, accessor: (r) => r.source },
  { key: "visitors", header: "Visitors", numeric: true, sortable: true, filterValue: (r) => r.visitors, accessor: (r) => r.visitors.toLocaleString("en-US") },
  { key: "revenue", header: "Revenue", numeric: true, sortable: true, filterValue: (r) => r.revenue, accessor: (r) => formatCurrency(r.revenue) },
  { key: "sales", header: "Sales", numeric: true, sortable: true, filterValue: (r) => r.sales, accessor: (r) => r.sales },
  { key: "status", header: "Status", filterValue: (r) => r.status, render: (r) => <StatusPill kind="payment" status={r.status} /> },
];

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [dates, setDates] = useState<DateRange>({ start: "2026-11-01", end: "2026-11-08" });

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 400);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="flex flex-col gap-6">
      {/* Title row: page title on the left, date range and the one primary action on the right. */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h1 className="type-h1 m-0 text-text">Dashboard</h1>
        <div className="flex items-center gap-2">
          <DateRangePicker className="w-64" value={dates} onValueChange={setDates} align="end" />
          <Button className="flex-none" onClick={() => router.push("/admin/payments/new")}>
            <PlusIcon className="size-4" />
            <span>New payment</span>
          </Button>
        </div>
      </div>

      {/* Row 1: three key figures with their trend. */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {KPIS.map((k) => (
          <KpiCard key={k.id} label={k.label} value={k.value} unit={k.unit} trend={k.trend} spark={k.spark} loading={loading} />
        ))}
      </div>

      {/* Row 2: two charts side by side. */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard
          title="Revenue"
          subtitle="Monthly, ETB"
          value="827,400 ETB"
          change="↑ 14.2%"
          ranges={RANGES_REVENUE}
          legend={["This period", "Previous period"]}
          loading={loading}
        />
        <Card>
          <CardHeader title="Orders" subtitle="This week against last week" />
          <LineChart
            ariaLabel="Orders by weekday, this week and last week"
            labels={WEEK_DAYS}
            format={(v) => `${v} orders`}
            series={[
              { id: "prev", label: "Last week", tone: "muted", values: ORDERS_LAST_WEEK },
              { id: "now", label: "This week", tone: "accent", values: ORDERS_THIS_WEEK },
            ]}
          />
        </Card>
      </div>

      {/* Row 3: a short ranked list beside the wider table. */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <ListCard
          title="Top regions"
          subtitle="By sales this period"
          loading={loading}
          rows={REGIONS.map((r) => ({
            leading: <UserIcon className="size-4 text-text-soft" />,
            name: r.name,
            meta: r.meta,
            amount: r.amount,
          }))}
        />
        <div className="lg:col-span-2">
          <Table
            title="Top channels"
            columns={channelColumns}
            data={CHANNELS}
            getRowId={(r) => r.id}
            loading={loading}
            toolbar={false}
            pagination={false}
            filters={false}
          />
        </div>
      </div>

      {/* Row 4: shortcuts to common tasks. */}
      <Card>
        <CardHeader
          title="Shortcuts"
          subtitle="Common tasks"
          action={<CardLink href="/admin/payments">All payments</CardLink>}
        />
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => router.push("/admin/payments/new")}>
            <CardIcon className="size-4" />
            <span>Record payment</span>
          </Button>
          <Button variant="secondary" onClick={() => router.push("/admin/settings")}>
            <ScheduleIcon className="size-4" />
            <span>Open settings</span>
          </Button>
        </div>
      </Card>
    </div>
  );
}
