/**
 * Events and their ticket types (module EVENTS).
 *
 *   GET    /v1/organizations/:organizationId/events                ?page&pageSize&status&visibility
 *   POST   /v1/organizations/:organizationId/events
 *   GET    /v1/organizations/:organizationId/events/:eventId
 *   PATCH  /v1/organizations/:organizationId/events/:eventId
 *   PATCH  /v1/organizations/:organizationId/events/:eventId/status   { status: PUBLISHED | CLOSED | CANCELLED }
 *   PUT    /v1/organizations/:organizationId/events/:eventId/cover    multipart, one file in `file`
 *   DELETE /v1/organizations/:organizationId/events/:eventId/cover
 *   GET    /v1/organizations/:organizationId/events/:eventId/ticket-types
 *   POST   /v1/organizations/:organizationId/events/:eventId/ticket-types
 *   PATCH  /v1/organizations/:organizationId/events/:eventId/ticket-types/:ticketTypeId
 *   PATCH  /v1/organizations/:organizationId/events/:eventId/ticket-types/:ticketTypeId/status   { is_active }
 *
 * No delete: events are closed or cancelled, so their history stays.
 */
import { apiPage, apiRequest, clampPageSize } from "@/lib/api-client";
import type { Paginated } from "@/lib/api-client";

export type EventStatus = "DRAFT" | "PUBLISHED" | "CLOSED" | "CANCELLED";
/** What to show on the badge: LIVE while a published event runs; a cancelled event stays CANCELLED. */
export type EventDisplayStatus = EventStatus | "LIVE";
export type EventVisibility = "PUBLIC" | "UNLISTED";
/** QUICK: buyers give one mobile, tickets may be unnamed. DETAILED (default): each guest's details are collected. */
export type RegistrationMode = "QUICK" | "DETAILED";
export type HolderFieldSetting = "REQUIRED" | "OPTIONAL" | "HIDDEN";
/** How a DETAILED event asks for each guest detail. Always sent all five together. A hidden name hides the rest. */
export interface HolderFields {
  name: HolderFieldSetting;
  mobile: HolderFieldSetting;
  email: HolderFieldSetting;
  affiliation: HolderFieldSetting;
  country: HolderFieldSetting;
}
/** The API's default for a new event. */
export const DEFAULT_HOLDER_FIELDS: HolderFields = { name: "REQUIRED", mobile: "REQUIRED", email: "OPTIONAL", affiliation: "OPTIONAL", country: "OPTIONAL" };

/** A staff event, as `GET /v1/organizations/{id}/events` returns it. Instants are ISO strings in UTC. */
export interface StaffEvent {
  id: string;
  organization_id: string;
  /** null = organization-wide. */
  branch_id: string | null;
  customer_account_id: string | null;
  venue_id: string | null;
  cover_file_id: string | null;
  name: string;
  slug: string;
  description: string | null;
  starts_at: string | null;
  ends_at: string | null;
  /** IANA zone the event happens in. Show its times in this zone. */
  timezone: string;
  status: EventStatus;
  display_status: EventDisplayStatus;
  capacity: number | null;
  registration_opens_at: string | null;
  registration_closes_at: string | null;
  visibility: EventVisibility;
  category: string | null;
  registration_mode: RegistrationMode;
  holder_fields: HolderFields;
  /** Most tickets one mobile may hold at this event, across every order; null = no limit. */
  purchase_limit_per_mobile: number | null;
  published_at: string | null;
  /** Phase 9: when the doors open for admission; null = at `starts_at`. Admission ends at `ends_at`. */
  doors_open_at: string | null;
  /** Phase 9: set when the event was cancelled; whether tickets already used at the door are refunded too. */
  cancelled_at: string | null;
  cancelled_by: string | null;
  refund_admitted_tickets: boolean | null;
  /** `url` is a path: show it with `assetUrl`. */
  cover: { url: string } | null;
  created_at: string;
  updated_at: string;
}

/** Instants are sent with an offset or `Z`. `null` clears a field on update. */
export interface EventInput {
  name: string;
  slug?: string;
  description: string | null;
  starts_at: string | null;
  ends_at: string | null;
  timezone?: string;
  capacity: number | null;
  registration_opens_at: string | null;
  registration_closes_at: string | null;
  visibility: EventVisibility;
  category: string | null;
  registration_mode?: RegistrationMode;
  holder_fields?: HolderFields;
  purchase_limit_per_mobile?: number | null;
  /** Phase 9: optional, before `ends_at`; null opens the doors at the start. */
  doors_open_at?: string | null;
  customer_account_id: string | null;
  venue_id: string | null;
}

/** Who may get a ticket type: anyone on the public page, or only staff issuing tickets. */
export type TicketAudience = "PUBLIC" | "STAFF_ONLY";

/** A one-off price from `starts_at` (included) to `ends_at` (excluded); no end means until the schedule changes. */
export interface PriceWindow {
  id: string;
  starts_at: string;
  ends_at: string | null;
  price: string;
}

