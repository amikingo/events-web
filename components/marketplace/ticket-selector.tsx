"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatCurrency } from "../../lib/format";
import { ORDER_TICKET_LIMIT } from "../../lib/marketplace/config";
import { formatEventDate, formatEventTime } from "../../lib/marketplace/datetime";
import { eventAvailability, isLowStock, remainingOf, salesOpenAt, startingPrice, ticketSaleState } from "../../lib/marketplace/event-state";
import type { TicketSaleState } from "../../lib/marketplace/event-state";
import { computeTotals, feePerTicket, maxFor, selectionToItems, totalQuantity } from "../../lib/marketplace/pricing";
import type { Selection } from "../../lib/marketplace/pricing";
import { exploreHref } from "../../lib/marketplace/query";
import { useMountedNow } from "../../lib/marketplace/storage-store";
import { cn } from "../../lib/utils";
import { checkoutService } from "../../lib/services/checkout-service";
import type { EventLifecycle, TicketType } from "../../types/marketplace";
import { AlertCard } from "../ui/alert-card";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { BellIcon, CheckThinIcon } from "../ui/icons";
import { NumberStepper } from "../ui/number-stepper";
import { Pill } from "../ui/pill";
import { toast } from "../ui/toaster";

export interface SelectorEvent {
  id: string;
  slug: string;
  title: string;
  lifecycle: EventLifecycle;
  startsAt: string;
  endsAt: string;
  ticketTypes: TicketType[];
}

/** Quantity control for one ticket type: the library stepper at touch size, named for screen readers. */
export function QuantitySelector({ label, value, max, onChange, disabled }: { label: string; value: number; max: number; onChange: (v: number) => void; disabled?: boolean }) {
  return <NumberStepper aria-label={`Quantity for ${label}`} value={value} min={0} max={disabled ? 0 : Math.max(value, max)} onValueChange={onChange} size="lg" />;
}

function availabilityText(t: TicketType, state: TicketSaleState): { text: string; tone: "faint" | "warning" | "danger" } | null {
  if (state === "sold-out") return { text: "Sold out", tone: "danger" };
  if (state === "ended") return { text: "Sales ended", tone: "faint" };
  if (state === "not-started") return { text: `On sale ${formatEventDate(t.salesStartAt, { weekday: true, year: false })}, ${formatEventTime(t.salesStartAt)}`, tone: "faint" };
  if (isLowStock(t)) return { text: `Only ${remainingOf(t)} left`, tone: "warning" };
  return null;
}

/** One ticket type: what you get, the price with its fee, availability, and the quantity control. */
export function TicketTypeCard({ type, quantity, max, state, onChange }: { type: TicketType; quantity: number; max: number; state: TicketSaleState; onChange: (q: number) => void }) {
  const avail = availabilityText(type, state);
  const buyable = state === "on-sale";
  return (
    <li className={cn("flex flex-col gap-3 rounded-md border p-3.5 transition-colors", quantity > 0 ? "border-accent bg-[color-mix(in_srgb,var(--color-accent)_8%,var(--color-surface))]" : "border-border", !buyable && "bg-surface-2")}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className={cn("m-0 type-body font-semibold", buyable ? "text-text" : "text-text-soft")}>{type.name}</h3>
          <p className="m-0 type-body-sm text-text-soft">{type.description}</p>
        </div>
        <div className="flex-none text-right">
          <span className={cn("block type-body font-semibold", buyable ? "text-text" : "text-text-faint", state === "sold-out" && "line-through")}>{type.price === 0 ? "Free" : formatCurrency(type.price)}</span>
          {type.price > 0 && <span className="block type-body-sm text-text-faint">+ {formatCurrency(feePerTicket(type.price))} fee</span>}
        </div>
      </div>
      {type.perks.length > 0 && (
        <ul className="m-0 flex list-none flex-wrap gap-x-3 gap-y-1 p-0">
          {type.perks.map((p) => (
            <li key={p} className="flex items-center gap-1 type-body-sm text-text-soft">
              <CheckThinIcon className="size-3 text-success-text" />
              {p}
            </li>
          ))}
        </ul>
      )}
      <div className="flex items-center justify-between gap-3">
        {avail ? (
          <span className={cn("type-body-sm font-semibold", avail.tone === "danger" ? "text-danger-text" : avail.tone === "warning" ? "text-warning-text" : "text-text-faint")}>{avail.text}</span>
        ) : (
          <span className="type-body-sm text-text-faint">Up to {Math.min(type.maxPerOrder, ORDER_TICKET_LIMIT)} per order</span>
        )}
        {buyable && <QuantitySelector label={type.name} value={quantity} max={max} onChange={onChange} />}
      </div>
    </li>
  );
}

