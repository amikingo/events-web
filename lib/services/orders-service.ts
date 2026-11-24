"use client";

import { DEMO } from "../marketplace/config";
import { newPaymentRef, newTicketId } from "../marketplace/ids";
import { computeTotals } from "../marketplace/pricing";
import { createStorageStore, useStorageStore } from "../marketplace/storage-store";
import type { Buyer, EventSummary, IssuedTicket, Order, OrderItem, PaymentMethodId, TicketHolder } from "../../types/marketplace";

/**
 * Orders and tickets, stored in this browser only. A real backend creates the order, issues signed ticket codes and
 * sends the email and SMS; keep these method names when connecting it.
 */

const ordersStore = createStorageStore<Order[]>("cheche-events.orders.v1", [], "local");
const seededStore = createStorageStore<string[]>("cheche-events.seeded.v1", [], "local");

function issueTickets(items: OrderItem[], holders: TicketHolder[], buyer: Buyer): IssuedTicket[] {
  const tickets: IssuedTicket[] = [];
  for (const item of items) {
    for (let i = 0; i < item.quantity; i++) {
      const holder = holders[tickets.length] ?? { name: buyer.name, email: buyer.email, answers: {} };
      tickets.push({ id: newTicketId(), ticketTypeId: item.ticketTypeId, ticketTypeName: item.name, price: item.price, holder, state: "valid" });
    }
  }
  return tickets;
}

export interface CreateOrderInput {
  ref: string;
  accountId: string;
  event: Pick<EventSummary, "id" | "slug" | "title">;
  items: OrderItem[];
  buyer: Buyer;
  holders: TicketHolder[];
  payment: { status: "paid" | "pending" | "free"; method?: PaymentMethodId; reference?: string };
}

export const ordersService = {
  store: ordersStore,

  create(input: CreateOrderInput): Order {
    const now = new Date().toISOString();
    const order: Order = {
      ref: input.ref,
      accountId: input.accountId,
      eventId: input.event.id,
      eventSlug: input.event.slug,
      eventTitle: input.event.title,
      createdAt: now,
      items: input.items,
      buyer: input.buyer,
      totals: computeTotals(input.items),
      payment: { ...input.payment, paidAt: input.payment.status === "paid" ? now : undefined },
      tickets: issueTickets(input.items, input.holders, input.buyer),
    };
    ordersStore.update((list) => [order, ...list.filter((o) => o.ref !== order.ref)]);
    return order;
  },

  /** Asks the (mock) provider again about a pending payment. The demo always confirms on the second check. */
  async refreshPayment(ref: string): Promise<Order | undefined> {
    await new Promise((r) => setTimeout(r, 1800));
    let updated: Order | undefined;
    ordersStore.update((list) =>
      list.map((o) => {
        if (o.ref !== ref || o.payment.status !== "pending") return o;
        updated = { ...o, payment: { ...o.payment, status: "paid", paidAt: new Date().toISOString(), reference: o.payment.reference ?? newPaymentRef(o.payment.method ?? "telebirr") } };
        return updated;
      }),
    );
    return updated;
  },

  /**
   * Gives the demo account (Hana Bekele) a realistic history the first time it signs in: upcoming, pending, rescheduled,
   * past and cancelled orders. Needs the catalog so prices and dates match the events.
   */
  ensureDemoOrders(accountId: string, events: Record<string, EventSummary>) {
    if (accountId !== DEMO.accountId || seededStore.get().includes(accountId)) return;
    const buyer: Buyer = { name: "Hana Bekele", email: "hana.bekele@example.com", phone: DEMO.phone };
    const plan: { eventId: string; lines: [string, number][]; ref: string; status: "paid" | "pending" | "free"; method?: PaymentMethodId; used?: number; daysAgo: number; guest?: string }[] = [
      { eventId: "evt-001", lines: [["ga", 2]], ref: "CE-J4ZZ7R", status: "paid", method: "telebirr", daysAgo: 9, guest: "Yared Bekele" },
      { eventId: "evt-009", lines: [["free", 1]], ref: "CE-PD2M8K", status: "free", daysAgo: 3 },
      { eventId: "evt-022", lines: [["ga", 2]], ref: "CE-LAUG4H", status: "pending", method: "cbe", daysAgo: 1, guest: "Mekdes Alemu" },
      { eventId: "evt-013", lines: [["ga", 2]], ref: "CE-HH9P3W", status: "paid", method: "wallet", daysAgo: 20, guest: "Yared Bekele" },
      { eventId: "evt-014", lines: [["seat", 1]], ref: "CE-AG7T5B", status: "paid", method: "telebirr", used: 1, daysAgo: 30 },
      { eventId: "evt-015", lines: [["tasting", 2]], ref: "CE-WT6Q2N", status: "paid", method: "cbe", used: 2, daysAgo: 16, guest: "Selam Tesfaye" },
      { eventId: "evt-016", lines: [["delegate", 1]], ref: "CE-LC3R8V", status: "paid", method: "telebirr", daysAgo: 25 },
    ];
    const created: Order[] = [];
    for (const p of plan) {
      const ev = events[p.eventId];
      if (!ev) continue;
      const items: OrderItem[] = p.lines.flatMap(([typeId, quantity]) => {
        const t = ev.ticketTypes.find((x) => x.id === typeId);
        return t ? [{ ticketTypeId: t.id, name: t.name, price: t.price, quantity }] : [];
      });
      const holders: TicketHolder[] = [{ name: buyer.name, email: buyer.email, answers: {} }, ...(p.guest ? [{ name: p.guest, email: "", answers: {} }] : [])];
      const createdAt = new Date(Date.parse(ev.startsAt) > Date.now() ? Date.now() - p.daysAgo * 86_400_000 : Date.parse(ev.startsAt) - p.daysAgo * 86_400_000).toISOString();
      const tickets = issueTickets(items, holders, buyer).map((t, i) => (p.used && i < p.used ? { ...t, state: "used" as const, checkedInAt: ev.startsAt } : t));
      created.push({
        ref: p.ref,
        accountId,
        eventId: ev.id,
        eventSlug: ev.slug,
        eventTitle: ev.title,
        createdAt,
        items,
        buyer,
        totals: computeTotals(items),
        payment: { status: p.status, method: p.method, reference: p.status === "paid" && p.method ? newPaymentRef(p.method) : undefined, paidAt: p.status === "paid" ? createdAt : undefined },
        tickets,
      });
    }
    ordersStore.update((list) => [...list.filter((o) => !created.some((c) => c.ref === o.ref)), ...created]);
    seededStore.update((ids) => [...ids, accountId]);
  },
};

/** All stored orders: `undefined` while hydrating. Filter by account in the caller. */
export function useOrders(): Order[] | undefined {
  return useStorageStore(ordersStore);
}
