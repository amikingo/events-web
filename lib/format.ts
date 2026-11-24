/**
 * The guideline's Date & time formats, once: 12-hour time everywhere, Gregorian dates by default, the country code
 * always visible on phone numbers, thousands separators and no decimals on consumer-facing money.
 */

/** `14:30` → `2:30 PM`. Accepts "HH:mm" or a Date. */
export function formatTime(value: string | Date): string {
  const [h, m] = typeof value === "string" ? value.split(":").map(Number) : [value.getHours(), value.getMinutes()];
  const hour = h! % 12 === 0 ? 12 : h! % 12;
  return `${hour}:${String(m ?? 0).padStart(2, "0")} ${h! >= 12 ? "PM" : "AM"}`;
}

/** `2550` → `2,550 ETB`. Whole birr by default; pass `decimals` for ledgers that need cents. */
export function formatCurrency(amount: number, { decimals = 0, unit = "ETB" }: { decimals?: number; unit?: string | false } = {}): string {
  const n = amount.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  return unit === false ? n : `${n} ${unit}`;
}

/** Gregorian `Nov 3, 2026`. The Ethiopian calendar is a toggle in the date picker, never a replacement here. */
export function formatDate(value: Date | string, { year = true }: { year?: boolean } = {}): string {
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", ...(year ? { year: "numeric" } : {}) });
}

/** `12500` → `12,500`. Counts and quantities; money goes through `formatCurrency`. */
export function formatNumber(value: number, { decimals = 0 }: { decimals?: number } = {}): string {
  return value.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

/** `12.4` → `12.4%`. One decimal by default, as the KPI cards show it. */
export function formatPercent(value: number, { decimals = 1 }: { decimals?: number } = {}): string {
  return `${value.toFixed(decimals)}%`;
}

/** `1843000` → `1.8 MB`, as the upload rows show it. */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${Math.max(0, Math.round(bytes))} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let n = bytes / 1024;
  let i = 0;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i++;
  }
  return `${n < 10 ? n.toFixed(1) : Math.round(n)} ${units[i]}`;
}

/** "Just now", "2 min ago", "1 hr ago", "Yesterday", then the date — the wording of the guideline's list and transaction cards. */
export function formatRelativeTime(value: Date | string, now: Date = new Date()): string {
  const d = typeof value === "string" ? new Date(value) : value;
  const sec = Math.round((now.getTime() - d.getTime()) / 1000);
  if (sec < 60) return "Just now";
  const min = Math.round(sec / 60);
  if (min < 60) return `${min} min ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr} hr ago`;
  const day = Math.round(hr / 24);
  if (day === 1) return "Yesterday";
  if (day < 7) return `${day} days ago`;
  return formatDate(d, { year: d.getFullYear() !== now.getFullYear() });
}

/** Hides the middle digits of a phone number: `+251 911 204 412` → `+251 9•• ••• 412`. */
export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  const national = digits.startsWith("251") ? digits.slice(3) : digits.replace(/^0/, "");
  return `+251 ${national[0] ?? "9"}•• ••• ${national.slice(-3)}`;
}
