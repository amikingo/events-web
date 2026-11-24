"use client";

import { useMemo, useState } from "react";
import { Avatar } from "../../../components/ui/avatar";
import { Button } from "../../../components/ui/button";
import { Card } from "../../../components/ui/card";
import { ConfirmDialog } from "../../../components/ui/confirm-dialog";
import { EmptyState } from "../../../components/ui/empty-state";
import { CheckIcon } from "../../../components/ui/icons";
import { RecordHeading, RecordKv } from "../../../components/ui/record-view";
import { SelectCard } from "../../../components/ui/select-card";
import { StatusPill } from "../../../components/ui/status-pill";
import { Tab, TabList, Tabs } from "../../../components/ui/tabs";
import { toast } from "../../../components/ui/toaster";
import { formatCurrency, formatDate } from "../../../lib/format";

type Decision = "open" | "approved" | "rejected";

interface InboxItem {
  id: string;
  from: string;
  kind: "Expense" | "Time off" | "Access" | "Purchase";
  title: string;
  summary: string;
  amount?: number;
  date: string; // ISO
  decision: Decision;
}

// Mock data — replace with your own queries.
const ITEMS: InboxItem[] = [
  { id: "REQ-120", from: "Liya Mengistu", kind: "Expense", title: "Client lunch in Bole", summary: "Lunch with the Example Hotel team to talk about next year's contract. Receipt attached.", amount: 3450, date: "2026-11-08", decision: "open" },
  { id: "REQ-119", from: "Yonas Kebede", kind: "Time off", title: "Three days off, 24 to 26 November", summary: "Family event in Bahir Dar. Sales calls for those days are already covered by Selam.", date: "2026-11-07", decision: "open" },
  { id: "REQ-118", from: "Dawit Alemu", kind: "Access", title: "Finance reports for the new hire", summary: "Hana Bekele starts on Monday and needs to read the monthly finance reports.", date: "2026-11-07", decision: "open" },
  { id: "REQ-117", from: "Selam Tadesse", kind: "Purchase", title: "Two label printers for the warehouse", summary: "The current printers jam several times a day. Quote from the supplier is attached.", amount: 28900, date: "2026-11-05", decision: "open" },
  { id: "REQ-116", from: "Abel Girma", kind: "Expense", title: "Taxi to the Adama site visit", summary: "Return trip, two people.", amount: 1800, date: "2026-11-03", decision: "approved" },
];

const initialsOf = (name: string) =>
  name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

function DecisionPill({ decision }: { decision: Decision }) {
  return <StatusPill kind="approval" status={decision === "open" ? "pending" : decision} />;
}

export default function InboxPage() {
  const [items, setItems] = useState<InboxItem[]>(ITEMS);
  const [tab, setTab] = useState("open");
  const [selectedId, setSelectedId] = useState<string | null>(ITEMS[0]!.id);
  const [rejectOpen, setRejectOpen] = useState(false);

  const openCount = items.filter((i) => i.decision === "open").length;
  const visible = useMemo(() => items.filter((i) => (tab === "open" ? i.decision === "open" : i.decision !== "open")), [items, tab]);
  const selected = items.find((i) => i.id === selectedId) ?? null;

  function decide(id: string, decision: Exclude<Decision, "open">) {
    const item = items.find((i) => i.id === id);
    setItems((all) => all.map((i) => (i.id === id ? { ...i, decision } : i)));
    // Move on to the next request that still needs a decision.
    const next = items.find((i) => i.id !== id && i.decision === "open");
    setSelectedId(tab === "open" ? (next?.id ?? null) : id);
    toast.success(decision === "approved" ? "Request approved" : "Request rejected", { body: item ? `${item.from} will be told.` : undefined });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="type-h1 m-0 text-text">Inbox</h1>
        <p className="type-body m-0 text-text-soft">Requests waiting for you. Pick one to read it and decide.</p>
      </div>

      <Tabs
        value={tab}
        onValueChange={(v) => {
          setTab(v);
          setSelectedId(items.find((i) => (v === "open" ? i.decision === "open" : i.decision !== "open"))?.id ?? null);
        }}
      >
        <TabList>
          <Tab value="open" count={openCount}>
            Needs a decision
          </Tab>
          <Tab value="done">Decided</Tab>
        </TabList>
      </Tabs>

      {visible.length === 0 ? (
        <Card>
          <EmptyState
            tone="success"
            icon={<CheckIcon />}
            title={tab === "open" ? "You are all caught up" : "Nothing decided yet"}
            description={tab === "open" ? "New requests will show up here." : "Requests you approve or reject appear here."}
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(300px,380px)_1fr]">
          <div className="flex flex-col gap-2" role="radiogroup" aria-label="Requests">
            {visible.map((item) => (
              <SelectCard
                key={item.id}
                selected={item.id === selectedId}
                onClick={() => setSelectedId(item.id)}
                leading={<Avatar initials={initialsOf(item.from)} size={36} />}
                title={item.title}
                subtitle={`${item.from} · ${formatDate(item.date, { year: false })}`}
                value={item.amount ? formatCurrency(item.amount) : undefined}
              />
            ))}
          </div>

          {selected ? (
            <Card className="flex flex-col gap-5 lg:sticky lg:top-4">
              <div className="flex items-start gap-3">
                <Avatar initials={initialsOf(selected.from)} size={48} />
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="type-h3 m-0 text-text">{selected.title}</h2>
                    <DecisionPill decision={selected.decision} />
                  </div>
                  <p className="type-body-sm m-0 text-text-faint">
                    <code>{selected.id}</code> · From {selected.from} · {formatDate(selected.date)}
                  </p>
                </div>
              </div>

              <div>
                <RecordHeading>Request</RecordHeading>
                <p className="type-body m-0 text-text-soft">{selected.summary}</p>
              </div>

              <RecordKv
                items={[
                  { label: "Type", value: selected.kind },
                  { label: "Amount", value: selected.amount ? formatCurrency(selected.amount) : "Not applicable" },
                  { label: "Sent", value: formatDate(selected.date) },
                  { label: "Decision", value: selected.decision === "open" ? "Waiting" : selected.decision === "approved" ? "Approved" : "Rejected" },
                ]}
              />

              {selected.decision === "open" ? (
                <div className="flex flex-wrap gap-2 border-t border-border pt-4">
                  <Button onClick={() => decide(selected.id, "approved")}>Approve</Button>
                  <Button variant="secondary" onClick={() => setRejectOpen(true)}>
                    Reject
                  </Button>
                </div>
              ) : (
                <p className="type-body-sm m-0 border-t border-border pt-4 text-text-faint">This request has been decided.</p>
              )}
            </Card>
          ) : (
            <Card>
              <EmptyState size="sm" title="Pick a request" description="Choose one from the list to read it here." />
            </Card>
          )}
        </div>
      )}

      <ConfirmDialog
        open={rejectOpen}
        onOpenChange={setRejectOpen}
        title="Reject this request?"
        description={selected ? `${selected.from} will be told that “${selected.title}” was rejected.` : undefined}
        confirmLabel="Reject request"
        onConfirm={() => {
          setRejectOpen(false);
          if (selected) decide(selected.id, "rejected");
        }}
      />
    </div>
  );
}
