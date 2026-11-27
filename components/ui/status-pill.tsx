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
  /**
   * A ticket order (events): the API's own words, as it sends them (PENDING_PAYMENT, CONFIRMED, EXPIRED,
   * REFUND_REQUIRED). Pending: places held while the buyer pays; expired: unpaid in time, places released; refund
   * needed: paid after its places were released, so someone must follow up.
   */
  ticketOrder: {
    pending_payment: ["Pending payment", "warning"],
    confirmed: ["Confirmed", "success"],
    expired: ["Expired", "neutral"],
    refund_required: ["Refund needed", "danger"],
  },
  /** Which payment keys an account uses: test keys take no real money. */
  paymentKey: {
    test: ["Test", "warning"],
    live: ["Live", "success"],
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
  /** An event's life: drafted, published (open to view), live while it runs, then closed or cancelled. */
  event: {
    draft: ["Draft", "warning"],
    published: ["Published", "success"],
    live: ["Live", "info"],
    closed: ["Closed", "neutral"],
    cancelled: ["Cancelled", "danger"],
  },
  /** Whether a published event is taking sign-ups right now (the public site). */
  signup: {
    open: ["Registration open", "success"],
    closed: ["Registration closed", "neutral"],
  },
  /** A guest's place at an event. */
  registration: {
    confirmed: ["Confirmed", "success"],
    cancelled: ["Cancelled", "danger"],
    /** A place held while its order is being paid: no code yet. */
    held: ["Waiting for payment", "warning"],
    /** The hold ended unpaid: the place went back. */
    released: ["Released", "neutral"],
  },
  /** A message (an SMS confirmation) on its way to a guest. */
  message: {
    pending: ["Sending", "warning"],
    sent: ["SMS sent", "success"],
    failed: ["SMS failed", "danger"],
    skipped: ["SMS skipped", "neutral"],
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
