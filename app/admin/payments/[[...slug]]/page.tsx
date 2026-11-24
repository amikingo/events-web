"use client";

import { usePathname } from "next/navigation";
import { Suspense, useSyncExternalStore, useState } from "react";
import { Button } from "../../../../components/ui/button";
import { Card, CardGrid } from "../../../../components/ui/card";
import { Chip } from "../../../../components/ui/chip";
import { CardIcon, DownloadIcon, PlusIcon, ShieldIcon } from "../../../../components/ui/icons";
import { KpiCard } from "../../../../components/ui/kpi-card";
import { PayLogo } from "../../../../components/ui/pay-logo";
import type { PayLogoMethod } from "../../../../components/ui/pay-logo";
import { Pill } from "../../../../components/ui/pill";
import {
  RecordHeading,
  RecordKv,
  RecordRailCard,
  RecordRows,
} from "../../../../components/ui/record-view";
import {
  RecordWorkspace,
  parseRecordPath,
  recordPath,
} from "../../../../components/ui/record-workspace";
import { SegmentedControl } from "../../../../components/ui/segmented-control";
import { StatusPill } from "../../../../components/ui/status-pill";
import { Table } from "../../../../components/ui/table";
import type { ColumnDef } from "../../../../components/ui/table";
import { toast } from "../../../../components/ui/toaster";
import { formatCurrency, formatDate } from "../../../../lib/format";
import { paymentsService } from "../../../../lib/services/payments-service";
import type { Payment } from "../../../../types";
import { PaymentForm, feeOf, parseAmount } from "./payment-form";
import type { PaymentFormValues } from "./payment-form";

function useLivePayments(): Payment[] {
  return useSyncExternalStore(
    (cb) => paymentsService.subscribe(cb),
    () => paymentsService.getSnapshot(),
    () => paymentsService.getSnapshot(),
  );
}

const methods: PayLogoMethod[] = ["telebirr", "cbe", "wallet"];
const logoOf = (m: Payment["method"]): PayLogoMethod => {
  if (m === "CBE Birr") return "cbe";
  if (m === "Wallet") return "wallet";
  return "telebirr";
};

// Columns configuration
const columns: ColumnDef<Payment>[] = [
  {
    key: "id",
    header: "Payment ID",
    filter: false,
    filterValue: (r) => r.id,
    accessor: (r) => <span className="font-mono text-text-faint">{r.id}</span>,
  },
  {
    key: "customer",
    header: "Payer / Customer",
    primary: true,
    sortable: true,
    accessor: (r) => (
      <div className="min-w-0">
        <div className="type-body font-semibold text-text">{r.customer}</div>
        <div className="type-body-sm font-mono text-text-faint">{r.reference}</div>
      </div>
    ),
  },
  {
    key: "method",
    header: "Gateway Rail",
    accessor: (r) => (
      <div className="flex items-center gap-2">
        <PayLogo method={logoOf(r.method)} size={24} />
        <span className="type-body-sm text-text font-medium">{r.method}</span>
      </div>
    ),
  },
  {
    key: "status",
    header: "Settlement Status",
    filterValue: (r) => r.status,
    render: (r) => <StatusPill kind="payment" status={r.status} />,
  },
  {
    key: "amount",
    header: "Gross (ETB)",
    numeric: true,
    sortable: true,
    filterValue: (r) => r.amount,
    accessor: (r) => formatCurrency(r.amount, { unit: false }),
  },
  {
    key: "fee",
    header: "Fee (ETB)",
    numeric: true,
    accessor: (r) => (
      <span className="text-text-faint">{formatCurrency(r.fee, { unit: false })}</span>
    ),
  },
  {
    key: "net",
    header: "Net (ETB)",
    numeric: true,
    sortable: true,
    accessor: (r) => (
      <span className="font-medium text-text">{formatCurrency(r.amount - r.fee, { unit: false })}</span>
    ),
  },
  {
    key: "date",
    header: "Transaction Date",
    sortable: true,
    accessor: (r) => formatDate(r.date),
  },
];

