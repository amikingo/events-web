"use client";

import { useEffect, useMemo, useState } from "react";
import { PieChart } from "../../../components/charts/pie-chart";
import { RankedBars } from "../../../components/charts/ranked-bars";
import { Card, CardHeader } from "../../../components/ui/card";
import { CardIcon, DocIcon, ScheduleIcon } from "../../../components/ui/icons";
import { KpiCard } from "../../../components/ui/kpi-card";
import { SegmentedControl } from "../../../components/ui/segmented-control";
import { StatusPill } from "../../../components/ui/status-pill";
import { Table } from "../../../components/ui/table";
import type { ColumnDef } from "../../../components/ui/table";
import { formatCurrency, formatDate } from "../../../lib/format";

interface OrderLine {
  name: string;
  quantity: number;
  unitPrice: number;
}

interface Order {
  id: string;
  customer: string;
  date: string; // ISO
  status: "new" | "packed" | "delivered" | "returned";
  delivery: number;
  lines: OrderLine[];
}

// Mock data — replace with your own queries.
const ORDERS: Order[] = [
  {
    id: "ORD-3018",
    customer: "Hana Bekele",
    date: "2026-11-08",
    status: "new",
    delivery: 150,
    lines: [
      { name: "Yirgacheffe beans, 1 kg", quantity: 2, unitPrice: 1250 },
      { name: "Clay jebena, medium", quantity: 1, unitPrice: 950 },
    ],
  },
  {
    id: "ORD-3017",
    customer: "Dawit Alemu",
    date: "2026-11-07",
    status: "packed",
    delivery: 0,
    lines: [
      { name: "Sidamo beans, 1 kg", quantity: 5, unitPrice: 1100 },
      { name: "Spiced tea blend, 100 g", quantity: 4, unitPrice: 260 },
      { name: "Roasted barley (kolo), 500 g", quantity: 6, unitPrice: 180 },
    ],
  },
  {
    id: "ORD-3016",
    customer: "Selam Tadesse",
    date: "2026-11-06",
    status: "delivered",
    delivery: 150,
    lines: [{ name: "Manual coffee grinder", quantity: 1, unitPrice: 2300 }],
  },
  {
    id: "ORD-3015",
    customer: "Abel Girma",
    date: "2026-11-05",
    status: "delivered",
    delivery: 150,
    lines: [
      { name: "Green tea, 50 bags", quantity: 3, unitPrice: 340 },
      { name: "Spiced tea blend, 100 g", quantity: 2, unitPrice: 260 },
    ],
  },
  {
    id: "ORD-3014",
    customer: "Liya Mengistu",
    date: "2026-11-03",
    status: "returned",
    delivery: 150,
    lines: [{ name: "Ground coffee, 250 g", quantity: 3, unitPrice: 420 }],
  },
  {
    id: "ORD-3013",
    customer: "Meron Haile",
    date: "2026-11-02",
    status: "delivered",
    delivery: 0,
    lines: [
      { name: "Yirgacheffe beans, 1 kg", quantity: 4, unitPrice: 1250 },
      { name: "Green tea, 50 bags", quantity: 2, unitPrice: 340 },
    ],
  },
  {
    id: "ORD-3012",
    customer: "Yonas Kebede",
    date: "2026-11-01",
    status: "delivered",
    delivery: 150,
    lines: [
      { name: "Clay jebena, medium", quantity: 2, unitPrice: 950 },
      { name: "Roasted barley (kolo), 500 g", quantity: 3, unitPrice: 180 },
    ],
  },
  {
    id: "ORD-3011",
    customer: "Kazanchis Wellness Hub",
    date: "2026-10-31",
    status: "packed",
    delivery: 0,
    lines: [
      { name: "Sidamo beans, 1 kg", quantity: 8, unitPrice: 1100 },
      { name: "Manual coffee grinder", quantity: 2, unitPrice: 2300 },
    ],
  },
];

const VAT_RATE = 0.15;
const subtotalOf = (o: Order) => o.lines.reduce((sum, l) => sum + l.quantity * l.unitPrice, 0);
const vatOf = (o: Order) => Math.round(subtotalOf(o) * VAT_RATE);
const totalOf = (o: Order) => subtotalOf(o) + vatOf(o) + o.delivery;
const itemCount = (o: Order) => o.lines.reduce((sum, l) => sum + l.quantity, 0);

const columns: ColumnDef<Order>[] = [
  { key: "id", header: "Order", filter: false, filterValue: (r) => r.id, accessor: (r) => <span className="font-mono text-text-faint">{r.id}</span> },
  { key: "customer", header: "Customer", primary: true, sortable: true, accessor: (r) => r.customer },
  { key: "date", header: "Date", sortable: true, accessor: (r) => formatDate(r.date) },
  { key: "items", header: "Items", numeric: true, filterValue: (r) => itemCount(r), accessor: (r) => itemCount(r) },
  { key: "status", header: "Status", mobile: "badge", filterValue: (r) => r.status, render: (r) => <StatusPill kind="order" status={r.status} /> },
  { key: "total", header: "Total", numeric: true, sortable: true, filterValue: (r) => totalOf(r), accessor: (r) => formatCurrency(totalOf(r)) },
];

