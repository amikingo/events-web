import { cache } from "react";
import { isDiscoverable, loadCatalog, loadEventDetail, toSummary } from "../marketplace/catalog";
import type { Catalog } from "../marketplace/catalog";
import { EXPLORE_PAGE_SIZE } from "../marketplace/config";
import { addDays, addisDateKey, addisParts, DAY_MS } from "../marketplace/datetime";
import { eventPhase } from "../marketplace/event-state";
import type { Category, City, CityId, EventItem, EventQuery, EventQueryResult, EventSummary, Organizer, Venue } from "../../types/marketplace";

/**
 * Read side of the marketplace, used by Server Components. Backed by the public API (no login): the catalog is built
 * from `GET /v1/public/events` and an event's own page from `GET /v1/public/organizations/{org}/events/{event}`
 * (see `lib/marketplace/catalog.ts`). The method names and return types are the ones the screens always used.
 *
 * No caching (project decision): the catalog is rebuilt for every request, so "now" and every derived state
 * (upcoming, ongoing, registration open…) is always current. React's `cache()` only shares one catalog between the
 * components of a single request (one consistent "now" per page); nothing is kept between requests.
 */
const getCatalog = cache(async (): Promise<Catalog> => loadCatalog(new Date()));
/**
 * One event page fetch per request: the page and its generateMetadata both ask for the event, and the Next server
 * shares one rate limit against the API for every visitor, so the second ask must not call the API again.
 */
const getEventDetail = cache((orgSlug: string, eventSlug: string) => loadEventDetail(orgSlug, eventSlug));

export interface HomeData {
  now: string;
  featured: EventSummary[];
  trending: EventSummary[];
  upcoming: EventSummary[];
  thisWeek: EventSummary[];
  nearby: Partial<Record<CityId, EventSummary[]>>;
  categories: (Category & { count: number; cover: EventSummary["coverPattern"] })[];
  cities: City[];
  organizers: (Organizer & { upcomingCount: number })[];
  /** Big slides for the spotlight carousel: featured first, then the hottest events. */
  spotlight: EventSummary[];
  /** Everything on sale, hottest first — the hero's poster wall. */
  wall: EventSummary[];
  /** Ready-made answers to "what's on?". */
  picks: { today: EventSummary[]; weekend: EventSummary[]; free: EventSummary[]; online: EventSummary[] };
  /** Discoverable events in total, for honest counts in copy. */
  liveCount: number;
}

export interface EventDetail {
  now: string;
  event: EventItem;
  summary: EventSummary;
  organizer: Organizer;
  organizerUpcoming: number;
  venue?: Venue;
  city?: City;
  category: Category;
  related: EventSummary[];
}

export interface Facets {
  categories: Category[];
  cities: City[];
  organizers: Pick<Organizer, "slug" | "name">[];
}

export interface SearchSuggestion {
  id: string;
  label: string;
  sub: string;
  href: string;
}

const byStart = (a: EventSummary, b: EventSummary) => a.startsAt.localeCompare(b.startsAt);

function weekendWindow(now: number): [string, string] {
  const today = addisDateKey(now);
  const weekday = addisParts(new Date(now).toISOString()).weekday;
  const saturday = weekday === 0 ? addDays(today, -1) : addDays(today, 6 - weekday);
  return [saturday, addDays(saturday, 1)];
}

/** Does the event run on any day in [fromKey, toKey]? */
function overlapsDays(e: EventSummary, fromKey: string, toKey: string): boolean {
  return addisParts(e.startsAt).key <= toKey && addisParts(e.endsAt).key >= fromKey;
}

function matchScore(e: EventSummary, tags: string[], q: string): number {
  if (!q) return 0;
  const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
  let score = 0;
  for (const term of terms) {
    let hit = 0;
    if (e.title.toLowerCase().includes(term)) hit = Math.max(hit, 10);
    if (e.organizerName.toLowerCase().includes(term)) hit = Math.max(hit, 6);
    if (tags.some((t) => t.includes(term))) hit = Math.max(hit, 5);
    if (e.categoryName.toLowerCase().includes(term)) hit = Math.max(hit, 4);
    if ((e.venueName ?? "").toLowerCase().includes(term) || (e.cityName ?? "").toLowerCase().includes(term)) hit = Math.max(hit, 3);
    if (e.summary.toLowerCase().includes(term)) hit = Math.max(hit, 2);
    if (!hit) return 0; // every term must match somewhere
    score += hit;
  }
  return score;
}

