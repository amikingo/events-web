import { eventPhase } from "./event-state";
import type { EventSummary, IssuedTicket, Order } from "../../types/marketplace";

/** What a ticket shows the attendee, derived from the order, the ticket and the live event. */
export type TicketDisplayStatus = "active" | "used" | "expired" | "cancelled" | "pending";

export function ticketStatus(order: Order, ticket: IssuedTicket, event: EventSummary | undefined, now: number): TicketDisplayStatus {
  if (event?.lifecycle === "cancelled") return "cancelled";
  if (order.payment.status === "pending" || order.payment.status === "failed") return "pending";
  if (ticket.state === "used") return "used";
  if (event && eventPhase(event, now) === "ended") return "expired";
  return "active";
}

export type OrderBucket = "upcoming" | "past" | "cancelled";

export function orderBucket(order: Order, event: EventSummary | undefined, now: number): OrderBucket {
  if (!event || event.lifecycle === "cancelled") return "cancelled";
  return eventPhase(event, now) === "ended" ? "past" : "upcoming";
}

/** Only paid or free orders for live events carry a usable code. */
export function ticketHasCode(status: TicketDisplayStatus): boolean {
  return status === "active" || status === "used";
}
