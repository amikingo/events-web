/**
 * The door (Phase 8): admit a ticket by its code, once for the whole event. Module REGISTRATIONS (update).
 *
 *   POST /v1/organizations/:organizationId/events/:eventId/check-ins   { code }, header Idempotency-Key
 *
 * A scanned QR and a typed code use the same call (lower case and spaces are fine). One new key per scan; the same key
 * again only to retry after a lost response, which returns the original result.
 * - 200 ADMITTED: this request let the ticket in. ALREADY_CHECKED_IN: it was let in before (original time and staff).
 * - 404: no such code for this event. 409 `ticket_not_admissible` (details.status HELD, RELEASED or CANCELLED),
 *   `outside_admission_window` (details.doors_open_at, ends_at), `invalid_event_state` (not published).
 */
import { apiRequest } from "@/lib/api-client";

export interface CheckIn {
  result: "ADMITTED" | "ALREADY_CHECKED_IN";
  checked_in_at: string;
  /** The staff member's user id. */
  checked_in_by: string;
  ticket: {
    id: string;
    code: string;
    ticket_type: { code: string; name: string };
    /** null for an unnamed ticket. */
    holder: { first_name: string; last_name: string | null } | null;
    order: { reference: string };
  };
}

export function checkIn(organizationId: string, eventId: string, code: string, idempotencyKey: string): Promise<CheckIn> {
  return apiRequest<CheckIn>(`/v1/organizations/${organizationId}/events/${eventId}/check-ins`, {
    method: "POST",
    body: { code },
    headers: { "Idempotency-Key": idempotencyKey },
  });
}
