/**
 * Where a paid order's token is kept (Phase 7 step 3).
 *
 * - The buyer's browser: `{ reference → token }` in local storage, so `/orders/{reference}` opens after Cheche Pay
 *   brings them back (and later, on the same browser). Storage can be missing (private mode): then only this visit works.
 * - Staff: the token a new paid staff order comes with is shown once on its page, then forgotten. It's held in memory
 *   only, never in storage.
 * Tokens are never logged.
 */
const KEY = "cheche.orderTokens";

function readAll(): Record<string, string> {
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? (parsed as Record<string, string>) : {};
  } catch {
    return {};
  }
}

export function saveOrderToken(reference: string, token: string): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify({ ...readAll(), [reference]: token }));
  } catch {
    // No storage: the order page can't be reopened from this browser, but this visit still works.
  }
}

export function readOrderToken(reference: string): string | null {
  return readAll()[reference] ?? null;
}

/** Staff: the token of an order just created, by order id, until its page has shown it once. */
const shownOnce = new Map<string, { token: string; checkoutUrl: string | null }>();

export function rememberStaffHandover(orderId: string, token: string, checkoutUrl: string | null): void {
  shownOnce.set(orderId, { token, checkoutUrl });
}

/** Returns the handover once, then forgets it. */
export function takeStaffHandover(orderId: string): { token: string; checkoutUrl: string | null } | null {
  const found = shownOnce.get(orderId) ?? null;
  shownOnce.delete(orderId);
  return found;
}
