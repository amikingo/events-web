import { CITIES } from "../../mocks/marketplace/reference";
import { assetUrl } from "../api-client";
import { ApiError } from "../api-client";
import { getPublicEvent, listPublicEvents } from "../api/public-events";
import type { PublicEventCard, PublicEventDetail } from "../api/public-events";
import type { Category, City, CoverPattern, EventItem, EventSummary, Organizer, TicketType, Venue } from "../../types/marketplace";
import { eventPhase, isFreeEvent, startingPrice } from "./event-state";

/**
 * The marketplace catalog, built from the public API (no login). It has the same shape the screens already read, so the
 * pages and components don't know the data is real. Where the API has nothing to say (prices, followers, an agenda), the
 * field is left empty and the screen hides that block instead of showing an invented value.
 *
 * An event's `slug` here is `<organization slug>/<event slug>`: the API needs both to find an event, and with this the
 * existing `/events/${event.slug}` links become `/events/<organization>/<event>` without touching any component.
 */

export interface Catalog {
  /** The moment the catalog was built; every derived state (upcoming, ongoing…) is computed against it on the server. */
  generatedAt: string;
  events: EventItem[];
  categories: Category[];
  cities: City[];
  organizers: Organizer[];
  venues: Venue[];
  /** The API could not be reached: the lists are empty because nothing could be loaded, not because there is nothing. */
  unavailable: boolean;
}

const PATTERNS: CoverPattern[] = ["rings", "grid", "arcs", "dots", "waves", "stripes", "burst", "blocks"];

/** A stable pick, so an event keeps the same artwork on every visit. */
function hash(text: string): number {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) >>> 0;
  return h;
}

export const slugify = (text: string): string =>
  text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const initialsOf = (name: string) => name.split(/\s+/).filter(Boolean).map((w) => w[0]).join("").slice(0, 2).toUpperCase() || "?";

/** The organizer as far as the API tells us: a name and a slug. Everything else is empty, and the screens hide it. */
function organizerOf(card: Pick<PublicEventCard, "organization">): Organizer {
  const o = card.organization;
  return { id: o.slug, slug: o.slug, name: o.name, initials: initialsOf(o.name), tagline: "", bio: "", cityId: "", email: "", phone: "", followers: 0, verified: false, rating: 0 };
}

function venueOf(card: Pick<PublicEventCard, "organization" | "slug" | "venue">): { venue: Venue; city?: City } | undefined {
  const v = card.venue;
  if (!v) return undefined;
  const city = v.city ? CITIES.find((c) => c.name.toLowerCase() === v.city!.trim().toLowerCase()) : undefined;
  return {
    venue: {
      id: `${card.organization.slug}/${card.slug}#venue`,
      name: v.name,
      // A known city is added by the screen from its name; an unknown one is part of the address.
      address: [v.address, city ? null : v.city].filter(Boolean).join(", "),
      cityId: city?.id ?? "",
      cityName: city ? undefined : (v.city ?? undefined),
      capacity: 0,
      directions: "",
    },
    city,
  };
}

/**
 * Registration is the only "ticket" there is. One free ticket type stands for it, so the existing availability logic
 * (on sale, opens soon, closed) reads the API's `registration_open` and the registration window without change.
 */
/** Far above any real event: remaining places are never shown as few. */
const NO_PUBLIC_LIMIT = 1_000_000;

function registrationTicket(startsAt: string, endsAt: string, open: boolean, opensAt: string | null, closesAt: string | null, name = "Registration", code = "REGISTRATION"): TicketType {
  const past = new Date(Date.now() - 365 * 86_400_000).toISOString();
  const salesStartAt = open ? past : (opensAt ?? past);
  // Not open and not "not yet open": the window has passed, so sales are over.
  const notYet = !open && opensAt !== null && Date.now() < Date.parse(opensAt);
  return {
    id: code,
    name,
    kind: "free",
    description: "",
    price: 0,
    // The public API doesn't say how many places are left, so the made-up ticket has no limit: "Few left" or
    // "Sold out" must never be guessed. A full event shows up as registration_closed / capacity_reached instead.
    quantityTotal: NO_PUBLIC_LIMIT,
    quantitySold: 0,
    maxPerOrder: 1,
    salesStartAt,
    salesEndAt: open ? (closesAt ?? endsAt) : notYet ? endsAt : past,
    perks: [],
  };
}

function eventFromCard(card: PublicEventCard): EventItem {
  const startsAt = card.starts_at ?? new Date().toISOString();
  const endsAt = card.ends_at ?? startsAt;
  const categoryName = card.category?.trim() || "Events";
  const key = `${card.organization.slug}/${card.slug}`;
  const msUntil = Date.parse(startsAt) - Date.now();
  return {
    id: key,
    slug: key,
    title: card.name,
    summary: "",
    description: [],
    categoryId: slugify(categoryName) || "events",
    organizerId: card.organization.slug,
    format: "in-person",
    venueId: card.venue ? `${key}#venue` : undefined,
    startsAt,
    endsAt,
    lifecycle: card.display_status === "CANCELLED" ? "cancelled" : "published",
    updates: [],
    ticketTypes: [registrationTicket(startsAt, endsAt, card.registration_open, null, null)],
    speakers: [],
    agenda: [],
    attendeeQuestions: [],
    refundPolicy: { summary: "", details: [] },
    tags: [],
    featured: false,
    // Sooner is hotter: there is no popularity signal, so "trending" falls back to what is coming up first.
    trendingScore: Math.round(1_000_000 - Math.max(0, msUntil) / 3_600_000),
    publishedAt: startsAt,
    language: "",
    coverPattern: PATTERNS[hash(key) % PATTERNS.length]!,
    coverUrl: card.cover ? assetUrl(card.cover.url) : undefined,
    timezone: card.timezone,
  };
}

