"use client";

import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { cn } from "../../../lib/utils";

/**
 * Fades and lifts its content in the first time it scrolls into view. Landing page only.
 *
 * Content is fully visible in the server HTML and for anything already on screen: only blocks that start below the
 * fold are hidden (after hydration) and then revealed, so without JavaScript or with reduced motion nothing is lost.
 * `delay` (ms) staggers siblings. The styles are in app/globals.css (`[data-reveal]`).
 */
export function Reveal({ children, delay = 0, className }: { children: ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (el.getBoundingClientRect().top < window.innerHeight * 0.92) return; // already on screen: leave it be

    el.dataset.reveal = "hidden";
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        el.dataset.reveal = "shown";
        io.disconnect();
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className={cn(className)} style={delay ? { transitionDelay: `${delay}ms` } : undefined}>
      {children}
    </div>
  );
}
