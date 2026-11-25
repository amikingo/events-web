/**
 * Venues of an organization: reusable physical places. Module EVENTS (venues have no permission of their own).
 *
 *   GET   /v1/organizations/:organizationId/venues              ?page&pageSize&is_active
 *   POST  /v1/organizations/:organizationId/venues
 *   GET   /v1/organizations/:organizationId/venues/:venueId
 *   PATCH /v1/organizations/:organizationId/venues/:venueId
 *   PATCH /v1/organizations/:organizationId/venues/:venueId/status   { is_active }
 *
 * No delete: venues are switched off, so past events keep them.
 */
import { apiListAll, apiPage, apiRequest, clampPageSize } from "@/lib/api-client";
import type { Paginated } from "@/lib/api-client";

/** A venue as the API returns it (its own field names). */
export interface Venue {
  id: string;
  organization_id: string;
  name: string;
  address: string | null;
  city: string | null;
  /** Two-letter country code (`ET`). */
  country: string | null;
  /** How many people the place holds. An event sets its own booking limit. */
  capacity: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/** Create and update payload. `null` clears a field on update. */
export interface VenueInput {
  name: string;
  address: string | null;
  city: string | null;
  country: string | null;
  capacity: number | null;
}

export interface VenueListParams {
  page: number;
  pageSize: number;
  /** Only active (true) or only switched-off (false) venues; all when left out. */
  isActive?: boolean;
}

const base = (organizationId: string) => `/v1/organizations/${organizationId}/venues`;

/** One page of venues. The page size is clamped to the API's limit (100). */
export function listVenues(organizationId: string, params: VenueListParams, signal?: AbortSignal): Promise<Paginated<Venue>> {
  return apiPage<Venue>(base(organizationId), {
    page: params.page,
    pageSize: clampPageSize(params.pageSize),
    query: { is_active: params.isActive === undefined ? undefined : String(params.isActive) },
    signal,
  });
}

/** Every venue, switched-off ones included: other records (events) still need to name them. */
export function listAllVenues(organizationId: string, signal?: AbortSignal): Promise<Venue[]> {
  return apiListAll<Venue>(base(organizationId), { signal });
}

export function getVenue(organizationId: string, venueId: string, signal?: AbortSignal): Promise<Venue> {
  return apiRequest<Venue>(`${base(organizationId)}/${venueId}`, { signal });
}

export function createVenue(organizationId: string, input: VenueInput): Promise<Venue> {
  return apiRequest<Venue>(base(organizationId), { method: "POST", body: input });
}

/** Send only what changed. */
export function updateVenue(organizationId: string, venueId: string, changes: Partial<VenueInput>): Promise<Venue> {
  return apiRequest<Venue>(`${base(organizationId)}/${venueId}`, { method: "PATCH", body: changes });
}

export function setVenueActive(organizationId: string, venueId: string, isActive: boolean): Promise<Venue> {
  return apiRequest<Venue>(`${base(organizationId)}/${venueId}/status`, { method: "PATCH", body: { is_active: isActive } });
}
