import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "../../lib/utils";
import type { EventSummary } from "../../types/marketplace";
import { ChevRightIcon } from "../ui/icons";
import { EventCard, EventCardSkeleton } from "./event-card";

/**
 * Page-width container used by every marketplace screen: up to 1400px wide, with a 16px side margin on phones and 24px
 * from tablet up. The swipeable rows (`-mx-4 px-4 sm:-mx-6 sm:px-6`) bleed into exactly this margin.
 */
export function Container({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("mx-auto w-full max-w-[1400px] px-4 sm:px-6", className)}>{children}</div>;
}

export function SectionHeader({ id, title, description, href, linkLabel = "See all" }: { id: string; title: ReactNode; description?: ReactNode; href?: string; linkLabel?: string }) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4">
      <div className="min-w-0">
        <h2 id={id} className="m-0 type-h2 text-text">
          {title}
        </h2>
        {description && <p className="m-0 mt-1 type-body text-text-soft">{description}</p>}
      </div>
      {href && (
        <Link href={href} className="inline-flex flex-none items-center gap-0.5 rounded-sm type-body-sm font-semibold text-accent-text hover:underline">
          {linkLabel}
          <ChevRightIcon className="size-3.5" />
        </Link>
      )}
    </div>
  );
}

/** A labelled page section with consistent vertical rhythm. */
export function Section({ id, title, description, href, linkLabel, className, children }: { id: string; title: ReactNode; description?: ReactNode; href?: string; linkLabel?: string; className?: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className={cn("py-8 sm:py-10", className)}>
      <Container>
        <SectionHeader id={id} title={title} description={description} href={href} linkLabel={linkLabel} />
        {children}
      </Container>
    </section>
  );
}

/**
 * Responsive event grid. `scroll` turns it into a swipeable row on phones (one and a bit cards visible, which signals
 * there is more) and a grid from tablet up.
 */
/** `mobileLimit`: show only the first N on phones (keeps long sections short on small screens). */
export function EventGrid({ events, now, scroll = false, ranked = false, mobileLimit, className }: { events: EventSummary[]; now: string; scroll?: boolean; ranked?: boolean; mobileLimit?: number; className?: string }) {
  return (
    <ul
      className={cn(
        "m-0 list-none p-0",
        scroll
          ? "-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-4 [&::-webkit-scrollbar]:hidden"
          : "grid grid-cols-1 gap-x-5 gap-y-8 min-[480px]:grid-cols-2 lg:grid-cols-3",
        className,
      )}
    >
      {events.map((e, i) => (
        <li key={e.id} className={cn("min-w-0", scroll && "w-[78%] flex-none snap-start sm:w-auto", mobileLimit !== undefined && i >= mobileLimit && "max-[479px]:hidden")}>
          <EventCard event={e} now={now} rank={ranked ? i + 1 : undefined} />
        </li>
      ))}
    </ul>
  );
}

export function EventGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-x-5 gap-y-8 min-[480px]:grid-cols-2 lg:grid-cols-3" role="status" aria-label="Loading events">
      {Array.from({ length: count }, (_, i) => (
        <EventCardSkeleton key={i} />
      ))}
    </div>
  );
}
