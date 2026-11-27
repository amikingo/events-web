"use client";

import { useQueries, useQuery } from "@tanstack/react-query";
import { ArrowLeft, Banknote, Clock, Receipt, RotateCcw, Wallet } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useModuleAccess } from "@/components/ability-provider";
import { Button } from "@/components/ui/button";
import { CardGrid } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorBanner } from "@/components/ui/error-banner";
import { PagerNextIcon, PagerPrevIcon } from "@/components/ui/icons";
import { KpiCard } from "@/components/ui/kpi-card";
import { Note } from "@/components/ui/note";
import { Select } from "@/components/ui/select";
import { Skeleton, SkeletonStack } from "@/components/ui/skeleton";
import { StatusPill } from "@/components/ui/status-pill";
import { Table } from "@/components/ui/table";
import type { ColumnDef } from "@/components/ui/table";
import { TextLink } from "@/components/ui/text-link";
import { describeApiError } from "@/lib/api/errors";
import { getEvent, listEvents } from "@/lib/api/events";
import type { StaffEvent } from "@/lib/api/events";
import { listOrders } from "@/lib/api/orders";
import type { OrderSummary } from "@/lib/api/orders";
import { listPaymentCases } from "@/lib/api/payment-cases";
import type { PaymentCase } from "@/lib/api/payment-cases";
import { nationalMobile } from "@/lib/checkout";
import { MODULE_CODES } from "@/lib/constants/modules";
import { formatMomentShort } from "@/lib/ethiopian-datetime";
import { formatDate, formatNumber } from "@/lib/format";
import { formatPrice, fromCents, toCents } from "@/lib/price";
import { eventQk, orderQk, paymentCaseQk } from "@/lib/query-keys";

/**
 * Payments event by event, worked out from each event's orders and payment cases (the API has no report endpoint
 * yet). "Paid" is the total of confirmed orders that cost money; refunds are shown beside it, not taken off, because
 * a refund can also belong to a charge that never became a confirmed order. One request per 100 orders per event, so
 * the limits below keep it bounded.
 */
const EVENT_PAGE = { page: 1, pageSize: 100 };
/** Most pages of 100 read, per event's orders and per list of cases. */
const MAX_PAGES = 30;
const FALLBACK_CURRENCY = "ETB";

async function readOrders(organizationId: string, eventId: string, signal: AbortSignal): Promise<{ orders: OrderSummary[]; partial: boolean }> {
  const orders: OrderSummary[] = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const result = await listOrders(organizationId, eventId, { page, pageSize: 100 }, signal);
    orders.push(...result.data);
    if (orders.length >= result.totalItems || result.data.length === 0) return { orders, partial: false };
  }
  return { orders, partial: true };
}

async function readCases(organizationId: string, eventId: string | undefined, signal: AbortSignal): Promise<{ cases: PaymentCase[]; partial: boolean }> {
  const cases: PaymentCase[] = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const result = await listPaymentCases(organizationId, { eventId, page, pageSize: 100 }, signal);
    cases.push(...result.data);
    if (cases.length >= result.totalItems || result.data.length === 0) return { cases, partial: false };
  }
  return { cases, partial: true };
}

const ordersQuery = (organizationId: string, eventId: string) => ({
  queryKey: [...orderQk.all(organizationId, eventId), "payments"] as const,
  queryFn: ({ signal }: { signal: AbortSignal }) => readOrders(organizationId, eventId, signal),
});

const casesQuery = (organizationId: string, eventId?: string) => ({
  queryKey: [...paymentCaseQk.all(organizationId), "totals", eventId ?? "all"] as const,
  queryFn: ({ signal }: { signal: AbortSignal }) => readCases(organizationId, eventId, signal),
});

interface Totals {
  currency: string;
  paidOrders: number;
  paidCents: number;
  waitingOrders: number;
  waitingCents: number;
  refundedCents: number;
  openCases: number;
}