/** Everything the API lists as upcoming or live, up to 5 pages of 100. */
async function fetchAllCards(): Promise<PublicEventCard[]> {
  const all: PublicEventCard[] = [];
  for (let page = 1; page <= 5; page++) {
    const result = await listPublicEvents({ page, pageSize: 100 });
    all.push(...result.data);
    if (page >= result.totalPages) break;
  }
  return all;
}

function assemble(cards: PublicEventCard[], now: Date, unavailable: boolean): Catalog {
  const events = cards.map(eventFromCard);
  const organizers = new Map<string, Organizer>();
  const venues: Venue[] = [];
  const cities = new Map<string, City>();
  for (const card of cards) {
    if (!organizers.has(card.organization.slug)) organizers.set(card.organization.slug, organizerOf(card));
    const placed = venueOf(card);
    if (placed) venues.push(placed.venue);
    if (placed?.city) cities.set(placed.city.id, placed.city);
  }
  const categories = new Map<string, Category>();
  for (const e of events) {
    const name = cards.find((c) => `${c.organization.slug}/${c.slug}` === e.id)?.category?.trim() || "Events";
    if (!categories.has(e.categoryId)) categories.set(e.categoryId, { id: e.categoryId, name, description: "" });
  }
  return { generatedAt: now.toISOString(), events, categories: [...categories.values()], cities: [...cities.values()], organizers: [...organizers.values()], venues, unavailable };
}

/** Builds the catalog from the API. If it can't be reached, returns an empty catalog marked `unavailable` so pages can say so. */
export async function loadCatalog(now: Date): Promise<Catalog> {
  try {
    return assemble(await fetchAllCards(), now, false);
  } catch {
    return assemble([], now, true);
  }
}

export interface LoadedEvent {
  event: EventItem;
  organizer: Organizer;
  venue?: Venue;
  city?: City;
  category: Category;
}

/** One event for its own page, from the API's event page (which has the description and ticket types). `null` for an unknown event. */
export async function loadEventDetail(organizationSlug: string, eventSlug: string): Promise<LoadedEvent | null> {
  let detail: PublicEventDetail;
  try {
    detail = await getPublicEvent(organizationSlug, eventSlug);
  } catch (error) {
    if (error instanceof ApiError && error.code === "not_found") return null;
    throw error;
  }
  const base = eventFromCard(detail);
  const startsAt = base.startsAt;
  const endsAt = base.endsAt;
  // Prices are shown only (never added up here), so the marketplace's numeric price is set from the API's string.
  const tickets = detail.ticket_types.map((t) => ({
    ...registrationTicket(startsAt, endsAt, detail.registration_open, detail.registration_opens_at, detail.registration_closes_at, t.name, t.code),
    price: t.is_free ? 0 : Number(t.price),
  }));
  const event: EventItem = {
    ...base,
    doorsOpenAt: detail.doors_open_at ?? undefined,
    description: (detail.description ?? "").split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean),
    ticketTypes: tickets.length ? tickets : base.ticketTypes,
    registration: {
      open: detail.registration_open,
      opensAt: detail.registration_opens_at,
      closesAt: detail.registration_closes_at,
      privacyVersion: detail.privacy_notice.version,
      organizationSlug: detail.organization.slug,
      eventSlug: detail.slug,
      ticketTypes: detail.ticket_types.map((t) => ({ code: t.code, name: t.name, price: t.price, currency: t.currency, isFree: t.is_free })),
      mode: detail.registration_mode,
      purchaseLimit: detail.purchase_limit_per_mobile,
      holderFields: detail.holder_fields,
    },
  };
  const placed = venueOf(detail);
  const categoryName = detail.category?.trim() || "Events";
  return { event, organizer: organizerOf(detail), venue: placed?.venue, city: placed?.city, category: { id: event.categoryId, name: categoryName, description: "" } };
}

/** The list-sized shape of an event, with names resolved. */
export function toSummary(e: EventItem, c: Catalog): EventSummary {
  const now = Date.parse(c.generatedAt);
  const venue = e.venueId ? c.venues.find((v) => v.id === e.venueId) : undefined;
  const city = venue ? c.cities.find((x) => x.id === venue.cityId) : undefined;
  const cityName = city?.name ?? venue?.cityName;
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
    cityName,
    onlinePlatform: e.onlinePlatform,
    startsAt: e.startsAt,
    endsAt: e.endsAt,
    lifecycle: e.lifecycle,
    originalStartsAt: e.originalStartsAt,
    lifecycleNote: e.lifecycleNote,
    latestUpdate: e.updates[0],
    coverPattern: e.coverPattern,
    coverUrl: e.coverUrl,
    timezone: e.timezone,
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
