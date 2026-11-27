"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { ArrowLeft, Copy, CreditCard, Eye, KeyRound, MessageSquare, Phone, Printer, Ticket, Undo2, Wallet } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useModuleAccess } from "@/components/ability-provider";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Card, CardGrid, CardHeader } from "@/components/ui/card";
import { Note } from "@/components/ui/note";
import { EmptyState } from "@/components/ui/empty-state";
import { KpiCard } from "@/components/ui/kpi-card";
import { PhoneInput } from "@/components/ui/phone-input";
import { Skeleton, SkeletonStack } from "@/components/ui/skeleton";
import { StatusPill } from "@/components/ui/status-pill";
import { Table } from "@/components/ui/table";
import type { ColumnDef } from "@/components/ui/table";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import type { StaffEvent } from "@/lib/api/events";
import { describeApiError } from "@/lib/api/errors";
import { getOrder, listOrders } from "@/lib/api/orders";
import type { OrderPayment, OrderSummary, OrderTicket } from "@/lib/api/orders";
import { toast } from "@/components/ui/toaster";
import { nationalMobile } from "@/lib/checkout";
import { formatMomentFull, formatMomentShort } from "@/lib/ethiopian-datetime";
import { phoneDigits } from "@/lib/marketplace/validation";
import { formatNumber } from "@/lib/format";
import { takeStaffHandover } from "@/lib/order-tokens";
import { formatPrice } from "@/lib/price";
import { orderQk } from "@/lib/query-keys";
import { MODULE_CODES } from "@/lib/constants/modules";
import { ReturnTicketDialog } from "./return-ticket";

const orderPath = (eventId: string, orderId: string) => `/admin/events/${eventId}/orders/${orderId}`;

/** The event's orders, newest first: reference, buyer, total, where it came from, when. A row opens the order. */
export function OrdersTab({ event, orderHref = (o) => orderPath(event.id, o.id) }: { event: StaffEvent; orderHref?: (order: OrderSummary) => string }) {
  // router.push, not history.pushState: the tab is also shown on the Orders page, a different route.
  const router = useRouter();
  const orgId = event.organization_id;
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [mobile, setMobile] = useState("");
  // Only a whole Ethiopian mobile filters: the API wants one buyer, in any format.
  const typed = phoneDigits(mobile);
  const buyerMobile = useDebouncedValue(typed.length === 9 ? `+251${typed}` : "", 300);
  const params = { page, pageSize, buyerMobile: buyerMobile || undefined };

  const list = useQuery({
    queryKey: orderQk.list(orgId, event.id, params),
    queryFn: ({ signal }) => listOrders(orgId, event.id, params, signal),
    placeholderData: keepPreviousData,
  });

  const columns: ColumnDef<OrderSummary>[] = [
    { key: "reference", header: "Reference", primary: true, filterValue: (o) => o.reference, render: (o) => <code className="font-mono">{o.reference}</code> },
    { key: "buyer", header: "Buyer mobile", filterValue: (o) => o.buyer_mobile ?? "", accessor: (o) => (o.buyer_mobile ? nationalMobile(o.buyer_mobile) : "None") },
    { key: "total", header: "Total", numeric: true, filterValue: (o) => o.total_amount, accessor: (o) => formatPrice(o.total_amount, o.currency) },
    { key: "source", header: "From", filterValue: (o) => o.source, accessor: (o) => (o.source === "PUBLIC" ? "Online" : "Staff") },
    { key: "status", header: "Status", filterValue: (o) => o.status, render: (o) => <StatusPill kind="ticketOrder" status={o.status} /> },
    { key: "created", header: "Created", filterValue: (o) => o.created_at, accessor: (o) => formatMomentShort(o.created_at, event.timezone) },
  ];

  if (list.isError) {
    return <EmptyState size="sm" tone="danger" title="We couldn't load the orders" description={describeApiError(list.error, "order")} />;
  }

  return (
    <Table
      columns={columns}
      data={list.data?.data ?? []}
      getRowId={(o) => o.id}
      title="Orders"
      loading={list.isPending}
      page={page}
      onPageChange={setPage}
      rowsPerPage={pageSize}
      onRowsPerPageChange={(size) => {
        setPageSize(size);
        setPage(1);
      }}
      totalRows={list.data?.totalItems ?? 0}
      searchable={false}
      filters={false}
      onRowClick={(o) => router.push(orderHref(o))}
      rowActions={() => [{ key: "view", label: "View order", icon: <Eye />, view: true, onClick: (o: OrderSummary) => router.push(orderHref(o)) }]}
      toolbarActions={
        <div className="w-full sm:w-[240px]">
          <PhoneInput
            aria-label="Find a buyer's mobile"
            value={mobile}
            onValueChange={(v) => {
              setMobile(v);
              setPage(1);
            }}
          />
        </div>
      }
      emptyState={
        buyerMobile ? (
          <EmptyState title="No orders from this mobile" description="Check the number, or clear it to see every order." />
        ) : (
          <EmptyState title="No orders yet" description="Orders appear here when guests get tickets online or staff issue them." />
        )
      }
    />
  );
}

