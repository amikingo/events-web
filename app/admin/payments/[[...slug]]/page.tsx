"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowUpRight, Banknote, CircleCheck, Phone, Receipt, Wallet } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import type { ReactNode } from "react";
import { NoOrganization, useOrganizationId } from "@/app/admin/_components/organization-scope";
import { useModuleAccess } from "@/components/ability-provider";
import { AmountInput, parseAmount } from "@/components/ui/amount-input";
import { Button } from "@/components/ui/button";
import { Card, CardGrid, CardHeader } from "@/components/ui/card";
import { Combobox } from "@/components/ui/combobox";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorBanner } from "@/components/ui/error-banner";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { KpiCard } from "@/components/ui/kpi-card";
import { Note } from "@/components/ui/note";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Select } from "@/components/ui/select";
import { Skeleton, SkeletonStack } from "@/components/ui/skeleton";
import { StatusPill } from "@/components/ui/status-pill";
import { Table } from "@/components/ui/table";
import type { ColumnDef } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toaster";
import { ApiError } from "@/lib/api-client";
import { describeApiError } from "@/lib/api/errors";
import { getEvent, listEvents } from "@/lib/api/events";
import { getPaymentCase, listPaymentCases, PAYMENT_CASE_KIND_LABEL, resolvePaymentCase } from "@/lib/api/payment-cases";
import type { PaymentCase, PaymentCaseDetail, PaymentCaseKind, PaymentCaseStatus, PaymentCaseTicket } from "@/lib/api/payment-cases";
import { nationalMobile } from "@/lib/checkout";
import { MODULE_CODES } from "@/lib/constants/modules";
import { formatMomentFull, formatMomentShort } from "@/lib/ethiopian-datetime";
import { formatPrice } from "@/lib/price";
import { eventQk, paymentCaseQk } from "@/lib/query-keys";

const EVENT_PAGE = { page: 1, pageSize: 100 };
const PAGE_SIZE = 20;
const KINDS = Object.keys(PAYMENT_CASE_KIND_LABEL) as PaymentCaseKind[];

/**
 * A case's state in the shared status words (the library has no payment-case kind; `components/ui` isn't ours to
 * change): open → "Needs a decision", refunded → "Refunded", closed without a refund → "Closed".
 */
function CaseStatus({ c }: { c: Pick<PaymentCase, "status" | "resolution"> }) {
  if (c.status === "OPEN") return <StatusPill kind="approval" status="pending" />;
  return c.resolution?.outcome === "REFUNDED" ? <StatusPill kind="payment" status="refunded" /> : <StatusPill kind="event" status="closed" />;
}

/** What staff should do for each kind of case: one sentence. */
const WHAT_TO_DO: Record<PaymentCaseKind, string> = {
  REFUND_REQUIRED: "The buyer paid after their places were released and none were left. Refund the payment in full.",
  PAID_TWICE: "The buyer was charged twice for the same order. Refund one of the two charges.",
  AMOUNT_MISMATCH: "Cheche Pay confirmed a different amount from the order total. Check the payment in your merchant account before deciding.",
  TICKET_RETURN: "A paid ticket was returned and its place freed. Refund the ticket's price.",
  EVENT_CANCELLATION: "The event was cancelled. Refund this order's paid tickets.",
};

/* ───────────────────────────── the list ───────────────────────────── */

