import { formatTime } from "../format";
import { MARKETPLACE } from "./config";

/**
 * Event dates live in Addis Ababa time (UTC+3, no daylight saving). Everything here formats in that zone explicitly, so
 * the server and every visitor's browser print the same date, wherever they are.
 */

const OFFSET_MS = 3 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** `YYYY-MM-DD` of the given moment in Addis Ababa. */
export function addisDateKey(ms: number): string {
  return new Date(ms + OFFSET_MS).toISOString().slice(0, 10);
}

/** `YYYY-MM-DD` shifted by whole days. */
export function addDays(key: string, days: number): string {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y!, m! - 1, d!) + days * DAY_MS).toISOString().slice(0, 10);
}

/** `2026-11-27` + `19:30` → `2026-11-27T19:30:00+03:00`. */
export function toAddisIso(key: string, time: string): string {
  return `${key}T${time}:00${MARKETPLACE.utcOffset}`;
}

/** Local Addis Ababa parts of an ISO moment. */
export function addisParts(iso: string): { key: string; hh: string; mm: string; weekday: number } {
  const shifted = new Date(Date.parse(iso) + OFFSET_MS);
  return {
    key: shifted.toISOString().slice(0, 10),
    hh: String(shifted.getUTCHours()).padStart(2, "0"),
    mm: String(shifted.getUTCMinutes()).padStart(2, "0"),
    weekday: shifted.getUTCDay(),
  };
}

const fmtCache = new Map<string, Intl.DateTimeFormat>();
function fmt(opts: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const k = JSON.stringify(opts);
  let f = fmtCache.get(k);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", { timeZone: MARKETPLACE.timeZone, ...opts });
    fmtCache.set(k, f);
  }
  return f;
}

/** `Nov 27, 2026`, or `Fri, Nov 27` with `weekday` and without `year`. Same wording as `formatDate` in lib/format. */
export function formatEventDate(iso: string, { weekday = false, year = true }: { weekday?: boolean; year?: boolean } = {}): string {
  return fmt({ month: "short", day: "numeric", ...(year ? { year: "numeric" } : {}), ...(weekday ? { weekday: "short" } : {}) }).format(new Date(iso));
}

/** `Friday, November 27, 2026` — for the event page header. */
export function formatEventDateLong(iso: string): string {
  return fmt({ weekday: "long", month: "long", day: "numeric", year: "numeric" }).format(new Date(iso));
}

/** 12-hour local time (`7:30 PM`), via `formatTime` from lib/format. */
export function formatEventTime(iso: string): string {
  const { hh, mm } = addisParts(iso);
  return formatTime(`${hh}:${mm}`);
}

/**
 * The one-line "when" of an event:
 * same day → `Fri, Nov 27 · 7:30 PM – 11:30 PM`; several days → `Fri, Dec 11 – Sat, Dec 12`.
 */
export function formatEventWhen(startIso: string, endIso: string): string {
  const s = addisParts(startIso);
  const e = addisParts(endIso);
  const sameDay = s.key === e.key || (Date.parse(endIso) - Date.parse(startIso) < 12 * 60 * 60 * 1000 && Number(e.hh) < 6);
  if (sameDay) return `${formatEventDate(startIso, { weekday: true, year: false })} · ${formatEventTime(startIso)} – ${formatEventTime(endIso)}`;
  return `${formatEventDate(startIso, { weekday: true, year: false })} – ${formatEventDate(endIso, { weekday: true, year: false })}`;
}

/** The calendar chip on cards: `{ weekday: "FRI", day: "27", month: "NOV" }`. */
export function dateChip(iso: string): { weekday: string; day: string; month: string } {
  const d = new Date(iso);
  return {
    weekday: fmt({ weekday: "short" }).format(d).toUpperCase(),
    day: fmt({ day: "numeric" }).format(d),
    month: fmt({ month: "short" }).format(d).toUpperCase(),
  };
}

/** `09:41` countdown text from milliseconds left. */
export function formatCountdown(msLeft: number): string {
  const total = Math.max(0, Math.floor(msLeft / 1000));
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

/** "Today", "Tomorrow", "In 5 days", or `Nov 27` — relative to `now`, by Addis Ababa calendar day. */
export function formatDaysAway(iso: string, now: number): string {
  const days = Math.round((Date.parse(`${addisParts(iso).key}T00:00:00Z`) - Date.parse(`${addisDateKey(now)}T00:00:00Z`)) / DAY_MS);
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days > 1 && days < 7) return `In ${days} days`;
  if (days === -1) return "Yesterday";
  return formatEventDate(iso, { year: false });
}

export { DAY_MS };
