/**
 * Gregorian <-> Ethiopian calendar conversion, ported from the guideline's own date-picker script
 * (verified there against a 73,414-day round trip, weekdays and leap years). Everything goes through the
 * Julian Day Number, so the two calendars always describe the same underlying day.
 */

const JD_EPOCH_ETHIOPIC = 1723856;
const emod = (a: number, b: number) => ((a % b) + b) % b;

export interface YMD {
  year: number;
  month: number;
  day: number;
}

export function gregorianToJDN(year: number, month: number, day: number): number {
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  return day + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;
}

export function jdnToGregorian(jdn: number): YMD {
  const a = jdn + 32044;
  const b = Math.floor((4 * a + 3) / 146097);
  const c = a - Math.floor((146097 * b) / 4);
  const d = Math.floor((4 * c + 3) / 1461);
  const e = c - Math.floor((1461 * d) / 4);
  const m = Math.floor((5 * e + 2) / 153);
  return {
    day: e - Math.floor((153 * m + 2) / 5) + 1,
    month: m + 3 - 12 * Math.floor(m / 10),
    year: 100 * b + d - 4800 + Math.floor(m / 10),
  };
}

export function jdnToEthiopian(jdn: number): YMD {
  const r = emod(jdn - JD_EPOCH_ETHIOPIC, 1461);
  const n = emod(r, 365) + 365 * Math.floor(r / 1460);
  return {
    year: 4 * Math.floor((jdn - JD_EPOCH_ETHIOPIC) / 1461) + Math.floor(r / 365) - Math.floor(r / 1460),
    month: Math.floor(n / 30) + 1,
    day: emod(n, 30) + 1,
  };
}

export function ethiopianToJDN(year: number, month: number, day: number): number {
  let lo = JD_EPOCH_ETHIOPIC + (year - 10) * 366;
  let hi = JD_EPOCH_ETHIOPIC + (year + 2) * 366;
  const targetKey = year * 1000 + month * 40 + day;
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    const e = jdnToEthiopian(mid);
    if (e.year * 1000 + e.month * 40 + e.day < targetKey) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

/** Sunday = 0 … Saturday = 6. */
export function weekdayOfJDN(jdn: number): number {
  return emod(jdn + 1, 7);
}

/** Months 1–12 have 30 days; Pagume (13) has 5, or 6 in a leap year. */
export function ethMonthLength(ecYear: number, ecMonth: number): number {
  return ecMonth <= 12 ? 30 : emod(ecYear, 4) === 3 ? 6 : 5;
}

export const ETH_MONTHS = ["Meskerem", "Tikimt", "Hidar", "Tahsas", "Tir", "Yekatit", "Megabit", "Miazia", "Ginbot", "Sene", "Hamle", "Nehase", "Pagume"] as const;
export const GREG_MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"] as const;

export type CalendarSystem = "gc" | "ec";

/** "Nov 10, 2026" (Gregorian) or "Hidar 1, 2019" (Ethiopian) for a JDN. */
export function formatJDN(jdn: number, cal: CalendarSystem): string {
  if (cal === "ec") {
    const e = jdnToEthiopian(jdn);
    return `${ETH_MONTHS[e.month - 1]} ${e.day}, ${e.year}`;
  }
  const g = jdnToGregorian(jdn);
  return `${GREG_MONTHS[g.month - 1]!.slice(0, 3)} ${g.day}, ${g.year}`;
}

/** ISO `YYYY-MM-DD` <-> JDN, for passing dates in and out of components. */
export function isoToJDN(iso: string): number {
  const [y = 0, m = 1, d = 1] = iso.split("-").map(Number);
  return gregorianToJDN(y, m, d);
}
export function jdnToIso(jdn: number): string {
  const g = jdnToGregorian(jdn);
  return `${g.year}-${String(g.month).padStart(2, "0")}-${String(g.day).padStart(2, "0")}`;
}
