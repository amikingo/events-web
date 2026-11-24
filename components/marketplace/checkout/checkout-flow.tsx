"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatCurrency } from "../../../lib/format";
import { HOLD_MINUTES, ORDER_TICKET_LIMIT } from "../../../lib/marketplace/config";
import { formatCountdown } from "../../../lib/marketplace/datetime";
import { eventAvailability, ticketSaleState } from "../../../lib/marketplace/event-state";
import { newOrderRef } from "../../../lib/marketplace/ids";
import { computeTotals, maxFor, sanitizeSelection, selectionToItems, totalQuantity } from "../../../lib/marketplace/pricing";
import type { Selection } from "../../../lib/marketplace/pricing";
import { useNow } from "../../../lib/marketplace/storage-store";
import { phoneDigits } from "../../../lib/marketplace/validation";
import { cn } from "../../../lib/utils";
import { attendeeAuth, useAttendee } from "@/app/auth/attendee/attendee-auth-service";
import { checkoutService, emptyDraft, useCheckoutDrafts } from "../../../lib/services/checkout-service";
import type { CheckoutDraft, CheckoutStep } from "../../../lib/services/checkout-service";
import { ordersService } from "../../../lib/services/orders-service";
import type { AttendeeQuestion, Buyer, EventLifecycle, PaymentMethodId, TicketHolder, TicketType } from "../../../types/marketplace";
import { AlertCard } from "../../ui/alert-card";
import { Button } from "../../ui/button";
import { Card } from "../../ui/card";
import { Checkbox } from "../../ui/checkbox";
import { AlertDialog } from "../../ui/confirm-dialog";
import { ArrowLeftIcon, ClockIcon } from "../../ui/icons";
import { ModalSteps } from "../../ui/modal";
import { Skeleton } from "../../ui/skeleton";
import { toast } from "../../ui/toaster";
import { TicketTypeCard } from "../ticket-selector";
import { AttendeeForm } from "./attendee-form";
import { OrderSummary, PriceBreakdown } from "./order-summary";
import type { SummaryEvent } from "./order-summary";
import { OTPVerification } from "@/app/auth/attendee/otp-verification";
import { PaymentStep } from "./payment-step";

export interface CheckoutEvent extends SummaryEvent {
  slug: string;
  lifecycle: EventLifecycle;
  ticketTypes: TicketType[];
  attendeeQuestions: AttendeeQuestion[];
  refundSummary: string;
}

const LABELS: Record<CheckoutStep, string> = { tickets: "Tickets", attendees: "Attendees", verify: "Verify", review: "Review", payment: "Payment" };
const HEADINGS: Record<CheckoutStep, string> = {
  tickets: "Choose your tickets",
  attendees: "Who's going?",
  verify: "Confirm your phone number",
  review: "Review your order",
  payment: "Payment",
};

/** Sticky on phones, inline on desktop: the step's one primary action, with the total beside it. */
function ActionBar({ total, children, back }: { total?: number; children: React.ReactNode; back?: () => void }) {
  return (
    <div className="sticky bottom-0 z-10 -mx-4 mt-8 flex items-center gap-3 border-t border-border bg-surface px-4 py-3 sm:mx-0 sm:rounded-md sm:border lg:static lg:border-0 lg:bg-transparent lg:px-0 lg:py-0">
      {back && (
        <Button variant="secondary" onClick={back} className="max-[480px]:w-9 max-[480px]:px-0" aria-label="Back">
          <ArrowLeftIcon className="size-4" />
          <span className="max-[480px]:hidden">Back</span>
        </Button>
      )}
      {total !== undefined && (
        <div className="min-w-0 lg:hidden">
          <span className="block type-body-sm text-text-soft">Total</span>
          <span className="block type-body font-semibold tabular-nums text-text">{total === 0 ? "Free" : formatCurrency(total)}</span>
        </div>
      )}
      <div className="ml-auto flex">{children}</div>
    </div>
  );
}

