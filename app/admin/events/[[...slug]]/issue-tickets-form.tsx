"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, Phone, Ticket, Users, Wallet } from "lucide-react";
import { useState } from "react";
import type { ReactNode } from "react";
import { HolderCard } from "@/components/checkout/holder-card";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorBanner } from "@/components/ui/error-banner";
import { Field } from "@/components/ui/field";
import { IconTile } from "@/components/ui/icon-tile";
import { NumberStepper } from "@/components/ui/number-stepper";
import { PhoneInput } from "@/components/ui/phone-input";
import { Pill } from "@/components/ui/pill";
import { Skeleton, SkeletonStack } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toaster";
import { ApiError } from "@/lib/api-client";
import { DEFAULT_HOLDER_FIELDS, listTicketTypes } from "@/lib/api/events";
import { useAtTime } from "@/lib/use-at-time";
import type { StaffEvent } from "@/lib/api/events";
import { describeApiError } from "@/lib/api/errors";
import { issueTickets } from "@/lib/api/orders";
import type { StaffOrderInput } from "@/lib/api/orders";
import { BUYER_MOBILE_REQUIRED, MAX_TICKETS_PER_ORDER, emptyHolder, nationalMobile, newIdempotencyKey, orderRefusalMessage, placeOrderIssues, toHolderInput, validateHolder } from "@/lib/checkout";
import type { HolderDraft, HolderErrors, HolderKey } from "@/lib/checkout";
import { formatMomentShort } from "@/lib/ethiopian-datetime";
import { phoneDigits, validatePhone } from "@/lib/marketplace/validation";
import { rememberStaffHandover } from "@/lib/order-tokens";
import { formatPrice, fromCents, toCents } from "@/lib/price";
import { eventQk, orderQk, registrationQk } from "@/lib/query-keys";

/** A line of the summary card: an icon and a value, or a faint placeholder when it's empty. */
function SummaryLine({ icon, value, empty }: { icon: ReactNode; value: string; empty: string }) {
  return (
    <p className={value ? "type-body-sm m-0 flex min-w-0 items-center gap-2 text-text-soft" : "type-body-sm m-0 flex items-center gap-2 text-text-faint"}>
      <span className="flex-none [&_svg]:size-4">{icon}</span>
      <span className="truncate">{value || empty}</span>
    </p>
  );
}

interface IssueTicketsFormProps {
  event: StaffEvent;
  onDone: (orderId?: string) => void;
}

/**
 * Staff "Issue tickets" (Phase 7): several tickets in one order, staff-only types included, an optional buyer mobile
 * the codes are texted to (required when anything has a price), and, on a Detailed event, each guest's details. A paid
 * order waits for the buyer to pay through Cheche Pay; its page shows the payment link and token once.
 */
