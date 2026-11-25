import { Pill } from "../ui/pill";
import type { PillSize, PillVariant } from "../ui/pill";
import { StatusPill } from "../ui/status-pill";
import { eventAvailability, eventPhase, isLowStock, ticketSaleState } from "../../lib/marketplace/event-state";
import type { EventLifecycle, TicketType } from "../../types/marketplace";

/**
 * The one place event states turn into badges. Where the shared status vocabulary has the right word, it is used
 * (Cancelled, Completed, Rescheduled). Ticketing states it does not cover yet (Sold out, Happening now, Few left, Sales
 * closed, Opens soon) use a `Pill` with the vocabulary's colour meanings — a request to add them to `statusVocabulary`
 * is in the implementation notes, so this mapping can move into `StatusPill` later without touching any screen.
 */

type BadgeEvent = { lifecycle: EventLifecycle; startsAt: string; endsAt: string; ticketTypes: TicketType[] };

export type EventBadgeKind = "cancelled" | "completed" | "rescheduled" | "live" | "sold-out" | "closed" | "opens-soon" | "few-left";

export function eventBadgeKind(e: BadgeEvent, now: number): EventBadgeKind | null {
  if (e.lifecycle === "cancelled") return "cancelled";
  const phase = eventPhase(e, now);
  if (phase === "ended") return "completed";
  if (e.lifecycle === "postponed") return "rescheduled";
  const availability = eventAvailability(e, now);
  if (phase === "ongoing") return "live";
  if (availability === "sold-out") return "sold-out";
  if (availability === "closed") return "closed";
  if (availability === "not-started") return "opens-soon";
  if (e.ticketTypes.some((t) => ticketSaleState(t, now) === "on-sale" && isLowStock(t))) return "few-left";
  return null;
}

/** `variant="solid"` is for badges sitting on artwork (one visible at a time), where a tinted pill would disappear. */
export function EventStatusBadge({ event, now, size = "sm", variant, className }: { event: BadgeEvent; now: number; size?: PillSize; variant?: PillVariant; className?: string }) {
  const kind = eventBadgeKind(event, now);
  if (!kind) return null;
  const common = { size, variant, className };
  switch (kind) {
    case "cancelled":
      return <StatusPill kind="booking" status="cancelled" {...common} />;
    case "completed":
      return <StatusPill kind="booking" status="completed" dot={false} {...common} />;
    case "rescheduled":
      return <StatusPill kind="booking" status="rescheduled" {...common} />;
    case "live":
      return (
        <Pill tone="info" dot {...common}>
          Happening now
        </Pill>
      );
    case "sold-out":
      return (
        <Pill tone="danger" {...common}>
          Sold out
        </Pill>
      );
    case "closed":
      return (
        <Pill tone="neutral" {...common}>
          Registration closed
        </Pill>
      );
    case "opens-soon":
      return (
        <Pill tone="warning" {...common}>
          Opens soon
        </Pill>
      );
    case "few-left":
      return (
        <Pill tone="warning" dot {...common}>
          Few left
        </Pill>
      );
  }
}