function CasesList({ organizationId }: { organizationId: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<PaymentCaseStatus>("OPEN");
  const [eventId, setEventId] = useState(searchParams.get("event_id") ?? "");
  const [kind, setKind] = useState<"" | PaymentCaseKind>(() => {
    const k = searchParams.get("kind");
    return k && (KINDS as string[]).includes(k) ? (k as PaymentCaseKind) : "";
  });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);

  // The API's kind filter doesn't take EVENT_CANCELLATION yet (its cases exist, the filter refuses the word), so that
  // one kind is filtered here, on the page the API returned.
  const localKind = kind === "EVENT_CANCELLATION";
  const params = { status, kind: kind && !localKind ? kind : undefined, eventId: eventId || undefined, page, pageSize };

  const events = useQuery({ queryKey: eventQk.list(organizationId, EVENT_PAGE), queryFn: ({ signal }) => listEvents(organizationId, EVENT_PAGE, signal) });
  const list = useQuery({
    queryKey: paymentCaseQk.list(organizationId, params),
    queryFn: ({ signal }) => listPaymentCases(organizationId, params, signal),
    placeholderData: keepPreviousData,
  });
  const eventsById = new Map((events.data?.data ?? []).map((e) => [e.id, e]));
  const rows = (list.data?.data ?? []).filter((c) => !localKind || c.kind === "EVENT_CANCELLATION");

  // Filters live in the address too, so a link from a cancelled event opens on its refunds.
  function syncAddress(next: { eventId?: string; kind?: string }) {
    const q = new URLSearchParams();
    const e = next.eventId ?? eventId;
    const k = next.kind ?? kind;
    if (e) q.set("event_id", e);
    if (k) q.set("kind", k);
    window.history.replaceState(null, "", q.size ? `${pathname}?${q}` : pathname);
  }

  const columns: ColumnDef<PaymentCase>[] = [
    { key: "kind", header: "Case", primary: true, filterValue: (c) => PAYMENT_CASE_KIND_LABEL[c.kind], accessor: (c) => <span className="font-medium text-text">{PAYMENT_CASE_KIND_LABEL[c.kind]}</span> },
    { key: "event", header: "Event", filterValue: (c) => eventsById.get(c.event_id)?.name ?? "", accessor: (c) => eventsById.get(c.event_id)?.name ?? "An event" },
    { key: "amount", header: "Amount", numeric: true, filterValue: (c) => c.amount, accessor: (c) => formatPrice(c.amount, c.currency) },
    { key: "created", header: "Opened", filterValue: (c) => c.created_at, accessor: (c) => formatMomentShort(c.created_at, eventsById.get(c.event_id)?.timezone) },
    { key: "status", header: "Status", filterValue: (c) => c.status, render: (c) => <CaseStatus c={c} /> },
  ];

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex flex-col gap-0.5">
        <h1 className="type-h1 m-0 text-text">Payments</h1>
        <p className="type-body m-0 text-text-soft">Refunds and payment problems. Move the money in Cheche Pay, then record it here.</p>
      </div>

      {list.isError ? (
        <EmptyState size="lg" tone="danger" title="We couldn't load payment cases" description={describeApiError(list.error, "case")} actions={<Button onClick={() => void list.refetch()}>Try again</Button>} />
      ) : (
        <Table
          columns={columns}
          data={rows}
          getRowId={(c) => c.id}
          title="Cases"
          loading={list.isPending}
          searchable={false}
          filters={false}
          page={page}
          onPageChange={setPage}
          rowsPerPage={pageSize}
          onRowsPerPageChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
          totalRows={localKind ? rows.length : (list.data?.totalItems ?? 0)}
          onRowClick={(c) => router.push(`/admin/payments/${c.id}`)}
          // The event and kind filters sit with the status chips, inside the table's own toolbar.
          toolbarActions={
              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
                <SegmentedControl
                  aria-label="Status"
                  options={[
                    { value: "OPEN", label: "Open" },
                    { value: "RESOLVED", label: "Resolved" },
                  ]}
                  value={status}
                  onValueChange={(v) => {
                    setStatus(v as PaymentCaseStatus);
                    setPage(1);
                  }}
                />
                <div className="w-full sm:w-[240px]">
                  <Combobox
                    id="payments-event"
                    options={[{ value: "", label: "All events" }, ...(events.data?.data ?? []).map((e) => ({ value: e.id, label: e.name, sub: e.starts_at ? formatMomentShort(e.starts_at, e.timezone) : "No date yet" }))]}
                    value={eventId}
                    onValueChange={(v) => {
                      setEventId(v);
                      setPage(1);
                      syncAddress({ eventId: v });
                    }}
                    placeholder="All events"
                    emptyText="No event by that name"
                  />
                </div>
                <div className="w-full sm:w-[210px]">
                  <Select
                    id="payments-kind"
                    options={[{ value: "", label: "All kinds" }, ...KINDS.map((k) => ({ value: k, label: PAYMENT_CASE_KIND_LABEL[k] }))]}
                    value={kind}
                    onValueChange={(v) => {
                      setKind(v as "" | PaymentCaseKind);
                      setPage(1);
                      syncAddress({ kind: v });
                    }}
                    placeholder="All kinds"
                  />
                </div>
              </div>
          }
          emptyState={
            <EmptyState
              icon={<CircleCheck />}
              title={eventId || kind ? "No cases match" : status === "OPEN" ? "Nothing to refund" : "Nothing resolved yet"}
              description={
                eventId || kind
                  ? "Try a different event or kind."
                  : status === "OPEN"
                    ? "Refunds and payment problems appear here when they need you."
                    : "Cases you close appear here, with what was done."
              }
            />
          }
        />
      )}
    </div>
  );
}

