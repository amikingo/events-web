"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { formatEventWhen } from "../../../lib/marketplace/datetime";
import { cn } from "../../../lib/utils";
import type { EventSummary } from "../../../types/marketplace";
import { Button } from "../../ui/button";
import { PagerNextIcon, PagerPrevIcon } from "../../ui/icons";
import { priceLabel, whereLabel } from "../event-card";
import { EventCover } from "../event-cover";
import { EventStatusBadge } from "../event-status-badge";
import { LandingHeading } from "./landing-section";
import { landingType } from "./landing-type";

/** Seconds each slide stays before the next one comes in. */
const AUTOPLAY_SECONDS = 6;

const subscribeMotion = (cb: () => void) => {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
};
const subscribeVisibility = (cb: () => void) => {
  document.addEventListener("visibilitychange", cb);
  return () => document.removeEventListener("visibilitychange", cb);
};

/**
 * Featured events as large cinematic slides. Native horizontal scroll with snap (swipe, trackpad and keyboard all work),
 * arrows, dots, and autoplay every 6 seconds that loops.
 *
 * Autoplay pauses while the pointer is over the carousel, while focus is inside it and while the tab is hidden, and
 * never starts for visitors who prefer reduced motion. The active dot fills as a timer so the next change is never a
 * surprise.
 *
 * Product decision: no visible pause/play button. Without one the carousel does not meet WCAG 2.2.2 (Pause, Stop,
 * Hide) for touch users, who can't hover to pause. To restore it, add a button that toggles a `userPaused` state and
 * include `!userPaused` in `autoplay` below.
 */
