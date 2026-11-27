"use client";

import { useQueries } from "@tanstack/react-query";
import { useState } from "react";
import type { StaffEvent } from "@/lib/api/events";
import { listRegistrations } from "@/lib/api/registrations";
import type { Registration } from "@/lib/api/registrations";
import { toCents } from "@/lib/price";
import { registrationQk } from "@/lib/query-keys";
import type { TimePoint } from "./dashboard-charts";

/**
 * The dashboards' sales figures, worked out from the guest lists (the API has no report endpoint yet): confirmed
 * tickets per day, confirmed ticket prices per month, and where tickets came from. Cancelled, returned, unpaid (held)
 * and released tickets aren't counted. One request per 100 tickets per event, so both limits below keep it bounded;
 * `partial` says when they cut something off. Replace with a report endpoint when the API has one.
 */
const DAYS = 14;
const MONTHS = 6;
/** Most events read, newest first. */
const MAX_EVENTS = 100;
/** Most pages of 100 tickets read per event. */
const MAX_PAGES = 30;
/** Days and months are counted in Ethiopian time. */
const TIME_ZONE = "Africa/Addis_Ababa";

const dayKey = new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" });

async function readConfirmed(event: StaffEvent, signal: AbortSignal): Promise<{ tickets: Registration[]; partial: boolean }> {
  const tickets: Registration[] = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const result = await listRegistrations(event.organization_id, event.id, { page, pageSize: 100, status: "CONFIRMED" }, signal);
    tickets.push(...result.data);
    if (tickets.length >= result.totalItems || result.data.length === 0) return { tickets, partial: false };
  }
  return { tickets, partial: true };
}

export interface TicketReport {
  /** Confirmed tickets per day, the last 14 days, oldest first. */
  perDay: TimePoint[];
  /** Tickets in those 14 days. */
  recentTickets: number;
  /** Paid ticket prices per month, the last 6 months, in `currency` units. */
  perMonth: TimePoint[];
  /** The currency revenue is shown in (ETB when any ticket uses it), and whether other currencies were left out. */
  currency: string;
  otherCurrencies: boolean;
  sources: { label: string; value: number }[];
  loading: boolean;
  /** Some guest lists couldn't be read. */
  failed: boolean;
  partial: boolean;
}

export function useTicketReport(events: StaffEvent[], enabled: boolean): TicketReport {
  const [now] = useState(() => Date.now());
  // Drafts have no tickets.
  const read = events
    .filter((e) => e.status !== "DRAFT")
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))
    .slice(0, MAX_EVENTS);
  const queries = useQueries({
    queries: read.map((event) => ({
      queryKey: registrationQk.report(event.organization_id, event.id),
      queryFn: ({ signal }: { signal: AbortSignal }) => readConfirmed(event, signal),
      enabled,
      staleTime: 5 * 60_000,
    })),
  });
  const tickets = queries.flatMap((q) => q.data?.tickets ?? []);

  // The last 14 days and 6 months as keys, oldest first.
  const [year, month, day] = dayKey.format(now).split("-").map(Number) as [number, number, number];
  const pad = (n: number) => String(n).padStart(2, "0");
  const days = Array.from({ length: DAYS }, (_, i) => new Date(year, month - 1, day - (DAYS - 1 - i)));
  const months = Array.from({ length: MONTHS }, (_, i) => new Date(year, month - 1 - (MONTHS - 1 - i), 1));

  const currencies = new Set(tickets.filter((t) => toCents(t.price.amount) > 0).map((t) => t.price.currency));
  const currency = currencies.has("ETB") || currencies.size === 0 ? "ETB" : [...currencies][0]!;

  const ticketsOn = new Map<string, number>();
  const centsIn = new Map<string, number>();
  let online = 0;
  let staff = 0;
  let free = 0;
  for (const t of tickets) {
    const key = dayKey.format(Date.parse(t.registered_at));
    ticketsOn.set(key, (ticketsOn.get(key) ?? 0) + 1);
    const cents = toCents(t.price.amount);
    if (cents > 0 && t.price.currency === currency) centsIn.set(key.slice(0, 7), (centsIn.get(key.slice(0, 7)) ?? 0) + cents);
    if (t.source === "STAFF") staff++;
    else if (cents > 0) online++;
    else free++;
  }

  const perDay = days.map((d) => ({ date: d, value: ticketsOn.get(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`) ?? 0 }));

  return {
    perDay,
    recentTickets: perDay.reduce((sum, p) => sum + p.value, 0),
    perMonth: months.map((m) => ({ date: m, value: (centsIn.get(`${m.getFullYear()}-${pad(m.getMonth() + 1)}`) ?? 0) / 100 })),
    currency,
    otherCurrencies: currencies.size > 1,
    sources: [
      { label: "Bought online", value: online },
      { label: "Issued by staff", value: staff },
      { label: "Free sign-ups", value: free },
    ],
    loading: enabled && queries.some((q) => q.isPending),
    failed: queries.some((q) => q.isError),
    partial: events.length > MAX_EVENTS || queries.some((q) => q.data?.partial),
  };
}