export interface TicketType {
  id: string;
  event_id: string;
  code: string;
  name: string;
  /** The regular price: a decimal string, always with two places (`"500.00"`); `"0.00"` is free. Used whenever no
   * scheduled price applies. Never compute with it as a float. */
  price: string;
  /** Phase 11: scheduled prices, sorted by start. */
  price_windows: PriceWindow[];
  /** Phase 11: what a new order pays right now, and when that changes (null: nothing is scheduled to change). */
  effective_price: string;
  effective_is_free: boolean;
  price_valid_until: string | null;
  /** The organizer's currency (`"ETB"`); set by the API, never sent. */
  currency: string;
  audience: TicketAudience;
  /** null = no separate limit: it draws on the event's capacity only. */
  capacity: number | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TicketTypeInput {
  code: string;
  name: string;
  capacity: number | null;
  /** A decimal string such as `"500"` or `"500.50"`; `"0"` is free (the default). */
  price?: string;
  audience?: TicketAudience;
  /** Phase 11: the whole schedule (it replaces the old one; `[]` clears it, leaving it out keeps it). Up to 20. */
  price_windows?: { starts_at: string; ends_at?: string; price: string }[];
}

const base = (organizationId: string) => `/v1/organizations/${organizationId}/events`;

export interface EventListParams {
  page: number;
  pageSize: number;
  status?: EventStatus;
  visibility?: EventVisibility;
}

/** One page of events. The page size is clamped to the API's limit (100). */
export function listEvents(organizationId: string, params: EventListParams, signal?: AbortSignal): Promise<Paginated<StaffEvent>> {
  return apiPage<StaffEvent>(base(organizationId), {
    page: params.page,
    pageSize: clampPageSize(params.pageSize),
    query: { status: params.status, visibility: params.visibility },
    signal,
  });
}

export function getEvent(organizationId: string, eventId: string, signal?: AbortSignal): Promise<StaffEvent> {
  return apiRequest<StaffEvent>(`${base(organizationId)}/${eventId}`, { signal });
}

/** Created as DRAFT with a General Admission ticket type. Omit `slug` to have one made from the name. */
export function createEvent(organizationId: string, input: EventInput): Promise<StaffEvent> {
  return apiRequest<StaffEvent>(base(organizationId), { method: "POST", body: input });
}

/** Send only what changed. The slug can change only while DRAFT. CLOSED and CANCELLED events can't change (409). */
export function updateEvent(organizationId: string, eventId: string, changes: Partial<EventInput>): Promise<StaffEvent> {
  return apiRequest<StaffEvent>(`${base(organizationId)}/${eventId}`, { method: "PATCH", body: changes });
}

/**
 * DRAFT → PUBLISHED | CANCELLED, PUBLISHED → CLOSED | CANCELLED. Publishing needs dates and an active ticket type,
 * else `409 event_not_publishable` with `details.missing`.
 */
export function setEventStatus(organizationId: string, eventId: string, status: "PUBLISHED" | "CLOSED" | "CANCELLED"): Promise<StaffEvent> {
  return apiRequest<StaffEvent>(`${base(organizationId)}/${eventId}/status`, { method: "PATCH", body: { status } });
}

/**
 * Phase 9: cancels a DRAFT or PUBLISHED event. The API stops sales and the door, cancels unused tickets, opens one
 * refund case per paid order and texts the buyers. `refundAdmittedTickets` is required once a guest was let in
 * (else 400 with issue `refund_decision_required`). Cancelling again changes nothing.
 */
export function cancelEvent(organizationId: string, eventId: string, refundAdmittedTickets?: boolean): Promise<StaffEvent> {
  return apiRequest<StaffEvent>(`${base(organizationId)}/${eventId}/cancel`, {
    method: "POST",
    body: refundAdmittedTickets === undefined ? {} : { refund_admitted_tickets: refundAdmittedTickets },
  });
}

/**
 * Phase 9: moves a published event before its first admission (else 409 `event_has_admissions`). Start and end go
 * together; when the event has its own door time, send `doors_open_at` again (same, new, or null), else 400
 * `doors_open_at_reconfirm`. Tickets and codes stay valid; buyers are texted about a real move.
 */
export function rescheduleEvent(
  organizationId: string,
  eventId: string,
  input: { starts_at: string; ends_at: string; doors_open_at?: string | null },
): Promise<StaffEvent> {
  return apiRequest<StaffEvent>(`${base(organizationId)}/${eventId}/reschedule`, { method: "POST", body: input });
}

/** JPEG, PNG or WebP up to 5 MB, as the only field `file`. Replaces the current cover. */
export function uploadEventCover(organizationId: string, eventId: string, file: File): Promise<StaffEvent> {
  const form = new FormData();
  form.append("file", file);
  return apiRequest<StaffEvent>(`${base(organizationId)}/${eventId}/cover`, { method: "PUT", body: form });
}

export function removeEventCover(organizationId: string, eventId: string): Promise<StaffEvent> {
  return apiRequest<StaffEvent>(`${base(organizationId)}/${eventId}/cover`, { method: "DELETE" });
}

const tickets = (organizationId: string, eventId: string) => `${base(organizationId)}/${eventId}/ticket-types`;

/** Ordered by `display_order`. */
export function listTicketTypes(organizationId: string, eventId: string, signal?: AbortSignal): Promise<TicketType[]> {
  return apiRequest<TicketType[]>(tickets(organizationId, eventId), { signal });
}

/** `capacity` must fit within the event's capacity when both are set. */
export function createTicketType(organizationId: string, eventId: string, input: TicketTypeInput): Promise<TicketType> {
  return apiRequest<TicketType>(tickets(organizationId, eventId), { method: "POST", body: input });
}

export function updateTicketType(organizationId: string, eventId: string, ticketTypeId: string, changes: Partial<TicketTypeInput>): Promise<TicketType> {
  return apiRequest<TicketType>(`${tickets(organizationId, eventId)}/${ticketTypeId}`, { method: "PATCH", body: changes });
}

/** A published event keeps at least one active ticket type (409). */
export function setTicketTypeActive(organizationId: string, eventId: string, ticketTypeId: string, isActive: boolean): Promise<TicketType> {
  return apiRequest<TicketType>(`${tickets(organizationId, eventId)}/${ticketTypeId}/status`, { method: "PATCH", body: { is_active: isActive } });
}
