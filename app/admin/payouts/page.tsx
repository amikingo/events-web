"use client";

import { useEffect, useMemo, useState } from "react";
import { InfoCard } from "../../../components/ui/info-card";
import { PayLogo } from "../../../components/ui/pay-logo";
import type { PayLogoMethod } from "../../../components/ui/pay-logo";
import { StatusPill } from "../../../components/ui/status-pill";
import { Table } from "../../../components/ui/table";
import type { ColumnDef } from "../../../components/ui/table";
import { formatCurrency, formatDate } from "../../../lib/format";

interface PayoutPayment {
  reference: string;
  customer: string;
  amount: number;
}

interface Payout {
  id: string;
  date: string; // ISO
  method: "Telebirr" | "CBE Birr";
  status: "paid" | "pending" | "failed" | "refunded";
  payments: PayoutPayment[];
}

// Mock data — replace with your own queries.
const PAYOUTS: Payout[] = [
  {
    id: "PO-1042",
    date: "2026-11-08",
    method: "Telebirr",
    status: "pending",
    payments: [
      { reference: "TB-77A19C", customer: "Hana Bekele", amount: 2550 },
      { reference: "TB-77A0B2", customer: "Dire Dawa City Mall", amount: 38900 },
      { reference: "TB-76E991", customer: "Kazanchis Wellness Hub", amount: 14200 },
    ],
  },
  {
    id: "PO-1041",
    date: "2026-11-07",
    method: "CBE Birr",
    status: "paid",
    payments: [
      { reference: "CBE-20931", customer: "Addis Sport Park", amount: 800 },
      { reference: "CBE-19842", customer: "Awash Delivery Fleet", amount: 4500 },
    ],
  },
  {
    id: "PO-1040",
    date: "2026-11-06",
    method: "Telebirr",
    status: "paid",
    payments: [
      { reference: "TB-75C210", customer: "Bole Branch Cafe", amount: 1200 },
      { reference: "TB-75B804", customer: "Meron Haile", amount: 6400 },
      { reference: "TB-75A377", customer: "Yonas Kebede", amount: 3100 },
      { reference: "TB-759F12", customer: "Liya Mengistu", amount: 950 },
    ],
  },
  {
    id: "PO-1039",
    date: "2026-11-05",
    method: "CBE Birr",
    status: "failed",
    payments: [{ reference: "CBE-19611", customer: "Selam Tadesse", amount: 9800 }],
  },
];

const FEE_RATE = 0.015;
const grossOf = (p: Payout) => p.payments.reduce((sum, x) => sum + x.amount, 0);
const feeOf = (p: Payout) => Math.round(grossOf(p) * FEE_RATE);
const netOf = (p: Payout) => grossOf(p) - feeOf(p);
const logoOf = (m: Payout["method"]): PayLogoMethod => (m === "CBE Birr" ? "cbe" : "telebirr");

const columns: ColumnDef<Payout>[] = [
  { key: "id", header: "Payout", filter: false, filterValue: (r) => r.id, accessor: (r) => <span className="font-mono text-text-faint">{r.id}</span> },
  { key: "date", header: "Date", primary: true, sortable: true, accessor: (r) => formatDate(r.date) },
  {
    key: "method",
    header: "Sent through",
    filterValue: (r) => r.method,
    render: (r) => (
      <span className="flex items-center gap-2">
        <PayLogo method={logoOf(r.method)} size={24} />
        {r.method}
      </span>
    ),
  },
  { key: "count", header: "Payments", numeric: true, filterValue: (r) => r.payments.length, accessor: (r) => r.payments.length },
  { key: "status", header: "Status", mobile: "badge", filterValue: (r) => r.status, render: (r) => <StatusPill kind="payment" status={r.status} /> },
  { key: "net", header: "You receive", numeric: true, sortable: true, filterValue: (r) => netOf(r), accessor: (r) => <span className="font-medium text-text">{formatCurrency(netOf(r))}</span> },
];

export default function PayoutsPage() {
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 400);
    return () => clearTimeout(t);
  }, []);

  const expandable = useMemo(
    () => ({
      columns: [
        { key: "ref", header: "Reference", primary: true },
        { key: "customer", header: "Customer" },
        { key: "amount", header: "Amount", numeric: true },
        { key: "fee", header: "Fee", numeric: true },
        { key: "net", header: "Net", numeric: true },
      ],
      rows: (p: Payout) =>
        p.payments.map((x) => {
          const fee = Math.round(x.amount * FEE_RATE);
          return {
            ref: <span className="font-mono">{x.reference}</span>,
            customer: x.customer,
            amount: formatCurrency(x.amount),
            fee: formatCurrency(fee),
            net: formatCurrency(x.amount - fee),
          };
        }),
      totals: (p: Payout) => [
        { label: "Payments", value: formatCurrency(grossOf(p)) },
        { label: "Fees (1.5%)", value: formatCurrency(feeOf(p)) },
        { label: "You receive", value: formatCurrency(netOf(p)) },
      ],
    }),
    [],
  );

  const latest = [...PAYOUTS].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="type-h1 m-0 text-text">Payouts</h1>
        <p className="type-body m-0 text-text-soft">Money on its way to your account, and the payments inside each batch.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {latest.map((p) => (
          <InfoCard
            key={p.id}
            title={p.method}
            subtitle={`${p.id} · ${formatDate(p.date)}`}
            status={<StatusPill kind="payment" status={p.status} />}
            rows={[
              { label: "Payments", value: `${p.payments.length}` },
              { label: "Amount", value: formatCurrency(grossOf(p)) },
              { label: "Fees (1.5%)", value: formatCurrency(feeOf(p)) },
            ]}
            total={{ label: "You receive", value: formatCurrency(netOf(p)) }}
          />
        ))}
      </div>

      <Table title="All payouts" columns={columns} data={PAYOUTS} getRowId={(p) => p.id} loading={loading} expandable={expandable} />
    </div>
  );
}
