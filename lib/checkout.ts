import { ApiError } from "@/lib/api-client";
import { describeApiError } from "@/lib/api/errors";
import type { HolderFieldSetting, HolderFields } from "@/lib/api/events";
import type { HolderInput } from "@/lib/api/orders";

/**
 * Checkout rules shared by the public ticket form and staff "Issue tickets" (Phase 7). The forms differ in how they
 * look; what a holder must give, how an order is built and how the API's refusals read are the same for both.
 */

/** At most this many tickets in one order, across every ticket type. */
export const MAX_TICKETS_PER_ORDER = 20;

/** One ticket's holder details as typed. */
export interface HolderDraft {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  affiliation: string;
  country: string;
}
export type HolderKey = keyof HolderDraft;
export type HolderErrors = Partial<Record<HolderKey, string>>;

export const emptyHolder = (): HolderDraft => ({ firstName: "", lastName: "", phone: "", email: "", affiliation: "", country: "" });

/** The API's holder field (`affiliation_name`) → the draft key, for showing its issues on the right box. */
const API_FIELD_TO_KEY: Record<string, HolderKey> = {
  first_name: "firstName",
  last_name: "lastName",
  phone: "phone",
  email: "email",
  affiliation_name: "affiliation",
  country: "country",
};

/** How each detail reads in a sentence ("enter their organization or affiliation"). */
const KEY_WORDS: Record<HolderKey, string> = {
  firstName: "first name",
  lastName: "last name",
  phone: "mobile number",
  email: "email",
  affiliation: "organization or affiliation",
  country: "country",
};

/** The setting that governs a draft field (both name boxes follow `name`). */
export function settingFor(fields: HolderFields, key: HolderKey): HolderFieldSetting {
  if (key === "firstName" || key === "lastName") return fields.name;
  if (key === "phone") return fields.mobile;
  return fields[key];
}

const EMAIL = /^\S+@\S+\.\S+$/;
const PHONE = /^\+?[0-9][0-9 ()-]{5,30}$/;

/**
 * What the form can tell before sending. Required details must be given; a guest profile needs a first name, so any
 * other detail without one is refused by the API (`required_with_details`), and the form says so first.
 */
export function validateHolder(draft: HolderDraft, fields: HolderFields): HolderErrors {
  const errors: HolderErrors = {};
  const keys: HolderKey[] = ["firstName", "phone", "email", "affiliation", "country"];
  for (const key of keys) {
    if (settingFor(fields, key) === "REQUIRED" && !draft[key].trim()) errors[key] = `Enter their ${KEY_WORDS[key]}.`;
  }
  if (draft.email.trim() && !EMAIL.test(draft.email.trim())) errors.email = "Enter a valid email, like name@company.com.";
  if (draft.phone.trim() && !PHONE.test(draft.phone.trim())) errors.phone = "Use digits, spaces and + - ( ) only.";
  const otherDetails = [draft.lastName, draft.phone, draft.email, draft.affiliation, draft.country].some((v) => v.trim());
  if (!errors.firstName && !draft.firstName.trim() && otherDetails) errors.firstName = "Give this guest's first name too.";
  return errors;
}

/** The holder as the API takes it: hidden details never sent (the API refuses them), empty ones left out. */
export function toHolderInput(draft: HolderDraft, fields: HolderFields): HolderInput {
  const holder: HolderInput = {};
  const put = (key: HolderKey, value: string) => {
    if (settingFor(fields, key) === "HIDDEN" || !value.trim()) return;
    if (key === "firstName") holder.first_name = value.trim();
    if (key === "lastName") holder.last_name = value.trim();
    if (key === "phone") holder.phone = value.trim();
    if (key === "email") holder.email = value.trim();
    if (key === "affiliation") holder.affiliation_name = value.trim();
    if (key === "country") holder.country = value.trim();
  };
  (Object.keys(draft) as HolderKey[]).forEach((key) => put(key, draft[key]));
  return holder;
}