export function IssueTicketsForm({ event, onDone }: IssueTicketsFormProps) {
  const queryClient = useQueryClient();
  const orgId = event.organization_id;
  const detailed = (event.registration_mode ?? "DETAILED") === "DETAILED";
  const fields = event.holder_fields ?? DEFAULT_HOLDER_FIELDS;

  const ticketTypes = useQuery({ queryKey: eventQk.tickets(orgId, event.id), queryFn: ({ signal }) => listTicketTypes(orgId, event.id, signal) });
  const active = (ticketTypes.data ?? []).filter((t) => t.is_active);
  // A scheduled price starts or ends while the form is open: fetch the prices again.
  useAtTime((ticketTypes.data ?? []).map((t) => t.price_valid_until), () => void ticketTypes.refetch());
  // Every active type can be issued; a paid order waits for the buyer to pay through Cheche Pay.
  const free = active;

  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [holders, setHolders] = useState<Record<string, HolderDraft>>({});
  const [mobile, setMobile] = useState("");
  const [errors, setErrors] = useState<{ tickets?: string; mobile?: string }>({});
  const [holderErrors, setHolderErrors] = useState<Record<number, HolderErrors>>({});
  const [failure, setFailure] = useState<string | string[] | null>(null);
  const [key, setKey] = useState(newIdempotencyKey);

  const total = Object.values(quantities).reduce((sum, q) => sum + q, 0);
  const cap = Math.min(MAX_TICKETS_PER_ORDER, mobile && event.purchase_limit_per_mobile ? event.purchase_limit_per_mobile : MAX_TICKETS_PER_ORDER);
  const slots = free.flatMap((t) => Array.from({ length: quantities[t.id] ?? 0 }, (_, n) => ({ slot: `${t.id}#${n}`, id: t.id, name: t.name })));
  const chosen = free.filter((t) => (quantities[t.id] ?? 0) > 0);
  // Shown only (the server works out the real total), added up in whole cents.
  const totalCents = chosen.reduce((sum, t) => sum + toCents(t.effective_price ?? t.price) * (quantities[t.id] ?? 0), 0);
  const currency = active[0]?.currency ?? "ETB";
  // An event with a per-mobile limit counts every ticket against a buyer mobile, so one is always needed (Phase 8).
  const capped = Boolean(event.purchase_limit_per_mobile);
  const mobileRequired = totalCents > 0 || capped;
  const offsets = chosen.map((_, i) => chosen.slice(0, i).reduce((sum, t) => sum + (quantities[t.id] ?? 0), 0));

  const issue = useMutation({
    mutationFn: (input: StaffOrderInput) => issueTickets(orgId, event.id, input, key),
    onSuccess: ({ order, replayed }) => {
      void queryClient.invalidateQueries({ queryKey: registrationQk.all(orgId, event.id) });
      void queryClient.invalidateQueries({ queryKey: orderQk.all(orgId, event.id) });
      setKey(newIdempotencyKey());
      if (!replayed && toCents(order.total_amount) !== totalCents) {
        // A scheduled price started or ended between choosing and creating: the order's own total is what's paid.
        toast.info("The price changed while you were choosing", { body: `This order's total is ${formatPrice(order.total_amount, order.currency)}.` });
      }
      if (replayed) toast.info("Already issued", { body: `Order ${order.reference} was issued before. Nothing changed.` });
      else if (order.status === "PENDING_PAYMENT") toast.success("Order created", { body: `Order ${order.reference} waits for payment. Give the buyer the payment link.` });
      else toast.success(order.ticket_count === 1 ? "Ticket issued" : `${order.ticket_count} tickets issued`, { body: `Order ${order.reference}.` });
      // A paid order's token comes once, in this reply: hand it to the order page to show once, then forget it.
      if (order.order_token) rememberStaffHandover(order.id, order.order_token, order.payment?.checkout_url ?? null);
      onDone(order.id);
    },
    onError: (error) => {
      // A refusal (4xx) is final: the next press is a new submission. Otherwise the same key goes again.
      if (error instanceof ApiError && error.status >= 400 && error.status < 500) setKey(newIdempotencyKey());
      const placed = placeOrderIssues(error, offsets);
      if (placed) {
        setHolderErrors(placed.holders);
        if (placed.buyer) setErrors((e) => ({ ...e, mobile: placed.buyer }));
        setFailure(placed.summary);
      } else {
        setFailure(orderRefusalMessage(error, "staff"));
      }
    },
  });

  function setQuantity(id: string, value: number) {
    setQuantities((q) => ({ ...q, [id]: value }));
    setErrors((e) => ({ ...e, tickets: undefined }));
  }

  function setHolder(slot: string, index: number, field: HolderKey, value: string) {
    setHolders((h) => ({ ...h, [slot]: { ...(h[slot] ?? emptyHolder()), [field]: value } }));
    if (holderErrors[index]?.[field]) setHolderErrors((e) => ({ ...e, [index]: { ...e[index], [field]: undefined } }));
  }

  function submit() {
    const nextHolderErrors: Record<number, HolderErrors> = {};
    if (detailed) {
      slots.forEach((s, i) => {
        const found = validateHolder(holders[s.slot] ?? emptyHolder(), fields);
        if (Object.keys(found).length > 0) nextHolderErrors[i] = found;
      });
    }
    const next = {
      tickets: total === 0 ? "Choose at least one ticket." : undefined,
      mobile: mobile.trim()
        ? validatePhone(mobile)
        : totalCents > 0
          ? "A paid order needs the buyer's mobile: the payment link and codes go there."
          : capped
            ? BUYER_MOBILE_REQUIRED
            : undefined,
    };
    setErrors(next);
    setHolderErrors(nextHolderErrors);
    if (next.tickets || next.mobile || Object.keys(nextHolderErrors).length > 0) return;
    setFailure(null);
    issue.mutate({
      ...(mobile.trim() ? { buyer_mobile: `+251${phoneDigits(mobile)}` } : {}),
      items: chosen.map((t) => ({
        ticket_type_id: t.id,
        quantity: quantities[t.id]!,
        ...(detailed ? { holders: slots.filter((s) => s.id === t.id).map((s) => toHolderInput(holders[s.slot] ?? emptyHolder(), fields)) } : {}),
      })),
    });
  }

  return (
    <div className="flex w-full max-w-6xl flex-col gap-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-0.5">
          <h1 className="type-h1 m-0 text-text">Issue tickets</h1>
          <p className="type-body m-0 text-text-soft">For {event.name}. Staff-only ticket types can be issued here too.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" type="button" onClick={() => onDone()}>
            Cancel
          </Button>
          <Button type="button" onClick={submit} loading={issue.isPending} loadingLabel="Issuing" disabled={free.length === 0}>
            {totalCents > 0 ? "Create paid order" : total > 1 ? `Issue ${total} tickets` : "Issue ticket"}
          </Button>
        </div>
      </div>

      {failure && (
        <ErrorBanner>
          {Array.isArray(failure) ? (
            <ul className="m-0 list-none p-0">
              {failure.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          ) : (
            failure
          )}
        </ErrorBanner>
      )}

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)] lg:gap-8">
        {/* Left: what will be issued, filled in as the form is. Stays in view while the page scrolls. */}
        <aside className="flex flex-col gap-3 lg:sticky lg:top-6">
          <Card>
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <IconTile tone="accent" size="lg">
                  <Ticket />
                </IconTile>
                <div className="flex min-w-0 flex-col gap-1">
                  <p className="type-h3 m-0 text-text">{total === 0 ? "No tickets yet" : total === 1 ? "1 ticket" : `${total} tickets`}</p>
                  <div>
                    <Pill tone="neutral" size="sm">
                      {detailed ? "Detailed: named guests" : "Quick: tickets can be unnamed"}
                    </Pill>
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-2 border-t border-border pt-4">
                <SummaryLine icon={<CalendarDays />} value={event.starts_at ? formatMomentShort(event.starts_at, event.timezone) : ""} empty="No date yet" />
                <SummaryLine icon={<Phone />} value={mobile.trim() ? nationalMobile(`+251${phoneDigits(mobile)}`) : ""} empty="No buyer mobile: codes shown here only" />
                <SummaryLine icon={<Users />} value={chosen.map((t) => `${quantities[t.id]} × ${t.name}`).join(", ")} empty="Pick ticket types" />
                <SummaryLine icon={<Wallet />} value={total > 0 ? `Total ${formatPrice(fromCents(totalCents), currency)}${totalCents > 0 ? " · paid through Cheche Pay" : ""}` : ""} empty="No total yet" />
              </div>
            </div>
          </Card>
          <p className="type-body-sm m-0 px-1 text-text-faint">Tickets are issued at once. Each one gets its own code.</p>
        </aside>

        {/* Right: tickets, buyer, guests. */}
        <div className="flex flex-col gap-6">
          <section className="flex flex-col gap-3">
            <div className="flex flex-col gap-0.5 px-1">
              <h2 className="type-h3 m-0 text-text">Tickets</h2>
              <p className="type-body-sm m-0 text-text-soft">Up to {cap} in one order{event.purchase_limit_per_mobile ? `, and ${event.purchase_limit_per_mobile} per mobile number for this event` : ""}.</p>
            </div>
            <Card>
              {ticketTypes.isPending ? (
                <SkeletonStack>
                  <Skeleton shape="block" height={56} />
                  <Skeleton shape="block" height={56} />
                </SkeletonStack>
              ) : ticketTypes.isError ? (
                <EmptyState size="sm" tone="danger" title="We couldn't load the ticket types" description={describeApiError(ticketTypes.error, "ticket type")} />
              ) : active.length === 0 ? (
                <EmptyState size="sm" title="No ticket types switched on" description="Switch one on under Ticket types first." />
              ) : (
                <Field label="How many of each" error={errors.tickets}>
                  <ul className="m-0 flex list-none flex-col divide-y divide-border rounded-md border border-border p-0">
                    {active.map((t) => {
                      const q = quantities[t.id] ?? 0;
                      return (
                        <li key={t.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                          <div className="flex min-w-0 flex-col gap-0.5">
                            <span className="type-body m-0 flex flex-wrap items-center gap-2 font-medium text-text">
                              {t.name}
                              {t.audience === "STAFF_ONLY" && (
                                <Pill tone="neutral" size="sm">
                                  Staff only
                                </Pill>
                              )}
                            </span>
                            <span className="type-body-sm m-0 text-text-soft">{formatPrice(t.effective_price ?? t.price, t.currency)}
                              {t.price_valid_until && ` · changes ${formatMomentShort(t.price_valid_until, event.timezone)}`}
                            </span>
                          </div>
                          {<NumberStepper aria-label={`How many ${t.name} tickets`} value={q} min={0} max={q + Math.max(0, cap - total)} onValueChange={(v) => setQuantity(t.id, v)} />}
                        </li>
                      );
                    })}
                  </ul>
                </Field>
              )}
            </Card>
          </section>

          <section className="flex flex-col gap-3">
            <div className="flex flex-col gap-0.5 px-1">
              <h2 className="type-h3 m-0 text-text">Buyer</h2>
              <p className="type-body-sm m-0 text-text-soft">
                {totalCents > 0
                  ? "Required for a paid order: the payment link and the codes go to this mobile."
                  : capped
                    ? `Required: this event allows ${event.purchase_limit_per_mobile} tickets per mobile number, counted by this one.`
                    : "Optional. The codes are texted to this mobile."}
              </p>
            </div>
            <Card>
              <Field label="Buyer mobile" htmlFor="it-mobile" required={mobileRequired} error={errors.mobile} hint={mobileRequired ? undefined : "Leave it empty to hand the codes over yourself."}>
                <PhoneInput
                  id="it-mobile"
                  value={mobile}
                  error={!!errors.mobile}
                  onValueChange={(v) => {
                    setMobile(v);
                    setErrors((e) => ({ ...e, mobile: undefined }));
                  }}
                />
              </Field>
            </Card>
          </section>

          {detailed && slots.length > 0 && (
            <section className="flex flex-col gap-3">
              <div className="flex flex-col gap-0.5 px-1">
                <h2 className="type-h3 m-0 text-text">Guests</h2>
                <p className="type-body-sm m-0 text-text-soft">Who each ticket is for.</p>
              </div>
              <Card>
                <div className="flex flex-col gap-3">
                  {slots.map((s, i) => (
                    <HolderCard key={s.slot} index={i} ticketTypeName={s.name} fields={fields} value={holders[s.slot] ?? emptyHolder()} errors={holderErrors[i]} onChange={(field, value) => setHolder(s.slot, i, field, value)} />
                  ))}
                </div>
              </Card>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
