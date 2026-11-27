/**
 * Orders: several tickets, of one or more ticket types, for one buyer (Phase 7). Module REGISTRATIONS.
 *
 *   POST /v1/public/organizations/:orgSlug/events/:eventSlug/orders   public checkout; Idempotency-Key required
 *   POST /v1/organizations/:organizationId/events/:eventId/orders     staff "Issue tickets"; Idempotency-Key optional
 *   GET  /v1/organizations/:organizationId/events/:eventId/orders     ?buyer_mobile&page&pageSize (no tickets)
 *   GET  /v1/organizations/:organizationId/events/:eventId/orders/:orderId   one order with its tickets
 *   GET  /v1/public/orders/:reference            the buyer's order page (header X-Order-Token)
 *   POST /v1/public/orders/:reference/check      back from Cheche Pay: ask it now (X-Order-Token)
 *   POST /v1/public/orders/:reference/payment    pay now: the checkout link, new or still valid (X-Order-Token)
 *
 * Paid orders (Phase 7 step 3) answer PENDING_PAYMENT with `payment.checkout_url` and, once, `order_token`: the
 * buyer's key to read the order without an account. Keep it only where the screens need it; never log it.
 *
 * At most 20 tickets per order, each ticket type once. A DETAILED event takes one holder per ticket (following its
 * `holder_fields`); a QUICK event takes none (its tickets are unnamed). Prices are never sent: the server sets them.
 * A 201 is a new order; a 200 is the same submission again (same key and body), with the same codes.
 */
import { apiPage, apiRequest, apiRequestWithStatus, clampPageSize } from "@/lib/api-client";
import type { Paginated } from "@/lib/api-client";
import type { Confirmation } from "@/lib/api/registrations";
import type { RegistrationStatus } from "@/lib/api/persons";

export type OrderStatus = "CONFIRMED" | "PENDING_PAYMENT" | "EXPIRED" | "REFUND_REQUIRED";

/** What a ticket's holder may be given. Hidden fields are left out; a QUICK event sends no holders. */
export interface HolderInput {
  first_name?: string;
  last_name?: string | null;
  phone?: string | null;
  email?: string | null;
  affiliation_name?: string | null;
  country?: string | null;
}

export interface PublicOrderInput {
  /** Required unless the guest is signed in (their account's mobile is used). */
  buyer_mobile?: string;
  privacy_notice_version: string;
  items: { ticket_type_code: string; quantity: number; holders?: HolderInput[] }[];
}

export interface StaffOrderInput {
  buyer_mobile?: string;
  items: { ticket_type_id: string; quantity: number; holders?: HolderInput[] }[];
}

/** A payment's own status: started, paid, or paid a different amount than the order's. */
export type PaymentStatus = "INITIATED" | "PAID" | "MISMATCH";

/** A price as the API sends it: a decimal string with the currency. */
export interface Money {
  amount: string;
  currency: string;
}

export interface PublicOrder {
  reference: string;
  status: OrderStatus;
  total_amount: string;
  currency: string;
  /** While PENDING_PAYMENT: when the held places go back if unpaid. */
  hold_expires_at: string | null;
  payment: { status: PaymentStatus; checkout_url: string | null; checkout_expires_at: string | null } | null;
  /** Only in the reply that created (or replayed) the order. */
  order_token?: string;
  created_at: string;
  event: { name: string; slug: string; starts_at: string | null; ends_at: string | null; timezone: string };
  organization: { name: string; slug: string };
  tickets: { code: string | null; status: RegistrationStatus; ticket_type: { code: string; name: string }; price: Money; holder: { first_name: string; last_name: string | null } | null }[];
}

export interface OrderTicket {
  id: string;
  /** null while an order waits for payment (later steps). */
  code: string | null;
  status: RegistrationStatus;
  ticket_type: { id: string; code: string; name: string };
  price: Money;
  /** null for an unnamed ticket. */
  holder: { person_id: string; first_name: string; last_name: string | null; phone: string | null; email: string | null; affiliation_name: string | null } | null;
}

