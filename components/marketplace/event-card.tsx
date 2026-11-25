import Link from "next/link";
import { formatCurrency } from "../../lib/format";
import { formatMomentShort } from "../../lib/ethiopian-datetime";
import { dateChip } from "../../lib/marketplace/datetime";
import { eventPhase } from "../../lib/marketplace/event-state";
import { cn } from "../../lib/utils";
import type { EventSummary } from "../../types/marketplace";
import { MapPinIcon, MonitorIcon } from "../ui/icons";
import { Skeleton } from "../ui/skeleton";
import { EventCover } from "./event-cover";
import { EventStatusBadge } from "./event-status-badge";

/**
 * The event tile used across discovery. Imagery leads; one line of date, the title, where, and the price. The whole
 * tile is one link (the title's link stretches over it), so there is a single tab stop per event.
 */

export function priceLabel(e: Pick<EventSummary, "isFree" | "minPrice" | "ticketTypes">): string {
  if (e.isFree) return "Free";
  if (e.minPrice === 0) return "Free · paid options";
  return e.ticketTypes.length > 1 ? `From ${formatCurrency(e.minPrice)}` : formatCurrency(e.minPrice);
}

export function whereLabel(e: Pick<EventSummary, "format" | "venueName" | "cityName" | "onlinePlatform">): string {
  if (e.format === "online") return `Online${e.onlinePlatform ? ` · ${e.onlinePlatform}` : ""}`;
  const place = [e.venueName, e.cityName].filter(Boolean).join(" · ");
  return e.format === "hybrid" ? `${place} · also online` : place;
}

export function DateChip({ iso, timeZone, className }: { iso: string; timeZone?: string; className?: string }) {
  const d = dateChip(iso, timeZone);
  return (
    <span className={cn("flex w-12 flex-col items-center rounded-sm bg-surface py-1 text-text shadow", className)} aria-hidden="true">
      <span className="type-label text-accent-text">{d.month}</span>
      <span className="type-h2 leading-none">{d.day}</span>
      <span className="type-label text-text-faint">{d.weekday}</span>
    </span>
  );
}

export interface EventCardProps {
  event: EventSummary;
  /** Server "now" (ISO) the badge states are computed against. */
  now: string;
  layout?: "vertical" | "horizontal";
  /** Trending position, shown as a large numeral. */
  rank?: number;
  /** Heading level for the title inside its section. */
  headingLevel?: "h3" | "h4";
  className?: string;
}

export function EventCard({ event, now, layout = "vertical", rank, headingLevel = "h3", className }: EventCardProps) {
  const nowMs = Date.parse(now);
  const ended = event.lifecycle === "cancelled" || eventPhase(event, nowMs) === "ended";
  const Heading = headingLevel;
  const when = formatMomentShort(event.startsAt, event.timezone);
  const online = event.format === "online";

  if (layout === "horizontal") {
    return (
      <article className={cn("group relative flex min-w-0 gap-3.5 rounded-md p-1.5 transition-colors hover:bg-surface-2", className)}>
        <div className="relative aspect-square w-[88px] flex-none overflow-hidden rounded-sm sm:w-[104px]">
          <EventCover seed={event.id} pattern={event.coverPattern} category={event.categoryId} src={event.coverUrl} muted={ended} />
        </div>
        <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5">
          <p className="type-label text-accent-text">{when}</p>
          <Heading className="m-0 type-h3 text-text line-clamp-2">
            <Link href={`/events/${event.slug}`} className="rounded-sm outline-offset-4 after:absolute after:inset-0 after:content-['']">
              {event.title}
            </Link>
          </Heading>
          <p className="m-0 flex items-center gap-1 type-body-sm text-text-soft">
            {online ? <MonitorIcon className="size-3.5 flex-none" /> : <MapPinIcon className="size-3.5 flex-none" />}
            <span className="truncate">{whereLabel(event)}</span>
          </p>
          <div className="mt-0.5 flex flex-wrap items-center gap-2">
            <span className="type-body-sm font-semibold text-text">{priceLabel(event)}</span>
            <EventStatusBadge event={event} now={nowMs} />
          </div>
        </div>
      </article>
    );
  }

  return (
    <article className={cn("group relative flex min-w-0 flex-col", className)}>
      <div className="relative aspect-[3/2] overflow-hidden rounded-md bg-surface-2">
        <div className="size-full transition-transform duration-(--motion-slow) ease-(--ease-slow) group-hover:scale-[1.04] motion-reduce:transition-none">
          <EventCover seed={event.id} pattern={event.coverPattern} category={event.categoryId} src={event.coverUrl} muted={ended} />
        </div>
        <DateChip iso={event.startsAt} timeZone={event.timezone} className="absolute left-3 top-3" />
        {rank !== undefined && (
          <span className="absolute bottom-2 right-3 type-h1 text-white [text-shadow:0_1px_8px_var(--color-overlay)]" aria-hidden="true">
            {String(rank).padStart(2, "0")}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 pt-3">
        <p className="m-0 type-label text-accent-text">
          {event.categoryName}
          <span className="text-text-faint"> · {formatMomentShort(event.startsAt, event.timezone)}</span>
        </p>
        <Heading className="m-0 type-h3 text-text line-clamp-2 group-hover:text-accent-text">
          <Link href={`/events/${event.slug}`} className="rounded-sm outline-offset-4 after:absolute after:inset-0 after:content-['']">
            {event.title}
          </Link>
        </Heading>
        <p className="m-0 flex items-center gap-1 type-body-sm text-text-soft">
          {online ? <MonitorIcon className="size-3.5 flex-none" /> : <MapPinIcon className="size-3.5 flex-none" />}
          <span className="truncate">{whereLabel(event)}</span>
        </p>
        <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-1.5">
          <span className="type-body font-semibold text-text">{priceLabel(event)}</span>
          <EventStatusBadge event={event} now={nowMs} />
        </div>
      </div>
    </article>
  );
}

export function EventCardSkeleton({ layout = "vertical" }: { layout?: "vertical" | "horizontal" }) {
  if (layout === "horizontal") {
    return (
      <div className="flex gap-3.5 p-1.5" aria-hidden="true">
        <Skeleton className="aspect-square w-[88px] flex-none rounded-sm sm:w-[104px]" height="auto" />
        <div className="flex flex-1 flex-col justify-center gap-2">
          <Skeleton width="40%" />
          <Skeleton shape="title" width="80%" />
          <Skeleton width="60%" />
        </div>
      </div>
    );
  }
  return (
    <div className="flex flex-col" aria-hidden="true">
      <Skeleton className="aspect-[3/2] rounded-md" height="auto" />
      <div className="flex flex-col gap-2 pt-3">
        <Skeleton width="35%" />
        <Skeleton shape="title" width="85%" />
        <Skeleton width="60%" />
        <Skeleton width="30%" className="mt-1" />
      </div>
    </div>
  );
}
