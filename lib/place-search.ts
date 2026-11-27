/**
 * Finding a place by name, with OpenStreetMap's public search (Nominatim). Not events-api: this calls a third party,
 * under its usage policy (https://operations.osmfoundation.org/policies/nominatim/):
 *
 * - only when the person asks (never while they type: autocomplete is forbidden);
 * - at most one request a second, and the whole site shares that allowance, so it suits staff adding venues, not
 *   visitors; heavier use needs our own proxy with a cache, or another provider;
 * - answers are cached, the browser sends the site's address as the referrer, and OpenStreetMap is credited;
 * - nothing personal is sent: only the text searched for, never a token or cookie.
 *
 * `NEXT_PUBLIC_PLACE_SEARCH_URL` points it elsewhere; set it to an empty value to switch search off.
 */
import { parsePin } from "@/lib/map-pin";
import type { VenuePin } from "@/lib/api/venue-locations";

const ENDPOINT = process.env.NEXT_PUBLIC_PLACE_SEARCH_URL ?? "https://nominatim.openstreetmap.org/search";
export const placeSearchEnabled = ENDPOINT !== "";
/** A little over a second between requests. */
const GAP_MS = 1100;

export interface Place {
  id: string;
  name: string;
  /** The rest of its address. */
  detail: string;
  pin: VenuePin;
}

const cache = new Map<string, Place[]>();
let freeAt = 0;

function toPlace(item: unknown): Place | null {
  const raw = item as { place_id?: number; name?: string; display_name?: string; lat?: string; lon?: string };
  const pin = parsePin(`${raw.lat}, ${raw.lon}`);
  if (!pin || !raw.display_name) return null;
  const [first = raw.display_name, ...rest] = raw.display_name.split(", ");
  return { id: String(raw.place_id ?? raw.display_name), name: raw.name || first, detail: rest.join(", "), pin };
}

/** Up to five places in the country (a two-letter code), best match first. */
export async function searchPlaces(query: string, country: string, signal?: AbortSignal): Promise<Place[]> {
  const code = country.trim().toLowerCase() || "et";
  const text = query.trim();
  const key = `${code}|${text.toLowerCase()}`;
  const known = cache.get(key);
  if (known) return known;

  const wait = Math.max(0, freeAt - Date.now());
  freeAt = Date.now() + wait + GAP_MS;
  if (wait) await new Promise((resolve) => setTimeout(resolve, wait));

  const params = new URLSearchParams({ q: text, format: "jsonv2", limit: "5", countrycodes: code, "accept-language": "en" });
  const response = await fetch(`${ENDPOINT}?${params}`, { signal, credentials: "omit", referrerPolicy: "strict-origin-when-cross-origin" });
  if (!response.ok) throw new Error(`Place search answered ${response.status}`);
  const found = ((await response.json()) as unknown[]).map(toPlace).filter((p): p is Place => p !== null);
  cache.set(key, found);
  return found;
}
