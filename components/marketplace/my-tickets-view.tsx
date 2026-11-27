"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSession } from "@/app/auth/session";
import { EventTicket } from "@/components/checkout/event-ticket";
import { TicketDesignPicker } from "@/components/checkout/ticket-design";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorBanner } from "@/components/ui/error-banner";
import { CalendarIcon, CardIcon, DocIcon } from "@/components/ui/icons";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusPill } from "@/components/ui/status-pill";
import { listMyTickets } from "@/lib/api/customer";
import type { MyTicket } from "@/lib/api/customer";
import { describeApiError } from "@/lib/api/errors";
import { getPublicEvent } from "@/lib/api/public-events";
import type { PublicEventDetail } from "@/lib/api/public-events";
import { assetUrl } from "@/lib/api-client";
import { formatMomentFull, formatRangeFull } from "@/lib/ethiopian-datetime";
import { usePublicTicketLook } from "@/lib/ticket-design-share";

function isPastTicket(ticket: MyTicket, nowMs: number): boolean {
  const endIso = ticket.event.ends_at ?? ticket.event.starts_at;
  if (!endIso) return false;
  const endMs = Date.parse(endIso);
  return !Number.isNaN(endMs) && endMs < nowMs;
}

function formatTicketWhen(event: MyTicket["event"]): string {
  if (!event.starts_at) return "Date to be announced";
  if (event.ends_at) return formatRangeFull(event.starts_at, event.ends_at, event.timezone);
  return formatMomentFull(event.starts_at, event.timezone);
}

function TicketsSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-label="Loading your tickets">
      <div className="flex flex-col gap-3">
        <Skeleton className="h-5 w-28" />
        <Skeleton className="h-[136px] w-full rounded-md" />
        <Skeleton className="h-[136px] w-full rounded-md" />
      </div>
    </div>
  );
}

/**
 * The designed ticket for one of My Tickets: the cover and venue come from the event's public page. When the organizer
 * saved a design it's the only one; otherwise the buyer chooses.
 */
function FullTicket({ ticket }: { ticket: MyTicket }) {
  const design = usePublicTicketLook(ticket.organization.slug, ticket.event.slug);
  const [event, setEvent] = useState<PublicEventDetail | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    getPublicEvent(ticket.organization.slug, ticket.event.slug, controller.signal)
      .then(setEvent)
      .catch(() => undefined); // The ticket still shows, in the brand colours.
    return () => controller.abort();
  }, [ticket.organization.slug, ticket.event.slug]);
  if (design.loading) return <Skeleton className="mx-auto h-[420px] w-full max-w-[420px] rounded-md" />;
  return (
    <div className="flex w-full flex-col gap-4">
      {!design.look && <TicketDesignPicker className="mx-auto w-full max-w-[420px]" />}
      <EventTicket
        look={design.look ?? undefined}
        eventName={ticket.event.name}
        eventSlug={ticket.event.slug}
        organizerName={ticket.organization.name}
        startsAt={ticket.event.starts_at}
        timeZone={ticket.event.timezone}
        venue={event?.venue ? [event.venue.name, event.venue.city].filter(Boolean).join(", ") : null}
        coverUrl={event?.cover ? assetUrl(event.cover.url) : null}
        ticketType={ticket.ticket_type.name}
        code={ticket.code}
      />
    </div>
  );
}

function TicketCard({ ticket, past }: { ticket: MyTicket; past: boolean }) {
  const [open, setOpen] = useState(false);
  const cancelled = ticket.status === "CANCELLED";
  const muted = cancelled || past;
  const eventHref = `/events/${ticket.organization.slug}/${ticket.event.slug}`;

  return (
    <Card className={muted ? "bg-surface/75" : undefined}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="type-body-sm font-medium text-text-faint">{ticket.organization.name}</span>
            <StatusPill kind="registration" status={ticket.status} size="sm" />
          </div>
          <h3 className="m-0 type-h3 text-text">
            <Link href={eventHref} className="rounded-sm hover:text-accent-text hover:underline">
              {ticket.event.name}
            </Link>
          </h3>
          <p className="m-0 flex items-start gap-2 type-body-sm text-text-soft">
            <CalendarIcon className="mt-0.5 size-4 flex-none text-text-faint" aria-hidden="true" />
            <span>{formatTicketWhen(ticket.event)}</span>
          </p>
          <p className="m-0 flex items-center gap-2 type-body-sm text-text-soft">
            <CardIcon className="size-4 flex-none text-text-faint" aria-hidden="true" />
            <span>{ticket.ticket_type.name}</span>
          </p>
        </div>

        {cancelled ? (
          <div className="flex flex-none items-center sm:justify-end">
            <span className="type-body-sm text-text-faint">Registration cancelled</span>
          </div>
        ) : (
          <div className="flex flex-none flex-wrap items-center gap-3">
            <div className="flex flex-col items-start rounded-md border border-border bg-surface-2 px-4 py-3 sm:items-end sm:text-right">
              <span className="type-label text-text-faint">Entry code</span>
              <span
                className="mt-0.5 font-mono text-lg font-semibold tracking-[0.18em] text-text sm:text-xl"
                aria-label={`Entry code ${ticket.code.split("").join(" ")}`}
              >
                {ticket.code}
              </span>
            </div>
            {!past && (
              <Button variant={open ? "secondary" : undefined} aria-expanded={open} onClick={() => setOpen((v) => !v)}>
                {open ? "Hide ticket" : "Show ticket"}
              </Button>
            )}
          </div>
        )}
      </div>
      {open && !past && !cancelled && (
        <div className="mt-5 border-t border-border pt-5">
          <FullTicket ticket={ticket} />
        </div>
      )}
    </Card>
  );
}