/** One order in the list: no tickets. */
export interface OrderSummary {
  id: string;
  event_id: string;
  reference: string;
  status: OrderStatus;
  source: "STAFF" | "PUBLIC";
  buyer_mobile: string | null;
  /** Bought by a signed-in Cheche account (it shows in their My Tickets). */
  bought_with_account: boolean;
  total_amount: string;
  currency: string;
  hold_expires_at: string | null;
  created_by: string | null;
  created_at: string;
}

export interface OrderPayment {
  id: string;
  status: PaymentStatus;
  checkout_url: string | null;
  checkout_expires_at: string | null;
  tx_ref: string | null;
  provider_transaction_id: string | null;
  key_mode: "test" | "live" | null;
  verified_at: string | null;
  last_error: string | null;
}

/** One order with its tickets and the buyer's confirmation SMS. */
export interface Order extends OrderSummary {
  ticket_count: number;
  tickets: OrderTicket[];
  confirmation: Confirmation;
  /** null for a free order. */
  payment: OrderPayment | null;
  /** Only in the reply that created a paid staff order: give it to the buyer with the link. */
  order_token?: string;
}

export interface OrderListParams {
  page: number;
  pageSize: number;
  /** Any Ethiopian format. */
  buyerMobile?: string;
}

const staffBase = (organizationId: string, eventId: string) => `/v1/organizations/${organizationId}/events/${eventId}/orders`;

/** Public checkout. The guest's token is sent when they are signed in, so the tickets land in their My Tickets. */
export async function checkout(organizationSlug: string, eventSlug: string, input: PublicOrderInput, idempotencyKey: string): Promise<{ order: PublicOrder; replayed: boolean }> {
  const { data, status } = await apiRequestWithStatus<PublicOrder>(`/v1/public/organizations/${organizationSlug}/events/${eventSlug}/orders`, {
    method: "POST",
    body: input,
    headers: { "Idempotency-Key": idempotencyKey },
  });
  return { order: data, replayed: status === 200 };
}

/** Staff "Issue tickets". Staff-only types are allowed. */
export async function issueTickets(organizationId: string, eventId: string, input: StaffOrderInput, idempotencyKey: string): Promise<{ order: Order; replayed: boolean }> {
  const { data, status } = await apiRequestWithStatus<Order>(staffBase(organizationId, eventId), {
    method: "POST",
    body: input,
    headers: { "Idempotency-Key": idempotencyKey },
  });
  return { order: data, replayed: status === 200 };
}

export function listOrders(organizationId: string, eventId: string, params: OrderListParams, signal?: AbortSignal): Promise<Paginated<OrderSummary>> {
  return apiPage<OrderSummary>(staffBase(organizationId, eventId), {
    page: params.page,
    pageSize: clampPageSize(params.pageSize),
    query: { buyer_mobile: params.buyerMobile?.trim() || undefined },
    signal,
  });
}

export function getOrder(organizationId: string, eventId: string, orderId: string, signal?: AbortSignal): Promise<Order> {
  return apiRequest<Order>(`${staffBase(organizationId, eventId)}/${orderId}`, { signal });
}

const publicOrder = (reference: string) => `/v1/public/orders/${encodeURIComponent(reference)}`;

/** The buyer's order page. A wrong token is 404. */
export function getPublicOrder(reference: string, orderToken: string, signal?: AbortSignal): Promise<PublicOrder> {
  return apiRequest<PublicOrder>(publicOrder(reference), { headers: { "X-Order-Token": orderToken }, signal });
}

/** Back from Cheche Pay: the server asks it now. 502 `payment_provider_unavailable`: keep polling with `getPublicOrder`. */
export function checkPublicOrder(reference: string, orderToken: string): Promise<PublicOrder> {
  return apiRequest<PublicOrder>(`${publicOrder(reference)}/check`, { method: "POST", headers: { "X-Order-Token": orderToken } });
}

/** Pay now: the checkout link (the same one while valid). 409 `invalid_order_state` when it isn't waiting for payment. */
export function startPublicPayment(reference: string, orderToken: string): Promise<PublicOrder> {
  return apiRequest<PublicOrder>(`${publicOrder(reference)}/payment`, { method: "POST", headers: { "X-Order-Token": orderToken } });
}