export const eventsService = {
  async list(query: EventQuery): Promise<EventQueryResult> {
    const c = await getCatalog();
    const now = Date.parse(c.generatedAt);
    const today = addisDateKey(now);
    const tagsOf = new Map(c.events.map((e) => [e.id, e.tags]));
    const organizerSlug = new Map(c.organizers.map((o) => [o.id, o.slug]));

    let rows = c.events.map((e) => toSummary(e, c)).filter((e) => e.lifecycle !== "cancelled");

    rows = rows.filter((e) => {
      const phase = eventPhase(e, now);
      switch (query.date) {
        case "past":
          return phase === "ended";
        case "today":
          return phase !== "ended" && overlapsDays(e, today, today);
        case "weekend": {
          const [sat, sun] = weekendWindow(now);
          return phase !== "ended" && overlapsDays(e, sat, sun);
        }
        case "week":
          return phase !== "ended" && Date.parse(e.startsAt) <= now + 7 * DAY_MS;
        case "month":
          return phase !== "ended" && Date.parse(e.startsAt) <= now + 30 * DAY_MS;
        default:
          return phase !== "ended";
      }
    });

    if (query.category !== "all") rows = rows.filter((e) => e.categoryId === query.category);
    if (query.city === "online") rows = rows.filter((e) => e.format !== "in-person");
    else if (query.city !== "all") rows = rows.filter((e) => e.cityId === query.city);
    if (query.price === "free") rows = rows.filter((e) => e.isFree);
    if (query.price === "paid") rows = rows.filter((e) => !e.isFree && !e.priceUnknown);
    if (query.organizer !== "all") rows = rows.filter((e) => organizerSlug.get(e.organizerId) === query.organizer);

    const scores = new Map<string, number>();
    if (query.q) {
      for (const e of rows) scores.set(e.id, matchScore(e, tagsOf.get(e.id) ?? [], query.q));
      rows = rows.filter((e) => (scores.get(e.id) ?? 0) > 0);
    }

    const past = query.date === "past";
    rows.sort((a, b) => {
      if (query.sort === "newest") return b.publishedAt.localeCompare(a.publishedAt);
      if (query.sort === "upcoming") return past ? b.startsAt.localeCompare(a.startsAt) : a.startsAt.localeCompare(b.startsAt);
      const s = (scores.get(b.id) ?? 0) - (scores.get(a.id) ?? 0);
      if (s !== 0) return s;
      return past ? b.startsAt.localeCompare(a.startsAt) : b.trendingScore - a.trendingScore;
    });

    const total = rows.length;
    const totalPages = Math.max(1, Math.ceil(total / EXPLORE_PAGE_SIZE));
    const page = Math.min(query.page, totalPages);
    return { items: rows.slice((page - 1) * EXPLORE_PAGE_SIZE, page * EXPLORE_PAGE_SIZE), total, page, pageSize: EXPLORE_PAGE_SIZE, totalPages };
  },

  async getHome(): Promise<HomeData> {
    const c = await getCatalog();
    const now = Date.parse(c.generatedAt);
    const live = c.events.filter((e) => isDiscoverable(e, now)).map((e) => toSummary(e, c));

    const featured = live.filter((e) => e.featured).sort(byStart).slice(0, 3);
    const trending = [...live].sort((a, b) => b.trendingScore - a.trendingScore).slice(0, 8);
    const upcoming = live.filter((e) => eventPhase(e, now) === "upcoming").sort(byStart).slice(0, 8);
    const thisWeek = live.filter((e) => Date.parse(e.startsAt) <= now + 7 * DAY_MS).sort(byStart).slice(0, 6);

    const nearby: HomeData["nearby"] = {};
    for (const city of c.cities) {
      const list = live.filter((e) => e.cityId === city.id).sort(byStart).slice(0, 4);
      if (list.length) nearby[city.id] = list;
    }

    const categories = c.categories.map((cat) => {
      const inCat = live.filter((e) => e.categoryId === cat.id);
      return { ...cat, count: inCat.length, cover: [...inCat].sort((a, b) => b.trendingScore - a.trendingScore)[0]?.coverPattern ?? "blocks" };
    });

    const organizers = [...c.organizers]
      .sort((a, b) => b.followers - a.followers)
      .slice(0, 5)
      .map((o) => ({ ...o, upcomingCount: live.filter((e) => e.organizerId === o.id).length }));

    const hottest = [...live].sort((a, b) => b.trendingScore - a.trendingScore);
    const spotlight = [...featured, ...hottest.filter((e) => !e.featured)].slice(0, 5);
    const today = addisDateKey(now);
    const [sat, sun] = weekendWindow(now);
    const picks = {
      today: live.filter((e) => overlapsDays(e, today, today)).sort(byStart).slice(0, 6),
      weekend: live.filter((e) => overlapsDays(e, sat, sun)).sort(byStart).slice(0, 6),
      free: live.filter((e) => !e.priceUnknown && e.minPrice === 0).sort(byStart).slice(0, 6),
      online: live.filter((e) => e.format !== "in-person").sort(byStart).slice(0, 6),
    };

    return { now: c.generatedAt, featured, trending, upcoming, thisWeek, nearby, categories, cities: c.cities, organizers, spotlight, wall: hottest, picks, liveCount: live.length };
  },

  /** `slug` is `<organization slug>/<event slug>`. */
  async getBySlug(slug: string): Promise<EventDetail | null> {
    const [orgSlug, eventSlug] = slug.split("/");
    if (!orgSlug || !eventSlug) return null;
    const c = await getCatalog();
    const now = Date.parse(c.generatedAt);
    // The event's own page has the description and ticket types the list doesn't; it also opens unlisted and past events.
    const loaded = await getEventDetail(orgSlug, eventSlug);
    if (!loaded) return null;
    const { event, organizer, venue, city, category } = loaded;
    const live = c.events.filter((e) => e.id !== event.id && isDiscoverable(e, now));
    const related = [...live]
      .sort((a, b) => Number(b.categoryId === event.categoryId) * 2 + Number(b.organizerId === event.organizerId) - (Number(a.categoryId === event.categoryId) * 2 + Number(a.organizerId === event.organizerId)) || a.startsAt.localeCompare(b.startsAt))
      .slice(0, 4)
      .map((e) => toSummary(e, c));
    return {
      now: c.generatedAt,
      event,
      summary: toSummary(event, c),
      organizer,
      organizerUpcoming: live.filter((e) => e.organizerId === organizer.id).length + 1,
      venue,
      city,
      category,
      related,
    };
  },

  /** False when the API couldn't be reached: pages then say so, because empty lists would wrongly read as "no events". */
  async isAvailable(): Promise<boolean> {
    return !(await getCatalog()).unavailable;
  },

  /** The catalog's "now" (ISO) — what server-rendered states are computed against. */
  async getNow(): Promise<string> {
    return (await getCatalog()).generatedAt;
  },

  /** Every event (cancelled and past included) as summaries, keyed by id — what order and ticket screens look events up in. */
  async getSummaryLookup(): Promise<Record<string, EventSummary>> {
    const c = await getCatalog();
    return Object.fromEntries(c.events.map((e) => [e.id, toSummary(e, c)]));
  },

  async getFacets(): Promise<Facets> {
    const c = await getCatalog();
    return { categories: c.categories, cities: c.cities, organizers: c.organizers.map((o) => ({ slug: o.slug, name: o.name })) };
  },

  async getSearchSuggestions(): Promise<SearchSuggestion[]> {
    const c = await getCatalog();
    const now = Date.parse(c.generatedAt);
    const events = c.events
      .filter((e) => isDiscoverable(e, now))
      .map((e) => toSummary(e, c))
      .sort(byStart)
      .map((e) => ({ id: e.slug, label: e.title, sub: e.cityName ?? "Online", href: `/events/${e.slug}` }));
    const organizers = c.organizers.map((o) => ({ id: `org:${o.slug}`, label: o.name, sub: "Organizer", href: `/events?organizer=${o.slug}` }));
    return [...events, ...organizers];
  },
};
