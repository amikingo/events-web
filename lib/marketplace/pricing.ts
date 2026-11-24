import { ORDER_TICKET_LIMIT, SERVICE_FEE_RATE, VAT_RATE } from "./config";
import { remainingOf, ticketSaleState } from "./event-state";
import type { OrderItem, OrderTotals, TicketType } from "../../types/marketplace";

/** Ticket type id → quantity. */
export type Selection = Record<string, number>;

/** Service fee for one ticket at this price, in whole birr. */
export function feePerTicket(price: number): number {
  return price > 0 ? Math.round(price * SERVICE_FEE_RATE) : 0;
}

/**
 * Order totals, all in whole birr:
 * subtotal = Σ price × qty · service fee = Σ round(price × 5%) × qty · VAT = round(service fee × 15%) · total = sum of the three.
 */
export function computeTotals(items: Pick<OrderItem, "price" | "quantity">[]): OrderTotals {
  const subtotal = items.reduce((n, i) => n + i.price * i.quantity, 0);
  const serviceFee = items.reduce((n, i) => n + feePerTicket(i.price) * i.quantity, 0);
  const vat = Math.round(serviceFee * VAT_RATE);
  return { subtotal, serviceFee, vat, total: subtotal + serviceFee + vat };
}

export function totalQuantity(selection: Selection): number {
  return Object.values(selection).reduce((n, q) => n + q, 0);
}

/** The selection as order lines, in the event's ticket order, skipping zero quantities and unknown types. */
export function selectionToItems(selection: Selection, types: TicketType[]): OrderItem[] {
  return types
    .filter((t) => (selection[t.id] ?? 0) > 0)
    .map((t) => ({ ticketTypeId: t.id, name: t.name, price: t.price, quantity: selection[t.id]! }));
}

/** Highest quantity this type can go to, given the rest of the selection, stock, per-type cap and the order cap. */
export function maxFor(type: TicketType, selection: Selection, now: number): number {
  if (ticketSaleState(type, now) !== "on-sale") return 0;
  const others = totalQuantity(selection) - (selection[type.id] ?? 0);
  return Math.max(0, Math.min(remainingOf(type), type.maxPerOrder, ORDER_TICKET_LIMIT - others));
}

/** Drops quantities that are no longer allowed (sold out since, over the cap) — run before holding tickets. */
export function sanitizeSelection(selection: Selection, types: TicketType[], now: number): Selection {
  const next: Selection = {};
  for (const t of types) {
    const want = selection[t.id] ?? 0;
    if (want <= 0) continue;
    const allowed = Math.min(want, maxFor(t, next, now));
    if (allowed > 0) next[t.id] = allowed;
  }
  return next;
}
