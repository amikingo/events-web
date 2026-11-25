import type { CSSProperties } from "react";
import { cn } from "../../lib/utils";
import type { CategoryId, CoverPattern } from "../../types/marketplace";

/**
 * Generated cover artwork for an event: a deterministic SVG composition per event (pattern + category palette), drawn
 * only with design tokens that stay the same in light and dark mode. It ships no image bytes, so it can never break or
 * slow a page down. When organizers upload real cover photos, render them in this same frame.
 */

type Palette = { base: string; a: string; b: string; c: string };

const v = (name: string) => `var(--color-${name})`;

const PALETTES: Record<string, Palette> = {
  music: { base: v("accent-deep"), a: v("accent-fill"), b: v("accent-light"), c: v("paper-ink") },
  business: { base: v("paper-ink"), a: v("neutral-700"), b: v("accent-fill"), c: v("neutral-300") },
  tech: { base: v("cbe"), a: v("accent-50"), b: v("accent-80"), c: v("paper-ink") },
  arts: { base: v("warning-fill"), a: v("accent-deep"), b: v("accent-20"), c: v("paper-ink") },
  food: { base: v("telebirr"), a: v("warning-fill"), b: v("accent-20"), c: v("paper-ink") },
  sports: { base: v("accent-fill"), a: v("accent-deep"), b: v("accent-light"), c: v("paper") },
};

function seeded(text: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  let s = h >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return (s >>> 0) / 4294967296;
  };
}

const f = (fill: string, opacity?: number): CSSProperties => ({ fill, opacity });
const st = (stroke: string, width: number, opacity?: number): CSSProperties => ({ fill: "none", stroke, strokeWidth: width, opacity });

const W = 400;
const H = 260;

/**
 * Rounds a coordinate to 0.1px. Server (Node) and browser engines may disagree in the last digits of `Math.sin`/`cos`, which
 * would make the SVG markup differ and break hydration; rounding makes both print the same string (and shrinks the HTML).
 */
const q = (v: number) => Math.round(v * 10) / 10;

