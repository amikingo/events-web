"use client";

import { HOLD_MINUTES } from "../marketplace/config";
import { newHoldId, newPaymentRef } from "../marketplace/ids";
import type { Selection } from "../marketplace/pricing";
import { createStorageStore, useStorageStore } from "../marketplace/storage-store";
import type { Buyer, PaymentMethodId, TicketHolder } from "../../types/marketplace";

/**
 * Checkout draft and the simulated payment provider.
 *
 * IMPORTANT: the 10-minute hold here is only a visible countdown kept in this tab. The real reservation must be created,
 * enforced and expired by the backend (inventory is not reduced by this mock). The payment provider below never moves
 * money; it resolves to the result the demo control asks for.
 */

export type CheckoutStep = "tickets" | "attendees" | "verify" | "review" | "payment";

export interface CheckoutDraft {
  eventId: string;
  selection: Selection;
  step: CheckoutStep;
  buyer: Buyer;
  holders: TicketHolder[];
  /** Nine digits of the phone verified in this checkout. */
  verifiedPhone: string | null;
  hold: { id: string; expiresAt: number } | null;
  acceptedTerms: boolean;
}

const EMPTY_BUYER: Buyer = { name: "", email: "", phone: "" };
const draftsStore = createStorageStore<Record<string, CheckoutDraft>>("cheche-events.checkout.v1", {}, "session");

export function emptyDraft(eventId: string, selection: Selection = {}): CheckoutDraft {
  return { eventId, selection, step: "tickets", buyer: EMPTY_BUYER, holders: [], verifiedPhone: null, hold: null, acceptedTerms: false };
}

const sameSelection = (a: Selection, b: Selection) => {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  return [...keys].every((k) => (a[k] ?? 0) === (b[k] ?? 0));
};

export const checkoutService = {
  store: draftsStore,

  getDraft(eventId: string): CheckoutDraft | undefined {
    return draftsStore.get()[eventId];
  },

  patch(eventId: string, patch: Partial<CheckoutDraft>) {
    draftsStore.update((all) => ({ ...all, [eventId]: { ...(all[eventId] ?? emptyDraft(eventId)), ...patch } }));
  },

  /** From the event page: start (or restart) a checkout with this selection. A changed selection drops any hold. */
  startWithSelection(eventId: string, selection: Selection) {
    const prev = draftsStore.get()[eventId];
    const keepHold = prev && sameSelection(prev.selection, selection) && prev.hold && prev.hold.expiresAt > Date.now();
    draftsStore.update((all) => ({
      ...all,
      [eventId]: { ...(prev ?? emptyDraft(eventId)), selection, step: "tickets", hold: keepHold ? prev!.hold : null, acceptedTerms: false },
    }));
  },

  /** Places the (simulated) hold. The backend will check stock and return the real expiry. */
  async holdTickets(eventId: string): Promise<{ id: string; expiresAt: number }> {
    await new Promise((r) => setTimeout(r, 500));
    const hold = { id: newHoldId(), expiresAt: Date.now() + HOLD_MINUTES * 60_000 };
    checkoutService.patch(eventId, { hold });
    return hold;
  },

  releaseHold(eventId: string) {
    checkoutService.patch(eventId, { hold: null });
  },

  clear(eventId: string) {
    draftsStore.update((all) => {
      const next = { ...all };
      delete next[eventId];
      return next;
    });
  },
};

export function useCheckoutDrafts(): Record<string, CheckoutDraft> | undefined {
  return useStorageStore(draftsStore);
}

/* ───────── Simulated payment provider ───────── */

export type PaymentScenario = "success" | "pending" | "failure";

export type PaymentResult =
  | { status: "paid"; reference: string }
  | { status: "pending"; reference: string }
  | { status: "failed"; reason: string };

export const PAYMENT_METHODS: { id: PaymentMethodId; name: string; hint: string }[] = [
  { id: "telebirr", name: "Telebirr", hint: "Approve the request in the Telebirr app" },
  { id: "cbe", name: "CBE Birr", hint: "Confirm with your CBE Birr PIN" },
  { id: "wallet", name: "Cheche wallet", hint: "Pay from your wallet balance" },
];

export const mockPaymentProvider = {
  /** Resolves after the "approve on your phone" wait with the outcome the demo control chose. */
  async charge({ method, scenario }: { method: PaymentMethodId; amount: number; scenario: PaymentScenario }): Promise<PaymentResult> {
    await new Promise((r) => setTimeout(r, 4200));
    if (scenario === "failure") {
      return { status: "failed", reason: method === "wallet" ? "Your wallet balance is too low for this order." : "The payment was declined. No money was taken from your account." };
    }
    return { status: scenario === "pending" ? "pending" : "paid", reference: newPaymentRef(method) };
  },
};
