"use client";

import Link from "next/link";
import { downloadCalendar, downloadTicket } from "../../../lib/marketplace/downloads";
import { formatEventDate, formatEventTime } from "../../../lib/marketplace/datetime";
import { qrPath } from "../../../lib/marketplace/qr";
import { ticketHasCode } from "../../../lib/marketplace/tickets";
import type { TicketDisplayStatus } from "../../../lib/marketplace/tickets";
import { cn } from "../../../lib/utils";
import type { EventSummary, IssuedTicket, Order } from "../../../types/marketplace";
import { Button } from "../../ui/button";
import { CalendarIcon, ClockIcon, DownloadIcon, LockIcon, XCircleIcon } from "../../ui/icons";
import { StatusPill } from "../../ui/status-pill";
import { whereLabel } from "../event-card";

/** A QR-style code for the ticket id. A placeholder until the backend issues signed codes — and labelled as such. */
export function QRCodeDisplay({ value, size = 160, caption = true, className }: { value: string; size?: number; caption?: boolean; className?: string }) {
  const { d, size: n } = qrPath(value);
  return (
    <figure className={cn("m-0 flex flex-col items-center gap-2", className)}>
      <svg viewBox={`-2 -2 ${n + 4} ${n + 4}`} width={size} height={size} role="img" aria-label={`Ticket code for ${value} (demo placeholder)`} className="rounded-sm" shapeRendering="crispEdges">
        <rect x={-2} y={-2} width={n + 4} height={n + 4} style={{ fill: "var(--color-paper)" }} />
        <path d={d} style={{ fill: "var(--color-paper-ink)" }} />
      </svg>
      {caption && (
        <figcaption className="text-center">
          <span className="block font-mono type-body-sm font-semibold text-text">{value}</span>
          <span className="block type-body-sm text-text-faint">Demo code · not valid for entry</span>
        </figcaption>
      )}
    </figure>
  );
}

export function TicketStatusPill({ status, size = "sm" }: { status: TicketDisplayStatus; size?: "sm" | "md" }) {
  switch (status) {
    case "active":
      return <StatusPill kind="ticket" status="active" size={size} />;
    case "used":
      return <StatusPill kind="ticket" status="used" size={size} dot={false} />;
    case "expired":
      return <StatusPill kind="ticket" status="expired" size={size} dot={false} />;
    case "cancelled":
      return <StatusPill kind="booking" status="cancelled" size={size} />;
    case "pending":
      return <StatusPill kind="payment" status="pending" size={size} />;
  }
}

function LockedCode({ status }: { status: TicketDisplayStatus }) {
  const cancelled = status === "cancelled";
  return (
    <div className="flex size-[160px] flex-col items-center justify-center gap-2 rounded-sm border border-dashed border-border-strong bg-surface-2 p-3 text-center">
      {cancelled ? <XCircleIcon className="size-6 text-danger-text" /> : status === "pending" ? <ClockIcon className="size-6 text-warning-text" /> : <LockIcon className="size-6 text-text-faint" />}
      <span className="type-body-sm text-text-soft">{cancelled ? "Event cancelled. Refund on its way." : "Your code appears once payment is confirmed."}</span>
    </div>
  );
}

/**
 * One ticket, styled as a stub: event, holder, type and id on the left; the code on the right behind a perforation.
 * Pending and cancelled tickets show why there's no code instead of a code.
 */
export function TicketCard({ ticket, order, event, status, index, total, showDetailsLink = true }: { ticket: IssuedTicket; order: Order; event: EventSummary; status: TicketDisplayStatus; index: number; total: number; showDetailsLink?: boolean }) {
  const hasCode = ticketHasCode(status);
  return (
    <article className="overflow-hidden rounded-lg border border-border bg-surface shadow" aria-label={`Ticket ${index + 1} of ${total}`}>
      <div className="grid sm:grid-cols-[minmax(0,1fr)_auto]">
        <div className="flex min-w-0 flex-col gap-3 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="type-label text-text-faint">
              Ticket {index + 1} of {total}
            </span>
            <TicketStatusPill status={status} />
          </div>
          <div>
            <h3 className="m-0 type-h3 text-text">{event.title}</h3>
            <p className="m-0 mt-0.5 type-body-sm text-text-soft">
              {formatEventDate(event.startsAt, { weekday: true })} · {formatEventTime(event.startsAt)}
            </p>
            <p className="m-0 type-body-sm text-text-soft">{whereLabel(event)}</p>
          </div>
          <dl className="m-0 grid grid-cols-2 gap-3 type-body-sm">
            <div>
              <dt className="type-label text-text-faint">Holder</dt>
              <dd className="m-0 truncate text-text">{ticket.holder.name}</dd>
            </div>
            <div>
              <dt className="type-label text-text-faint">Ticket</dt>
              <dd className="m-0 truncate text-text">{ticket.ticketTypeName}</dd>
            </div>
            <div>
              <dt className="type-label text-text-faint">Booking</dt>
              <dd className="m-0 font-mono text-text">{order.ref}</dd>
            </div>
            <div>
              <dt className="type-label text-text-faint">Ticket ID</dt>
              <dd className="m-0 font-mono text-text">{ticket.id}</dd>
            </div>
          </dl>
          <div className="mt-auto flex flex-wrap gap-2 pt-1">
            {hasCode && (
              <Button variant="secondary" onClick={() => downloadTicket(ticket, order, event)}>
                <DownloadIcon className="size-4" /> Download
              </Button>
            )}
            {status === "active" && (
              <Button variant="secondary" onClick={() => downloadCalendar(event, `${window.location.origin}/events/${event.slug}`)}>
                <CalendarIcon className="size-4" /> Add to calendar
              </Button>
            )}
            {showDetailsLink && (
              <Button asChild variant="secondary">
                <Link href={`/my-tickets/${ticket.id}`}>View ticket</Link>
              </Button>
            )}
          </div>
        </div>
        <div className="flex items-center justify-center border-t border-dashed border-border-strong bg-surface p-5 sm:border-l sm:border-t-0">
          {hasCode ? <QRCodeDisplay value={ticket.id} size={160} className={cn(status === "used" && "opacity-40")} /> : <LockedCode status={status} />}
        </div>
      </div>
    </article>
  );
}