// Sections for Create / Edit full-page form
const sections = [
  {
    id: "details",
    title: "Transaction Details",
    hint: "Payer information, sovereign payment rail, and gross transaction amount.",
    fields: [
      {
        name: "customer",
        label: "Payer / Customer Name",
        required: true,
        requiredMessage: "Enter customer or organization name.",
        full: true,
      },
      {
        name: "method",
        label: "Payment Rail",
        type: "select" as const,
        required: true,
        requiredMessage: "Select gateway rail.",
        options: [
          { label: "Telebirr (SuperApp Switch)", value: "Telebirr" },
          { label: "CBE Birr (Account Settlement)", value: "CBE Birr" },
          { label: "Wallet (Internal Ledger)", value: "Wallet" },
        ],
      },
      {
        name: "amount",
        label: "Gross Amount (ETB)",
        required: true,
        requiredMessage: "Enter payment amount in ETB.",
        validate: (v: string) =>
          Number(v.replace(/,/g, "")) > 0 ? undefined : "Enter an amount greater than 0.",
      },
    ],
  },
  {
    id: "notes",
    title: "Settlement Remarks",
    fields: [
      {
        name: "note",
        label: "Internal Audit Remark",
        type: "textarea" as const,
        full: true,
        hint: "Remarks for internal compliance and treasury audit.",
      },
    ],
  },
];

type RailFilter = "all" | "Telebirr" | "CBE Birr" | "Wallet";

/** Change the address without rebuilding the page (so a record page loads once). */
function go(path: string) {
  window.history.pushState(null, "", path);
}

