/**
 * A deterministic QR-style matrix for ticket placeholders: real finder and timing patterns, data modules derived from a
 * hash of the ticket id. It is NOT a scannable QR code — the backend will issue signed codes. Same id → same picture,
 * on the server and in the browser.
 */

const SIZE = 25;

function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function rng(seed: number): () => number {
  let s = seed || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return (s >>> 0) / 4294967296;
  };
}

function inFinder(r: number, c: number): boolean {
  const near = (a: number) => a < 8 || a > SIZE - 9;
  return near(r) && near(c) && !(r > SIZE - 9 && c > SIZE - 9);
}

function finderModule(r: number, c: number): boolean {
  const origins: [number, number][] = [[0, 0], [0, SIZE - 7], [SIZE - 7, 0]];
  for (const [or, oc] of origins) {
    const y = r - or;
    const x = c - oc;
    if (y >= -1 && y <= 7 && x >= -1 && x <= 7) {
      if (y < 0 || y > 6 || x < 0 || x > 6) return false;
      return y === 0 || y === 6 || x === 0 || x === 6 || (y >= 2 && y <= 4 && x >= 2 && x <= 4);
    }
  }
  return false;
}

export function qrMatrix(text: string): boolean[][] {
  const next = rng(hash(text));
  return Array.from({ length: SIZE }, (_, r) =>
    Array.from({ length: SIZE }, (_, c) => {
      if (inFinder(r, c)) return finderModule(r, c);
      if (r === 6) return c % 2 === 0;
      if (c === 6) return r % 2 === 0;
      if (r >= SIZE - 9 && r <= SIZE - 5 && c >= SIZE - 9 && c <= SIZE - 5) {
        const y = r - (SIZE - 9);
        const x = c - (SIZE - 9);
        return y === 0 || y === 4 || x === 0 || x === 4 || (y === 2 && x === 2);
      }
      return next() > 0.52;
    }),
  );
}

/** One SVG path for all dark modules (fast to render, small to serialise). */
export function qrPath(text: string): { d: string; size: number } {
  const m = qrMatrix(text);
  let d = "";
  m.forEach((row, r) => row.forEach((on, c) => (on ? (d += `M${c} ${r}h1v1h-1z`) : null)));
  return { d, size: SIZE };
}
