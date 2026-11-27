/**
 * Payment cases (Phase 8, module PAYMENTS): money that needs a person. A refund due after a late payment, a double
 * charge, a wrong amount, a returned paid ticket, or a cancelled event's paid order. The money moves by hand in the
 * organizer's Cheche Pay merchant account; these calls only record what was done.
 *
 *   GET  /v1/organizations/:organizationId/payment-cases            ?status&kind&event_id&page&pageSize (PAYMENTS.view)
 *   GET  /v1/organizations/:organizationId/payment-cases/:caseId    one case with its order, payment and ticket
 *   POST /v1/organizations/:organizationId/payment-cases/:caseId/resolve   (PAYMENTS.update)
 */
import { apiPage, apiRequest, clampPageSize } from "@/lib/api-client";
import type { Paginated } from "@/lib/api-client";
import type { RegistrationStatus } from "@/lib/api/persons";

export type PaymentCaseKind = "REFUND_REQUIRED" | "PAID_TWICE" | "AMOUNT_MISMATCH" | "TICKET_RETURN" | "EVENT_CANCELLATION";
export type PaymentCaseStatus = "OPEN" | "RESOLVED";
export type PaymentCaseOutcome = "REFUNDED" | "CLOSED_WITHOUT_REFUND";

/** The brief's labels: what happened, then what to do. */
export const PAYMENT_CASE_KIND_LABEL: Record<PaymentCaseKind, string> = {
  REFUND_REQUIRED: "Paid too late: refund",
  PAID_TWICE: "Charged twice: refund one",
  AMOUNT_MISMATCH: "Wrong amount: investigate",
  TICKET_RETURN: "Returned ticket: refund",
  EVENT_CANCELLATION: "Event cancelled: refund",
};

export interface PaymentCase {
  id: string;
  event_id: string;
  order_id: string;
  kind: PaymentCaseKind;
  tx_ref: string | null;
  registration_id: string | null;
  amount: string;
  currency: string;
  status: PaymentCaseStatus;
  resolution: {
    outcome: PaymentCaseOutcome;
    refunded_amount: string | null;
    refunded_currency: string | null;
    merchant_reference: string | null;
    note: string | null;
    resolved_by: string;
    resolved_at: string;
  } | null;
  created_by: string | null;
  created_at: string;
}

export interface PaymentCaseTicket {
  id: string;
  code: string | null;
  status: RegistrationStatus;
  ticket_type: { code: string; name: string };
  price: { amount: string; currency: string };
}

export interface PaymentCaseDetail extends PaymentCase {
  order: {
    id: string;
    reference: string;
    status: string;
    buyer_mobile: string | null;
    total_amount: string;
    currency: string;
    created_at: string;
    tickets: PaymentCaseTicket[];
  };
  payment: {
    id: string;
    status: string;
    amount: string;
    currency: string;
    current_tx_ref: string | null;
    paid_tx_ref: string | null;
    provider_transaction_id: string | null;
    key_mode: "TEST" | "LIVE" | null;
    verified_at: string | null;
    last_error: string | null;
  } | null;
  ticket: PaymentCaseTicket | null;
}

export interface PaymentCaseListParams {
  status?: PaymentCaseStatus;
  kind?: PaymentCaseKind;
  eventId?: string;
  page?: number;
  pageSize?: number;
}

export type PaymentCaseResolveInput =
  | { resolution: "REFUNDED"; refunded_amount: string; refunded_currency: string; merchant_reference: string }
  | { resolution: "CLOSED_WITHOUT_REFUND"; note: string };

const base = (organizationId: string) => `/v1/organizations/${organizationId}/payment-cases`;

export function listPaymentCases(organizationId: string, params: PaymentCaseListParams, signal?: AbortSignal): Promise<Paginated<PaymentCase>> {
  return apiPage<PaymentCase>(base(organizationId), {
    page: params.page,
    pageSize: clampPageSize(params.pageSize),
    query: { status: params.status, kind: params.kind, event_id: params.eventId },
    signal,
  });
}

export function getPaymentCase(organizationId: string, caseId: string, signal?: AbortSignal): Promise<PaymentCaseDetail> {
  return apiRequest<PaymentCaseDetail>(`${base(organizationId)}/${caseId}`, { signal });
}

export function resolvePaymentCase(organizationId: string, caseId: string, input: PaymentCaseResolveInput): Promise<PaymentCaseDetail> {
  return apiRequest<PaymentCaseDetail>(`${base(organizationId)}/${caseId}/resolve`, { method: "POST", body: input });
}
