import { LOW_STOCK_THRESHOLD } from "./config";
import type { EventLifecycle, TicketType } from "../../types/marketplace";

/**
 * Derived event states. Organizers set the lifecycle (published / cancelled / postponed); timing and availability are
 * worked out from dates and stock so they can never disagree with each other.
 */

export type EventPhase = "upcoming" | "ongoing" | "ended";

export function eventPhase(e: { startsAt: string; endsAt: string }, now: number): EventPhase {
  if (now < Date.parse(e.startsAt)) return "upcoming";
  if (now <= Date.parse(e.endsAt)) return "ongoing";
  return "ended";
}

export type TicketSaleState = "on-sale" | "sold-out" | "not-started" | "ended";

export function remainingOf(t: TicketType): number {
  return Math.max(0, t.quantityTotal - t.quantitySold);
}

export function ticketSaleState(t: TicketType, now: number): TicketSaleState {
  if (remainingOf(t) <= 0) return "sold-out";
  if (now < Date.parse(t.salesStartAt)) return "not-started";
  if (now > Date.parse(t.salesEndAt)) return "ended";
  return "on-sale";
}

export function isLowStock(t: TicketType): boolean {
  const left = remainingOf(t);
  return left > 0 && (left <= LOW_STOCK_THRESHOLD || left / t.quantityTotal <= 0.1);
}

/** What an attendee can do with the event right now. */
export type EventAvailability = "on-sale" | "sold-out" | "closed" | "not-started" | "cancelled" | "ended";

export function eventAvailability(e: { lifecycle: EventLifecycle; startsAt: string; endsAt: string; ticketTypes: TicketType[] }, now: number): EventAvailability {
  if (e.lifecycle === "cancelled") return "cancelled";
  if (eventPhase(e, now) === "ended") return "ended";
  const states = e.ticketTypes.map((t) => ticketSaleState(t, now));
  if (states.includes("on-sale")) return "on-sale";
  if (states.includes("not-started")) return "not-started";
  if (states.every((s) => s === "sold-out")) return "sold-out";
  return "closed";
}

/** The earliest moment a not-yet-on-sale event opens. */
export function salesOpenAt(types: TicketType[]): string | undefined {
  return types.map((t) => t.salesStartAt).sort()[0];
}

/** The lowest price a buyer could pay now, falling back to the lowest overall when nothing is on sale. */
export function startingPrice(types: TicketType[], now: number): number {
  const onSale = types.filter((t) => ticketSaleState(t, now) === "on-sale");
  const pool = onSale.length ? onSale : types;
  return Math.min(...pool.map((t) => t.price));
}

export function isFreeEvent(types: TicketType[]): boolean {
  return types.every((t) => t.price === 0);
}

/** Share of all seats sold, 0–100, for "Selling fast" signals. */
export function soldShare(types: TicketType[]): number {
  const total = types.reduce((n, t) => n + t.quantityTotal, 0);
  const sold = types.reduce((n, t) => n + t.quantitySold, 0);
  return total ? Math.round((sold / total) * 100) : 0;
}
