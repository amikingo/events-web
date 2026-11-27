/**
 * The visitor site: no login, no token.
 *
 *   GET  /v1/public/events                                                           ?page&pageSize&category&organization
 *   GET  /v1/public/organizations/:organizationSlug/events/:eventSlug                works for UNLISTED events too (by link)
 *   POST /v1/public/organizations/:organizationSlug/events/:eventSlug/registrations  header Idempotency-Key (a UUID)
 *
 * Both slugs identify an event: two organizers may use the same event slug. Rate limited per IP (`429 rate_limited`).
 */
import type { HolderFields, RegistrationMode } from "@/lib/api/events";
import { apiPage, apiRequest, apiRequestWithStatus, clampPageSize } from "@/lib/api-client";
import type { Paginated } from "@/lib/api-client";
import type { EventDisplayStatus } from "@/lib/api/events";

export interface PublicEventCard {
  name: string;
  slug: string;
  organization: { name: string; slug: string };
  starts_at: string | null;
  ends_at: string | null;
  timezone: string;
  display_status: EventDisplayStatus;
  category: string | null;
  venue: { name: string; address: string | null; city: string | null; country: string | null } | null;
  /** `url` is a path: show it with `assetUrl`. */
  cover: { url: string } | null;
  /** Show or hide the sign-up button. */
  registration_open: boolean;
}

export interface PublicEventDetail extends PublicEventCard {
  description: string | null;
  registration_opens_at: string | null;
  registration_closes_at: string | null;
  /** Active PUBLIC ticket types only, in display order. `code` is what the sign-up form sends; `price` is a decimal string. */
  ticket_types: PublicTicketType[];
  /** Phase 7: how guests register, which details a DETAILED event asks for, and the per-mobile ticket limit. */
  registration_mode: RegistrationMode;
  holder_fields: HolderFields;
  purchase_limit_per_mobile: number | null;
  /** Phase 9: when the doors open; null = at the start time. */
  doors_open_at: string | null;
  /** Show this notice on the form and send its `version` back with the registration. */
  privacy_notice: { version: string };
}

export interface PublicTicketType {
  code: string;
  name: string;
  /** `"0.00"` is free. Shown only; never computed with. */
  price: string;
  currency: string;
  is_free: boolean;
  /** Phase 11: `price` is what a new order pays now; this is when that changes (null: it doesn't). */
  price_valid_until: string | null;
}

export interface PublicRegistrationInput {
  first_name: string;
  last_name: string;
  /** An Ethiopian mobile (`09…` or `+251…`) for anonymous visitors; omitted when signed in as a guest. */
  phone?: string;
  email?: string | null;
  affiliation_name?: string | null;
  country?: string | null;
  /** Needed only when the event has several ticket types. */
  ticket_type_code?: string;
  privacy_notice_version: string;
}

/** What a visitor gets back: only what they need. No ids. */
export interface PublicRegistration {
  code: string;
  status: "CONFIRMED" | "CANCELLED";
  registered_at: string;
  ticket_type: { code: string; name: string };
  event: { name: string; slug: string; starts_at: string | null; ends_at: string | null; timezone: string };
  organization: { name: string; slug: string };
  guest: { first_name: string };
}

export interface PublicEventListParams {
  page: number;
  pageSize: number;
  category?: string;
  /** An organization slug. */
  organization?: string;
}

export function listPublicEvents(params: PublicEventListParams, signal?: AbortSignal): Promise<Paginated<PublicEventCard>> {
  return apiPage<PublicEventCard>("/v1/public/events", {
    page: params.page,
    pageSize: clampPageSize(params.pageSize),
    query: { category: params.category, organization: params.organization },
    signal,
  });
}

export function getPublicEvent(organizationSlug: string, eventSlug: string, signal?: AbortSignal): Promise<PublicEventDetail> {
  return apiRequest<PublicEventDetail>(`/v1/public/organizations/${organizationSlug}/events/${eventSlug}`, { signal });
}

/**
 * Create a new `idempotencyKey` (`crypto.randomUUID()`) when the visitor presses Register. Reuse it only to retry that
 * same submission (a network error or timeout); make a new one when they change the form. Both 201 (registered) and
 * 200 (that submission was already processed) are success: `alreadyProcessed` is true for 200.
 */
export async function registerForEvent(
  organizationSlug: string,
  eventSlug: string,
  input: PublicRegistrationInput,
  idempotencyKey: string,
): Promise<{ registration: PublicRegistration; alreadyProcessed: boolean }> {
  const { data, status } = await apiRequestWithStatus<PublicRegistration>(`/v1/public/organizations/${organizationSlug}/events/${eventSlug}/registrations`, {
    method: "POST",
    body: input,
    headers: { "Idempotency-Key": idempotencyKey },
  });
  return { registration: data, alreadyProcessed: status === 200 };
}