function totalsOf(orders: OrderSummary[], cases: PaymentCase[]): Totals {
  const costing = orders.filter((o) => toCents(o.total_amount) > 0);
  const paid = costing.filter((o) => o.status === "CONFIRMED");
  const waiting = costing.filter((o) => o.status === "PENDING_PAYMENT");
  const currency = costing[0]?.currency ?? cases[0]?.currency ?? FALLBACK_CURRENCY;
  const sum = (list: OrderSummary[]) => list.reduce((total, o) => total + toCents(o.total_amount), 0);
  return {
    currency,
    paidOrders: paid.length,
    paidCents: sum(paid),
    waitingOrders: waiting.length,
    waitingCents: sum(waiting),
    refundedCents: cases.reduce((total, c) => {
      const r = c.resolution;
      return r?.outcome === "REFUNDED" && r.refunded_amount && r.refunded_currency === currency ? total + toCents(r.refunded_amount) : total;
    }, 0),
    openCases: cases.filter((c) => c.status === "OPEN").length,
  };
}

const money = (cents: number, currency: string) => (cents === 0 ? `0 ${currency}` : formatPrice(fromCents(cents), currency));
/** In the table, nothing is a faint dash, so the amounts that exist stand out. */
const cell = (cents: number, currency: string) => (cents === 0 ? <span className="text-text-faint">–</span> : money(cents, currency));
const orderCount = (n: number) => `${formatNumber(n)} ${n === 1 ? "order" : "orders"}`;

function TotalCards({ totals, loading }: { totals: Totals; loading: boolean }) {
  return (
    <CardGrid size="narrow">
      <KpiCard label="Paid" value={money(totals.paidCents, totals.currency)} icon={<Banknote />} iconTone="success" loading={loading} />
      <KpiCard label="Paid orders" value={formatNumber(totals.paidOrders)} icon={<Receipt />} iconTone="accent" loading={loading} />
      <KpiCard label="Waiting for payment" value={money(totals.waitingCents, totals.currency)} icon={<Clock />} iconTone="charcoal" loading={loading} />
      <KpiCard label="Refunded" value={money(totals.refundedCents, totals.currency)} icon={<RotateCcw />} iconTone="charcoal" loading={loading} />
    </CardGrid>
  );
}

type Row = Totals & { event: StaffEvent; orders: OrderSummary[] };

/** Orders on one page of an opened row: the choices, the first being where a row starts. */
const PEEK_SIZES = [5, 10, 25];

/** The page numbers to offer: all of a few, else the first, the last and those around this one (0 marks a gap). */
function pageList(page: number, pages: number): number[] {
  if (pages <= 5) return Array.from({ length: pages }, (_, i) => i + 1);
  const near = [1, page - 1, page, page + 1, pages].filter((n) => n >= 1 && n <= pages);
  return [...new Set(near)].flatMap((n, i, all) => (i > 0 && n - all[i - 1]! > 1 ? [0, n] : [n]));
}

/** The pager for the orders inside an opened row, like the table's own (which moves between events only). */
function RowPager({ page, pages, onChange }: { page: number; pages: number; onChange: (page: number) => void }) {
  const size = "size-[30px]";
  return (
    <span className="ml-2 inline-flex items-center gap-1 align-middle">
      <Button variant="secondary" iconOnly className={size} aria-label="Previous orders" disabled={page <= 1} onClick={() => onChange(page - 1)}>
        <PagerPrevIcon className="size-3.5" />
      </Button>
      {pageList(page, pages).map((n, i) =>
        n === 0 ? (
          <span key={`gap-${i}`} className="px-1" aria-hidden="true">
            …
          </span>
        ) : (
          <Button key={n} variant={n === page ? undefined : "secondary"} iconOnly className={size} aria-label={`Orders page ${n}`} aria-current={n === page ? "page" : undefined} onClick={() => onChange(n)}>
            {n}
          </Button>
        ),
      )}
      <Button variant="secondary" iconOnly className={size} aria-label="Next orders" disabled={page >= pages} onClick={() => onChange(page + 1)}>
        <PagerNextIcon className="size-3.5" />
      </Button>
    </span>
  );
}