function rememberInterest(eventId: string, kind: "released" | "on-sale") {
  try {
    const key = "cheche-events.alerts";
    const list = JSON.parse(localStorage.getItem(key) ?? "[]") as string[];
    localStorage.setItem(key, JSON.stringify([...new Set([...list, `${eventId}:${kind}`])]));
  } catch {
    /* storage unavailable: the toast still confirms for this visit */
  }
}

/**
 * Ticket selection with live totals, the 6-per-order cap, per-type limits and every unavailable state. On desktop it
 * sits in a sticky side panel; on phones a bar pinned to the bottom of the screen keeps the next step in reach.
 */
export function TicketSelector({ event, serverNow }: { event: SelectorEvent; serverNow: string }) {
  const router = useRouter();
  const mountedNow = useMountedNow();
  const now = mountedNow || Date.parse(serverNow);
  const [selection, setSelection] = useState<Selection>({});
  const [starting, setStarting] = useState(false);

  const availability = eventAvailability(event, now);
  const count = totalQuantity(selection);
  const items = selectionToItems(selection, event.ticketTypes);
  const totals = computeTotals(items);
  const atLimit = count >= ORDER_TICKET_LIMIT;
  const from = startingPrice(event.ticketTypes, now);

  function setQty(typeId: string, q: number) {
    setSelection((s) => ({ ...s, [typeId]: q }));
  }

  function proceed() {
    setStarting(true);
    checkoutService.startWithSelection(event.id, Object.fromEntries(Object.entries(selection).filter(([, q]) => q > 0)));
    router.push(`/checkout/${event.slug}`);
  }

  function scrollToTickets() {
    document.getElementById("tickets")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const blocked = availability === "cancelled" || availability === "ended";

  return (
    <>
      <Card className="flex flex-col gap-4" aria-labelledby="tickets-title">
        <div className="flex items-center justify-between gap-3">
          <h2 id="tickets-title" className="m-0 type-h2 text-text">
            Tickets
          </h2>
          {availability === "on-sale" && (
            <Pill tone="success" dot size="sm">
              On sale
            </Pill>
          )}
        </div>

        {availability === "cancelled" && <AlertCard tone="danger" title="This event is cancelled" body="Ticket sales have stopped. If you bought tickets, your refund is on its way automatically." />}
        {availability === "ended" && (
          <AlertCard
            tone="info"
            title="This event has ended"
            body="Tickets are no longer available. Find something similar coming up."
            actions={
              <Link href={exploreHref()} className="type-body-sm font-semibold text-accent-text hover:underline">
                Browse upcoming events
              </Link>
            }
          />
        )}
        {availability === "sold-out" && <AlertCard tone="warning" title="Sold out" body="Every ticket has been sold. Organizers sometimes release returned tickets." />}
        {availability === "closed" && <AlertCard tone="warning" title="Ticket sales have closed" body="Online sales ended before the event. Check with the organizer about tickets at the door." />}
        {availability === "not-started" && (
          <AlertCard tone="info" title="Tickets aren't on sale yet" body={`Sales open ${(() => { const at = salesOpenAt(event.ticketTypes); return at ? `${formatEventDate(at, { weekday: true, year: false })} at ${formatEventTime(at)}` : "soon"; })()}.`} />
        )}

        {!blocked && (
          <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
            {event.ticketTypes.map((t) => (
              <TicketTypeCard key={t.id} type={t} quantity={selection[t.id] ?? 0} max={maxFor(t, selection, now)} state={ticketSaleState(t, now)} onChange={(q) => setQty(t.id, q)} />
            ))}
          </ul>
        )}

        {availability === "on-sale" && (
          <div className="flex flex-col gap-3 border-t border-border pt-4">
            {atLimit && (
              <p className="m-0 type-body-sm text-warning-text" role="status">
                You&rsquo;ve reached the limit of {ORDER_TICKET_LIMIT} tickets per order.
              </p>
            )}
            {count > 0 ? (
              <dl className="m-0 flex flex-col gap-1 type-body-sm text-text-soft">
                <div className="flex justify-between">
                  <dt>
                    {count} {count === 1 ? "ticket" : "tickets"}
                  </dt>
                  <dd className="m-0 tabular-nums">{formatCurrency(totals.subtotal)}</dd>
                </div>
                {totals.serviceFee > 0 && (
                  <div className="flex justify-between">
                    <dt>Service fee and VAT</dt>
                    <dd className="m-0 tabular-nums">{formatCurrency(totals.serviceFee + totals.vat)}</dd>
                  </div>
                )}
                <div className="mt-1 flex justify-between type-body font-semibold text-text">
                  <dt>Total</dt>
                  <dd className="m-0 tabular-nums">{totals.total === 0 ? "Free" : formatCurrency(totals.total)}</dd>
                </div>
              </dl>
            ) : (
              <p className="m-0 type-body-sm text-text-faint">Choose how many tickets you need. All fees are shown before you pay.</p>
            )}
            <Button disabled={count === 0} loading={starting} loadingLabel="Holding your tickets" onClick={proceed} className="w-full">
              {totals.total === 0 && count > 0 ? "Continue to registration" : "Continue to checkout"}
            </Button>
          </div>
        )}

        {(availability === "sold-out" || availability === "closed") && (
          <Button
            variant="secondary"
            className="w-full"
            onClick={() => {
              rememberInterest(event.id, "released");
              toast.success("We'll let you know", { body: "You'll get a message if tickets are released for this event." });
            }}
          >
            <BellIcon className="size-4" /> Notify me if tickets are released
          </Button>
        )}
        {availability === "not-started" && (
          <Button
            variant="secondary"
            className="w-full"
            onClick={() => {
              rememberInterest(event.id, "on-sale");
              toast.success("Reminder set", { body: "We'll message you when tickets go on sale." });
            }}
          >
            <BellIcon className="size-4" /> Remind me when sales open
          </Button>
        )}
      </Card>

      {/* Phone purchase bar: always one tap from the next step. */}
      {!blocked && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-surface px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 shadow-sheet lg:hidden">
          <div className="mx-auto flex max-w-[640px] items-center justify-between gap-3">
            <div className="min-w-0">
              {count > 0 ? (
                <>
                  <span className="block type-body-sm text-text-soft">
                    {count} {count === 1 ? "ticket" : "tickets"}
                  </span>
                  <span className="block type-body font-semibold text-text tabular-nums">{totals.total === 0 ? "Free" : formatCurrency(totals.total)}</span>
                </>
              ) : (
                <>
                  <span className="block type-body-sm text-text-soft">{availability === "on-sale" ? "Tickets" : availability === "sold-out" ? "Sold out" : availability === "not-started" ? "Opens soon" : "Sales closed"}</span>
                  <span className="block type-body font-semibold text-text">{from === 0 ? "Free" : `From ${formatCurrency(from)}`}</span>
                </>
              )}
            </div>
            {count > 0 ? (
              <Button loading={starting} loadingLabel="Holding" onClick={proceed}>
                Checkout
              </Button>
            ) : (
              <Button variant={availability === "on-sale" ? "primary" : "secondary"} onClick={scrollToTickets}>
                {availability === "on-sale" ? "Choose tickets" : "See details"}
              </Button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
