"use client";

import Link from "next/link";
import { formatEventDateLong, formatEventTime } from "../../../lib/marketplace/datetime";
import { useMountedNow } from "../../../lib/marketplace/storage-store";
import { ticketStatus } from "../../../lib/marketplace/tickets";
import { useAttendee } from "@/app/auth/attendee/attendee-auth-service";
import { useOrders } from "../../../lib/services/orders-service";
import type { EventSummary } from "../../../types/marketplace";
import { Button } from "../../ui/button";
import { EmptyState } from "../../ui/empty-state";
import { ArrowLeftIcon, LockIcon, SearchIcon } from "../../ui/icons";
import { Skeleton } from "../../ui/skeleton";
import { TicketCard } from "./ticket-card";

/** A single ticket, full size, ready to show at the door. */
export function TicketDetailView({ ticketId, events, serverNow }: { ticketId: string; events: Record<string, EventSummary>; serverNow: string }) {
  const account = useAttendee();
  const orders = useOrders();
  const mounted = useMountedNow();
  const now = mounted || Date.parse(serverNow);

  if (account === undefined || orders === undefined) return <Skeleton className="h-[320px] rounded-lg" />;

  if (!account) {
    return (
      <EmptyState
        size="lg"
        tone="charcoal"
        ring
        icon={<LockIcon />}
        title="Sign in to view this ticket"
        description="Tickets are only shown to the account that booked them."
        actions={
          <Button asChild>
            <Link href={`/auth?next=/my-tickets/${ticketId}`}>Sign in</Link>
          </Button>
        }
      />
    );
  }

  const order = orders.find((o) => o.accountId === account.id && o.tickets.some((t) => t.id === ticketId));
  const ticket = order?.tickets.find((t) => t.id === ticketId);
  const event = order ? events[order.eventId] : undefined;

  if (!order || !ticket || !event) {
    return (
      <EmptyState
        size="lg"
        tone="charcoal"
        icon={<SearchIcon />}
        title="Ticket not found"
        description="It may belong to another account. Check My Tickets for everything you've booked."
        actions={
          <Button asChild>
            <Link href="/my-tickets">Go to My Tickets</Link>
          </Button>
        }
      />
    );
  }

  const index = order.tickets.findIndex((t) => t.id === ticketId);

  return (
    <div className="mx-auto flex max-w-[760px] flex-col gap-6">
      <Link href="/my-tickets" className="inline-flex items-center gap-1.5 self-start rounded-sm type-body-sm font-semibold text-text-soft hover:text-text">
        <ArrowLeftIcon className="size-4" /> My Tickets
      </Link>
      <div>
        <h1 className="m-0 type-h1 text-text">{event.title}</h1>
        <p className="m-0 mt-1 type-body text-text-soft">
          {formatEventDateLong(event.startsAt)} · doors {formatEventTime(event.startsAt)}
        </p>
      </div>
      <TicketCard ticket={ticket} order={order} event={event} status={ticketStatus(order, ticket, event, now)} index={index} total={order.tickets.length} showDetailsLink={false} />
      <div className="flex flex-wrap gap-2">
        <Button asChild variant="secondary">
          <Link href={`/events/${event.slug}`}>View event details</Link>
        </Button>
        <Button asChild variant="secondary">
          <Link href={`/booking/${order.ref}`}>Order {order.ref}</Link>
        </Button>
      </div>
      {ticket.checkedInAt && <p className="m-0 type-body-sm text-text-faint">Checked in on {formatEventDateLong(ticket.checkedInAt)}.</p>}
    </div>
  );
}
