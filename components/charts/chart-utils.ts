"use client";

import { useEffect, useRef, useState } from "react";

/** Width of an element in px, kept current as it resizes. Charts draw at real pixel size so text never scales down. */
export function useWidth<T extends HTMLElement>(): [React.RefObject<T | null>, number] {
  const ref = useRef<T | null>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    setWidth(el.clientWidth);
    const ro = new ResizeObserver(([entry]) => setWidth(Math.round(entry!.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width];
}

/** Round axis ticks: 0, then clean steps (1, 2, 2.5, 5 × 10ⁿ) up to a max that covers the data. */
export function niceTicks(max: number, count = 4): number[] {
  if (max <= 0) return [0, 1];
  const rough = max / count;
  const pow = Math.pow(10, Math.floor(Math.log10(rough)));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => s >= rough)!;
  const ticks: number[] = [];
  for (let v = 0; v < max + step; v += step) {
    ticks.push(Math.round(v * 1000) / 1000);
    if (v >= max) break;
  }
  return ticks;
}

/** 12,400 → "12.4K" on an axis that reaches it; full numbers under 10,000. */
export function compact(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${+(n / 1_000_000).toFixed(1)}M`;
  if (abs >= 10_000) return `${+(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString("en-US");
}

/** One hue, light to dark, for parts of a whole. The last step is a grey so an "Other" part reads as the remainder. */
export const PART_FILLS = [
  { bg: "var(--color-accent)", ink: "text-white" },
  { bg: "var(--color-accent-80)", ink: "text-white" },
  { bg: "var(--color-accent-50)", ink: "text-text" },
  { bg: "var(--color-accent-20)", ink: "text-text" },
  { bg: "var(--color-accent-10)", ink: "text-text" },
  { bg: "var(--color-border-strong)", ink: "text-text" },
];
