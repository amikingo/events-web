"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { formatEventDate } from "../../../lib/marketplace/datetime";
import { cn } from "../../../lib/utils";
import type { EventSummary } from "../../../types/marketplace";
import { Button } from "../../ui/button";
import { ChevIcon } from "../../ui/icons";
import { EventCover } from "../event-cover";
import { landingType } from "./landing-type";

/**
 * Tile layout, as offsets from the middle of the screen (x, w in vw; y, h in vh), how far each tile grows by the end of
 * the fly-through (`zoom`) and a slight turn (`tilt`, degrees). The tile that is at the middle ignores `zoom` and
 * grows until it fills the screen; the others fly past the screen edges.
 */
const TILES = [
  { x: -30, y: -30, w: 24, h: 22, zoom: 5, tilt: -5 },
  { x: 6, y: -33, w: 20, h: 20, zoom: 6, tilt: 3 },
  { x: 34, y: -24, w: 22, h: 26, zoom: 4, tilt: 6 },
  { x: -36, y: 8, w: 20, h: 24, zoom: 8, tilt: -4 },
  { x: 36, y: 14, w: 20, h: 22, zoom: 6, tilt: 4 },
  { x: -22, y: 33, w: 22, h: 20, zoom: 9, tilt: 5 },
  { x: 14, y: 34, w: 24, h: 18, zoom: 5, tilt: -6 },
] as const;

/** The order the tiles take the middle in: once round the wall, clockwise from the top left, then back to the first. */
const TURN_ORDER = [0, 1, 2, 4, 6, 5, 3] as const;
/** How long each tile stays at the middle before the next one takes its place (ms). */
const TURN_MS = 2200;
/** How much bigger a tile is while it sits at the middle. */
const CENTRE_SCALE = 1.4;
/**
 * How far the tile at the middle grows by the end of the fly-through. It has to cover any screen shape (the narrowest
 * tile needs about 4×) without overshooting, or only a corner of the cover is left on screen. No `will-change: transform`
 * on the scaled layers: it makes the browser stretch a small bitmap, which blurs the cover.
 */
const FILL_ZOOM = 4.5;

/** The story's timeline, as shares of the scroll (0 → 1). The fly-through takes the first part, then one chapter per event. */
const FLY_END = 0.36;
/** Where each chapter's text is at its fullest. Chapters fade through each other around these points. */
const CHAPTER_AT = [0.47, 0.71, 0.95] as const;
/** How far either side of its point a chapter's text stays on screen (fade in and out included). */
const CHAPTER_SPAN = 0.14;

/** A chapter's visibility (0–1) as CSS: a plateau around its point with short fades either side. */
const chapterOpacity = (at: number) => `clamp(0, calc((${CHAPTER_SPAN} - abs(var(--p) - ${at})) * 12), 1)`;

/**
 * "Take the centre, then fly through" scroll story. No headline: the wall of event covers takes turns coming to the
 * middle of the screen, one by one and round again. Scrolling stops the turns, and the cover that is at the middle
 * is the one that grows until it fills the screen while the others fly past. Scrolling on moves through that event and
 * the next two in turn order, each a full-screen cover with its details and a progress bar along the bottom.
 *
 * One scroll listener writes the progress to CSS variables (`--p` overall, `--f` for the fly-through) and one timer
 * moves the turn along while the section is on screen and still at the top; the scaling, fading and moving are CSS.
 * With reduced motion nothing moves or pins: the wall stays still, with a link to all events.
 */