/* ───────────────────────────── one case ───────────────────────────── */

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-0.5 py-2.5 first:pt-0 last:pb-0 sm:grid-cols-[minmax(0,180px)_minmax(0,1fr)] sm:gap-4">
      <dt className="type-body-sm text-text-soft">{label}</dt>
      <dd className="type-body m-0 min-w-0 break-words text-text">{children}</dd>
    </div>
  );
}

const PAYMENT_WORD: Record<string, string> = { INITIATED: "pending", PAID: "paid", MISMATCH: "disputed" };

/** Which field an API issue belongs to: `body.refunded_amount` → `refunded_amount`. */
function issuesOf(error: unknown): Record<string, string> {
  if (!(error instanceof ApiError)) return {};
  const issues = (error.details as { issues?: { path?: string; message?: string }[] } | undefined)?.issues ?? [];
  return Object.fromEntries(issues.map((i) => [(i.path ?? "").replace(/^body\./, ""), i.message ?? "Check this field"]));
}

/** Record outcome (Payments › update): what was done in the merchant account. */
function ResolveForm({ organizationId, c }: { organizationId: string; c: PaymentCaseDetail }) {
  const queryClient = useQueryClient();
  const [outcome, setOutcome] = useState<"REFUNDED" | "CLOSED_WITHOUT_REFUND">("REFUNDED");
  const [amount, setAmount] = useState(() => c.amount.replace(/\.00$/, ""));
  const [currency, setCurrency] = useState(c.currency || "ETB");
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const run = useMutation({
    mutationFn: () =>
      resolvePaymentCase(
        organizationId,
        c.id,
        outcome === "REFUNDED"
          ? { resolution: "REFUNDED", refunded_amount: parseAmount(amount).toFixed(2), refunded_currency: currency.trim().toUpperCase(), merchant_reference: reference.trim() }
          : { resolution: "CLOSED_WITHOUT_REFUND", note: note.trim() },
      ),
    onSuccess: (updated) => {
      queryClient.setQueryData(paymentCaseQk.detail(organizationId, c.id), updated);
      void queryClient.invalidateQueries({ queryKey: paymentCaseQk.all(organizationId) });
      toast.success(outcome === "REFUNDED" ? "Refund recorded" : "Case closed");
    },
    onError: (error) => setErrors(issuesOf(error)),
  });

  function submit() {
    const next: Record<string, string> = {};
    if (outcome === "REFUNDED") {
      if (!(parseAmount(amount) > 0)) next.refunded_amount = "Enter the amount you refunded.";
      if (!/^[A-Za-z]{3}$/.test(currency.trim())) next.refunded_currency = "A three-letter code, like ETB.";
      if (!reference.trim()) next.merchant_reference = "Enter the refund reference from your merchant account.";
    } else if (!note.trim()) {
      next.note = "Say why there's no refund.";
    }
    setErrors(next);
    if (Object.keys(next).length === 0) run.mutate();
  }

  const apiError = run.isError && Object.keys(issuesOf(run.error)).length === 0 ? describeApiError(run.error, "case") : null;

  return (
    <Card>
      <CardHeader title="Record outcome" subtitle="Do this after moving the money. It can't be changed later." />
      <div className="flex flex-col gap-4">
        <SegmentedControl
          aria-label="Outcome"
          block
          options={[
            { value: "REFUNDED", label: "Refunded" },
            { value: "CLOSED_WITHOUT_REFUND", label: "Closed without refund" },
          ]}
          value={outcome}
          onValueChange={(v) => {
            setOutcome(v as typeof outcome);
            setErrors({});
          }}
        />
        {outcome === "REFUNDED" ? (
          <>
            <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_140px]">
              <Field label="Amount refunded" htmlFor="refund-amount" required error={errors.refunded_amount} hint={`Due: ${formatPrice(c.amount, c.currency)}`}>
                <AmountInput id="refund-amount" value={amount} onValueChange={setAmount} currency={currency.toUpperCase() || "ETB"} error={!!errors.refunded_amount} />
              </Field>
              <Field label="Currency" htmlFor="refund-currency" required error={errors.refunded_currency}>
                <Input id="refund-currency" value={currency} maxLength={3} onChange={(e) => setCurrency(e.target.value.toUpperCase())} error={!!errors.refunded_currency} />
              </Field>
            </div>
            <Field label="Merchant refund reference" htmlFor="refund-reference" required error={errors.merchant_reference} hint="The reference your Cheche Pay merchant account gave the refund.">
              <Input id="refund-reference" value={reference} onChange={(e) => setReference(e.target.value)} error={!!errors.merchant_reference} />
            </Field>
          </>
        ) : (
          <Field label="Why no refund" htmlFor="case-note" required error={errors.note} hint="For example: the buyer agreed to keep the ticket for another date.">
            <Textarea id="case-note" rows={3} value={note} maxLength={1000} onChange={(e) => setNote(e.target.value)} error={!!errors.note} />
          </Field>
        )}
        {apiError && <ErrorBanner>{apiError}</ErrorBanner>}
        <div className="flex justify-end">
          <Button loading={run.isPending} loadingLabel="Recording" onClick={submit}>
            {outcome === "REFUNDED" ? "Record refund" : "Close without refund"}
          </Button>
        </div>
      </div>
    </Card>
  );
}

