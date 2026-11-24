/**
 * Attendee marketplace settings in one place. Business rules here (fees, limits, hold length) are the frontend's
 * copy of what the backend will enforce; the backend stays the source of truth once it exists.
 */
export const MARKETPLACE = {
  name: "Cheche Events",
  tagline: "Find events worth leaving the house for",
  supportEmail: "support@cheche.example",
  /** Nine national digits; shown with +251. */
  supportPhone: "911 000 222",
  timeZone: "Africa/Addis_Ababa",
  utcOffset: "+03:00",
  currency: "ETB",
} as const;

/** Most tickets one order can hold, across all ticket types. */
export const ORDER_TICKET_LIMIT = 6;

/** How long selected tickets are held during checkout. The real hold must be created and expired by the backend. */
export const HOLD_MINUTES = 10;

/** Platform service fee per paid ticket, as a share of the ticket price. Free tickets carry no fee. */
export const SERVICE_FEE_RATE = 0.05;

/** VAT charged on the service fee (ticket prices are set VAT-inclusive by organizers). */
export const VAT_RATE = 0.15;

/** Explore results per page. */
export const EXPLORE_PAGE_SIZE = 9;

/** A ticket type counts as "few left" at or below this many seats, or at 10% of capacity. */
export const LOW_STOCK_THRESHOLD = 10;

/**
 * Demo credentials for the simulated sign-in and phone verification. Shown on the sign-in screens so the flows can be
 * tested; there is no real SMS.
 */
export const DEMO = {
  code: "123456",
  phone: "911204412",
  accountId: "att-demo",
} as const;
