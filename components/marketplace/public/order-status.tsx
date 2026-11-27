"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { CalendarDays, CalendarPlus, CalendarX2, CheckCircle2, Clock, CreditCard, DoorOpen } from "lucide-react";
import { useSession } from "@/app/auth/session";
import { Button } from "@/components/ui/button";
import { EventTicket } from "@/components/checkout/event-ticket";
import { TicketDesignPicker } from "@/components/checkout/ticket-design";
import { ShareButton } from "@/components/marketplace/share-button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorBanner } from "@/components/ui/error-banner";
import { IconTile } from "@/components/ui/icon-tile";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusPill } from "@/components/ui/status-pill";
import { ApiError, assetUrl } from "@/lib/api-client";
import { describeApiError } from "@/lib/api/errors";
import { checkPublicOrder, getPublicOrder, startPublicPayment } from "@/lib/api/orders";
import type { PublicOrder } from "@/lib/api/orders";
import { getPublicEvent } from "@/lib/api/public-events";
import type { PublicEventDetail } from "@/lib/api/public-events";
import { formatMomentFull } from "@/lib/ethiopian-datetime";
import { readOrderToken } from "@/lib/order-tokens";
import { wasPriceChanged } from "@/lib/price-change";
import { formatPrice, isFreePrice } from "@/lib/price";
import { usePublicTicketLook } from "@/lib/ticket-design-share";

/** How long to wait between looks at an order that's waiting for payment. */
const POLL_MS = 5000;

/** The buyer's words for each order status. */
const STATUS_TEXT: Record<PublicOrder["status"], { title: string; body: string }> = {
  PENDING_PAYMENT: { title: "Waiting for payment", body: "Your places are held while you pay." },
  CONFIRMED: { title: "Paid", body: "Your tickets are ready." },
  EXPIRED: { title: "Not paid in time", body: "The places were released. You can start a new order from the event page." },
  REFUND_REQUIRED: { title: "Paid after the places were released", body: "The organizer will refund you." },
};