export function SpotlightCarousel({ events, now }: { events: EventSummary[]; now: string }) {
  const track = useRef<HTMLUListElement>(null);
  const [index, setIndex] = useState(0);
  const [hovering, setHovering] = useState(false);
  const [focusInside, setFocusInside] = useState(false);
  const reducedMotion = useSyncExternalStore(subscribeMotion, () => window.matchMedia("(prefers-reduced-motion: reduce)").matches, () => true);
  const tabHidden = useSyncExternalStore(subscribeVisibility, () => document.hidden, () => true);
  const nowMs = Date.parse(now);
  const count = events.length;
  const autoplay = count > 1 && !reducedMotion;
  const running = autoplay && !hovering && !focusInside && !tabHidden;

  const behavior = (): ScrollBehavior => (window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth");

  function goTo(i: number) {
    const el = track.current;
    const slide = el?.children[i] as HTMLElement | undefined;
    if (!el || !slide) return;
    el.scrollTo({ left: slide.offsetLeft - el.offsetLeft - (el.clientWidth - slide.clientWidth) / 2, behavior: behavior() });
  }

  // Advance after the dwell time; any change of slide (autoplay, arrows, dots, swipe) restarts the countdown.
  const goToRef = useRef(goTo);
  useEffect(() => {
    goToRef.current = goTo;
  });
  useEffect(() => {
    if (!running) return;
    const t = setTimeout(() => goToRef.current((index + 1) % count), AUTOPLAY_SECONDS * 1000);
    return () => clearTimeout(t);
  }, [running, index, count]);

  function onScroll() {
    const el = track.current;
    if (!el) return;
    const center = el.scrollLeft + el.clientWidth / 2;
    let best = 0;
    let bestDist = Infinity;
    Array.from(el.children).forEach((c, i) => {
      const s = c as HTMLElement;
      const mid = s.offsetLeft - el.offsetLeft + s.clientWidth / 2;
      const d = Math.abs(mid - center);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    });
    if (best !== index) setIndex(best);
  }

  return (
    <div>
      <LandingHeading
        id="spotlight"
        eyebrow="Spotlight"
        title={<>Don&rsquo;t miss these</>}
        description="Hand-picked events our team is excited about this month."
        action={
        <div className="flex flex-none gap-2 self-start md:self-auto">
          <Button variant="secondary" iconOnly aria-label="Previous event" onClick={() => goTo((index - 1 + count) % count)}>
            <PagerPrevIcon className="size-4" />
          </Button>
          <Button variant="secondary" iconOnly aria-label="Next event" onClick={() => goTo((index + 1) % count)}>
            <PagerNextIcon className="size-4" />
          </Button>
        </div>
        }
      />

      <ul
        ref={track}
        onScroll={onScroll}
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
        onFocus={() => setFocusInside(true)}
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocusInside(false);
        }}
        aria-label="Featured events"
        aria-live={running ? "off" : "polite"}
        className="-mx-4 m-0 flex list-none snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:-mx-6 sm:px-6 [&::-webkit-scrollbar]:hidden"
      >
        {events.map((e, i) => (
          <li key={e.id} className="w-[88%] flex-none snap-center sm:w-[82%] lg:w-[76%]" aria-roledescription="slide" aria-label={`${i + 1} of ${events.length}`}>
            <article className="group relative isolate flex aspect-[4/5] flex-col justify-end overflow-hidden rounded-lg sm:aspect-[16/9] lg:aspect-[21/9]">
              <div className="absolute inset-0 -z-10 transition-transform duration-(--motion-slow) ease-(--ease-slow) group-hover:scale-[1.03] motion-reduce:transition-none">
                <EventCover seed={e.id} pattern={e.coverPattern} category={e.categoryId} src={e.coverUrl} />
              </div>
              <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-t from-[color-mix(in_srgb,var(--color-paper-ink)_94%,transparent)] via-[color-mix(in_srgb,var(--color-paper-ink)_45%,transparent)] to-transparent" />
              <div className="flex flex-col gap-2 p-5 sm:p-8">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-white/15 px-2.5 py-0.5 type-label text-white backdrop-blur-sm">{e.categoryName}</span>
                  <EventStatusBadge event={e} now={nowMs} variant="solid" />
                </div>
                <h3 className={cn("m-0 max-w-[720px] text-white", landingType.slide)}>
                  <Link href={`/events/${e.slug}`} className="rounded-sm outline-offset-4 after:absolute after:inset-0 after:content-['']">
                    {e.title}
                  </Link>
                </h3>
                <p className={cn("m-0 max-w-[560px] text-white/80 max-sm:line-clamp-2", landingType.lead)}>{e.summary}</p>
                <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
                  <p className="m-0 type-body-sm text-white/75">
                    {formatEventWhen(e.startsAt, e.endsAt, e.timezone)}
                    <span className="max-sm:block">
                      <span className="sm:mx-1.5 max-sm:hidden">·</span>
                      {whereLabel(e)}
                    </span>
                  </p>
                  <div className="relative z-[1] flex items-center gap-3">
                    <span className="type-h3 font-semibold text-white">{priceLabel(e)}</span>
                    <Button asChild>
                      <Link href={`/events/${e.slug}#tickets`}>Get tickets</Link>
                    </Button>
                  </div>
                </div>
              </div>
            </article>
          </li>
        ))}
      </ul>

      <div className="mt-4 flex justify-center gap-1.5">
        {events.map((e, i) => (
          <button
            key={e.id}
            type="button"
            aria-label={`Show ${e.title}`}
            aria-current={i === index ? "true" : undefined}
            onClick={() => goTo(i)}
            className={cn("relative h-1.5 overflow-hidden rounded-full transition-all", i === index ? "w-8 bg-border-strong" : "w-1.5 bg-border-strong hover:bg-text-faint")}
          >
            {i === index && (
              // The fill is the countdown: it restarts on every slide change and freezes while autoplay is paused.
              <span
                key={`${index}-${autoplay}`}
                aria-hidden="true"
                className={cn("absolute inset-0 origin-left rounded-full bg-accent", autoplay && "animate-slide-progress")}
                style={autoplay ? { animationDuration: `${AUTOPLAY_SECONDS}s`, animationPlayState: running ? "running" : "paused" } : undefined}
              />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
