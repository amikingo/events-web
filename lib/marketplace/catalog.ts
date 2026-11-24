import { CATEGORIES, CITIES, ORGANIZERS, VENUES } from "../../mocks/marketplace/reference";
import { EVENT_SEEDS } from "../../mocks/marketplace/events";
import type { RelTime } from "../../mocks/marketplace/events";
import type { Category, City, EventItem, EventSummary, Organizer, Venue } from "../../types/marketplace";
import { addDays, addisDateKey, toAddisIso } from "./datetime";
import { eventPhase, isFreeEvent, startingPrice } from "./event-state";

/**
 * Turns the relative mock seeds into a dated catalog. Pure: the same `now` always gives the same catalog, so it can be
 * cached on the server and handed to client components as plain data.
 */

export interface Catalog {
  /** The moment the catalog was built; every derived state (upcoming, sold out…) is computed against it on the server. */
  generatedAt: string;
  events: EventItem[];
  categories: Category[];
  cities: City[];
  organizers: Organizer[];
  venues: Venue[];
}

export function buildCatalog(now: Date): Catalog {
  const today = addisDateKey(now.getTime());
  const at = (r: RelTime) => toAddisIso(addDays(today, r.day), r.time);

  const events: EventItem[] = EVENT_SEEDS.map((s) => {
    const startKey = addDays(today, s.start.day);
    return {
      id: s.id,
      slug: s.slug,
      title: s.title,
      summary: s.summary,
      description: s.description,
      categoryId: s.categoryId,
      organizerId: s.organizerId,
      format: s.format,
      venueId: s.venueId,
      onlinePlatform: s.onlinePlatform,
      startsAt: at(s.start),
      endsAt: at(s.end),
      lifecycle: s.lifecycle,
      originalStartsAt: s.originalStart ? at(s.originalStart) : undefined,
      lifecycleNote: s.lifecycleNote,
      updates: (s.updates ?? []).map((u) => ({ at: at(u), summary: u.summary })),
      ticketTypes: s.tickets.map((t) => ({
        id: t.id,
        name: t.name,
        kind: t.kind,
        description: t.description,
        price: t.price,
        quantityTotal: t.quantityTotal,
        quantitySold: t.quantitySold,
        maxPerOrder: t.maxPerOrder ?? 6,
        salesStartAt: at(t.salesStart ?? { day: -45, time: "09:00" }),
        salesEndAt: t.salesEnd ? at(t.salesEnd) : at(s.start),
        perks: t.perks ?? [],
      })),
      speakers: s.speakers ?? [],
      agenda: (s.agenda ?? []).map((d) => ({
        id: `${s.id}-d${d.offset}`,
        label: d.label,
        items: d.items.map((i, n) => ({
          id: `${s.id}-d${d.offset}-${n}`,
          startsAt: toAddisIso(addDays(startKey, d.offset), i.start),
          endsAt: toAddisIso(addDays(startKey, d.offset), i.end),
          title: i.title,
          description: i.description,
          location: i.location,
          speakerIds: i.speakerIds ?? [],
        })),
      })),
      attendeeQuestions: s.attendeeQuestions ?? [],
      refundPolicy: s.refundPolicy,
      tags: s.tags,
      featured: s.featured ?? false,
      trendingScore: s.trendingScore,
      publishedAt: at({ day: s.publishedDay, time: "10:00" }),
      ageRestriction: s.ageRestriction,
      language: s.language ?? "English",
      coverPattern: s.coverPattern,
    };
  });

  return { generatedAt: now.toISOString(), events, categories: CATEGORIES, cities: CITIES, organizers: ORGANIZERS, venues: VENUES };
}

/** The list-sized shape of an event, with names resolved. */
export function toSummary(e: EventItem, c: Catalog): EventSummary {
  const now = Date.parse(c.generatedAt);
  const venue = e.venueId ? c.venues.find((v) => v.id === e.venueId) : undefined;
  const city = venue ? c.cities.find((x) => x.id === venue.cityId) : undefined;
  return {
    id: e.id,
    slug: e.slug,
    title: e.title,
    summary: e.summary,
    categoryId: e.categoryId,
    categoryName: c.categories.find((x) => x.id === e.categoryId)?.name ?? "",
    organizerId: e.organizerId,
    organizerName: c.organizers.find((o) => o.id === e.organizerId)?.name ?? "",
    format: e.format,
    venueName: venue?.name,
    venueAddress: venue?.address,
    cityId: city?.id,
    cityName: city?.name,
    onlinePlatform: e.onlinePlatform,
    startsAt: e.startsAt,
    endsAt: e.endsAt,
    lifecycle: e.lifecycle,
    originalStartsAt: e.originalStartsAt,
    lifecycleNote: e.lifecycleNote,
    latestUpdate: e.updates[0],
    coverPattern: e.coverPattern,
    minPrice: startingPrice(e.ticketTypes, now),
    isFree: isFreeEvent(e.ticketTypes),
    ticketTypes: e.ticketTypes,
    trendingScore: e.trendingScore,
    featured: e.featured,
    publishedAt: e.publishedAt,
    refundSummary: e.refundPolicy.summary,
  };
}

/** Events an attendee can still go to: not cancelled and not over. */
export function isDiscoverable(e: { lifecycle: string; startsAt: string; endsAt: string }, now: number): boolean {
  return e.lifecycle !== "cancelled" && eventPhase(e, now) !== "ended";
}