/** "14:32 left" until the hold ends; null once it has. */
function useCountdown(until: string | null): string | null {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!until) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [until]);
  if (!until) return null;
  const left = Math.max(0, Math.floor((Date.parse(until) - now) / 1000));
  if (left === 0) return null;
  const minutes = Math.floor(left / 60);
  const seconds = String(left % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

/** An .ics file for the event, so the buyer can add it to their calendar. Times go in UTC. */
function downloadCalendar(order: PublicOrder) {
  const stamp = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const escape = (text: string) => text.replace(/[\\;,]/g, (c) => `\\${c}`).replace(/\n/g, "\\n");
  const url = `${window.location.origin}/events/${order.organization.slug}/${order.event.slug}`;
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Cheche Events//Order//EN",
    "BEGIN:VEVENT",
    `UID:${order.reference}@cheche-events`,
    `DTSTAMP:${stamp(new Date().toISOString())}`,
    `DTSTART:${stamp(order.event.starts_at!)}`,
    `DTEND:${stamp(order.event.ends_at!)}`,
    `SUMMARY:${escape(order.event.name)}`,
    `DESCRIPTION:${escape(`Order ${order.reference}. Codes: ${order.tickets.map((t) => t.code).filter(Boolean).join(", ")}. ${url}`)}`,
    `URL:${url}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  const blob = new Blob([lines.join("\r\n")], { type: "text/calendar" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `${order.event.slug}.ics`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(link.href);
}

/** The stored token doesn't change while the page is open: nothing to subscribe to. */
const noSubscription = () => () => undefined;

const holderName = (h: { first_name: string; last_name: string | null } | null) => (h ? [h.first_name, h.last_name].filter(Boolean).join(" ") : "Unnamed ticket");

/**
 * The buyer's order, where Cheche Pay sends them back. With the token this browser kept at checkout: ask Cheche Pay
 * once on arrival (`/check`), then look again every 5 seconds while the order waits for payment. Pending: the hold's
 * countdown and Pay now. Paid: every code.
 */
export function OrderStatusView({ reference }: { reference: string }) {
  const session = useSession();
  const signedIn = session?.kind === "attendee";
  // The token lives in this browser's storage: unknown while the page is made on the server (undefined), then read.
  const token = useSyncExternalStore(
    noSubscription,
    () => readOrderToken(reference),
    () => undefined,
  );
  // Set by the checkout when this order's total differs from what its page showed.
  const priceChanged = useSyncExternalStore(
    noSubscription,
    () => wasPriceChanged(reference),
    () => false,
  );
  const [order, setOrder] = useState<PublicOrder | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);
  const checked = useRef(false);
  // Phase 9: the event as it is now (cancelled, moved, its door time), read from its public page.
  const [liveEvent, setLiveEvent] = useState<PublicEventDetail | null>(null);
  const eventKey = order ? `${order.organization.slug}/${order.event.slug}` : null;
  useEffect(() => {
    if (!eventKey) return;
    const [orgSlug, eventSlug] = eventKey.split("/");
    const controller = new AbortController();
    getPublicEvent(orgSlug!, eventSlug!, controller.signal)
      .then(setLiveEvent)
      .catch(() => undefined); // The order's own copy of the event still shows.
    return () => controller.abort();
  }, [eventKey]);
  const countdown = useCountdown(order?.status === "PENDING_PAYMENT" ? order.hold_expires_at : null);
  // The organizer's ticket design, when they saved one: then it's the only one.
  const design = usePublicTicketLook(order?.organization.slug, order?.event.slug);

  // On arrival: read the order. Only if it's waiting for payment, ask Cheche Pay once (the buyer may be back from paying).
  useEffect(() => {
    if (!token || checked.current) return;
    checked.current = true;
    (async () => {
      try {
        const found = await getPublicOrder(reference, token);
        setOrder(found);
        if (found.status === "PENDING_PAYMENT") {
          // Cheche Pay unreachable: the 5-second look-ups below carry on.
          setOrder(await checkPublicOrder(reference, token).catch(() => found));
        }
      } catch (error) {
        // A wrong token is 404; a malformed one is refused as invalid (400). Either way this browser can't open it.
        const notHere = error instanceof ApiError && (error.status === 404 || error.code === "validation_error");
        setFailure(notHere ? "We couldn't find this order on this browser. Open it from the browser you ordered on." : describeApiError(error, "order"));
      }
    })();
  }, [reference, token]);

  // While it waits for payment: look again every 5 seconds.
  useEffect(() => {
    if (!token || order?.status !== "PENDING_PAYMENT") return;
    const timer = window.setInterval(() => {
      getPublicOrder(reference, token)
        .then(setOrder)
        .catch(() => undefined);
    }, POLL_MS);
    return () => window.clearInterval(timer);
  }, [reference, token, order?.status]);

  async function payNow() {
    if (!token) return;
    setPaying(true);
    setFailure(null);
    try {
      const next = await startPublicPayment(reference, token);
      setOrder(next);
      if (next.payment?.checkout_url) window.location.assign(next.payment.checkout_url);
      else setFailure("Payment is not available right now. Try again in a moment.");
    } catch (error) {
      setFailure(describeApiError(error, "order"));
    } finally {
      setPaying(false);
    }
  }

  if (token === undefined) {
    return (
      <Card>
        <Skeleton shape="block" />
      </Card>
    );
  }

  if (!token) {
    return (
      <EmptyState
        size="lg"
        icon={<CreditCard />}
        title="We can't open this order here"
        description="Open this page from the browser you ordered on, or use My Tickets if you were signed in."
        actions={
          <Button asChild variant="secondary">
            <Link href="/my-tickets">My Tickets</Link>
          </Button>
        }
      />
    );
  }

  if (!order) {
    return failure ? (
      <EmptyState size="lg" tone="danger" title="We couldn't load your order" description={failure} />
    ) : (
      <Card>
        <div className="flex flex-col gap-3">
          <Skeleton shape="title" />
          <Skeleton shape="line" />
          <Skeleton shape="block" />
        </div>
      </Card>
    );
  }

  const status = STATUS_TEXT[order.status];
  const paid = order.status === "CONFIRMED";
  const pending = order.status === "PENDING_PAYMENT";
  const free = isFreePrice(order.total_amount);
  const eventHref = `/events/${order.organization.slug}/${order.event.slug}`;

  // The current schedule: a rescheduled event simply shows its new time.
  const startsAt = liveEvent?.starts_at ?? order.event.starts_at;
  const endsAt = liveEvent?.ends_at ?? order.event.ends_at;
  const doorsAt = liveEvent?.doors_open_at ?? null;
  const cancelled = liveEvent?.display_status === "CANCELLED";
  const refundDue = cancelled && order.tickets.some((t) => t.status === "CANCELLED" && !isFreePrice(t.price.amount));

  if (paid) {
    return (
      <div className="flex flex-col gap-6">
        {/* The headline: it worked, or the event was called off. */}
        {cancelled ? (
          <div className="flex flex-col items-center gap-3 text-center" role="status">
            <IconTile tone="danger" size="lg">
              <CalendarX2 />
            </IconTile>
            <div className="flex flex-col gap-1">
              <p className="m-0 type-label text-danger-text">Event cancelled</p>
              <h1 className="m-0 type-h1 text-text">This event was cancelled</h1>
              <p className="m-0 type-body text-text-soft">
                {refundDue ? "The organizer will refund you. " : ""}Tickets that were cancelled can&apos;t be used.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 text-center" role="status">
            <IconTile tone="success" size="lg">
              <CheckCircle2 />
            </IconTile>
            <div className="flex flex-col gap-1">
              <p className="m-0 type-label text-success-text">{free ? "You're registered" : "Payment received"}</p>
              <h1 className="m-0 type-h1 text-text">You&apos;re going to {order.event.name}</h1>
              <p className="m-0 type-body text-text-soft">
                {order.tickets.length === 1 ? "Your ticket is below." : `Your ${order.tickets.length} tickets are below.`} We&apos;ve also sent the codes by SMS.
              </p>
            </div>
          </div>
        )}

        {/* The event at a glance. */}
        <Card>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 flex-col gap-1">
              <p className="m-0 type-body font-semibold text-text">{order.event.name}</p>
              {startsAt && (
                <p className="m-0 flex items-center gap-2 type-body-sm text-text-soft">
                  <CalendarDays className="size-4 flex-none" />
                  {formatMomentFull(startsAt, order.event.timezone)}
                </p>
              )}
              {doorsAt && (
                <p className="m-0 flex items-center gap-2 type-body-sm text-text-soft">
                  <DoorOpen className="size-4 flex-none" />
                  Doors open {formatMomentFull(doorsAt, order.event.timezone)}
                </p>
              )}
              <p className="m-0 type-body-sm text-text-faint">
                By {order.organization.name} · Order <span className="font-mono">{order.reference}</span>
                {free ? "" : ` · ${formatPrice(order.total_amount, order.currency)}`}
              </p>
            </div>
            {!cancelled && startsAt && endsAt && (
              <Button variant="secondary" onClick={() => downloadCalendar({ ...order, event: { ...order.event, starts_at: startsAt, ends_at: endsAt } })}>
                <CalendarPlus className="size-4" />
                Add to calendar
              </Button>
            )}
          </div>
        </Card>

        {/* Each ticket as a ticket: cover, details, QR; one that was cancelled or returned has no QR. */}
        {!design.loading && !design.look && order.tickets.some((t) => t.code && t.status === "CONFIRMED") && <TicketDesignPicker className="mx-auto w-full max-w-[420px]" />}
        <ul className="m-0 flex list-none flex-col gap-8 p-0" aria-label="Your tickets">
          {order.tickets.map((t, i) => (
            <li key={`${t.code ?? "pending"}-${i}`} className="mx-auto w-full">
              {t.code && t.status === "CONFIRMED" && design.loading ? (
                <Skeleton className="mx-auto h-[420px] w-full max-w-[420px] rounded-md" />
              ) : t.code && t.status === "CONFIRMED" ? (
                <EventTicket
                  look={design.look ?? undefined}
                  eventName={order.event.name}
                  eventSlug={order.event.slug}
                  organizerName={order.organization.name}
                  startsAt={startsAt}
                  timeZone={order.event.timezone}
                  venue={liveEvent?.venue ? [liveEvent.venue.name, liveEvent.venue.city].filter(Boolean).join(", ") : null}
                  coverUrl={liveEvent?.cover ? assetUrl(liveEvent.cover.url) : null}
                  ticketType={isFreePrice(t.price.amount) || design.look?.showPrice === false ? t.ticket_type.name : `${t.ticket_type.name} · ${formatPrice(t.price.amount, t.price.currency)}`}
                  guest={holderName(t.holder)}
                  code={t.code}
                  position={order.tickets.length > 1 ? `Ticket ${i + 1} of ${order.tickets.length}` : undefined}
                />
              ) : (
                <Card>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex min-w-0 flex-col">
                      <span className="type-body truncate font-semibold text-text">{holderName(t.holder)}</span>
                      <span className="type-body-sm text-text-soft">{t.ticket_type.name} · can&apos;t be used</span>
                    </div>
                    <StatusPill kind="registration" status={t.status} />
                  </div>
                </Card>
              )}
            </li>
          ))}
        </ul>
        <p className="m-0 text-center type-body-sm text-text-soft">Download a ticket to show it without a connection.</p>

        <div className="flex flex-wrap justify-center gap-2">
          {signedIn && (
            <Button asChild>
              <Link href="/my-tickets">View in My tickets</Link>
            </Button>
          )}
          <ShareButton title={order.event.name} />
          <Button asChild variant="secondary">
            <Link href={eventHref}>Back to the event</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <p className="m-0 type-label text-accent-text">Order {order.reference}</p>
        <h1 className="m-0 type-h1 text-text">{order.event.name}</h1>
        <p className="m-0 type-body-sm text-text-soft">
          {order.organization.name}
          {order.event.starts_at ? ` · ${formatMomentFull(order.event.starts_at, order.event.timezone)}` : ""}
        </p>
      </div>

      {failure && <ErrorBanner>{failure}</ErrorBanner>}

      <Card>
        <div className="flex flex-col gap-4" role="status" aria-live="polite">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex flex-col gap-0.5">
              <p className="m-0 type-h2 text-text">{status.title}</p>
              <p className="m-0 type-body-sm text-text-soft">{status.body}</p>
            </div>
            <p className="m-0 type-h3 text-text">{formatPrice(order.total_amount, order.currency)}</p>
          </div>
          {/* Each ticket's price as the order fixed it. */}
          <ul className="m-0 flex list-none flex-col divide-y divide-border border-t border-border p-0 pt-1">
            {order.tickets.map((t, i) => (
              <li key={`${t.ticket_type.code}-${i}`} className="flex items-center justify-between gap-3 py-2">
                <span className="type-body-sm min-w-0 truncate text-text-soft">{t.ticket_type.name}</span>
                <span className="type-body-sm flex-none tabular-nums text-text">{formatPrice(t.price.amount, t.price.currency)}</span>
              </li>
            ))}
          </ul>
          {pending && priceChanged && (
            <p className="m-0 rounded-md bg-surface-2 px-3 py-2.5 type-body-sm text-text">
              The price changed while you were choosing. This order&apos;s total is {formatPrice(order.total_amount, order.currency)}.
            </p>
          )}
          {pending && (
            <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="m-0 flex items-center gap-2 type-body text-text-soft">
                <Clock className="size-4" />
                {countdown ? (
                  <>
                    Places held for <b className="font-mono text-text">{countdown}</b>
                  </>
                ) : (
                  "The hold is ending. Checking your payment…"
                )}
              </p>
              <Button onClick={() => void payNow()} loading={paying} loadingLabel="Opening payment">
                <CreditCard className="size-4" />
                Pay now
              </Button>
            </div>
          )}
        </div>
      </Card>

      {order.status === "EXPIRED" && (
        <Button asChild variant="secondary">
          <Link href={eventHref}>Back to the event</Link>
        </Button>
      )}
    </div>
  );
}