/** The totals and one row per event that has taken, or is waiting for, money. */
export function PaymentsByEvent({ organizationId }: { organizationId: string }) {
  const router = useRouter();
  const { can, ready } = useModuleAccess();
  // Orders belong to the guest list, which needs its own right.
  const allowed = can("read", MODULE_CODES.REGISTRATIONS);
  const events = useQuery({ queryKey: eventQk.list(organizationId, EVENT_PAGE), queryFn: ({ signal }) => listEvents(organizationId, EVENT_PAGE, signal), enabled: allowed });
  // Drafts were never on sale.
  const sold = (events.data?.data ?? []).filter((e) => e.status !== "DRAFT");
  const orders = useQueries({ queries: sold.map((e) => ({ ...ordersQuery(organizationId, e.id), enabled: allowed })) });
  const cases = useQuery({ ...casesQuery(organizationId), enabled: allowed });
  // Which page of its orders each opened row is on, and how many it lists on one.
  const [orderPages, setOrderPages] = useState<Record<string, number>>({});
  const [orderSizes, setOrderSizes] = useState<Record<string, number>>({});

  if (!ready) return <Skeleton shape="block" height={240} />;
  if (!allowed) return <Note icon={<Wallet />} className="mt-0">Payments by event come from orders. Ask an admin for the Guests › view right to see them.</Note>;
  if (events.isError) {
    return <EmptyState tone="danger" title="We couldn't load payments by event" description={describeApiError(events.error, "event")} actions={<Button onClick={() => void events.refetch()}>Try again</Button>} />;
  }

  const loading = events.isPending || cases.isPending || orders.some((q) => q.isPending);
  const failed = cases.isError || orders.some((q) => q.isError);
  const partial = (events.data?.totalItems ?? 0) > EVENT_PAGE.pageSize || cases.data?.partial || orders.some((q) => q.data?.partial);
  const rows: Row[] = sold
    .map((event, i) => {
      const found = orders[i]?.data?.orders ?? [];
      // Newest first; free orders aren't payments.
      const costing = found.filter((o) => toCents(o.total_amount) > 0).sort((a, b) => b.created_at.localeCompare(a.created_at));
      return { event, orders: costing, ...totalsOf(found, (cases.data?.cases ?? []).filter((c) => c.event_id === event.id)) };
    })
    .filter((r) => r.paidOrders + r.waitingOrders + r.openCases > 0 || r.refundedCents > 0)
    .sort((a, b) => b.paidCents - a.paidCents);
  // The cards add up one currency: the one most of the money is in.
  const currency = rows[0]?.currency ?? FALLBACK_CURRENCY;
  const all = rows
    .filter((r) => r.currency === currency)
    .reduce<Totals>(
      (t, r) => ({
        currency,
        paidOrders: t.paidOrders + r.paidOrders,
        paidCents: t.paidCents + r.paidCents,
        waitingOrders: t.waitingOrders + r.waitingOrders,
        waitingCents: t.waitingCents + r.waitingCents,
        refundedCents: t.refundedCents + r.refundedCents,
        openCases: t.openCases + r.openCases,
      }),
      { currency, paidOrders: 0, paidCents: 0, waitingOrders: 0, waitingCents: 0, refundedCents: 0, openCases: 0 },
    );

  const sizeOf = (r: Row) => orderSizes[r.event.id] ?? PEEK_SIZES[0]!;
  const pagesOf = (r: Row) => Math.max(1, Math.ceil(r.orders.length / sizeOf(r)));
  const pageOf = (r: Row) => Math.min(orderPages[r.event.id] ?? 1, pagesOf(r));

  const columns: ColumnDef<Row>[] = [
    {
      key: "event",
      header: "Event",
      primary: true,
      sortable: true,
      filterValue: (r) => r.event.name,
      accessor: (r) => (
        <div className="flex min-w-0 flex-col">
          <span className="type-body truncate font-medium text-text">{r.event.name}</span>
          <span className="type-body-sm text-text-faint">{r.event.starts_at ? formatMomentShort(r.event.starts_at, r.event.timezone) : "No date yet"}</span>
        </div>
      ),
    },
    { key: "orders", header: "Paid orders", numeric: true, sortable: true, filterValue: (r) => r.paidOrders, accessor: (r) => formatNumber(r.paidOrders) },
    { key: "paid", header: "Paid", numeric: true, sortable: true, filterValue: (r) => r.paidCents, accessor: (r) => <span className="font-medium text-text">{money(r.paidCents, r.currency)}</span> },
    { key: "waiting", header: "Waiting", numeric: true, sortable: true, filterValue: (r) => r.waitingCents, accessor: (r) => cell(r.waitingCents, r.currency) },
    { key: "refunded", header: "Refunded", numeric: true, sortable: true, filterValue: (r) => r.refundedCents, accessor: (r) => cell(r.refundedCents, r.currency) },
    { key: "cases", header: "Needs action", sortable: true, filterValue: (r) => r.openCases, accessor: (r) => (r.openCases ? <span className="font-medium text-text">{`${formatNumber(r.openCases)} open ${r.openCases === 1 ? "case" : "cases"}`}</span> : <span className="text-text-faint">–</span>) },
  ];

  return (
    <div className="flex flex-col gap-4">
      <TotalCards totals={all} loading={loading} />
      {failed && <ErrorBanner>Some events couldn&apos;t be read, so these figures are incomplete. Reload the page to try again.</ErrorBanner>}
      {partial && <Note className="mt-0">There is more than this page reads, so the figures cover only part of it.</Note>}
      <Table
        columns={columns}
        data={loading ? [] : rows}
        getRowId={(r) => r.event.id}
        title="By event"
        loading={loading}
        filters={false}
        searchPlaceholder="Search events"
        onRowClick={(r) => router.push(`/admin/payments/events/${r.event.id}`)}
        // Opening a row shows the payments inside it, without leaving the page.
        expandable={{
          label: "Show this event's orders",
          columns: [
            { key: "order", header: "Order", primary: true },
            { key: "buyer", header: "Buyer" },
            { key: "date", header: "Ordered" },
            { key: "status", header: "Status" },
            { key: "amount", header: "Amount", numeric: true },
          ],
          rows: (r) =>
            r.orders.slice((pageOf(r) - 1) * sizeOf(r), pageOf(r) * sizeOf(r)).map((o) => ({
              order: (
                <TextLink onClick={() => router.push(`/admin/orders/${r.event.id}/${o.id}`)}>
                  <span className="font-mono">{o.reference}</span>
                </TextLink>
              ),
              buyer: o.buyer_mobile ? nationalMobile(o.buyer_mobile) : "None",
              // The day is enough here, and keeps a phone's line short.
              date: formatDate(o.created_at, { year: false }),
              status: <StatusPill kind="ticketOrder" status={o.status} />,
              amount: <span className="whitespace-nowrap">{formatPrice(o.total_amount, o.currency)}</span>,
            })),
          // Only the paging: the row above already says what was paid, is waiting and was refunded.
          totals: (r) =>
            r.orders.length > PEEK_SIZES[0]!
              ? [
                  {
                    label: "Rows per page",
                    value: (
                      <span className="ml-2 inline-block align-middle font-normal">
                        <Select
                          size="sm"
                          options={PEEK_SIZES.map((n) => ({ value: String(n), label: String(n) }))}
                          value={String(sizeOf(r))}
                          onValueChange={(v) => {
                            setOrderSizes((all) => ({ ...all, [r.event.id]: Number(v) }));
                            setOrderPages((all) => ({ ...all, [r.event.id]: 1 }));
                          }}
                        />
                      </span>
                    ),
                  },
                  {
                    label: `${formatNumber((pageOf(r) - 1) * sizeOf(r) + 1)}–${formatNumber(Math.min(pageOf(r) * sizeOf(r), r.orders.length))} of ${formatNumber(r.orders.length)}`,
                    value: <RowPager page={pageOf(r)} pages={pagesOf(r)} onChange={(page) => setOrderPages((all) => ({ ...all, [r.event.id]: page }))} />,
                  },
                ]
              : [],
        }}
        emptyState={<EmptyState icon={<Wallet />} title="No payments yet" description="Events appear here once someone buys a ticket." />}
      />
    </div>
  );
}

