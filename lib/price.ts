import { formatCurrency } from "@/lib/format";

/**
 * Ticket prices arrive as decimal strings (`"500.00"`, `"0.00"`) with the organizer's currency. They are only ever
 * shown, never added up here, so turning one into a number for `formatCurrency` is safe; any sum is the API's job.
 */
export function isFreePrice(price: string | null | undefined): boolean {
  return !price || /^0+(\.0+)?$/.test(price.trim());
}

/** `"500.00"`, `"ETB"` → `500 ETB`; `"500.50"` → `500.50 ETB`; zero → `Free`. */
export function formatPrice(price: string | null | undefined, currency: string): string {
  if (isFreePrice(price)) return "Free";
  const value = price!.trim();
  const hasCents = /\.\d*[1-9]/.test(value);
  return formatCurrency(Number(value), { decimals: hasCents ? 2 : 0, unit: currency });
}

/** What a price box may hold before it's sent: digits with up to two decimals (`"500"`, `"500.5"`, `"500.50"`). */
export const PRICE_PATTERN = /^\d{1,10}(\.\d{1,2})?$/;

/** `"500.50"` → 50050: whole cents, so a total is added up exactly (never in floating point). */
export function toCents(price: string): number {
  const [whole = "0", fraction = ""] = price.trim().split(".");
  return Number(whole) * 100 + Number((fraction + "00").slice(0, 2));
}

/** 50050 → `"500.50"`, for `formatPrice`. */
export function fromCents(cents: number): string {
  return `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, "0")}`;
}
