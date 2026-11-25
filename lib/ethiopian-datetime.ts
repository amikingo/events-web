import { ETH_MONTHS, gregorianToJDN, jdnToEthiopian } from "./calendar";

/**
 * How dates and times are shown (product rule): the Ethiopian date and Ethiopian-clock time first, then the
 * Gregorian date with a 12-hour time; never a 24-hour time. Always in the event's own timezone, so every visitor
 * reads the clock at the venue. The same wording as the API's confirmation SMS (events-api
 * src/utils/confirmation-message.ts).
 *
 *   full:  "Megabit 3, 2019 at 3:00 in the morning (Mar 12, 2027, 9:00 AM)"   event page, confirmation, staff record
 *   short: "Megabit 3, 2019 · Mar 12, 9:00 AM"                                cards and lists
 */

type LocalMoment = { year: number; month: number; day: number; hour: number; minute: number };

const GREG_MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;
const DEFAULT_TIME_ZONE = "Africa/Addis_Ababa";

const partsCache = new Map<string, Intl.DateTimeFormat>();
function partsFormat(timeZone: string): Intl.DateTimeFormat {
  let format = partsCache.get(timeZone);
  if (!format) {
    format = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      hourCycle: "h23",
    });
    partsCache.set(timeZone, format);
  }
  return format;
}

/** The wall-clock date and time of an instant in a timezone (24-hour internally; never shown that way). */
export function localMoment(iso: string, timeZone: string = DEFAULT_TIME_ZONE): LocalMoment {
  const parts = partsFormat(timeZone).formatToParts(new Date(iso));
  const value = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value ?? 0);
  return { year: value("year"), month: value("month"), day: value("day"), hour: value("hour") % 24, minute: value("minute") };
}

/** "Megabit 3, 2019" for a local Gregorian date. */
export function ethiopianDateText(local: Pick<LocalMoment, "year" | "month" | "day">): string {
  const ethiopian = jdnToEthiopian(gregorianToJDN(local.year, local.month, local.day));
  return `${ETH_MONTHS[ethiopian.month - 1] ?? ""} ${ethiopian.day}, ${ethiopian.year}`;
}

/** The Ethiopian clock counts from 6 AM and 6 PM: 9:00 AM is "3:00 in the morning", 7:30 PM "1:30 in the evening". */
export function ethiopianClockText(hour: number, minute: number): string {
  const shifted = (hour + 6) % 12 === 0 ? 12 : (hour + 6) % 12;
  const part = hour >= 6 && hour < 12 ? "in the morning" : hour >= 12 && hour < 18 ? "in the afternoon" : hour >= 18 ? "in the evening" : "at night";
  return `${shifted}:${String(minute).padStart(2, "0")} ${part}`;
}

function time12(local: LocalMoment): string {
  const hour = local.hour % 12 === 0 ? 12 : local.hour % 12;
  return `${hour}:${String(local.minute).padStart(2, "0")} ${local.hour < 12 ? "AM" : "PM"}`;
}

function gregorianDate(local: LocalMoment, { year = true }: { year?: boolean } = {}): string {
  return `${GREG_MONTHS_SHORT[local.month - 1] ?? ""} ${local.day}${year ? `, ${local.year}` : ""}`;
}

const sameDay = (a: LocalMoment, b: LocalMoment) => a.year === b.year && a.month === b.month && a.day === b.day;

/** "Megabit 3, 2019 at 3:00 in the morning (Mar 12, 2027, 9:00 AM)". */
export function formatMomentFull(iso: string, timeZone?: string): string {
  const local = localMoment(iso, timeZone);
  return `${ethiopianDateText(local)} at ${ethiopianClockText(local.hour, local.minute)} (${gregorianDate(local)}, ${time12(local)})`;
}

/** "Megabit 3, 2019 · Mar 12, 9:00 AM". */
export function formatMomentShort(iso: string, timeZone?: string): string {
  const local = localMoment(iso, timeZone);
  return `${ethiopianDateText(local)} · ${gregorianDate(local, { year: false })}, ${time12(local)}`;
}

/** "Megabit 3, 2019 · Mar 12, 2027": a date with no time. */
export function formatDateShort(iso: string, timeZone?: string): string {
  const local = localMoment(iso, timeZone);
  return `${ethiopianDateText(local)} · ${gregorianDate(local)}`;
}

/**
 * The full "when" of an event, start to end:
 * same day   → "Megabit 3, 2019, 3:00 in the morning to 11:00 in the afternoon (Mar 12, 2027, 9:00 AM to 5:00 PM)"
 * other days → "Megabit 3, 2019 at 3:00 in the morning to Megabit 4, 2019 at 11:00 in the afternoon (Mar 12, 2027, 9:00 AM to Mar 13, 2027, 5:00 PM)"
 */
export function formatRangeFull(startIso: string, endIso: string, timeZone?: string): string {
  const start = localMoment(startIso, timeZone);
  const end = localMoment(endIso, timeZone);
  if (sameDay(start, end)) {
    return `${ethiopianDateText(start)}, ${ethiopianClockText(start.hour, start.minute)} to ${ethiopianClockText(end.hour, end.minute)} (${gregorianDate(start)}, ${time12(start)} to ${time12(end)})`;
  }
  return `${ethiopianDateText(start)} at ${ethiopianClockText(start.hour, start.minute)} to ${ethiopianDateText(end)} at ${ethiopianClockText(end.hour, end.minute)} (${gregorianDate(start)}, ${time12(start)} to ${gregorianDate(end)}, ${time12(end)})`;
}