/** A payment's status in the shared payment words: started is pending, a different amount is disputed. */
const PAYMENT_WORD: Record<OrderPayment["status"], string> = { INITIATED: "pending", PAID: "paid", MISMATCH: "disputed" };

/** Copy a value and say so. */
async function copyText(value: string, what: string) {
  try {
    await navigator.clipboard.writeText(value);
    toast.success(`${what} copied`);
  } catch {
    toast.error(`Couldn't copy the ${what.toLowerCase()}`, { body: "Your browser didn't allow it. Select it and copy it instead." });
  }
}

/** One label-and-value row of the payment card. */
function PaymentRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-0.5 py-2.5 first:pt-0 last:pb-0 sm:grid-cols-[minmax(0,180px)_minmax(0,1fr)] sm:gap-4">
      <dt className="type-body-sm text-text-soft">{label}</dt>
      <dd className="type-body m-0 min-w-0 break-words text-text">{children}</dd>
    </div>
  );
}

/** One order: who bought it, the total, the confirmation SMS, and every ticket with its code and holder. */
export function OrderPage({ event, orderId, back: backTo }: { event: StaffEvent; orderId: string; back?: { label: string; href: string } }) {
  const router = useRouter();
  const orgId = event.organization_id;
  const { can } = useModuleAccess();
  const [returning, setReturning] = useState<OrderTicket | null>(null);
  // Returning follows cancelling's rules: Guests › update, while the event is published or closed.
  const canReturn = can("update", MODULE_CODES.REGISTRATIONS) && (event.status === "PUBLISHED" || event.status === "CLOSED");
  const query = useQuery({ queryKey: orderQk.detail(orgId, event.id, orderId), queryFn: ({ signal }) => getOrder(orgId, event.id, orderId, signal) });
  // A paid staff order's link and token, shown once right after it was made; gone on the next visit.
  const [handover] = useState(() => takeStaffHandover(orderId));
  const back = (
    <Button variant="secondary" onClick={() => router.push(backTo?.href ?? `/admin/events/${event.id}`)}>
      <ArrowLeft className="size-4" />
      {backTo?.label ?? "Back to event"}
    </Button>
  );

  if (query.isPending) {
    return (
      <SkeletonStack>
        <Skeleton shape="title" />
        <Skeleton shape="block" />
        <Skeleton shape="block" />
      </SkeletonStack>
    );
  }
  if (query.isError) {
    return <EmptyState size="lg" tone="danger" title="We couldn't load this order" description={describeApiError(query.error, "order")} actions={back} />;
  }
  const order = query.data;
  const holderName = (h: OrderTicket["holder"]) => (h ? [h.first_name, h.last_name].filter(Boolean).join(" ") : "Unnamed ticket");
  const initials = (h: OrderTicket["holder"]) => (h ? `${h.first_name[0] ?? ""}${h.last_name?.[0] ?? ""}`.toUpperCase() || "?" : "?");
  const from = order.source === "PUBLIC" ? (order.bought_with_account ? "Online, signed in" : "Online") : "Issued by staff";

  /** Every code with its guest, one per line: ready to paste into a message. */
  async function copyCodes() {
    const lines = order.tickets.map((t) => `${t.code ?? "No code yet"} · ${t.ticket_type.name} · ${holderName(t.holder)}`);
    try {
      await navigator.clipboard.writeText([`${event.name} · order ${order.reference}`, ...lines].join("\n"));
      toast.success("Codes copied", { body: `${lines.length} ${lines.length === 1 ? "code" : "codes"} on the clipboard.` });
    } catch {
      toast.error("Couldn't copy the codes", { body: "Your browser didn't allow it. Select them in the table instead." });
    }
  }

  const columns: ColumnDef<OrderTicket>[] = [
    {
      key: "guest",
      header: "Guest",
      primary: true,
      filterValue: (t) => holderName(t.holder),
      accessor: (t) => (
        <div className="flex min-w-0 items-center gap-3">
          <Avatar initials={initials(t.holder)} size={32} />
          <div className="flex min-w-0 flex-col">
            <span className={t.holder ? "type-body truncate font-medium text-text" : "type-body truncate font-medium text-text-soft"}>{holderName(t.holder)}</span>
            {t.holder?.affiliation_name && <span className="type-body-sm truncate text-text-faint">{t.holder.affiliation_name}</span>}
          </div>
        </div>
      ),
    },
    {
      key: "contact",
      header: "Contact",
      filterValue: (t) => `${t.holder?.phone ?? ""} ${t.holder?.email ?? ""}`,
      accessor: (t) =>
        t.holder?.phone || t.holder?.email ? (
          <div className="flex flex-col">
            {t.holder.phone && <span className="type-body text-text">{nationalMobile(t.holder.phone)}</span>}
            {t.holder.email && <span className="type-body-sm text-text-soft">{t.holder.email}</span>}
          </div>
        ) : (
          <span className="type-body-sm text-text-faint">None</span>
        ),
    },
    { key: "type", header: "Ticket", filterValue: (t) => t.ticket_type.name, accessor: (t) => t.ticket_type.name },
    { key: "code", header: "Code", filterValue: (t) => t.code ?? "", render: (t) => <code className="font-mono text-text">{t.code ?? "No code yet"}</code> },
    { key: "price", header: "Price", numeric: true, filterValue: (t) => t.price.amount, accessor: (t) => formatPrice(t.price.amount, t.price.currency) },
    { key: "status", header: "Status", filterValue: (t) => t.status, render: (t) => <StatusPill kind="registration" status={t.status} /> },
  ];

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="type-h1 m-0 flex flex-wrap items-center gap-3 text-text">
            <span>
              Order <span className="font-mono">{order.reference}</span>
            </span>
            <StatusPill kind="ticketOrder" status={order.status} />
          </h1>
          <p className="type-body m-0 text-text-soft">
            {event.name} · {from} · {formatMomentFull(order.created_at, event.timezone)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" onClick={() => void copyCodes()}>
            <Copy className="size-4" />
            Copy codes
          </Button>
          <Button variant="secondary" onClick={() => window.print()}>
            <Printer className="size-4" />
            Print
          </Button>
          {back}
        </div>
      </div>

      <CardGrid size="narrow">
        <KpiCard label="Tickets" value={formatNumber(order.ticket_count)} icon={<Ticket />} iconTone="accent" />
        <KpiCard label="Total" value={formatPrice(order.total_amount, order.currency)} icon={order.payment ? <CreditCard /> : <Wallet />} iconTone="success" />
        <KpiCard label="Buyer mobile" value={order.buyer_mobile ? nationalMobile(order.buyer_mobile) : "None"} icon={<Phone />} iconTone="charcoal" />
        <KpiCard
          label="Codes by SMS"
          value={order.confirmation ? <StatusPill kind="message" status={order.confirmation.status} /> : "Not sent"}
          icon={<MessageSquare />}
          iconTone="charcoal"
        />
      </CardGrid>

      {handover && (
        <Card>
          <CardHeader title="Give these to the buyer" subtitle="Shown once. They pay with the link; the token opens their order page on another device." />
          <div className="flex flex-col gap-3">
            {handover.checkoutUrl && (
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <code className="type-body-sm min-w-0 flex-1 truncate rounded-sm bg-surface-2 px-3 py-2 font-mono text-text">{handover.checkoutUrl}</code>
                <Button variant="secondary" onClick={() => void copyText(handover.checkoutUrl!, "Payment link")}>
                  <Copy className="size-4" />
                  Copy link
                </Button>
              </div>
            )}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <code className="type-body-sm min-w-0 flex-1 truncate rounded-sm bg-surface-2 px-3 py-2 font-mono text-text">{handover.token}</code>
              <Button variant="secondary" onClick={() => void copyText(handover.token, "Order token")}>
                <Copy className="size-4" />
                Copy token
              </Button>
            </div>
            <Note icon={<KeyRound />} className="mt-0">
              You won&apos;t see the token again. Share it only with the buyer.
            </Note>
          </div>
        </Card>
      )}

      {order.payment && (
        <Card>
          <CardHeader title="Payment" subtitle="Through Cheche Pay." />
          <dl className="m-0 flex flex-col divide-y divide-border">
            <PaymentRow label="Status">
              <StatusPill kind="payment" status={PAYMENT_WORD[order.payment.status]} />
            </PaymentRow>
            {order.status === "PENDING_PAYMENT" && order.hold_expires_at && <PaymentRow label="Places held until">{formatMomentFull(order.hold_expires_at, event.timezone)}</PaymentRow>}
            {order.status === "PENDING_PAYMENT" && order.payment.checkout_url && (
              <PaymentRow label="Payment link">
                <span className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
                  <code className="type-body-sm min-w-0 flex-1 truncate font-mono text-text-soft">{order.payment.checkout_url}</code>
                  <Button variant="secondary" onClick={() => void copyText(order.payment!.checkout_url!, "Payment link")}>
                    <Copy className="size-4" />
                    Copy
                  </Button>
                </span>
              </PaymentRow>
            )}
            {order.status === "PENDING_PAYMENT" && order.payment.checkout_expires_at && <PaymentRow label="Link valid until">{formatMomentFull(order.payment.checkout_expires_at, event.timezone)}</PaymentRow>}
            {order.payment.verified_at && <PaymentRow label="Paid">{formatMomentFull(order.payment.verified_at, event.timezone)}</PaymentRow>}
            {order.payment.key_mode && (
              <PaymentRow label="Keys">
                <StatusPill kind="paymentKey" status={order.payment.key_mode} />
              </PaymentRow>
            )}
            {order.payment.tx_ref && (
              <PaymentRow label="Cheche Pay reference">
                <code className="font-mono">{order.payment.tx_ref}</code>
              </PaymentRow>
            )}
            {order.payment.last_error && <PaymentRow label="Last problem">{order.payment.last_error}</PaymentRow>}
          </dl>
        </Card>
      )}

      <Table
        columns={columns}
        data={order.tickets}
        getRowId={(t) => t.id}
        title={order.ticket_count === 1 ? "Ticket" : `${order.ticket_count} tickets`}
        searchable={order.tickets.length > 8}
        searchPlaceholder="Name, contact or code"
        filters={false}
        pagination={order.tickets.length > 20}
        rowActions={
          canReturn
            ? (t) => (t.status === "CONFIRMED" ? [{ key: "return", label: "Return ticket", icon: <Undo2 />, onClick: (row: OrderTicket) => setReturning(row) }] : [])
            : undefined
        }
        emptyState={<EmptyState size="sm" title="No tickets in this order" description="This shouldn't happen. Reload the page." />}
      />

      <ReturnTicketDialog
        organizationId={orgId}
        eventId={event.id}
        target={
          returning
            ? { id: returning.id, code: returning.code, name: returning.holder ? `${holderName(returning.holder)}'s` : "this unnamed", price: returning.price }
            : null
        }
        onClose={() => setReturning(null)}
      />
    </div>
  );
}
