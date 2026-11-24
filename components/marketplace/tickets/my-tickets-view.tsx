"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatCurrency } from "../../../lib/format";
import { formatEventDate, formatEventTime } from "../../../lib/marketplace/datetime";
import { useMountedNow } from "../../../lib/marketplace/storage-store";
import { orderBucket, ticketStatus } from "../../../lib/marketplace/tickets";
import type { OrderBucket } from "../../../lib/marketplace/tickets";
import { useAttendee } from "@/app/auth/attendee/attendee-auth-service";
import { ordersService, useOrders } from "../../../lib/services/orders-service";
import type { EventSummary, Order } from "../../../types/marketplace";
import { AlertCard } from "../../ui/alert-card";
import { Button } from "../../ui/button";
import { EmptyState } from "../../ui/empty-state";
import { CalendarIcon, CardIcon, LockIcon, XCircleIcon } from "../../ui/icons";
import { Skeleton } from "../../ui/skeleton";
import { StatusPill } from "../../ui/status-pill";
import { Tab, TabList, TabPanel, Tabs } from "../../ui/tabs";
import { toast } from "../../ui/toaster";
import { whereLabel } from "../event-card";
import { EventCover } from "../event-cover";
import { TicketStatusPill } from "./ticket-card";

function OrderCard({ order, event, now, bucket }: { order: Order; event: EventSummary; now: number; bucket: OrderBucket }) {
  const [checking, setChecking] = useState(false);
  const pending = order.payment.status === "pending";
  const changed = event.lifecycle === "postponed" || Boolean(event.latestUpdate);

  return (
    <article className="overflow-hidden rounded-lg border border-border bg-surface">
      <div className="flex flex-col sm:flex-row">
        <div className="relative aspect-[16/7] flex-none sm:aspect-auto sm:w-[200px]">
          <EventCover seed={event.id} pattern={event.coverPattern} category={event.categoryId} muted={bucket !== "upcoming"} />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-3 p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="m-0 type-label text-accent-text">
                {formatEventDate(event.startsAt, { weekday: true })} · {formatEventTime(event.startsAt)}
              </p>
              <h3 className="m-0 mt-0.5 type-h3 text-text">
                <Link href={`/events/${event.slug}`} className="rounded-sm hover:underline">
                  {event.title}
                </Link>
              </h3>
              <p className="m-0 type-body-sm text-text-soft">{whereLabel(event)}</p>
            </div>
            {pending ? <StatusPill kind="payment" status="pending" /> : bucket === "cancelled" ? <StatusPill kind="booking" status="cancelled" /> : <StatusPill kind="booking" status={bucket === "past" ? "completed" : "confirmed"} dot={bucket !== "past"} />}
          </div>

          {bucket === "cancelled" && <AlertCard tone="danger" title="The organizer cancelled this event" body={`${event.lifecycleNote ?? "A full refund is on its way."} Refund of ${formatCurrency(order.totals.total)} to your original payment method.`} />}
          {bucket === "upcoming" && event.lifecycle === "postponed" && event.originalStartsAt && (
            <AlertCard tone="warning" title={`Rescheduled to ${formatEventDate(event.startsAt, { weekday: true, year: false })}`} body="Your tickets stay valid for the new date. Prefer a refund? Contact the organizer from the event page." />
          )}
          {bucket === "upcoming" && changed && event.lifecycle === "published" && event.latestUpdate && <AlertCard tone="info" title="Event details updated" time={formatEventDate(event.latestUpdate.at, { year: false })} body={event.latestUpdate.summary} />}
          {pending && (
            <AlertCard
              tone="warning"
              title="Waiting for payment confirmation"
              body="Your tickets will be issued once the provider confirms. You won't be charged twice."
              actions={
                <button
                  type="button"
                  disabled={checking}
                  className="rounded-sm type-body-sm font-semibold text-accent-text hover:underline disabled:opacity-50"
                  onClick={async () => {
                    setChecking(true);
                    const u = await ordersService.refreshPayment(order.ref);
                    setChecking(false);
                    if (u?.payment.status === "paid") toast.success("Payment confirmed", { body: "Your tickets are ready." });
                  }}
                >
                  {checking ? "Checking…" : "Check payment status"}
                </button>
              }
            />
          )}

          <ul className="m-0 flex list-none flex-col divide-y divide-border rounded-md border border-border p-0">
            {order.tickets.map((t) => (
              <li key={t.id}>
                <Link href={`/my-tickets/${t.id}`} className="flex items-center gap-3 px-3 py-2.5 hover:bg-surface-2">
                  <CardIcon className="size-4 flex-none text-text-faint" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate type-body-sm font-semibold text-text">{t.holder.name}</span>
                    <span className="block truncate type-body-sm text-text-faint">
                      {t.ticketTypeName} · <span className="font-mono">{t.id}</span>
                    </span>
                  </span>
                  <TicketStatusPill status={ticketStatus(order, t, event, now)} />
                </Link>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap items-center justify-between gap-2 type-body-sm text-text-faint">
            <span>
              Booking <span className="font-mono text-text">{order.ref}</span> · {order.payment.status === "free" ? "Free" : formatCurrency(order.totals.total)}
            </span>
            <Link href={`/booking/${order.ref}`} className="rounded-sm font-semibold text-accent-text hover:underline">
              Order details
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}

const EMPTY: Record<OrderBucket, { title: string; description: string; icon: React.ReactNode }> = {
  upcoming: { title: "No upcoming tickets", description: "When you book an event, your tickets appear here.", icon: <CardIcon /> },
  past: { title: "No past events yet", description: "Events you've been to will be listed here.", icon: <CalendarIcon /> },
  cancelled: { title: "Nothing cancelled", description: "If an organizer cancels an event you booked, it shows here with your refund.", icon: <XCircleIcon /> },
};

/** Personal ticket wallet: upcoming, past and cancelled bookings for the signed-in attendee. */
export function MyTicketsView({ events, serverNow }: { events: Record<string, EventSummary>; serverNow: string }) {
  const account = useAttendee();
  const orders = useOrders();
  const mounted = useMountedNow();
  const now = mounted || Date.parse(serverNow);
  const [tab, setTab] = useState<OrderBucket>("upcoming");

  // The demo account gets a realistic booking history the first time it opens this page.
  useEffect(() => {
    if (account) ordersService.ensureDemoOrders(account.id, events);
  }, [account, events]);

  if (account === undefined || orders === undefined) {
    return (
      <div className="flex flex-col gap-4" aria-busy="true" aria-label="Loading your tickets">
        <Skeleton height={36} width={320} />
        {Array.from({ length: 2 }, (_, i) => (
          <Skeleton key={i} className="h-[220px] rounded-lg" />
        ))}
      </div>
    );
  }

  if (!account) {
    return (
      <EmptyState
        size="lg"
        tone="charcoal"
        ring
        icon={<LockIcon />}
        title="Sign in to see your tickets"
        description="Use the phone number or email you booked with. We'll send you a code."
        actions={
          <Button asChild>
            <Link href="/auth?next=/my-tickets">Sign in</Link>
          </Button>
        }
      />
    );
  }

  const mine = orders.filter((o) => o.accountId === account.id && events[o.eventId]);
  const groups: Record<OrderBucket, Order[]> = { upcoming: [], past: [], cancelled: [] };
  for (const o of mine) groups[orderBucket(o, events[o.eventId], now)].push(o);
  groups.upcoming.sort((a, b) => events[a.eventId]!.startsAt.localeCompare(events[b.eventId]!.startsAt));
  groups.past.sort((a, b) => events[b.eventId]!.startsAt.localeCompare(events[a.eventId]!.startsAt));

  return (
    <Tabs value={tab} onValueChange={(v) => setTab(v as OrderBucket)}>
      <TabList aria-label="Ticket groups">
        <Tab value="upcoming" count={groups.upcoming.length} countSoft>
          Upcoming
        </Tab>
        <Tab value="past" count={groups.past.length} countSoft>
          Past
        </Tab>
        <Tab value="cancelled" count={groups.cancelled.length} countSoft>
          Cancelled
        </Tab>
      </TabList>
      {(["upcoming", "past", "cancelled"] as OrderBucket[]).map((b) => (
        <TabPanel key={b} value={b}>
          {groups[b].length ? (
            <div className="flex flex-col gap-4">
              {groups[b].map((o) => (
                <OrderCard key={o.ref} order={o} event={events[o.eventId]!} now={now} bucket={b} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={EMPTY[b].icon}
              title={EMPTY[b].title}
              description={EMPTY[b].description}
              actions={
                b === "upcoming" ? (
                  <Button asChild>
                    <Link href="/events">Find events</Link>
                  </Button>
                ) : undefined
              }
              animate
            />
          )}
        </TabPanel>
      ))}
    </Tabs>
  );
}
