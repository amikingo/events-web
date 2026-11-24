"use client";

import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { cn } from "../../../lib/utils";
import { Container } from "../section";

/** From this width up the section pins and scrolls sideways; below it (and with reduced motion) it is a plain swipe row. */
const PIN_QUERY = "(min-width: 1024px) and (prefers-reduced-motion: no-preference)";

/**
 * A sideways scroll that pins the page. On a desktop the section is made tall, the stage stays on screen, and scrolling
 * down slides the row of cards from right to left; each card tilts and drops a little as it crosses the screen, level in
 * the middle. On phones, tablets and with reduced motion there is no pinning: the cards are a swipe row.
 *
 * One scroll listener moves the row and tilts the cards, writing CSS variables; cards are server-rendered `children`
 * (each should be an `<li>`).
 */
export function PinnedTrack({ header, children, className }: { header: ReactNode; children: ReactNode; className?: string }) {
  const section = useRef<HTMLElement>(null);
  const track = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const el = section.current;
    const row = track.current;
    if (!el || !row) return;
    const query = window.matchMedia(PIN_QUERY);
    const cards = Array.from(row.children) as HTMLElement[];
    let distance = 0;
    let frame = 0;

    const measure = () => {
      if (!query.matches) {
        el.style.height = "";
        el.style.setProperty("--p", "0");
        cards.forEach((c) => c.style.removeProperty("--t"));
        return;
      }
      // The row is as far from the left edge as it is wide, minus one screen: that is how far it has to travel.
      distance = Math.max(0, row.scrollWidth - window.innerWidth + parseFloat(getComputedStyle(row).paddingLeft) + 24);
      el.style.height = `${distance + window.innerHeight}px`;
      el.style.setProperty("--dist", `${distance}px`);
    };

    const update = () => {
      frame = 0;
      if (!query.matches) return;
      const rect = el.getBoundingClientRect();
      const range = rect.height - window.innerHeight;
      const p = range > 0 ? Math.min(1, Math.max(0, -rect.top / range)) : 0;
      el.style.setProperty("--p", p.toFixed(4));
      // Tilt each card by where it is on screen: -1 at the left edge, 0 in the middle, 1 at the right edge.
      const half = window.innerWidth / 2;
      for (const c of cards) {
        const r = c.getBoundingClientRect();
        const t = Math.max(-1, Math.min(1, (r.left + r.width / 2 - half) / half));
        c.style.setProperty("--t", t.toFixed(3));
      }
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    const relayout = () => {
      measure();
      schedule();
    };

    relayout();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", relayout);
    query.addEventListener("change", relayout);
    // Fonts and images can change the row's width after first paint.
    const observer = new ResizeObserver(relayout);
    observer.observe(row);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", relayout);
      query.removeEventListener("change", relayout);
      observer.disconnect();
    };
  }, []);

  return (
    <section ref={section} aria-labelledby="trending" className={cn("relative", className)} style={{ "--p": 0, "--dist": "0px" } as React.CSSProperties}>
      <div className="lg:motion-safe:sticky lg:motion-safe:top-0 lg:motion-safe:flex lg:motion-safe:h-svh lg:motion-safe:flex-col lg:motion-safe:justify-center lg:motion-safe:overflow-hidden py-14 sm:py-20 lg:motion-safe:py-0">
        <Container className="w-full">{header}</Container>
        <ul
          ref={track}
          className="m-0 flex list-none snap-x snap-mandatory gap-5 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:px-6 lg:motion-safe:snap-none lg:motion-safe:overflow-visible lg:motion-safe:pb-0 lg:motion-safe:pl-[max(1.5rem,calc((100vw-1400px)/2+1.5rem))] [&::-webkit-scrollbar]:hidden"
          style={{ translate: "calc(var(--p) * var(--dist) * -1) 0" }}
        >
          {children}
        </ul>
      </div>
    </section>
  );
}

/** One card in the row: fixed width, and (when pinned) turning up to 7° and dipping up to 22px with its place on screen (`--t`). */
export function PinnedTrackItem({ children }: { children: ReactNode }) {
  return (
    <li className="w-[78%] flex-none snap-start sm:w-[340px] xl:w-[380px] lg:motion-safe:[rotate:calc(var(--t,0)*7deg)] lg:motion-safe:[translate:0_calc(var(--t,0)*var(--t,0)*22px)]">
      {children}
    </li>
  );
}