/** /admin/payments/events/{eventId}: one event's totals and every order that cost money. */
export function EventPaymentsPage({ organizationId, eventId }: { organizationId: string; eventId: string }) {
  const router = useRouter();
  const { can, ready } = useModuleAccess();
  const allowed = can("read", MODULE_CODES.REGISTRATIONS);
  const event = useQuery({ queryKey: eventQk.detail(organizationId, eventId), queryFn: ({ signal }) => getEvent(organizationId, eventId, signal) });
  const orders = useQuery({ ...ordersQuery(organizationId, eventId), enabled: allowed });
  const cases = useQuery(casesQuery(organizationId, eventId));
  const back = (
    <Button variant="secondary" onClick={() => router.push("/admin/payments")}>
      <ArrowLeft className="size-4" />
      Back to payments
    </Button>
  );

  if (!ready) return <Skeleton shape="block" height={240} />;
  if (!allowed) return <EmptyState size="lg" title="You can't see this event's orders" description="Ask an admin for the Guests › view right." actions={back} />;
  const error = event.error ?? orders.error ?? cases.error;
  if (error) return <EmptyState size="lg" tone="danger" title="We couldn't load this event's payments" description={describeApiError(error, "event")} actions={back} />;
  if (event.isPending || !event.data) {
    return (
      <SkeletonStack>
        <Skeleton shape="title" />
        <Skeleton shape="block" height={88} />
        <Skeleton shape="block" height={240} />
      </SkeletonStack>
    );
  }

  const loading = orders.isPending || cases.isPending;
  const costing = (orders.data?.orders ?? []).filter((o) => toCents(o.total_amount) > 0);
  const totals = totalsOf(costing, cases.data?.cases ?? []);
  const timeZone = event.data.timezone;
  const columns: ColumnDef<OrderSummary>[] = [
    { key: "reference", header: "Order", primary: true, filterValue: (o) => o.reference, accessor: (o) => <span className="font-mono font-medium text-text">{o.reference}</span> },
    { key: "buyer", header: "Buyer", filterValue: (o) => (o.buyer_mobile ? nationalMobile(o.buyer_mobile) : ""), accessor: (o) => (o.buyer_mobile ? nationalMobile(o.buyer_mobile) : "None") },
    { key: "from", header: "From", filterValue: (o) => (o.source === "PUBLIC" ? "Online" : "Staff"), accessor: (o) => (o.source === "PUBLIC" ? "Online" : "Staff") },
    { key: "amount", header: "Amount", numeric: true, sortable: true, filterValue: (o) => toCents(o.total_amount), accessor: (o) => formatPrice(o.total_amount, o.currency) },
    { key: "date", header: "Ordered", sortable: true, filterValue: (o) => o.created_at, accessor: (o) => formatMomentShort(o.created_at, timeZone) },
    { key: "status", header: "Status", filterValue: (o) => o.status, render: (o) => <StatusPill kind="ticketOrder" status={o.status} /> },
  ];

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="flex min-w-0 flex-col gap-0.5">
          <h1 className="type-h1 m-0 text-text">{event.data.name}</h1>
          <p className="type-body m-0 text-text-soft">{loading ? "Payments for this event." : `${orderCount(costing.length)} that cost money.`} Free orders aren&apos;t listed.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {totals.openCases > 0 && (
            <Button onClick={() => router.push(`/admin/payments/cases?event_id=${eventId}`)}>
              {totals.openCases === 1 ? "1 open case" : `${totals.openCases} open cases`}
            </Button>
          )}
          {back}
        </div>
      </div>

      <TotalCards totals={totals} loading={loading} />
      {(orders.data?.partial || cases.data?.partial) && <Note className="mt-0">There is more than this page reads, so the figures cover only part of it.</Note>}

      <Table
        columns={columns}
        data={costing}
        getRowId={(o) => o.id}
        title="Orders"
        loading={loading}
        searchPlaceholder="Search by order or mobile"
        onRowClick={(o) => router.push(`/admin/orders/${eventId}/${o.id}`)}
        emptyState={<EmptyState icon={<Receipt />} title="No paid orders yet" description="Orders that cost money appear here." />}
      />
    </div>
  );
}
