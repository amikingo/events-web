import { Pill } from "./pill";
import type { PillProps, PillTone } from "./pill";

/**
 * The fixed status vocabulary — every status word in the company and the colour it must use. A product showing
 * that kind of record uses these words, not a per-product set. If a new state is needed, add it here first.
 */
export const statusVocabulary = {
  booking: {
    confirmed: ["Confirmed", "success"],
    pending: ["Pending", "warning"],
    "checked-in": ["Checked-in", "info"],
    completed: ["Completed", "neutral"],
    "no-show": ["No-show", "neutral"],
    cancelled: ["Cancelled", "danger"],
    rescheduled: ["Rescheduled", "warning"],
  },
  payment: {
    paid: ["Paid", "success"],
    settled: ["Settled", "success"],
    pending: ["Pending", "warning"],
    processing: ["Processing", "info"],
    failed: ["Failed", "danger"],
    refunded: ["Refunded", "neutral"],
    reversed: ["Reversed", "neutral"],
    disputed: ["Disputed", "danger"],
  },
  stock: {
    "in-stock": ["In stock", "success"],
    "low-stock": ["Low stock", "warning"],
    "out-of-stock": ["Out of stock", "danger"],
    backordered: ["Backordered", "neutral"],
  },
  order: {
    new: ["New", "info"],
    packed: ["Packed", "warning"],
    delivered: ["Delivered", "success"],
    returned: ["Returned", "neutral"],
  },
  inspection: {
    valid: ["Valid", "success"],
    "due-soon": ["Due soon", "warning"],
    expired: ["Expired", "danger"],
    suspended: ["Suspended", "neutral"],
  },
  ticket: {
    active: ["Active", "success"],
    used: ["Used", "neutral"],
    expired: ["Expired", "danger"],
  },
  vehicle: {
    "on-route": ["On route", "success"],
    maintenance: ["Maintenance", "warning"],
    idle: ["Idle", "neutral"],
  },
  account: {
    active: ["Active", "success"],
    invited: ["Invited", "warning"],
    inactive: ["Inactive", "neutral"],
    suspended: ["Suspended", "danger"],
  },
  /** A request waiting on someone: approvals, KYC reviews, refund requests. */
  approval: {
    pending: ["Needs a decision", "warning"],
    approved: ["Approved", "success"],
    rejected: ["Rejected", "danger"],
  },
  /** Sign-in and session results on a security page. */
  access: {
    "signed-in": ["Signed in", "success"],
    blocked: ["Blocked", "danger"],
    current: ["This device", "success"],
  },
} as const satisfies Record<string, Record<string, readonly [string, PillTone]>>;

export type StatusKind = keyof typeof statusVocabulary;
/** Every status key for a kind, e.g. `StatusOf<"booking">` = `"confirmed" | "pending" | …`. */
export type StatusOf<K extends StatusKind> = keyof (typeof statusVocabulary)[K];

/** Looks a status up case-insensitively ("Checked-in", "checked in", "CHECKED-IN" all work); returns `undefined` for a word that isn't in the vocabulary. */
export function lookupStatus(kind: StatusKind, status: string): { label: string; tone: PillTone } | undefined {
  const key = status.trim().toLowerCase().replace(/\s+/g, "-");
  const entry = (statusVocabulary[kind] as Record<string, readonly [string, PillTone]>)[key];
  return entry ? { label: entry[0], tone: entry[1] } : undefined;
}

export interface StatusPillProps extends Omit<PillProps, "tone" | "children"> {
  kind: StatusKind;
  /** The record's status, in any casing ("confirmed", "Checked-in"). */
  status: string;
}

/**
 * A `<Pill>` whose colour and wording come from the status vocabulary, so nobody picks a colour ad hoc. Defaults to the
 * dot form (statuses change over time). An unknown status renders as a neutral pill with the raw text.
 */
export function StatusPill({ kind, status, dot = true, ...props }: StatusPillProps) {
  const found = lookupStatus(kind, status);
  return (
    <Pill tone={found?.tone ?? "neutral"} dot={dot} {...props}>
      {found?.label ?? status}
    </Pill>
  );
}