interface FetchState {
  guestId: string;
  attempt: number;
  tickets: MyTicket[] | null;
  error: string | null;
  fetchedAtMs: number;
}

/**
 * My Tickets: signed-out visitors see how event codes work plus a Sign in prompt; signed-in guests see
 * their upcoming and past registrations from `GET /v1/customer/registrations`.
 */
export function MyTicketsView() {
  const session = useSession();
  const isGuest = session?.kind === "attendee";
  const guestId = isGuest ? session.account.id : null;

  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<FetchState | null>(null);

  useEffect(() => {
    if (!guestId) return;

    const controller = new AbortController();
    listMyTickets(controller.signal)
      .then((rows) => {
        if (controller.signal.aborted) return;
        setResult({
          guestId,
          attempt,
          tickets: rows,
          error: null,
          fetchedAtMs: Date.now(),
        });
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        setResult({
          guestId,
          attempt,
          tickets: null,
          error: describeApiError(err, "tickets"),
          fetchedAtMs: Date.now(),
        });
      });

    return () => controller.abort();
  }, [guestId, attempt]);

  const currentResult = result && guestId && result.guestId === guestId && result.attempt === attempt ? result : null;

  const { upcoming, past } = useMemo(() => {
    const list = currentResult?.tickets ?? [];
    const nowMs = currentResult?.fetchedAtMs ?? 0;
    const nextUpcoming: MyTicket[] = [];
    const nextPast: MyTicket[] = [];
    for (const item of list) {
      if (isPastTicket(item, nowMs)) nextPast.push(item);
      else nextUpcoming.push(item);
    }
    return { upcoming: nextUpcoming, past: nextPast };
  }, [currentResult]);

  if (session === undefined || (isGuest && !currentResult)) {
    return <TicketsSkeleton />;
  }

  if (!isGuest) {
    return (
      <EmptyState
        size="lg"
        tone="accent"
        icon={<DocIcon />}
        title="Your ticket is your code"
        description="When you register, we show an 8-character code on screen and text it to your phone. Sign in to view registrations made with your Cheche account."
        actions={
          <div className="flex flex-wrap justify-center gap-3">
            <Button asChild>
              <Link href="/auth?next=/my-tickets">Sign in</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/events">Browse events</Link>
            </Button>
          </div>
        }
      />
    );
  }

  if (currentResult?.error) {
    return (
      <div className="flex flex-col gap-4">
        <ErrorBanner>{currentResult.error}</ErrorBanner>
        <div>
          <Button variant="secondary" onClick={() => setAttempt((a) => a + 1)}>
            Try again
          </Button>
        </div>
      </div>
    );
  }

  const tickets = currentResult?.tickets ?? [];
  const note = (
    <p className="m-0 pt-2 type-body-sm text-text-faint">
      Tickets you registered for without signing in don&apos;t appear here. Their code still works.
    </p>
  );

  if (tickets.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <EmptyState
          size="lg"
          tone="accent"
          icon={<DocIcon />}
          title="No tickets yet"
          description="Events you register for while signed in will appear here with your entry code."
          actions={
            <Button asChild>
              <Link href="/events">Browse events</Link>
            </Button>
          }
        />
        {note}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {upcoming.length > 0 && (
        <section aria-labelledby="upcoming-tickets" className="flex flex-col gap-3">
          <h2 id="upcoming-tickets" className="m-0 type-h3 text-text">
            Upcoming
          </h2>
          <div className="flex flex-col gap-3">
            {upcoming.map((ticket) => (
              <TicketCard key={ticket.code} ticket={ticket} past={false} />
            ))}
          </div>
        </section>
      )}

      {past.length > 0 && (
        <section aria-labelledby="past-tickets" className="flex flex-col gap-3">
          <h2 id="past-tickets" className="m-0 type-h3 text-text-soft">
            Past
          </h2>
          <div className="flex flex-col gap-3">
            {past.map((ticket) => (
              <TicketCard key={ticket.code} ticket={ticket} past />
            ))}
          </div>
        </section>
      )}

      {note}
    </div>
  );
}
