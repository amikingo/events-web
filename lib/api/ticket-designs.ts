/**
 * An event's ticket design.
 *
 *   GET | PUT | DELETE /v1/organizations/:organizationId/events/:eventId/ticket-design                 Events view / update
 *   PUT | DELETE       /v1/organizations/:organizationId/events/:eventId/ticket-design/images/:slot    Events update
 *   GET                /v1/public/organizations/:organizationSlug/events/:eventSlug/ticket-design      no login
 *
 * `data: null` means the standard designs apply.
 */
import { apiRequest } from "@/lib/api-client";

export type TicketImageSlot = "logo" | "picture" | "artwork";

export interface TicketDesignSettings {
  /** The booking site's layout name; `custom` is the organizer's own artwork. */
  design: string;
  /** A named colour or `#rrggbb`; null keeps the design's own colours. */
  color: string | null;
  note: string | null;
  show_price: boolean;
  show_venue: boolean;
  show_guest: boolean;
  /** Where the QR panel goes on custom artwork (0 to 1) and its size. */
  qr: { x: number; y: number; size: "s" | "m" | "l" };
}

export interface TicketDesign extends TicketDesignSettings {
  /** `url` is a path: show it with `assetUrl`. */
  logo: { url: string } | null;
  picture: { url: string } | null;
  artwork: { url: string } | null;
  updated_at: string;
}

const staff = (organizationId: string, eventId: string) => `/v1/organizations/${organizationId}/events/${eventId}/ticket-design`;

export function getTicketDesign(organizationId: string, eventId: string, signal?: AbortSignal): Promise<TicketDesign | null> {
  return apiRequest<TicketDesign | null>(staff(organizationId, eventId), { signal });
}

/** Replaces the settings. `custom` needs the artwork uploaded first. */
export function saveTicketDesign(organizationId: string, eventId: string, settings: TicketDesignSettings): Promise<TicketDesign> {
  return apiRequest<TicketDesign>(staff(organizationId, eventId), { method: "PUT", body: settings });
}

export function removeTicketDesign(organizationId: string, eventId: string): Promise<null> {
  return apiRequest<null>(staff(organizationId, eventId), { method: "DELETE" });
}

/** JPEG, PNG or WebP up to 5 MB, as the only field `file`. */
export function uploadTicketImage(organizationId: string, eventId: string, slot: TicketImageSlot, file: File): Promise<TicketDesign> {
  const form = new FormData();
  form.append("file", file);
  return apiRequest<TicketDesign>(`${staff(organizationId, eventId)}/images/${slot}`, { method: "PUT", body: form });
}

export function removeTicketImage(organizationId: string, eventId: string, slot: TicketImageSlot): Promise<TicketDesign> {
  return apiRequest<TicketDesign>(`${staff(organizationId, eventId)}/images/${slot}`, { method: "DELETE" });
}

export function getPublicTicketDesign(organizationSlug: string, eventSlug: string, signal?: AbortSignal): Promise<TicketDesign | null> {
  return apiRequest<TicketDesign | null>(`/v1/public/organizations/${organizationSlug}/events/${eventSlug}/ticket-design`, { signal });
}