/**
 * A 400's issues, placed: `body.items.0.holders.2.affiliation_name` is ticket (items before it + 3)'s affiliation box.
 * `offsets[i]` is the number of tickets in the items before item i, in the order the items were sent.
 */
export function placeOrderIssues(
  error: unknown,
  offsets: number[],
): { holders: Record<number, HolderErrors>; buyer?: string; summary: string[] } | null {
  if (!(error instanceof ApiError) || error.code !== "validation_error") return null;
  const issues = (error.details as { issues?: { path?: string; message?: string; code?: string }[] } | undefined)?.issues;
  if (!Array.isArray(issues) || issues.length === 0) return null;
  const holders: Record<number, HolderErrors> = {};
  const summary: string[] = [];
  let buyer: string | undefined;
  for (const issue of issues) {
    const path = issue.path ?? "";
    const holder = /^body\.items\.(\d+)\.holders\.(\d+)\.(\w+)$/.exec(path);
    if (holder) {
      const ticket = (offsets[Number(holder[1])] ?? 0) + Number(holder[2]);
      const key = API_FIELD_TO_KEY[holder[3]!] ?? "firstName";
      const text =
        issue.code === "required_with_details"
          ? "Give this guest's first name too."
          : issue.code === "required"
            ? `Enter their ${KEY_WORDS[key]}.`
            : issue.code === "not_collected"
              ? `This event doesn't collect a guest's ${KEY_WORDS[key]}.`
              : (issue.message ?? "Check this detail.");
      holders[ticket] = { ...holders[ticket], [key]: text };
      summary.push(`Ticket ${ticket + 1}: ${text.charAt(0).toLowerCase()}${text.slice(1).replace(/\.$/, "")}`);
    } else if (path === "body.buyer_mobile") {
      buyer = issue.code === "buyer_mobile_required" ? BUYER_MOBILE_REQUIRED : "Enter a valid Ethiopian mobile number.";
      summary.push(buyer);
    } else {
      summary.push(issue.message ?? "Check the order and try again.");
    }
  }
  return { holders, buyer, summary };
}

/** Phase 8: an event with a per-mobile limit needs a buyer mobile on every ticket (issue code `buyer_mobile_required`). */
export const BUYER_MOBILE_REQUIRED = "This event limits tickets per mobile number: add the buyer's Ethiopian mobile.";

/** The 409 refusals of a checkout, in the brief's words; anything else as everywhere else. */
export function orderRefusalMessage(error: unknown, who: "public" | "staff"): string {
  if (error instanceof ApiError) {
    const details = (error.details ?? {}) as { limit?: number; held?: number; remaining?: number };
    if (error.code === "purchase_limit_reached") {
      const left = Math.max(0, (details.limit ?? 0) - (details.held ?? 0));
      return left === 0 ? "This mobile number has reached the limit for this event." : `This mobile number can get ${left} more ${left === 1 ? "ticket" : "tickets"} for this event.`;
    }
    if (error.code === "capacity_reached" && typeof details.remaining === "number") {
      return details.remaining === 0 ? "No places left." : `Only ${details.remaining} ${details.remaining === 1 ? "place" : "places"} left.`;
    }
    if (error.code === "payment_required") return who === "public" ? "Paid tickets will be available soon." : "This ticket type has a price. It can't be issued here yet.";
  }
  return describeApiError(error, "order");
}

/**
 * A random Idempotency-Key. crypto.randomUUID exists only on HTTPS and localhost; on plain HTTP (a phone testing
 * against a laptop on the network) it's built from crypto.getRandomValues instead.
 */
export function newIdempotencyKey(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return Array.from(crypto.getRandomValues(new Uint8Array(16)), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/** `+251911234567` → `0911 234 567`, how people write their own number. */
export function nationalMobile(mobile: string | null | undefined): string {
  if (!mobile) return "";
  const digits = mobile.replace(/\D/g, "").replace(/^251/, "").replace(/^0/, "");
  return digits.length === 9 ? `0${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}` : mobile;
}
