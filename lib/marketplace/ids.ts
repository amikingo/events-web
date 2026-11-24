/** Readable random references for mock orders and tickets. Call from event handlers only (never during render). */

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O, 1/I

function randomChars(n: number): string {
  const bytes = new Uint8Array(n);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
}

/** `CE-7K3Q9P` */
export function newOrderRef(): string {
  return `CE-${randomChars(6)}`;
}

/** `TKT-4MZ8-Q2HD` */
export function newTicketId(): string {
  const s = randomChars(8);
  return `TKT-${s.slice(0, 4)}-${s.slice(4)}`;
}

/** `HLD-8XPA2K` */
export function newHoldId(): string {
  return `HLD-${randomChars(6)}`;
}

/** Payment provider reference, `TB-…` / `CBE-…` / `WL-…`. */
export function newPaymentRef(method: "telebirr" | "cbe" | "wallet"): string {
  return `${method === "telebirr" ? "TB" : method === "cbe" ? "CBE" : "WL"}-${randomChars(8)}`;
}
