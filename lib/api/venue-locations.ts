/**
 * A venue's pin on the map.
 *
 *   GET | PUT | DELETE /v1/organizations/:organizationId/venues/:venueId/location                      Events view / update
 *   GET                /v1/public/organizations/:organizationSlug/events/:eventSlug/venue-location     no login
 *
 * `data: null` means no pin.
 */
import { apiRequest } from "@/lib/api-client";

export interface VenuePin {
  /** Degrees. */
  latitude: number;
  longitude: number;
}

const staff = (organizationId: string, venueId: string) => `/v1/organizations/${organizationId}/venues/${venueId}/location`;

export function getVenuePin(organizationId: string, venueId: string, signal?: AbortSignal): Promise<VenuePin | null> {
  return apiRequest<VenuePin | null>(staff(organizationId, venueId), { signal });
}

export function saveVenuePin(organizationId: string, venueId: string, pin: VenuePin): Promise<VenuePin> {
  return apiRequest<VenuePin>(staff(organizationId, venueId), { method: "PUT", body: pin });
}

export function removeVenuePin(organizationId: string, venueId: string): Promise<null> {
  return apiRequest<null>(staff(organizationId, venueId), { method: "DELETE" });
}

export function getPublicVenuePin(organizationSlug: string, eventSlug: string, signal?: AbortSignal): Promise<VenuePin | null> {
  return apiRequest<VenuePin | null>(`/v1/public/organizations/${organizationSlug}/events/${eventSlug}/venue-location`, { signal });
}
