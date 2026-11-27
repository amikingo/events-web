import Link from "next/link";
import { formatEventDate } from "../../../lib/marketplace/datetime";
import { exploreHref } from "../../../lib/marketplace/query";
import { cn } from "../../../lib/utils";
import type { City, EventSummary } from "../../../types/marketplace";
import { EventCover } from "../event-cover";
import { SearchBar } from "../search-bar";
import { Container } from "../section";
import { landingType } from "./landing-type";

/** One poster in the wall: artwork, date and title. Decorative (the wall is hidden from assistive tech). */
function Poster({ event, className }: { event: EventSummary; className?: string }) {
  return (
    <div className={cn("relative aspect-[3/4] w-full flex-none overflow-hidden rounded-lg ring-1 ring-border", className)}>
      <EventCover seed={event.id} pattern={event.coverPattern} category={event.categoryId} src={event.coverUrl} />
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[color-mix(in_srgb,var(--color-paper-ink)_90%,transparent)] to-transparent px-3 pb-3 pt-10">
        <span className="block type-label text-white/70">{formatEventDate(event.startsAt, { weekday: true, year: false, timeZone: event.timezone })}</span>
        <span className="block type-body-sm font-semibold text-white line-clamp-2">{event.title}</span>
      </div>
    </div>
  );
}

/** A column of posters scrolling forever; the list is doubled so the loop has no seam. Hover pauses it. */
export function PosterColumn({ events, direction, duration, className }: { events: EventSummary[]; direction: "up" | "down"; duration: number; className?: string }) {
  return (
    <div className={cn("h-full overflow-hidden", className)}>
      <div className={cn("flex flex-col gap-4 hover:[animation-play-state:paused]", direction === "up" ? "animate-marquee-up" : "animate-marquee-down")} style={{ animationDuration: `${duration}s` }}>
        {[...events, ...events].map((e, i) => (
          <Poster key={`${e.id}-${i}`} event={e} />
        ))}
      </div>
    </div>
  );
}

const POPULAR = ["Jazz", "Conference", "Coffee", "Comedy", "Running", "Art"];

/**
 * The landing hero: a stage (dark or light, following the theme) with a slowly moving wall of real upcoming events behind the search, so the first
 * thing a visitor sees is what's actually on. Static HTML; only the search box hydrates.
 */
export function Hero({ cities, wall, liveCount }: { cities: City[]; wall: EventSummary[]; liveCount: number }) {
  const cols = [0, 1, 2].map((n) => wall.filter((_, i) => i % 3 === n));
  // Pulled up under the floating header (76px = 12px inset + 64px pill) so the dark stage starts at the top of the window.
  return (
    <section aria-labelledby="hero-title" className="relative isolate -mt-[76px] overflow-hidden bg-[var(--hero-bg)] pt-[76px] text-text">
      {/* Soft accent glow behind the copy. */}
      <div aria-hidden="true" className="pointer-events-none absolute -left-40 -top-40 -z-10 size-[560px] rounded-full bg-accent-fill opacity-25 blur-[120px]" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-48 right-1/4 -z-10 size-[420px] rounded-full bg-cbe opacity-30 blur-[120px]" />

      <Container className="grid items-center gap-10 py-14 sm:py-20 lg:min-h-[680px] lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:py-0">
        <div className="min-w-0 lg:py-20">
          <h1 id="hero-title" className={cn("m-0 mt-5 max-w-[640px] text-text", landingType.display)}>
            Every event worth going to.{" "}
            <span className="bg-gradient-to-r from-accent-text via-accent to-accent-text bg-clip-text text-transparent">Tickets in seconds.</span>
          </h1>
          <p className={cn("m-0 mt-6 max-w-[500px] text-text-soft", landingType.lead)}>Concerts, conferences, festivals and workshops across Ethiopia.</p>

          <SearchBar cities={cities} className="mt-8 max-w-[720px]" />

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <span className="type-body-sm text-text-faint">Popular:</span>
            {POPULAR.map((q) => (
              <Link key={q} href={exploreHref({ q })} className="inline-flex h-8 items-center rounded-full border border-border bg-surface/40 px-3 type-body-sm font-medium text-text-soft transition-colors hover:border-border-strong hover:bg-surface/70 hover:text-text">
                {q}
              </Link>
            ))}
          </div>

        </div>

        {/* Desktop: three columns of posters drifting in opposite directions, faded at the edges. */}
        <div aria-hidden="true" className="relative hidden h-[680px] grid-cols-3 gap-4 [mask-image:linear-gradient(to_bottom,transparent,black_14%,black_86%,transparent)] lg:grid">
          <PosterColumn events={cols[0]!} direction="up" duration={15} />
          <PosterColumn events={cols[1]!} direction="down" duration={15} className="-mt-24" />
          <PosterColumn events={cols[2]!} direction="up" duration={15} />
        </div>
      </Container>

      {/* Phones and tablets: one drifting row under the search. */}
      <div aria-hidden="true" className="overflow-hidden pb-10 [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)] lg:hidden">
        <div className="flex w-max animate-marquee-x gap-3">
          {[...wall.slice(0, 8), ...wall.slice(0, 8)].map((e, i) => (
            <Poster key={`${e.id}-${i}`} event={e} className="w-[132px] sm:w-[160px]" />
          ))}
        </div>
      </div>
    </section>
  );
}