function CaseDetail({ organizationId, caseId }: { organizationId: string; caseId: string }) {
  const router = useRouter();
  const { can } = useModuleAccess();
  const query = useQuery({ queryKey: paymentCaseQk.detail(organizationId, caseId), queryFn: ({ signal }) => getPaymentCase(organizationId, caseId, signal) });
  const eventId = query.data?.event_id;
  const event = useQuery({
    queryKey: eventQk.detail(organizationId, eventId ?? ""),
    queryFn: ({ signal }) => getEvent(organizationId, eventId!, signal),
    enabled: !!eventId,
  });
  const back = (
    <Button variant="secondary" onClick={() => router.push("/admin/payments")}>
      <ArrowLeft className="size-4" />
      Back to payments
    </Button>
  );

  if (query.isPending) {
    return (
      <SkeletonStack>
        <Skeleton shape="title" />
        <Skeleton shape="block" height={88} />
        <Skeleton shape="block" height={240} />
      </SkeletonStack>
    );
  }
  if (query.isError) {
    return <EmptyState size="lg" tone="danger" title="We couldn't load this case" description={describeApiError(query.error, "case")} actions={back} />;
  }

  const c = query.data;
  const tz = event.data?.timezone;
  const r = c.resolution;
  const ticketColumns: ColumnDef<PaymentCaseTicket>[] = [
    { key: "code", header: "Code", primary: true, filterValue: (t) => t.code ?? "", render: (t) => <code className="font-mono text-text">{t.code ?? "No code"}</code> },
    { key: "type", header: "Ticket", filterValue: (t) => t.ticket_type.name, accessor: (t) => (t.id === c.registration_id ? `${t.ticket_type.name} · returned` : t.ticket_type.name) },
    { key: "price", header: "Price", numeric: true, filterValue: (t) => t.price.amount, accessor: (t) => formatPrice(t.price.amount, t.price.currency) },
    { key: "status", header: "Status", filterValue: (t) => t.status, render: (t) => <StatusPill kind="registration" status={t.status} /> },
  ];

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="type-h1 m-0 flex flex-wrap items-center gap-3 text-text">
            {PAYMENT_CASE_KIND_LABEL[c.kind]}
            <CaseStatus c={c} />
          </h1>
          <p className="type-body m-0 text-text-soft">
            {event.data?.name ?? "Event"} · order <span className="font-mono">{c.order.reference}</span> · opened {formatMomentFull(c.created_at, tz)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" onClick={() => router.push(`/admin/orders/${c.event_id}/${c.order_id}`)}>
            Open order
            <ArrowUpRight className="size-4" />
          </Button>
          {back}
        </div>
      </div>

      <CardGrid size="narrow">
        <KpiCard label={c.status === "OPEN" ? "To refund" : "Amount of the case"} value={formatPrice(c.amount, c.currency)} icon={<Banknote />} iconTone={c.status === "OPEN" ? "warning" : "charcoal"} />
        <KpiCard label="Order total" value={formatPrice(c.order.total_amount, c.order.currency)} icon={<Receipt />} iconTone="accent" />
        <KpiCard label="Buyer mobile" value={c.order.buyer_mobile ? nationalMobile(c.order.buyer_mobile) : "None"} icon={<Phone />} iconTone="charcoal" />
      </CardGrid>

      {c.status === "OPEN" && <Note icon={<Wallet />} className="mt-0">{WHAT_TO_DO[c.kind]}</Note>}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)] lg:items-start">
        <div className="flex min-w-0 flex-col gap-6">
          {c.payment && (
            <Card>
              <CardHeader title="Payment" subtitle="Through Cheche Pay. Search these references in your merchant account." />
              <dl className="m-0 flex flex-col divide-y divide-border">
                <Row label="Status">
                  <StatusPill kind="payment" status={PAYMENT_WORD[c.payment.status] ?? "pending"} />
                </Row>
                <Row label="Amount">{formatPrice(c.payment.amount, c.payment.currency)}</Row>
                {c.tx_ref && (
                  <Row label="This case's charge">
                    <code className="font-mono">{c.tx_ref}</code>
                  </Row>
                )}
                {c.payment.paid_tx_ref && (
                  <Row label="Paid reference">
                    <code className="font-mono">{c.payment.paid_tx_ref}</code>
                  </Row>
                )}
                {c.payment.current_tx_ref && c.payment.current_tx_ref !== c.payment.paid_tx_ref && (
                  <Row label="Latest attempt">
                    <code className="font-mono">{c.payment.current_tx_ref}</code>
                  </Row>
                )}
                {c.payment.provider_transaction_id && (
                  <Row label="Cheche Pay transaction">
                    <code className="font-mono">{c.payment.provider_transaction_id}</code>
                  </Row>
                )}
                {c.payment.key_mode && (
                  <Row label="Keys">
                    <StatusPill kind="paymentKey" status={c.payment.key_mode} />
                  </Row>
                )}
                {c.payment.verified_at && <Row label="Paid">{formatMomentFull(c.payment.verified_at, tz)}</Row>}
                {c.payment.last_error && <Row label="Last problem">{c.payment.last_error}</Row>}
              </dl>
            </Card>
          )}

          <Table
            columns={ticketColumns}
            data={c.ticket ? [c.ticket, ...c.order.tickets.filter((t) => t.id !== c.ticket!.id)] : c.order.tickets}
            getRowId={(t) => t.id}
            title={c.order.tickets.length === 1 ? "Ticket in this order" : `${c.order.tickets.length} tickets in this order`}
            searchable={false}
            filters={false}
            pagination={c.order.tickets.length > 20}
            emptyState={<EmptyState size="sm" title="No tickets in this order" description="The order has no tickets left to show." />}
          />
        </div>

        <div className="flex min-w-0 flex-col gap-6">
          {r ? (
            <Card>
              <CardHeader title="Outcome" subtitle={`Recorded ${formatMomentFull(r.resolved_at, tz)}.`} />
              <dl className="m-0 flex flex-col divide-y divide-border">
                <Row label="Outcome">{r.outcome === "REFUNDED" ? "Refunded" : "Closed without refund"}</Row>
                {r.refunded_amount && <Row label="Refunded">{formatPrice(r.refunded_amount, r.refunded_currency ?? c.currency)}</Row>}
                {r.merchant_reference && (
                  <Row label="Merchant reference">
                    <code className="font-mono">{r.merchant_reference}</code>
                  </Row>
                )}
                {r.note && <Row label="Note">{r.note}</Row>}
              </dl>
            </Card>
          ) : can("update", MODULE_CODES.PAYMENTS) ? (
            <ResolveForm organizationId={organizationId} c={c} />
          ) : (
            <Card>
              <CardHeader title="Waiting for an owner" subtitle="Someone with Payments access records the refund once the money is moved." />
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function PaymentsScreen() {
  const organizationId = useOrganizationId();
  const pathname = usePathname();
  if (organizationId === undefined) return null;
  if (organizationId === null) return <NoOrganization what="Payments" />;
  // /admin/payments → the list; /admin/payments/{caseId} → one case.
  const [caseId] = pathname.replace(/^\/admin\/payments\/?/, "").split("/").filter(Boolean);
  if (caseId) return <CaseDetail key={caseId} organizationId={organizationId} caseId={caseId} />;
  return <CasesList organizationId={organizationId} />;
}

export default function PaymentsPage() {
  return (
    <Suspense>
      <PaymentsScreen />
    </Suspense>
  );
}