export function CheckoutFlow({ event, serverNow }: { event: CheckoutEvent; serverNow: string }) {
  const router = useRouter();
  const drafts = useCheckoutDrafts();
  const account = useAttendee();
  const tick = useNow();
  const now = tick || Date.parse(serverNow);
  const [busy, setBusy] = useState(false);
  const [restarting, setRestarting] = useState(false);

  if (drafts === undefined || account === undefined) return <CheckoutSkeleton />;

  const draft: CheckoutDraft = drafts[event.id] ?? emptyDraft(event.id);
  const items = selectionToItems(draft.selection, event.ticketTypes);
  const totals = computeTotals(items);
  const count = totalQuantity(draft.selection);
  const isFree = count > 0 && totals.total === 0;
  const steps: CheckoutStep[] = isFree ? ["tickets", "attendees", "verify", "review"] : ["tickets", "attendees", "verify", "review", "payment"];
  const step: CheckoutStep = steps.includes(draft.step) ? draft.step : "tickets";
  const holdLeft = draft.hold ? draft.hold.expiresAt - now : null;
  const holdExpired = Boolean(draft.hold) && tick > 0 && holdLeft !== null && holdLeft <= 0;
  const availability = eventAvailability(event, now);

  const patch = (p: Partial<CheckoutDraft>) => checkoutService.patch(event.id, p);
  const go = (s: CheckoutStep) => {
    patch({ step: s });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // An event that can't be bought any more (and no hold in progress) stops checkout with a clear way back.
  if (availability !== "on-sale" && !draft.hold) {
    return (
      <div className="mx-auto max-w-[560px] py-6">
        <AlertCard
          tone={availability === "cancelled" ? "danger" : "warning"}
          title={availability === "cancelled" ? "This event is cancelled" : availability === "ended" ? "This event has ended" : availability === "sold-out" ? "Tickets are sold out" : availability === "not-started" ? "Tickets aren't on sale yet" : "Ticket sales have closed"}
          body="There's nothing to check out right now."
          actions={
            <Link href={`/events/${event.slug}`} className="type-body-sm font-semibold text-accent-text hover:underline">
              Back to the event
            </Link>
          }
        />
      </div>
    );
  }

  /* ── step handlers ── */

  function setQty(typeId: string, q: number) {
    const selection: Selection = { ...draft.selection, [typeId]: q };
    // Changing tickets releases the current hold; a new one is placed when continuing.
    patch({ selection, hold: null, acceptedTerms: false });
  }

  async function continueFromTickets() {
    const clean = sanitizeSelection(draft.selection, event.ticketTypes, now);
    if (totalQuantity(clean) !== count) {
      patch({ selection: clean });
      toast.warning("Your selection changed", { body: "Some tickets sold out or went over a limit, so we adjusted the quantities." });
      return;
    }
    setBusy(true);
    if (!draft.hold || (holdLeft ?? 0) <= 0) await checkoutService.holdTickets(event.id);
    setBusy(false);
    const buyer: Buyer = draft.buyer.name || !account ? draft.buyer : { name: account.name, email: account.email, phone: account.phone };
    patch({ step: "attendees", buyer });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function saveAttendees(buyer: Buyer, holders: TicketHolder[]) {
    const verifiedPhone = draft.verifiedPhone === buyer.phone || account?.phone === buyer.phone ? buyer.phone : null;
    patch({ buyer, holders, verifiedPhone });
    go("verify");
  }

  function onVerified() {
    const acc = attendeeAuth.signInWithVerifiedPhone(draft.buyer);
    patch({ verifiedPhone: phoneDigits(draft.buyer.phone) });
    toast.success(`Signed in as ${acc.name}`, { body: "Your tickets will appear in My Tickets." });
  }

  function placeOrder(payment: { status: "paid" | "pending" | "free"; method?: PaymentMethodId; reference?: string }) {
    const acc = account ?? attendeeAuth.signInWithVerifiedPhone(draft.buyer);
    const ref = newOrderRef();
    ordersService.create({ ref, accountId: acc.id, event: { id: event.id, slug: event.slug, title: event.title }, items, buyer: draft.buyer, holders: draft.holders, payment });
    checkoutService.clear(event.id);
    router.push(`/booking/${ref}`);
  }

  async function confirmFree() {
    setBusy(true);
    await new Promise((r) => setTimeout(r, 700));
    placeOrder({ status: "free" });
  }

  function restart() {
    setRestarting(true);
    patch({ step: "tickets", hold: null, acceptedTerms: false });
    setRestarting(false);
  }

  /* ── render ── */

  const stepIndex = steps.indexOf(step);
  const verified = Boolean(draft.verifiedPhone && draft.verifiedPhone === draft.buyer.phone);

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-10">
      <div className="min-w-0">
        <ModalSteps steps={steps.map((s) => LABELS[s])} current={stepIndex + 1} className="mb-6 px-0 pt-0" />

        {draft.hold && !holdExpired && holdLeft !== null && step !== "tickets" && (
          <div className={cn("mb-6 flex items-center gap-3 rounded-md border px-4 py-3", holdLeft < 120_000 ? "border-warning bg-[color-mix(in_srgb,var(--color-warning)_10%,var(--color-surface))]" : "border-border bg-surface")} role="timer" aria-live={holdLeft < 60_000 ? "polite" : "off"}>
            <ClockIcon className={cn("size-5 flex-none", holdLeft < 120_000 ? "text-warning-text" : "text-accent-text")} />
            <p className="m-0 flex-1 type-body-sm text-text-soft">
              We&rsquo;re holding your tickets for <b className="tabular-nums text-text">{formatCountdown(holdLeft)}</b>. Finish before the timer runs out.
            </p>
          </div>
        )}

        <h1 className="m-0 mb-6 type-h1 text-text">{HEADINGS[step]}</h1>

        {step === "tickets" && (
          <>
            <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
              {event.ticketTypes.map((t) => (
                <TicketTypeCard key={t.id} type={t} quantity={draft.selection[t.id] ?? 0} max={maxFor(t, draft.selection, now)} state={ticketSaleState(t, now)} onChange={(q) => setQty(t.id, q)} />
              ))}
            </ul>
            <p className="m-0 mt-3 type-body-sm text-text-faint">
              Up to {ORDER_TICKET_LIMIT} tickets per order. We hold your tickets for {HOLD_MINUTES} minutes once you continue.
            </p>
            <ActionBar total={totals.total}>
              <Button disabled={count === 0} loading={busy} loadingLabel="Holding tickets" onClick={continueFromTickets}>
                Continue
              </Button>
            </ActionBar>
          </>
        )}

        {step === "attendees" && (
          <>
            <AttendeeForm formId="attendee-form" items={items} questions={event.attendeeQuestions} initialBuyer={draft.buyer} initialHolders={draft.holders} onSubmit={saveAttendees} />
            <ActionBar total={totals.total} back={() => go("tickets")}>
              <Button type="submit" form="attendee-form">
                Continue
              </Button>
            </ActionBar>
          </>
        )}

        {step === "verify" && (
          <>
            <OTPVerification channel="sms" target={draft.buyer.phone} purpose="checkout" alreadyVerified={verified} onVerified={onVerified} />
            <ActionBar total={totals.total} back={() => go("attendees")}>
              <Button disabled={!verified} onClick={() => go("review")}>
                Continue to review
              </Button>
            </ActionBar>
          </>
        )}

        {step === "review" && (
          <>
            <div className="flex flex-col gap-4">
              <Card>
                <h2 className="m-0 mb-3 type-h3 text-text">Tickets</h2>
                <PriceBreakdown items={items} totals={totals} />
              </Card>
              <Card>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h2 className="m-0 type-h3 text-text">Attendees</h2>
                  <button type="button" className="rounded-sm type-body-sm font-semibold text-accent-text hover:underline" onClick={() => go("attendees")}>
                    Edit
                  </button>
                </div>
                <dl className="m-0 flex flex-col gap-2 type-body-sm">
                  <div className="flex justify-between gap-3">
                    <dt className="text-text-soft">Contact</dt>
                    <dd className="m-0 text-right text-text">
                      {draft.buyer.name}
                      <span className="block text-text-faint">
                        {draft.buyer.email} · +251 {draft.buyer.phone.replace(/(\d{3})(\d{3})(\d{3})/, "$1 $2 $3")}
                      </span>
                    </dd>
                  </div>
                  {draft.holders.map((h, i) => (
                    <div key={i} className="flex justify-between gap-3 border-t border-border pt-2">
                      <dt className="text-text-soft">Ticket {i + 1}</dt>
                      <dd className="m-0 text-right text-text">
                        {h.name}
                        {Object.values(h.answers).filter(Boolean).length > 0 && <span className="block text-text-faint">{Object.values(h.answers).filter(Boolean).join(" · ")}</span>}
                      </dd>
                    </div>
                  ))}
                </dl>
              </Card>
              <Card>
                <h2 className="m-0 mb-2 type-h3 text-text">Refund policy</h2>
                <p className="m-0 type-body-sm text-text-soft">{event.refundSummary}</p>
                <div className="mt-4">
                  <Checkbox checked={draft.acceptedTerms} onCheckedChange={(v) => patch({ acceptedTerms: v })} label="I agree to the refund policy and the terms of sale" />
                </div>
              </Card>
            </div>
            <ActionBar total={totals.total} back={() => go("verify")}>
              {isFree ? (
                <Button disabled={!draft.acceptedTerms} loading={busy} loadingLabel="Confirming" onClick={confirmFree}>
                  Confirm registration
                </Button>
              ) : (
                <Button disabled={!draft.acceptedTerms} onClick={() => go("payment")}>
                  Continue to payment
                </Button>
              )}
            </ActionBar>
          </>
        )}

        {step === "payment" && (
          <>
            <PaymentStep total={totals.total} onResult={(res, method) => placeOrder({ status: res.status, method, reference: res.reference })} />
            <div className="mt-4">
              <Button variant="secondary" onClick={() => go("review")}>
                <ArrowLeftIcon className="size-4" /> Back to review
              </Button>
            </div>
          </>
        )}
      </div>

      {/* Desktop summary; on phones it folds into a disclosure above the steps' sticky action bar. */}
      <aside aria-label="Order summary" className="order-first lg:order-none">
        <details className="group rounded-md border border-border bg-surface lg:hidden">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 type-body-sm font-semibold text-text [&::-webkit-details-marker]:hidden">
            <span>
              Order summary <span className="font-normal text-text-faint">· {count} {count === 1 ? "ticket" : "tickets"}</span>
            </span>
            <span className="tabular-nums">{totals.total === 0 && count > 0 ? "Free" : formatCurrency(totals.total)}</span>
          </summary>
          <div className="border-t border-border p-4">
            <OrderSummary event={event} items={items} totals={totals} holdLeftMs={draft.hold && !holdExpired ? holdLeft : null} />
          </div>
        </details>
        <Card className="hidden lg:sticky lg:top-24 lg:block">
          <h2 className="m-0 mb-4 type-h3 text-text">Order summary</h2>
          <OrderSummary event={event} items={items} totals={totals} holdLeftMs={draft.hold && !holdExpired ? holdLeft : null} />
        </Card>
      </aside>

      <AlertDialog
        open={holdExpired}
        onOpenChange={() => restart()}
        tone="warning"
        icon={<ClockIcon />}
        title="Your reservation expired"
        description={`We held your tickets for ${HOLD_MINUTES} minutes and released them so others can buy. Your details are saved; choose your tickets again to continue.`}
        actionLabel={restarting ? "Restarting…" : "Choose tickets again"}
        onAction={restart}
      />
    </div>
  );
}

function CheckoutSkeleton() {
  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]" aria-busy="true" aria-label="Loading checkout">
      <div className="flex flex-col gap-4">
        <Skeleton height={24} width="70%" />
        <Skeleton shape="title" width="40%" />
        <Skeleton shape="block" />
        <Skeleton shape="block" />
        <Skeleton shape="block" />
      </div>
      <Skeleton className="hidden h-[280px] rounded-md lg:block" />
    </div>
  );
}