type Filter = "all" | Order["status"];

const STATUS_LABEL: Record<Order["status"], string> = { new: "New", packed: "Packed", delivered: "Delivered", returned: "Returned" };

export default function OrdersPage() {
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 400);
    return () => clearTimeout(t);
  }, []);

  const count = (status: Order["status"]) => ORDERS.filter((o) => o.status === status).length;
  const kept = ORDERS.filter((o) => o.status !== "returned");
  const revenue = kept.reduce((sum, o) => sum + totalOf(o), 0);
  const awaiting = count("new") + count("packed");

  // Best sellers: the four products with the most sold, by amount, from the orders that were kept.
  const sold = new Map<string, number>();
  for (const o of kept) for (const l of o.lines) sold.set(l.name, (sold.get(l.name) ?? 0) + l.quantity * l.unitPrice);
  const topProducts = [...sold.entries()]
    .sort((x, y) => y[1] - x[1])
    .slice(0, 4)
    .map(([name, value]) => ({ id: name, label: name, value }));

  const visible = filter === "all" ? ORDERS : ORDERS.filter((o) => o.status === filter);

  const expandable = useMemo(
    () => ({
      columns: [
        { key: "item", header: "Item", primary: true },
        { key: "qty", header: "Qty", numeric: true },
        { key: "price", header: "Unit price", numeric: true },
        { key: "amount", header: "Amount", numeric: true },
      ],
      rows: (o: Order) =>
        o.lines.map((l) => ({
          item: l.name,
          qty: l.quantity,
          price: formatCurrency(l.unitPrice),
          amount: formatCurrency(l.quantity * l.unitPrice),
        })),
      totals: (o: Order) => [
        { label: "Subtotal", value: formatCurrency(subtotalOf(o)) },
        { label: "VAT (15%)", value: formatCurrency(vatOf(o)) },
        { label: "Delivery", value: o.delivery === 0 ? "Free" : formatCurrency(o.delivery) },
        { label: "Total", value: formatCurrency(totalOf(o)) },
      ],
    }),
    [],
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="type-h1 m-0 text-text">Orders</h1>
        <p className="type-body m-0 text-text-soft">What customers bought, and what still needs to go out.</p>
      </div>

      {/* Mock trends — replace with figures from your own data. */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Orders" value={String(ORDERS.length)} trend={{ direction: "up", value: "12%", label: "vs last week" }} icon={<DocIcon />} spark={[3, 4, 3, 5, 4, 6, 5, 8]} loading={loading} />
        <KpiCard label="Sales" value={formatCurrency(revenue, { unit: false })} unit="ETB" trend={{ direction: "up", value: "9.4%", label: "vs last week" }} icon={<CardIcon />} spark={[4, 5, 4, 6, 6, 7, 7, 9]} loading={loading} />
        <KpiCard label="Average order" value={formatCurrency(Math.round(revenue / kept.length), { unit: false })} unit="ETB" trend={{ label: "No change" }} icon={<CardIcon />} spark={[5, 5, 6, 5, 5, 6, 5, 5]} loading={loading} />
        <KpiCard label="Waiting to go out" value={String(awaiting)} trend={{ direction: "down", value: "2", label: "since yesterday" }} icon={<ScheduleIcon />} spark={[6, 5, 6, 4, 5, 4, 3, 3]} loading={loading} />
      </div>

      <div className="flex flex-col gap-3">
        <SegmentedControl
          aria-label="Filter orders by status"
          value={filter}
          onValueChange={(v) => setFilter(v as Filter)}
          options={[
            { value: "all", label: "All", count: ORDERS.length },
            { value: "new", label: "New", count: count("new") },
            { value: "packed", label: "Packed", count: count("packed") },
            { value: "delivered", label: "Delivered", count: count("delivered") },
            { value: "returned", label: "Returned", count: count("returned") },
          ]}
        />

        <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
          <Table
            title={filter === "all" ? "All orders" : `${STATUS_LABEL[filter]} orders`}
            columns={columns}
            data={visible}
            getRowId={(o) => o.id}
            loading={loading}
            expandable={expandable}
          />

          <div className="flex flex-col gap-4">
            <Card>
              <CardHeader title="Orders by status" subtitle="All orders" />
              <PieChart
                ariaLabel="Orders by status"
                totalLabel="Orders"
                size={150}
                layout="stacked"
                parts={(["delivered", "packed", "new", "returned"] as const).map((s) => ({ id: s, label: STATUS_LABEL[s], value: count(s) }))}
              />
            </Card>
            <Card>
              <CardHeader title="Top products" subtitle="By amount sold" />
              <RankedBars ariaLabel="Top products by amount sold" format={(v) => formatCurrency(v)} items={topProducts} />
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
