/**
 * Event times belong to the event's own timezone (an IANA name such as `Africa/Addis_Ababa`), not the viewer's.
 * The API stores and returns instants in UTC; staff type wall-clock times in the event's zone. These helpers convert
 * between the two with the built-in `Intl`, so they handle any zone, daylight saving included.
 */

/** Minutes the zone is ahead of UTC at that instant (Addis Ababa: 180). */
function offsetMinutes(utcMs: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(utcMs));
  const get = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return Math.round((asUtc - utcMs) / 60_000);
}

/** `2027-03-12T09:00` typed in `Africa/Addis_Ababa` → `2027-03-12T06:00:00.000Z`. Empty in, null out. */
export function zonedLocalToIso(local: string, timeZone: string): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(local);
  if (!match) return null;
  const [, y, mo, d, h, mi] = match.map(Number) as [number, number, number, number, number, number];
  const wall = Date.UTC(y, mo - 1, d, h, mi);
  // The offset depends on the instant, which depends on the offset: two passes settle it, also across a DST change.
  let utc = wall - offsetMinutes(wall, timeZone) * 60_000;
  utc = wall - offsetMinutes(utc, timeZone) * 60_000;
  return new Date(utc).toISOString();
}

/** `2027-03-12T06:00:00Z` → `2027-03-12T09:00` in `Africa/Addis_Ababa`: the shape `DateTimePicker` works with. */
export function isoToZonedLocal(iso: string | null, timeZone: string): string {
  if (!iso) return "";
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return "";
  return new Date(ms + offsetMinutes(ms, timeZone) * 60_000).toISOString().slice(0, 16);
}

/** `Mar 12, 2027, 9:00 AM` in the event's zone (12-hour, as everywhere in the product). */
export function formatInZone(iso: string | null, timeZone: string, { time = true }: { time?: boolean } = {}): string {
  if (!iso) return "Not set";
  return new Date(iso).toLocaleString("en-US", {
    timeZone,
    month: "short",
    day: "numeric",
    year: "numeric",
    ...(time ? { hour: "numeric", minute: "2-digit", hour12: true } : {}),
  });
}
