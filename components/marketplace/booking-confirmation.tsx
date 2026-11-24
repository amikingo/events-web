"use client";

import Link from "next/link";
import { useState } from "react";
import { formatCurrency, maskPhone } from "../../lib/format";
import { formatEventDate, formatEventTime } from "../../lib/marketplace/datetime";
import { downloadCalendar, downloadTicket } from "../../lib/marketplace/downloads";
import { useMountedNow } from "../../lib/marketplace/storage-store";
import { ticketStatus } from "../../lib/marketplace/tickets";
import { ordersService, useOrders } from "../../lib/services/orders-service";
import { PAYMENT_METHODS } from "../../lib/services/checkout-service";
import type { EventSummary } from "../../types/marketplace";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { EmptyState } from "../ui/empty-state";
import { CalendarIcon, CheckThinIcon, DownloadIcon, SearchIcon } from "../ui/icons";
import { IconTile } from "../ui/icon-tile";
import { Note } from "../ui/note";
import { Skeleton } from "../ui/skeleton";
import { toast } from "../ui/toaster";
import { PriceBreakdown } from "./checkout/order-summary";
import { PaymentStatus } from "./checkout/payment-status";
import { whereLabel } from "./event-card";
import { TicketCard } from "./tickets/ticket-card";

/**
 * After checkout: the confirmation, the booking reference, each ticket with its own code, downloads and where the
 * tickets were sent. A pending payment shows its state and a way to check again instead of tickets.
 */
export function BookingConfirmation({ orderRef, events, serverNow }: { orderRef: string; events: Record<string, EventSummary>; serverNow: string }) {
  const orders = useOrders();
  const mounted = useMountedNow();
  const now = mounted || Date.parse(serverNow);
  const [checking, setChecking] = useState(false);

  if (orders === undefined) {
    return (
      <div className="mx-auto flex max-w-[760px] flex-col gap-4" aria-busy="true" aria-label="Loading your booking">
        <Skeleton shape="avatar-lg" />
        <Skeleton shape="title" />
        <Skeleton shape="block" />
        <Skeleton className="h-[240px] rounded-lg" />
      </div>
    );
  }

  const order = orders.find((o) => o.ref === orderRef);
  const event = order ? events[order.eventId] : undefined;

  if (!order || !event) {
    return (
      <EmptyState
        size="lg"
        tone="charcoal"
        ring
        icon={<SearchIcon />}
        title="We can't find this booking"
        description="It may belong to another account or another browser. Your tickets are always in My Tickets once you sign in."
        actions={
          <Button asChild>
            <Link href="/my-tickets">Go to My Tickets</Link>
          </Button>
        }
      />
    );
  }

  const pending = order.payment.status === "pending";
  const count = order.tickets.length;
  const method = PAYMENT_METHODS.find((m) => m.id === order.payment.method)?.name;

  async function checkStatus() {
    setChecking(true);
    const updated = await ordersService.refreshPayment(order!.ref);
    setChecking(false);
    if (updated?.payment.status === "paid") toast.success("Payment confirmed", { body: "Your tickets are ready." });
    else toast.info("Still waiting for the provider", { body: "We'll update this page as soon as it's confirmed." });
  }

  return (
    <div className="mx-auto flex max-w-[760px] flex-col gap-8">
      {pending ? (
        <PaymentStatus
          kind="pending"
          title="Payment pending"
          description={`${method ?? "Your provider"} hasn't confirmed the payment yet. Your order ${order.ref} is reserved; tickets are issued as soon as it's confirmed. You haven't been charged twice.`}
          actions={
            <Button onClick={checkStatus} loading={checking} loadingLabel="Checking">
              Check payment status
            </Button>
          }
        />
      ) : (
        <div className="flex flex-col items-center gap-3 text-center">
          <IconTile tone="success" size="lg">
            <CheckThinIcon />
          </IconTile>
          <h1 className="m-0 type-h1 text-text">{order.payment.status === "free" ? "You're registered" : "You're going"}</h1>
          <p className="m-0 max-w-[480px] type-body text-text-soft">
            {count === 1 ? "Your ticket" : `Your ${count} tickets`} for <b className="text-text">{event.title}</b> {count === 1 ? "is" : "are"} confirmed.
          </p>
          <p className="m-0 type-body-sm text-text-faint">
            Booking reference <span className="font-mono font-semibold text-text">{order.ref}</span>
          </p>
        </div>
      )}

      <Card className="grid gap-4 sm:grid-cols-2">
        <div>
          <h2 className="m-0 type-label text-text-faint">Event</h2>
          <p className="m-0 mt-1 type-body font-semibold text-text">{event.title}</p>
          <p className="m-0 type-body-sm text-text-soft">
            {formatEventDate(event.startsAt, { weekday: true })} · {formatEventTime(event.startsAt)}
          </p>
          <p className="m-0 type-body-sm text-text-soft">{whereLabel(event)}</p>
          <Link href={`/events/${event.slug}`} className="mt-2 inline-block rounded-sm type-body-sm font-semibold text-accent-text hover:underline">
            View event details
          </Link>
        </div>
        <div>
          <h2 className="m-0 type-label text-text-faint">{order.payment.status === "free" ? "Registration" : "Payment"}</h2>
          <PriceBreakdown items={order.items} totals={order.totals} className="mt-2" />
          {order.payment.status === "paid" && method && (
            <p className="m-0 mt-2 type-body-sm text-text-faint">
              Paid with {method} · ref {order.payment.reference}
            </p>
          )}
        </div>
      </Card>

      {!pending && (
        <Note>
          We sent {count === 1 ? "the ticket" : "the tickets"} to <b className="text-text">{order.buyer.email}</b> and a text with the booking reference to <b className="text-text">{maskPhone(order.buyer.phone)}</b>. Guests with an email get their own ticket. (Demo: nothing is actually sent.)
        </Note>
      )}

      <section aria-labelledby="tickets-heading" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="tickets-heading" className="m-0 type-h2 text-text">
            {count === 1 ? "Your ticket" : `Your tickets (${count})`}
          </h2>
          {!pending && (
            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                onClick={() => {
                  order.tickets.forEach((t, i) => setTimeout(() => downloadTicket(t, order, event), i * 300));
                }}
              >
                <DownloadIcon className="size-4" /> Download all
              </Button>
              <Button variant="secondary" onClick={() => downloadCalendar(event, `${window.location.origin}/events/${event.slug}`)}>
                <CalendarIcon className="size-4" /> Add to calendar
              </Button>
            </div>
          )}
        </div>
        {order.tickets.map((t, i) => (
          <TicketCard key={t.id} ticket={t} order={order} event={event} status={ticketStatus(order, t, event, now)} index={i} total={count} />
        ))}
      </section>

      <div className="flex flex-col items-center gap-2 border-t border-border pt-8 text-center">
        <Button asChild>
          <Link href="/my-tickets">View My Tickets</Link>
        </Button>
        <Link href="/events" className="rounded-sm type-body-sm font-semibold text-text-soft hover:text-text">
          Keep exploring events
        </Link>
      </div>
      <p className="sr-only" aria-live="polite">
        {pending ? "Payment pending" : `Booking ${order.ref} confirmed, total ${formatCurrency(order.totals.total)}`}
      </p>
    </div>
  );
}
