"use client";

import { useState } from "react";
import { Button } from "../../../components/ui/button";
import { ConfirmDialog } from "../../../components/ui/confirm-dialog";
import { KpiCard } from "../../../components/ui/kpi-card";
import { ListCard } from "../../../components/ui/list-card";
import { StatusPill } from "../../../components/ui/status-pill";
import { Table } from "../../../components/ui/table";
import { Tab, TabList, TabPanel, Tabs } from "../../../components/ui/tabs";
import { toast } from "../../../components/ui/toaster";
import type { ShowcaseEntry } from "../../showcase/types";

export const cardDialogNavEntries: ShowcaseEntry[] = [
  {
    id: "kpi-card",
    name: "KpiCard",
    category: "Cards & Lists",
    summary: "One key number with its trend.",
    scenario: "Today page: the headline figure at the top.",
    whenToUse: ["One number the reader should see first."],
    avoid: ["Four equal KpiCards in a row. Make one the focus and the rest smaller."],
    source: "components/ui/kpi-card.tsx",
    code: `<KpiCard
  label="Gross volume"
  value="4,850,200"
  unit="ETB"
  trend={{ direction: "up", value: "14.2%", label: "vs last week" }}
  spark={[3, 4, 3, 5, 6, 5, 8]}
/>`,
    Demo: function Demo() {
      return (
        <div className="max-w-sm">
          <KpiCard
            label="Gross volume"
            value="4,850,200"
            unit="ETB"
            trend={{ direction: "up", value: "14.2%", label: "vs last week" }}
            spark={[3, 4, 3, 5, 6, 5, 8]}
          />
        </div>
      );
    },
  },
  {
    id: "list-card",
    name: "ListCard",
    category: "Cards & Lists",
    summary: "A short list of recent items with an amount and a status on each row.",
    scenario: "Today page: the latest transactions.",
    whenToUse: ["A preview of the latest five or six records."],
    avoid: ["A full, filterable list (use Table)."],
    source: "components/ui/list-card.tsx",
    code: `<ListCard
  title="Recent payments"
  rows={[{ name: "Hana Bekele", meta: "Telebirr · 2:30 PM", amount: "2,550 ETB", status: <StatusPill kind="payment" status="paid" /> }]}
/>`,
    Demo: function Demo() {
      return (
        <div className="max-w-lg">
          <ListCard
            title="Recent payments"
            subtitle="Today"
            rows={[
              { name: "Hana Bekele", meta: "Telebirr · 2:30 PM", amount: "2,550 ETB", status: <StatusPill kind="payment" status="paid" /> },
              { name: "Dawit Alemu", meta: "CBE Birr · 1:05 PM", amount: "12,000 ETB", status: <StatusPill kind="payment" status="pending" /> },
              { name: "Selam Tadesse", meta: "Telebirr · 11:40 AM", amount: "800 ETB", status: <StatusPill kind="payment" status="failed" /> },
            ]}
          />
        </div>
      );
    },
  },
  {
    id: "table-expandable",
    name: "Table (expandable rows)",
    category: "Cards & Lists",
    summary: "A table where each row opens to show the items inside it, with totals underneath.",
    scenario: "Orders page: an order opens into its line items, with subtotal, VAT and delivery.",
    whenToUse: ["Each row has a short list of its own items, such as an order, an invoice or a payout batch.", "The reader sometimes needs the breakdown, not always."],
    avoid: ["The row's own fields (they belong in the table columns or the record page).", "A long list of items (open the record page instead)."],
    source: "components/ui/table.tsx",
    code: `<Table
  title="Orders"
  columns={columns}
  data={orders}
  getRowId={(o) => o.id}
  expandable={{
    columns: [{ key: "item", header: "Item", primary: true }, { key: "amount", header: "Amount", numeric: true }],
    rows: (o) => o.lines.map((l) => ({ item: l.name, amount: formatCurrency(l.total) })),
    totals: (o) => [{ label: "Total", value: formatCurrency(o.total) }],
  }}
/>`,
    Demo: function Demo() {
      const orders = [
        { id: "ORD-3017", customer: "Dawit Alemu", lines: [{ name: "Sidamo beans, 1 kg", total: 5500 }, { name: "Spiced tea blend, 100 g", total: 1040 }] },
        { id: "ORD-3016", customer: "Selam Tadesse", lines: [{ name: "Manual coffee grinder", total: 2300 }] },
      ];
      return (
        <Table
          toolbar={false}
          pagination={false}
          filters={false}
          columns={[
            { key: "id", header: "Order", accessor: (r: (typeof orders)[number]) => r.id },
            { key: "customer", header: "Customer", primary: true, accessor: (r: (typeof orders)[number]) => r.customer },
          ]}
          data={orders}
          getRowId={(o) => o.id}
          expandable={{
            columns: [
              { key: "item", header: "Item", primary: true },
              { key: "amount", header: "Amount", numeric: true },
            ],
            rows: (o) => o.lines.map((l) => ({ item: l.name, amount: l.total.toLocaleString("en-US") + " ETB" })),
            totals: (o) => [{ label: "Total", value: o.lines.reduce((s, l) => s + l.total, 0).toLocaleString("en-US") + " ETB" }],
          }}
        />
      );
    },
  },
  {
    id: "confirm-dialog",
    name: "ConfirmDialog",
    category: "Dialogs",
    summary: "Asks the user to confirm one action. It never shows or edits a record.",
    scenario: "A user's page: suspending an account.",
    whenToUse: ["Confirming an action that is easy to regret."],
    avoid: ["Editing a record (use a full page with RecordForm).", "A delete that cannot be undone (use DestructiveDialog)."],
    source: "components/ui/confirm-dialog.tsx",
    code: `<ConfirmDialog
  open={open}
  onOpenChange={setOpen}
  title="Suspend this account?"
  description="Hana Bekele will not be able to sign in until you reactivate it."
  confirmLabel="Suspend account"
  onConfirm={suspend}
/>`,
    Demo: function Demo() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <Button variant="secondary" onClick={() => setOpen(true)}>
            Suspend account
          </Button>
          <ConfirmDialog
            open={open}
            onOpenChange={setOpen}
            title="Suspend this account?"
            description="Hana Bekele will not be able to sign in until you reactivate it."
            confirmLabel="Suspend account"
            onConfirm={() => {
              setOpen(false);
              toast.success("Account suspended");
            }}
          />
        </>
      );
    },
  },
  {
    id: "tabs",
    name: "Tabs",
    category: "Navigation",
    summary: "Splits one page into a few sections the user switches between.",
    scenario: "A customer's page: Overview, Payments and Notes.",
    whenToUse: ["Several sections of one record.", "A count on a tab shows what needs action."],
    avoid: ["Changing how the same data looks (use SegmentedControl)."],
    source: "components/ui/tabs.tsx",
    code: `<Tabs value={tab} onValueChange={setTab}>
  <TabList>
    <Tab value="overview">Overview</Tab>
    <Tab value="payments" count={2}>Payments</Tab>
  </TabList>
  <TabPanel value="overview">…</TabPanel>
</Tabs>`,
    Demo: function Demo() {
      const [tab, setTab] = useState("overview");
      return (
        <Tabs value={tab} onValueChange={setTab}>
          <TabList>
            <Tab value="overview">Overview</Tab>
            <Tab value="payments" count={2}>
              Payments
            </Tab>
            <Tab value="notes">Notes</Tab>
          </TabList>
          <TabPanel value="overview">Hana Bekele joined in March and pays by Telebirr.</TabPanel>
          <TabPanel value="payments">Two payments are waiting to settle.</TabPanel>
          <TabPanel value="notes">No notes yet.</TabPanel>
        </Tabs>
      );
    },
  },
];
