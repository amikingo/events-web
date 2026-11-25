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
  published_at: string | null;
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
  customer_account_id: string | null;
  venue_id: string | null;
}

export interface TicketType {
  id: string;
  event_id: string;
  code: string;
  name: string;
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
