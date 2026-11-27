/**
 * Phase 11: a scheduled price can start between choosing tickets and creating the order. The checkout marks such an
 * order here (this browser tab only), so its page can say the price changed above the Pay button.
 */
const key = (reference: string) => `price-changed:${reference}`;

export function markPriceChanged(reference: string): void {
  try {
    window.sessionStorage.setItem(key(reference), "1");
  } catch {
    // Storage unavailable: the order page still shows the order's own total.
  }
}

export function wasPriceChanged(reference: string): boolean {
  try {
    return window.sessionStorage.getItem(key(reference)) === "1";
  } catch {
    return false;
  }
}