function Pattern({ pattern, p, seed }: { pattern: CoverPattern; p: Palette; seed: string }) {
  // The generator is created here, from the seed, so rendering stays pure (React may render twice in development).
  const r = seeded(seed);
  switch (pattern) {
    case "rings": {
      const cx = q(260 + r() * 120);
      const cy = q(60 + r() * 140);
      return (
        <>
          {Array.from({ length: 9 }, (_, i) => (
            <circle key={i} cx={cx} cy={cy} r={30 + i * 34} style={st(i % 3 === 0 ? p.b : p.a, i % 2 ? 14 : 6, 0.85 - i * 0.06)} />
          ))}
          <circle cx={cx} cy={cy} r={22} style={f(p.b)} />
        </>
      );
    }
    case "grid": {
      const cells = Array.from({ length: 7 }, () => [Math.floor(r() * 10), Math.floor(r() * 7)] as const);
      return (
        <>
          {Array.from({ length: 11 }, (_, i) => (
            <line key={`v${i}`} x1={i * 40} y1={0} x2={i * 40} y2={H} style={st(p.a, 1.5, 0.45)} />
          ))}
          {Array.from({ length: 8 }, (_, i) => (
            <line key={`h${i}`} x1={0} y1={i * 40} x2={W} y2={i * 40} style={st(p.a, 1.5, 0.45)} />
          ))}
          {cells.map(([x, y], i) => (
            <rect key={i} x={x * 40} y={y * 40} width={40} height={40} style={f(i % 3 === 0 ? p.b : p.a, i % 3 === 0 ? 1 : 0.75)} />
          ))}
          <circle cx={q(300 + r() * 60)} cy={q(70 + r() * 60)} r={46} style={st(p.b, 10)} />
        </>
      );
    }
    case "arcs": {
      const ox = r() > 0.5 ? 0 : W;
      return (
        <>
          {Array.from({ length: 6 }, (_, i) => (
            <circle key={i} cx={ox} cy={H} r={280 - i * 46} style={f(i % 2 ? p.base : i % 4 === 0 ? p.a : p.b, i % 2 ? 1 : 0.9)} />
          ))}
          <circle cx={W - ox * 0.75 + (ox ? -40 : 40)} cy={70} r={28} style={f(p.b)} />
        </>
      );
    }
    case "dots": {
      const fx = 0.2 + r() * 0.6;
      return (
        <>
          {Array.from({ length: 9 }, (_, row) =>
            Array.from({ length: 14 }, (_, col) => {
              const dx = col / 13 - fx;
              const dy = row / 8 - 0.5;
              const rad = q(Math.max(1.5, 13 - Math.sqrt(dx * dx + dy * dy) * 22));
              return <circle key={`${row}-${col}`} cx={14 + col * 28.5} cy={14 + row * 29} r={rad} style={f((row + col) % 5 === 0 ? p.b : p.a, 0.9)} />;
            }),
          )}
        </>
      );
    }
    case "waves": {
      const phase = r() * Math.PI * 2;
      const wave = (y: number, amp: number, k: number) => {
        let d = `M0 ${H}L0 ${y}`;
        for (let x = 0; x <= W; x += 20) d += `L${x} ${q(y + Math.sin(x / 60 + phase + k) * amp)}`;
        return `${d}L${W} ${H}Z`;
      };
      return (
        <>
          <circle cx={q(90 + r() * 220)} cy={70} r={38} style={f(p.b)} />
          <path d={wave(120, 18, 0)} style={f(p.a, 0.7)} />
          <path d={wave(160, 22, 1.4)} style={f(p.b, 0.55)} />
          <path d={wave(200, 16, 2.6)} style={f(p.c, 0.6)} />
        </>
      );
    }
    case "stripes": {
      const angle = r() > 0.5 ? -24 : 24;
      return (
        <g transform={`rotate(${angle} ${W / 2} ${H / 2})`}>
          {Array.from({ length: 14 }, (_, i) => (
            <rect key={i} x={-200 + i * 58} y={-200} width={i % 3 === 0 ? 30 : 14} height={H + 400} style={f(i % 3 === 0 ? p.b : p.a, i % 3 === 0 ? 0.95 : 0.6)} />
          ))}
        </g>
      );
    }
    case "burst": {
      const cx = q(80 + r() * 240);
      const cy = q(200 + r() * 40);
      return (
        <>
          {Array.from({ length: 18 }, (_, i) => {
            const a1 = (i / 18) * Math.PI * 2;
            const a2 = a1 + Math.PI / 18;
            const R = 520;
            return <path key={i} d={`M${cx} ${cy}L${q(cx + Math.cos(a1) * R)} ${q(cy + Math.sin(a1) * R)}L${q(cx + Math.cos(a2) * R)} ${q(cy + Math.sin(a2) * R)}Z`} style={f(i % 2 ? p.a : p.b, i % 2 ? 0.8 : 0.35)} />;
          })}
          <circle cx={cx} cy={cy} r={44} style={f(p.c)} />
          <circle cx={cx} cy={cy} r={20} style={f(p.b)} />
        </>
      );
    }
    case "blocks":
    default: {
      const x = 40 + Math.floor(r() * 4) * 40;
      return (
        <>
          <rect x={x} y={40} width={140} height={180} style={f(p.a)} />
          <circle cx={x + 140} cy={130} r={90} style={f(p.b, 0.9)} />
          <rect x={x + 160} y={150} width={120} height={70} style={f(p.c, 0.85)} />
          <path d={`M${x - 40} 220 a60 60 0 0 1 120 0z`} style={f(p.b)} />
          <rect x={W - 70} y={24} width={36} height={36} style={f(p.a, 0.8)} />
        </>
      );
    }
  }
}

/** The palette of a known category, or one picked by a stable hash of the id (categories are free text now). */
const PALETTE_NAMES = Object.keys(PALETTES);
function paletteFor(category: CategoryId): Palette {
  const known = PALETTES[category];
  if (known) return known;
  let h = 0;
  for (let i = 0; i < category.length; i++) h = (h * 31 + category.charCodeAt(i)) >>> 0;
  return PALETTES[PALETTE_NAMES[h % PALETTE_NAMES.length]!]!;
}

export interface EventCoverProps {
  seed: string;
  pattern: CoverPattern;
  category: CategoryId;
  /** The organizer's uploaded picture. When given it is shown instead of the generated artwork. */
  src?: string;
  className?: string;
  /** Muted (greyscale) — for past or cancelled events. */
  muted?: boolean;
}

export function EventCover({ seed, pattern, category, src, className, muted = false }: EventCoverProps) {
  if (src) {
    // A plain <img>: the file is served by the API, so next/image's optimizer can't reach it. Decorative: the title sits next to it.
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt="" loading="lazy" className={cn("block size-full object-cover", muted && "grayscale-[0.85]", className)} />;
  }
  const p = paletteFor(category);
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      focusable="false"
      className={cn("block size-full", muted && "grayscale-[0.85]", className)}
    >
      <rect width={W} height={H} style={f(p.base)} />
      <Pattern pattern={pattern} p={p} seed={seed} />
    </svg>
  );
}
