import { formatCurrency } from "../../../lib/format";
import { formatCountdown, formatEventWhen } from "../../../lib/marketplace/datetime";
import { VAT_RATE } from "../../../lib/marketplace/config";
import { cn } from "../../../lib/utils";
import type { CategoryId, CoverPattern, OrderItem, OrderTotals } from "../../../types/marketplace";
import { ClockIcon } from "../../ui/icons";
import { EventCover } from "../event-cover";

export interface SummaryEvent {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string;
  where: string;
  categoryId: CategoryId;
  coverPattern: CoverPattern;
}

/** Line items and every charge, always visible before payment. */
export function PriceBreakdown({ items, totals, className }: { items: OrderItem[]; totals: OrderTotals; className?: string }) {
  return (
    <dl className={cn("m-0 flex flex-col gap-1.5 type-body-sm text-text-soft", className)}>
      {items.map((i) => (
        <div key={i.ticketTypeId} className="flex justify-between gap-3">
          <dt>
            {i.quantity} × {i.name}
          </dt>
          <dd className="m-0 tabular-nums text-text">{i.price === 0 ? "Free" : formatCurrency(i.price * i.quantity)}</dd>
        </div>
      ))}
      <div className="mt-1.5 flex justify-between gap-3 border-t border-border pt-2.5">
        <dt>Subtotal</dt>
        <dd className="m-0 tabular-nums">{formatCurrency(totals.subtotal)}</dd>
      </div>
      <div className="flex justify-between gap-3">
        <dt>Service fee</dt>
        <dd className="m-0 tabular-nums">{formatCurrency(totals.serviceFee)}</dd>
      </div>
      <div className="flex justify-between gap-3">
        <dt>VAT on service fee ({Math.round(VAT_RATE * 100)}%)</dt>
        <dd className="m-0 tabular-nums">{formatCurrency(totals.vat)}</dd>
      </div>
      <div className="mt-1.5 flex items-baseline justify-between gap-3 border-t border-dashed border-border-strong pt-2.5">
        <dt className="type-body font-semibold text-text">Total</dt>
        <dd className="m-0 type-h2 tabular-nums text-text">{totals.total === 0 ? "Free" : formatCurrency(totals.total)}</dd>
      </div>
    </dl>
  );
}

export function OrderSummary({ event, items, totals, holdLeftMs }: { event: SummaryEvent; items: OrderItem[]; totals: OrderTotals; holdLeftMs?: number | null }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-3">
        <div className="aspect-square w-16 flex-none overflow-hidden rounded-sm">
          <EventCover seed={event.id} pattern={event.coverPattern} category={event.categoryId} />
        </div>
        <div className="min-w-0">
          <p className="m-0 type-body font-semibold text-text line-clamp-2">{event.title}</p>
          <p className="m-0 type-body-sm text-text-soft">{formatEventWhen(event.startsAt, event.endsAt)}</p>
          <p className="m-0 type-body-sm text-text-faint truncate">{event.where}</p>
        </div>
      </div>
      {items.length ? <PriceBreakdown items={items} totals={totals} /> : <p className="m-0 type-body-sm text-text-faint">No tickets selected yet.</p>}
      {holdLeftMs != null && holdLeftMs > 0 && (
        <p className="m-0 flex items-center gap-1.5 type-body-sm text-text-soft">
          <ClockIcon className="size-3.5" /> Tickets held for <b className="tabular-nums text-text">{formatCountdown(holdLeftMs)}</b>
        </p>
      )}
    </div>
  );
}