export function ScrollZoomGallery({ events }: { events: EventSummary[] }) {
  const ref = useRef<HTMLElement>(null);
  const frozen = useRef(false);
  /** Position in TURN_ORDER of the tile that is at the middle. */
  const [turn, setTurn] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const chapters = Array.from(el.querySelectorAll<HTMLElement>("[data-chapter]"));
    let frame = 0;

    const update = () => {
      frame = 0;
      if (reduced.matches) {
        el.style.setProperty("--p", "0");
        el.style.setProperty("--f", "0");
        frozen.current = false;
        return;
      }
      const rect = el.getBoundingClientRect();
      const range = rect.height - window.innerHeight;
      const p = range > 0 ? Math.min(1, Math.max(0, -rect.top / range)) : 0;
      el.style.setProperty("--p", p.toFixed(4));
      el.style.setProperty("--f", Math.min(1, p / FLY_END).toFixed(4));
      // Once scrolling starts, the turns stop so the tile at the middle is the one that grows.
      frozen.current = p > 0.004;
      // Only the chapter on screen can be reached by keyboard or read by a screen reader.
      const active = p < FLY_END ? -1 : p < (CHAPTER_AT[0] + CHAPTER_AT[1]) / 2 ? 0 : p < (CHAPTER_AT[1] + CHAPTER_AT[2]) / 2 ? 1 : 2;
      chapters.forEach((c, i) => {
        c.inert = i !== active;
      });
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    // The turns: the next tile takes the middle every few seconds, while the section is on screen and still at the top.
    const timer = window.setInterval(() => {
      if (reduced.matches || frozen.current || document.hidden) return;
      const rect = el.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > window.innerHeight) return;
      setTurn((t) => (t + 1) % TURN_ORDER.length);
    }, TURN_MS);

    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    reduced.addEventListener("change", schedule);
    return () => {
      window.clearInterval(timer);
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      reduced.removeEventListener("change", schedule);
    };
  }, []);

  if (!events.length) return null;

  const eventFor = (tile: number) => events[tile % events.length];
  // The chapters follow the turn order from the tile at the middle, so chapter 1 is the cover that grew to fill the screen.
  const chapterEvents = [0, 1, 2].map((k) => eventFor(TURN_ORDER[(turn + k) % TURN_ORDER.length]));

  return (
    <section ref={ref} aria-labelledby="scene-title" className="relative isolate h-[420svh] bg-paper-ink text-white motion-reduce:h-auto" style={{ "--p": 0, "--f": 0 } as React.CSSProperties}>
      <h2 id="scene-title" className="sr-only">
        What&rsquo;s on across Ethiopia
      </h2>
      <div className="sticky top-0 h-svh overflow-hidden motion-reduce:static motion-reduce:h-[640px]">
        {/* Soft accent glow, like the hero. */}
        <div aria-hidden="true" className="pointer-events-none absolute -left-40 -top-40 -z-10 size-[520px] rounded-full bg-accent-fill opacity-25 blur-[120px]" />

        <div aria-hidden="true" className="absolute inset-0 isolate">
          {/*
            The wall. Each tile has two layers: the outer one scales (and turns) around the middle of the screen as you scroll;
            the inner one glides between its place on the wall and the middle, and swells while it is there. `--on` is 1 for
            the tile at the middle: it then grows to fill the screen instead of flying past, and stays flat.
          */}
          {TILES.map((t, i) => {
            const e = eventFor(i);
            const on = TURN_ORDER[turn] === i;
            return (
              <div
                key={i}
                data-on={on}
                className="absolute inset-0 flex items-center justify-center [--on:0] data-[on=true]:z-10 data-[on=true]:[--on:1]"
                style={{ "--z0": t.zoom, scale: `calc(1 + var(--f) * (var(--z0) + var(--on) * (${FILL_ZOOM} - var(--z0)) - 1))`, rotate: `calc(var(--f) * ${t.tilt}deg * (1 - var(--on)))` } as React.CSSProperties}
              >
                <div
                  className="relative overflow-hidden rounded-lg shadow-modal ring-1 ring-white/10 transition-[translate,scale] duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
                  style={{ width: `${t.w}vw`, height: `${t.h}vh`, translate: `calc((1 - var(--on)) * ${t.x}vw) calc((1 - var(--on)) * ${t.y}vh)`, scale: `calc(1 + var(--on) * ${CENTRE_SCALE - 1})` }}
                >
                  <EventCover seed={e.id} pattern={e.coverPattern} category={e.categoryId} />
                  {/* The tile at the middle names its event; it clears as the tile starts to grow. */}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[color-mix(in_srgb,var(--color-paper-ink)_85%,transparent)] to-transparent px-3 pb-2.5 pt-8 transition-opacity duration-500" style={{ opacity: `calc(var(--on) * max(0, 1 - var(--f) * 6))` }}>
                    <span className="hidden type-label text-white/70 sm:block">{formatEventDate(e.startsAt, { weekday: true, year: false })}</span>
                    <span className="text-[10px] font-semibold leading-tight text-white line-clamp-2 sm:type-body-sm sm:line-clamp-1">{e.title}</span>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Chapters 2 and 3: each cover fades in over the last and drifts slowly toward you while it is on screen. `z-20` keeps them above the grown first cover (the tile at the middle sits at `z-10`), or they would fade in underneath it and never show. */}
          {chapterEvents.slice(1).map((c, i) => (
            <div key={i} className="absolute inset-0 z-20" style={{ opacity: `clamp(0, calc((var(--p) - ${CHAPTER_AT[i + 1] - CHAPTER_SPAN}) * 10), 1)`, scale: `calc(1.04 + var(--p) * 0.16)` }}>
              <EventCover seed={c.id} pattern={c.coverPattern} category={c.categoryId} />
            </div>
          ))}
        </div>

        {/* A dark wash over the covers so the details read; it comes in as the first cover fills the screen. */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_top,color-mix(in_srgb,var(--color-paper-ink)_92%,transparent),color-mix(in_srgb,var(--color-paper-ink)_55%,transparent))]" style={{ opacity: "clamp(0, calc((var(--f) - 0.55) * 2.2), 1)" }} />

        {/* A cue to scroll, gone as soon as you do. */}
        <span aria-hidden="true" className="absolute inset-x-0 bottom-8 mx-auto flex size-10 animate-bounce items-center justify-center rounded-full border border-white/20 bg-white/5 text-white/80 motion-reduce:hidden" style={{ opacity: "max(0, calc(1 - var(--f) * 5))" }}>
          <ChevIcon className="size-4" />
        </span>

        {/* With reduced motion the story doesn't play, so the wall gets a plain way on. */}
        <div className="absolute inset-x-0 bottom-8 hidden justify-center motion-reduce:flex">
          <Button asChild>
            <Link href="/events">Explore all events</Link>
          </Button>
        </div>

        {/* The chapters: one event each, fading through one another. */}
        {chapterEvents.map((c, i) => (
          <div
            key={i}
            data-chapter={i}
            inert
            className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center motion-reduce:hidden"
            style={{ opacity: chapterOpacity(CHAPTER_AT[i]), translate: `0 calc(clamp(-60px, (${CHAPTER_AT[i]} - var(--p)) * 240px, 60px))` }}
          >
            <p className={cn("m-0 text-accent-light", landingType.eyebrow)}>
              {String(i + 1).padStart(2, "0")} / {String(chapterEvents.length).padStart(2, "0")} · {c.categoryName}
            </p>
            <h3 className={cn("m-0 mt-3 max-w-[760px] text-white", landingType.title)}>{c.title}</h3>
            <p className={cn("m-0 mt-4 max-w-[520px] text-white/80", landingType.lead)}>
              {formatEventDate(c.startsAt, { weekday: true, year: false })} · {c.venueName ?? c.cityName ?? "Online"}
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Button asChild>
                <Link href={`/events/${c.slug}`}>Get tickets</Link>
              </Button>
              {i === chapterEvents.length - 1 && (
                <Button asChild variant="secondary">
                  <Link href="/events">Explore all events</Link>
                </Button>
              )}
            </div>
          </div>
        ))}

        {/* Progress through the chapters: each bar fills while its event is on screen. */}
        <div aria-hidden="true" className="absolute inset-x-0 bottom-8 flex justify-center gap-2 motion-reduce:hidden" style={{ opacity: "clamp(0, calc((var(--f) - 0.9) * 10), 1)" }}>
          {chapterEvents.map((_, i) => (
            <span key={i} className="h-1 w-10 overflow-hidden rounded-full bg-white/25">
              <span className="block h-full bg-white" style={{ opacity: chapterOpacity(CHAPTER_AT[i]) }} />
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