function PaymentsView() {
  const pathname = usePathname();
  const allPayments = useLivePayments();
  const location = parseRecordPath("/admin/payments", pathname);
  const [railFilter, setRailFilter] = useState<RailFilter>("all");

  // Record and edit are their own pages with their own layout (not the workspace's built-in form).
  if (location.mode === "create" || location.mode === "edit") {
    const existing = location.mode === "edit" ? allPayments.find((p) => p.id === location.id) : undefined;
    const save = (values: PaymentFormValues) => {
      const amount = parseAmount(values.amount);
      if (existing) {
        paymentsService.update(existing.id, { customer: values.customer, phone: values.phone, method: values.method, amount, fee: feeOf(amount), note: values.note });
        toast.success("Changes saved");
        go(`/admin/payments/${existing.id}`);
      } else {
        const created: Payment = {
          id: `PAY-${8842 + Math.floor(Math.random() * 1000)}`,
          customer: values.customer,
          phone: values.phone,
          method: values.method,
          amount,
          fee: feeOf(amount),
          status: "paid",
          date: new Date().toISOString().slice(0, 10),
          reference: `${values.method === "CBE Birr" ? "CBE" : values.method === "Wallet" ? "CW" : "TB"}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
          note: values.note,
        };
        paymentsService.create(created);
        toast.success("Payment recorded", { body: `${formatCurrency(amount)} from ${values.customer}.` });
        go(`/admin/payments/${created.id}`);
      }
    };
    return <PaymentForm key={existing?.id ?? "new"} payment={existing} onSubmit={save} onCancel={() => go(existing ? `/admin/payments/${existing.id}` : "/admin/payments")} />;
  }

  const payments = allPayments.filter((p) => {
    if (railFilter === "all") return true;
    return p.method === railFilter;
  });

  const totalGross = payments.reduce((acc, p) => acc + p.amount, 0);
  const totalFees = payments.reduce((acc, p) => acc + p.fee, 0);
  const totalNet = totalGross - totalFees;

  return (
    <div className="flex flex-col gap-5">
      {/* 1 · TREASURY & FINANCIAL RAILS HERO */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="type-h1 text-text m-0">Finance & Treasury Ledger</h1>
            <Pill tone="neutral">Module 3</Pill>
          </div>
          <p className="type-body-sm text-text-soft m-0">
            Multi-tenant payment settlement, gateway reconciliation, and national rails
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Pill tone="success" dot>
            Telebirr Switch Active
          </Pill>
          <Pill tone="success" dot>
            CBE Rail Settled
          </Pill>
          <Button
            variant="secondary"
            onClick={() => toast.info("Exporting cryptographic treasury statement")}
          >
            <DownloadIcon className="size-3.5" /> Export statement
          </Button>
        </div>
      </div>

      {/* 2 · GATEWAY SUMMARY STATS STRIP */}
      <CardGrid size="narrow">
        <KpiCard
          label="Total Inflow Volume"
          value={formatCurrency(totalGross, { unit: false })}
          unit="ETB"
          trend={{ direction: "up", value: "14.2%", label: "verified" }}
          icon={<CardIcon />}
          spark={[38, 45, 52, 60, 58, 68, 75]}
          compact
        />
        <KpiCard
          label="Net Merchant Payout"
          value={formatCurrency(totalNet, { unit: false })}
          unit="ETB"
          trend={{ direction: "up", value: "98.5%", label: "T+1 clear" }}
          icon={<CardIcon />}
          spark={[35, 42, 50, 58, 56, 65, 72]}
          compact
        />
        <KpiCard
          label="Gateway Rail Fees"
          value={formatCurrency(totalFees, { unit: false })}
          unit="ETB"
          trend={{ direction: "down", value: "1.5%", label: "national rail" }}
          icon={<ShieldIcon />}
          spark={[15, 14, 13, 15, 14, 12, 11]}
          compact
        />
        <KpiCard
          label="Settlement Success Rate"
          value="99.8%"
          trend={{ value: "0%", label: "healthy" }}
          icon={<ShieldIcon />}
          spark={[99, 99, 100, 99, 100, 100, 100]}
          compact
        />
      </CardGrid>

      {/* 3 · RAIL FILTER SELECTOR */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="type-label text-text-soft mr-1">Filter by Rail:</span>
        <Chip
          selected={railFilter === "all"}
          onClick={() => setRailFilter("all")}
        >
          All Rails ({allPayments.length})
        </Chip>
        <Chip
          selected={railFilter === "Telebirr"}
          onClick={() => setRailFilter("Telebirr")}
          leading={<PayLogo method="telebirr" size={18} />}
        >
          Telebirr
        </Chip>
        <Chip
          selected={railFilter === "CBE Birr"}
          onClick={() => setRailFilter("CBE Birr")}
          leading={<PayLogo method="cbe" size={18} />}
        >
          CBE Birr
        </Chip>
        <Chip
          selected={railFilter === "Wallet"}
          onClick={() => setRailFilter("Wallet")}
          leading={<PayLogo method="wallet" size={18} />}
        >
          Wallet
        </Chip>
      </div>

      {/* 4 · RECORD WORKSPACE (LIST, PEEK PANEL, 360 FULL PAGE, CREATE/EDIT FORM) */}
      <RecordWorkspace
        fit
        inlineToasts={false}
        className="h-[calc(100vh-270px)] min-h-[520px]"
        records={payments}
        getId={(p) => p.id}
        noun="payment"
        listLabel="Payments & Settlements"
        location={location}
        // pushState (not router.push) changes the address without rebuilding the page, so the record page loads once.
        onLocationChange={(next) => go(recordPath("/admin/payments", next))}
        // THE LIST: Table with row click, sorting, pagination
        list={({ onRowClick, activeRowId, highlightIds, onVisibleRowsChange }) => (
          <Table
            columns={columns}
            data={payments}
            getRowId={(r) => r.id}
            title="Transactions Ledger"
            onRowClick={onRowClick}
            activeRowId={activeRowId}
            highlightIds={highlightIds}
            onVisibleRowsChange={onVisibleRowsChange}
            toolbarActions={
              <Button onClick={() => go("/admin/payments/new")}>
                <PlusIcon className="size-4" />
                Record payment
              </Button>
            }
            className="rounded-none border-none shadow-none"
          />
        )}
        // IDENTITY: Shared between peek panel and full 360 page
        identity={(p, api) => ({
          avatar: <PayLogo method={logoOf(p.method)} size={40} />,
          name: p.customer,
          status: <StatusPill kind="payment" status={p.status} />,
          meta: (
            <>
              <code>{p.id}</code> · {p.method} · {formatDate(p.date)}
            </>
          ),
          primary: {
            label: "Send receipt",
            onClick: () => toast.success(`Receipt dispatched to ${p.customer}`),
          },
          secondary: { label: "Edit record", onClick: () => go(`/admin/payments/${p.id}/edit`) },
          menu: [
            {
              label: "Download PDF receipt",
              onClick: () => toast.info(`Downloading official VAT invoice for ${p.id}`),
            },
            {
              label: "Copy reference code",
              onClick: () => {
                if (typeof navigator !== "undefined") {
                  navigator.clipboard?.writeText(p.reference);
                }
                toast.success("Transaction reference code copied");
              },
            },
            {
              label: "Reverse / Cancel payment",
              destructive: true,
              onClick: () =>
                api.confirm({
                  title: `Cancel transaction ${p.id}?`,
                  description:
                    "Customer will be credited back via national gateway rail. This settlement reversal cannot be undone.",
                  confirmLabel: "Authorize reversal",
                  onConfirm: async () => {
                    await paymentsService.update(p.id, { status: "failed" });
                    toast.info(`Payment ${p.id} reversed`);
                  },
                }),
            },
          ],
        })}
        // STATS STRIP: 2x2 in peek panel, 4-across on 360 page
        stats={(p) => [
          { label: "Gross Amount", value: formatCurrency(p.amount, { unit: false }), unit: "ETB" },
          { label: "Gateway Fee", value: formatCurrency(p.fee, { unit: false }), unit: "ETB" },
          { label: "Net to Merchant", value: formatCurrency(p.amount - p.fee, { unit: false }), unit: "ETB" },
          { label: "Payment Rail", value: p.method },
        ]}
        // THE PEEK PANEL: Fast inspection without route changes
        panel={(p) => (
          <div>
            <RecordHeading>Settlement Fact Sheet</RecordHeading>
            <RecordKv
              items={[
                { label: "Payer Name", value: p.customer },
                { label: "Contact Phone", value: p.phone },
                { label: "Gateway Reference", value: p.reference },
                { label: "Transaction Date", value: formatDate(p.date) },
                { label: "Net Settlement", value: formatCurrency(p.amount - p.fee) },
              ]}
            />
          </div>
        )}
        // FULL 360 PAGE: Deep tabs and side rail
        page={{
          tabs: [
            { id: "overview", label: "Ledger & Settlement" },
            { id: "timeline", label: "Audit Timeline" },
            { id: "refunds", label: "Refunds & Disputes" },
          ],
          content: (p, tab) =>
            tab === "timeline" ? (
              <div>
                <RecordHeading>Cryptographic Audit Trail</RecordHeading>
                <RecordRows
                  rows={[
                    {
                      title: "Payment Authorization Dispatched",
                      meta: `${formatDate(p.date)} · by ${p.customer}`,
                    },
                    {
                      title: p.status === "failed" ? "Gateway Clearance Declined" : "Settlement Confirmed",
                      meta: `${p.method} Rail · Gateway Ref: ${p.reference}`,
                    },
                    ...(p.status === "paid"
                      ? [{ title: "Dispatched to Merchant Settlement Ledger", meta: "Next business day T+1" }]
                      : []),
                  ]}
                />
              </div>
            ) : tab === "refunds" ? (
              <div>
                <RecordHeading>Dispute & Refund Clearance</RecordHeading>
                <RecordRows rows={[]} />
                <p className="m-0 mt-2 type-body-sm text-text-faint">
                  Zero active dispute or chargeback cases filed against this transaction reference.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <div>
                  <RecordHeading>Gateway Clearance Breakdown</RecordHeading>
                  <RecordKv
                    items={[
                      { label: "Gateway Reference", value: p.reference },
                      { label: "Payment Method Rail", value: p.method },
                      { label: "Date of Transaction", value: formatDate(p.date) },
                      { label: "Clearing Cycle", value: "T+1 Business Day" },
                      {
                        label: "Net Dispatched to Balance",
                        value: formatCurrency(p.amount - p.fee),
                      },
                    ]}
                  />
                </div>
                {p.note && (
                  <div>
                    <RecordHeading>Treasury Remarks</RecordHeading>
                    <p className="m-0 type-body-sm text-text-soft">{p.note}</p>
                  </div>
                )}
              </div>
            ),
          rail: (p) => (
            <>
              <RecordRailCard title="Customer Identity">
                <RecordKv
                  single
                  items={[
                    { label: "Client Name", value: p.customer },
                    { label: "Contact Phone", value: p.phone },
                  ]}
                />
              </RecordRailCard>
              <RecordRailCard title="Settlement Status">
                <RecordKv
                  single
                  items={[
                    {
                      label: "Clearing Status",
                      value: p.status === "paid" ? "Settled to merchant" : "Pending clearance",
                    },
                    { label: "Processing Fee (ETB)", value: formatCurrency(p.fee) },
                    { label: "Audit Stream", value: "Cryptographic Vault Verified" },
                  ]}
                />
              </RecordRailCard>
            </>
          ),
        }}
        // CREATE / EDIT FORM
        form={{
          sections,
          toValues: (p) => ({
            customer: p.customer,
            method: p.method,
            amount: String(p.amount),
            note: p.note,
          }),
          onSave: (values, existing) => {
            if (existing) {
              const updated: Payment = {
                ...existing,
                customer: values.customer!,
                method: values.method as Payment["method"],
                amount: Number(values.amount!.replace(/,/g, "")),
                note: values.note ?? "",
              };
              paymentsService.update(existing.id, updated);
              toast.success("Payment ledger updated");
              return updated;
            }

            const created: Payment = {
              id: `PAY-${8842 + Math.floor(Math.random() * 1000)}`,
              customer: values.customer!,
              phone: "+251 911 204 412",
              method: values.method as Payment["method"],
              amount: Number(values.amount!.replace(/,/g, "")),
              fee: Math.round(Number(values.amount!.replace(/,/g, "")) * 0.015),
              status: "paid",
              date: new Date().toISOString().slice(0, 10),
              reference: `TB-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
              note: values.note ?? "",
            };
            paymentsService.create(created);
            toast.success("Payment recorded successfully");
            return created;
          },
        }}
      />
    </div>
  );
}

export default function PaymentsPage() {
  return (
    <Suspense>
      <PaymentsView />
    </Suspense>
  );
}
