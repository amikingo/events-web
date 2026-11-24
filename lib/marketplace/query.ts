import type { CategoryId, CityId, DateFilter, EventQuery, PriceFilter, SortOption } from "../../types/marketplace";

/** Explore filters ⇄ URL search params. The URL is the single source of truth, so results are shareable and survive refresh. */

export const DEFAULT_QUERY: EventQuery = {
  q: "",
  category: "all",
  city: "all",
  date: "upcoming",
  price: "all",
  sort: "relevance",
  organizer: "all",
  page: 1,
};

const CATEGORY_IDS: CategoryId[] = ["music", "business", "tech", "arts", "food", "sports"];
const CITY_IDS: CityId[] = ["addis-ababa", "bahir-dar", "hawassa", "dire-dawa", "gondar", "adama"];
const DATES: DateFilter[] = ["upcoming", "today", "weekend", "week", "month", "past"];
const PRICES: PriceFilter[] = ["all", "free", "paid"];
const SORTS: SortOption[] = ["relevance", "upcoming", "newest"];

type RawParams = Record<string, string | string[] | undefined>;

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
const pick = <T extends string>(value: string, allowed: readonly T[], fallback: T): T => (allowed as readonly string[]).includes(value) ? (value as T) : fallback;

export function parseEventQuery(params: RawParams): EventQuery {
  const page = Number.parseInt(one(params.page), 10);
  const city = one(params.city);
  return {
    q: one(params.q).trim().slice(0, 80),
    category: pick(one(params.category), [...CATEGORY_IDS, "all"] as const, "all"),
    city: city === "online" ? "online" : pick(city, [...CITY_IDS, "all"] as const, "all"),
    date: pick(one(params.date), DATES, "upcoming"),
    price: pick(one(params.price), PRICES, "all"),
    sort: pick(one(params.sort), SORTS, "relevance"),
    organizer: one(params.organizer).trim() || "all",
    page: Number.isFinite(page) && page > 0 ? page : 1,
  };
}

/** Only the params that differ from the defaults, so URLs stay short (`/events?category=music`). */
export function queryToSearch(q: Partial<EventQuery>): string {
  const merged = { ...DEFAULT_QUERY, ...q };
  const sp = new URLSearchParams();
  if (merged.q) sp.set("q", merged.q);
  if (merged.category !== "all") sp.set("category", merged.category);
  if (merged.city !== "all") sp.set("city", merged.city);
  if (merged.date !== "upcoming") sp.set("date", merged.date);
  if (merged.price !== "all") sp.set("price", merged.price);
  if (merged.sort !== "relevance") sp.set("sort", merged.sort);
  if (merged.organizer !== "all") sp.set("organizer", merged.organizer);
  if (merged.page > 1) sp.set("page", String(merged.page));
  const s = sp.toString();
  return s ? `?${s}` : "";
}

export function exploreHref(q: Partial<EventQuery> = {}): string {
  return `/events${queryToSearch(q)}`;
}

/** How many filters differ from the defaults (search text excluded). */
export function activeFilterCount(q: EventQuery): number {
  return [q.category !== "all", q.city !== "all", q.date !== "upcoming", q.price !== "all", q.organizer !== "all"].filter(Boolean).length;
}

export const DATE_LABELS: Record<DateFilter, string> = {
  upcoming: "Any date",
  today: "Today",
  weekend: "This weekend",
  week: "Next 7 days",
  month: "Next 30 days",
  past: "Past events",
};

export const SORT_LABELS: Record<SortOption, string> = {
  relevance: "Best match",
  upcoming: "Soonest first",
  newest: "Newly announced",
};

/** Short sort names for tight spaces (the phone toolbar shows "Sort: Soonest"). */
export const SORT_SHORT_LABELS: Record<SortOption, string> = { relevance: "Best match", upcoming: "Soonest", newest: "Newest" };

export const PRICE_LABELS: Record<PriceFilter, string> = { all: "Any price", free: "Free", paid: "Paid" };
