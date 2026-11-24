import { formatEventDate } from "@/lib/marketplace/datetime";
import type { EventSummary } from "@/types/marketplace";

/**
 * The words on the sign-in page's shader background: a pill, a big headline whose last word keeps changing, and (as a
 * separate piece) a strip of real events scrolling along the bottom. Server-rendered and decorative.
 *
 * Display type: as on the landing page, the brand guideline governs colour and components here, not the `type-*` size
 * scale, so the headline is larger than 22px. It lives only in `HERO_TYPE`; the form keeps the scale.
 */
const HERO_TYPE = "text-[clamp(2.75rem,5.4vw,5rem)] font-semibold leading-[1.05] tracking-[-0.04em]";
const LINE = "1.12em";
const WORDS = ["concerts", "conferences", "festivals", "workshops", "comedy nights"] as const;

/** Words fade and un-blur one after another, like a text reveal. */
function Reveal({ text, from }: { text: string; from: number }) {
  return (
    <>
      {text.split(" ").map((w, i) => (
        <span key={w} className="inline-block animate-blur-in pr-[0.22em]" style={{ animationDelay: `${from + i * 90}ms` }}>
          {w}
        </span>
      ))}
    </>
  );
}

export function AuthHero({ liveCount }: { liveCount: number }) {
  return (
    <div className="hidden min-w-0 lg:block lg:pt-32">
      <h2 className={`max-w-[720px] text-white ${HERO_TYPE}`}>
        <span className="block">
          <Reveal text="Tickets for" from={280} />
        </span>
        {/* The rotating word: a column of lines that slides up one line at a time. */}
        <span className="relative block animate-blur-in overflow-hidden" style={{ height: LINE, animationDelay: "560ms" }}>
          <span className="flex animate-word-cycle flex-col">
            {[...WORDS, WORDS[0]].map((w, i) => (
              <span key={i} className="block whitespace-nowrap" style={{ height: LINE, lineHeight: LINE }}>
                <span className="animate-shimmer bg-gradient-to-r from-accent-light via-white to-accent-light bg-[length:200%_auto] bg-clip-text text-transparent">{w}.</span>
              </span>
            ))}
          </span>
        </span>
      </h2>
      <p className="m-0 mt-6 max-w-[460px] animate-blur-in type-body text-white/70" style={{ animationDelay: "800ms" }}>
        One sign-in for your tickets on Cheche Events.
      </p>
    </div>
  );
}

/** A glass pill per upcoming event, drifting sideways forever; the list is doubled so the loop has no seam. */
export function EventTicker({ events }: { events: EventSummary[] }) {
  const items = events.slice(0, 10);
  return (
    <div aria-hidden="true" className="hidden overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)] lg:block">
      <div className="flex w-max animate-marquee-x gap-3 hover:[animation-play-state:paused]">
        {[...items, ...items].map((e, i) => (
          <span key={`${e.id}-${i}`} className="inline-flex items-center gap-2.5 whitespace-nowrap rounded-full border border-white/15 bg-white/10 py-2 pl-4 pr-5 type-body-sm text-white/85 backdrop-blur">
            <span className="text-accent-light">{formatEventDate(e.startsAt, { weekday: false, year: false })}</span>
            {e.title}
          </span>
        ))}
      </div>
    </div>
  );
}
