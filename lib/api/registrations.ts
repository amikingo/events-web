/**
 * An event's guest list (module REGISTRATIONS). Staff follow the same rules as the public form: the event must be
 * published, not ended, inside its registration window, with an active ticket type and a free place.
 *
 *   GET   /v1/organizations/:organizationId/events/:eventId/registrations          ?status&ticket_type_id&q&page&pageSize
 *   POST  /v1/organizations/:organizationId/events/:eventId/registrations          201 a place was taken, 200 already registered
 *   GET   /v1/organizations/:organizationId/events/:eventId/registrations/summary  places confirmed and left
 *   GET   /v1/organizations/:organizationId/events/:eventId/registrations/export   ?status&ticket_type_id&q  CSV download (REGISTRATIONS.export)
 *   GET   /v1/organizations/:organizationId/events/:eventId/registrations/:registrationId
 *   PATCH /v1/organizations/:organizationId/events/:eventId/registrations/:registrationId/status       { status }
 *   PATCH /v1/organizations/:organizationId/events/:eventId/registrations/:registrationId/ticket-type  { ticket_type_id }
 *
 * Refusals to show in words: `registration_closed`, `capacity_reached`, `already_registered`, `ticket_type_required`
 * (see `describeApiError`).
 */
import { apiDownload, apiPage, apiRequest, apiRequestWithStatus, clampPageSize } from "@/lib/api-client";
import type { Paginated } from "@/lib/api-client";
import type { PersonInput, RegistrationStatus } from "@/lib/api/persons";

/** The latest confirmation SMS: `PENDING` (being sent), `SENT`, `FAILED` (gave up after 5 tries) or `SKIPPED` (limit reached). `null`: no Ethiopian mobile, so none was queued. */
export type Confirmation = { status: "PENDING" | "SENT" | "FAILED" | "SKIPPED"; sent_at: string | null } | null;

export interface Registration {
  id: string;
  event_id: string;
  /** The guest's 8-character code, also sent by SMS (for example `K7M2Q9XP`). */
  code: string;
  status: RegistrationStatus;
  source: "STAFF" | "PUBLIC";
  registered_by: string | null;
  registered_at: string;
  cancelled_at: string | null;
  person: { id: string; first_name: string; last_name: string | null; phone: string | null; email: string | null; affiliation_name: string | null };
  ticket_type: { id: string; code: string; name: string };
  /** The notice the public form showed; null for staff entries. */
  privacy_notice: { version: string; shown_at: string } | null;
  confirmation: Confirmation;
  created_at: string;
  updated_at: string;
}

/** Places per event and per ticket type. `remaining: null` means no limit. */
export interface RegistrationSummary {
  capacity: number | null;
  confirmed: number;
  remaining: number | null;
  ticket_types: { id: string; code: string; name: string; is_active: boolean; capacity: number | null; confirmed: number; remaining: number | null }[];
}

/** An existing guest (`person_id`, after confirming who they are) or a new one (`person`), never both. */
export interface RegistrationInput {
  person_id?: string;
  person?: PersonInput;
  /** Needed only when the event has several active ticket types. */
  ticket_type_id?: string;
}

export interface RegistrationListParams {
  page: number;
  pageSize: number;
  status?: RegistrationStatus;
  ticketTypeId?: string;
  /** Searches the guest's names, email and phone. */
  q?: string;
}

const base = (organizationId: string, eventId: string) => `/v1/organizations/${organizationId}/events/${eventId}/registrations`;

export function listRegistrations(organizationId: string, eventId: string, params: RegistrationListParams, signal?: AbortSignal): Promise<Paginated<Registration>> {
  return apiPage<Registration>(base(organizationId, eventId), {
    page: params.page,
    pageSize: clampPageSize(params.pageSize),
    query: { status: params.status, ticket_type_id: params.ticketTypeId, q: params.q?.trim() || undefined },
    signal,
  });
}

export function getRegistrationSummary(organizationId: string, eventId: string, signal?: AbortSignal): Promise<RegistrationSummary> {
  return apiRequest<RegistrationSummary>(`${base(organizationId, eventId)}/summary`, { signal });
}

export function getRegistration(organizationId: string, eventId: string, registrationId: string, signal?: AbortSignal): Promise<Registration> {
  return apiRequest<Registration>(`${base(organizationId, eventId)}/${registrationId}`, { signal });
}

/**
 * `placeTaken` is true for 201 (a new place, or a cancelled guest brought back) and false for 200 (the guest already
 * had this place: nothing changed). Pass an `idempotencyKey` (a new UUID per button press) so a double click is safe.
 */
export async function registerGuest(
  organizationId: string,
  eventId: string,
  input: RegistrationInput,
  idempotencyKey?: string,
): Promise<{ registration: Registration; placeTaken: boolean }> {
  const { data, status } = await apiRequestWithStatus<Registration>(base(organizationId, eventId), {
    method: "POST",
    body: input,
    headers: idempotencyKey ? { "Idempotency-Key": idempotencyKey } : undefined,
  });
  return { registration: data, placeTaken: status === 201 };
}

/** `CANCELLED` frees the place. `CONFIRMED` brings a cancelled guest back if there is room (every check is repeated). */
export function setRegistrationStatus(organizationId: string, eventId: string, registrationId: string, status: RegistrationStatus): Promise<Registration> {
  return apiRequest<Registration>(`${base(organizationId, eventId)}/${registrationId}/status`, { method: "PATCH", body: { status } });
}

/** Moves a confirmed guest to another active ticket type of the same published event. */
export function changeRegistrationTicketType(
  organizationId: string,
  eventId: string,
  registrationId: string,
  ticketTypeId: string,
): Promise<Registration> {
  return apiRequest<Registration>(`${base(organizationId, eventId)}/${registrationId}/ticket-type`, {
    method: "PATCH",
    body: { ticket_type_id: ticketTypeId },
  });
}

export interface RegistrationExportFilters {
  status?: RegistrationStatus;
  ticketTypeId?: string;
  q?: string;
}

/** Downloads all matching guests as a UTF-8 CSV file (no pagination parameters). */
export function downloadGuestList(
  organizationId: string,
  eventId: string,
  filters: RegistrationExportFilters = {},
  signal?: AbortSignal,
): Promise<Blob> {
  return apiDownload(`${base(organizationId, eventId)}/export`, {
    query: {
      status: filters.status,
      ticket_type_id: filters.ticketTypeId,
      q: filters.q?.trim() || undefined,
    },
    signal,
  });
}
