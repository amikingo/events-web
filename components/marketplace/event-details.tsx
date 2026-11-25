import Link from "next/link";
import type { ReactNode } from "react";
import { formatNumber } from "../../lib/format";
import { formatEventDate, formatEventDateLong, formatEventTime, formatEventWhen, zoneNote } from "../../lib/marketplace/datetime";
import { eventPhase } from "../../lib/marketplace/event-state";
import { exploreHref } from "../../lib/marketplace/query";
import type { AgendaDay, City, EventItem, Organizer, Speaker, Venue } from "../../types/marketplace";
import { AlertCard } from "../ui/alert-card";
import { Avatar } from "../ui/avatar";
import { Breadcrumb } from "../ui/breadcrumb";
import { CalendarIcon, CheckThinIcon, ClockIcon, MapPinIcon, MonitorIcon, StarIcon, UserIcon } from "../ui/icons";
import { Pill } from "../ui/pill";
import { LeafletMap } from "../ui/location-map-leaflet";
import { Tab, TabList, TabPanel, Tabs } from "../ui/tabs";
import { EventCover } from "./event-cover";
import { EventStatusBadge } from "./event-status-badge";

/* ───────── Header ───────── */

export function EventDetailsHeader({ event, organizer, venue, city, categoryName, now }: { event: EventItem; organizer: Organizer; venue?: Venue; city?: City; categoryName: string; now: string }) {
  const nowMs = Date.parse(now);
  const ended = event.lifecycle === "cancelled" || eventPhase(event, nowMs) === "ended";
  const where = event.format === "online" ? `Online on ${event.onlinePlatform ?? "a video call"}` : [venue?.name, city?.name].filter(Boolean).join(", ");
  return (
    <header>
      <Breadcrumb
        className="mb-4"
        items={[
          { label: "Events", href: "/events" },
          { label: categoryName, href: exploreHref({ category: event.categoryId }) },
          { label: event.title },
        ]}
      />
      <div className="relative aspect-[16/9] overflow-hidden rounded-lg sm:aspect-[21/9]">
        <EventCover seed={event.id} pattern={event.coverPattern} category={event.categoryId} src={event.coverUrl} muted={ended} />
      </div>
      <div className="mt-6 flex flex-wrap items-center gap-2">
        <Link href={exploreHref({ category: event.categoryId })} className="rounded-sm type-label text-accent-text hover:underline">
          {categoryName}
        </Link>
        <EventStatusBadge event={event} now={nowMs} size="md" />
        {event.format !== "in-person" && (
          <Pill tone="neutral" size="sm">
            {event.format === "online" ? "Online" : "In person and online"}
          </Pill>
        )}
        {event.ageRestriction && (
          <Pill tone="neutral" size="sm">
            {event.ageRestriction}
          </Pill>
        )}
      </div>
      <h1 className="m-0 mt-2 type-h1 text-text">{event.title}</h1>
      <p className="m-0 mt-2 max-w-[640px] type-body text-text-soft">{event.summary}</p>

      <dl className="m-0 mt-5 grid gap-4 sm:grid-cols-2">
        <Fact icon={<CalendarIcon />} label="Date and time">
          <span className="block font-semibold text-text">{formatEventDateLong(event.startsAt, event.timezone)}</span>
          <span className="block">
            {formatEventWhen(event.startsAt, event.endsAt, event.timezone).split(" · ")[1] ?? formatEventWhen(event.startsAt, event.endsAt, event.timezone)}
            {zoneNote(event.timezone) && <span className="text-text-faint"> · {zoneNote(event.timezone)}</span>}
          </span>
        </Fact>
        <Fact icon={event.format === "online" ? <MonitorIcon /> : <MapPinIcon />} label="Location">
          <span className="block font-semibold text-text">{where}</span>
          <span className="block">{event.format === "online" ? "Join link sent after you register" : venue?.address}</span>
        </Fact>
      </dl>

      <div className="mt-5 flex items-center gap-3 rounded-md border border-border bg-surface p-3">
        <Avatar initials={organizer.initials} size={36} />
        <div className="min-w-0 flex-1">
          <span className="block type-body-sm text-text-faint">Organized by</span>
          <Link href={exploreHref({ organizer: organizer.slug })} className="type-body font-semibold text-text hover:underline">
            {organizer.name}
          </Link>
        </div>
        {organizer.verified && (
          <Pill tone="success" size="sm">
            <CheckThinIcon className="size-3" /> Verified
          </Pill>
        )}
      </div>
    </header>
  );
}

function Fact({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className="flex size-10 flex-none items-center justify-center rounded-sm bg-[color-mix(in_srgb,var(--color-accent)_12%,var(--color-surface))] text-accent-text [&_svg]:size-[18px]" aria-hidden="true">
        {icon}
      </span>
      <div className="min-w-0">
        <dt className="type-label text-text-faint">{label}</dt>
        <dd className="m-0 mt-0.5 type-body-sm text-text-soft">{children}</dd>
      </div>
    </div>
  );
}

/* ───────── State notices (cancelled, rescheduled, updated, ended) ───────── */

export function EventNotices({ event, now }: { event: EventItem; now: string }) {
  const nowMs = Date.parse(now);
  const phase = eventPhase(event, nowMs);
  const latest = event.updates[0];
  return (
    <div className="flex flex-col gap-3 empty:hidden">
      {event.lifecycle === "cancelled" && <AlertCard tone="danger" title="This event has been cancelled" body={event.lifecycleNote} />}
      {event.lifecycle === "postponed" && event.originalStartsAt && phase !== "ended" && (
        <AlertCard
          tone="warning"
          title={`Rescheduled to ${formatEventDate(event.startsAt, { weekday: true, timeZone: event.timezone })}`}
          body={
            <>
              Originally planned for {formatEventDate(event.originalStartsAt, { weekday: true, timeZone: event.timezone })}. {event.lifecycleNote}
            </>
          }
        />
      )}
      {latest && event.lifecycle === "published" && phase !== "ended" && <AlertCard tone="info" title="Event details updated" time={formatEventDate(latest.at, { year: false })} body={latest.summary} />}
      {phase === "ended" && event.lifecycle !== "cancelled" && <AlertCard tone="info" title="This event has ended" body="Thanks to everyone who came. Follow the organizer to hear about the next one." />}
      {phase === "ongoing" && event.lifecycle !== "cancelled" && <AlertCard tone="success" title="Happening now" body={`Runs until ${formatEventDate(event.endsAt, { weekday: true, year: false, timeZone: event.timezone })}, ${formatEventTime(event.endsAt, event.timezone)}.`} />}
    </div>
  );
}

/* ───────── Sections ───────── */

export function DetailSection({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="border-t border-border py-8">
      <h2 id={id} className="m-0 mb-4 type-h2 text-text">
        {title}
      </h2>
      {children}
    </section>
  );
}

function AgendaList({ day, speakers }: { day: AgendaDay; speakers: Speaker[] }) {
  return (
    <ol className="m-0 flex list-none flex-col p-0">
      {day.items.map((item) => {
        const who = item.speakerIds.map((id) => speakers.find((s) => s.id === id)?.name).filter(Boolean);
        return (
          <li key={item.id} className="grid grid-cols-[88px_1fr] gap-3 border-b border-border py-3 last:border-b-0 sm:grid-cols-[120px_1fr]">
            <span className="type-body-sm font-semibold tabular-nums text-text">
              {formatEventTime(item.startsAt)}
              <span className="block font-normal text-text-faint">{formatEventTime(item.endsAt)}</span>
            </span>
            <div className="min-w-0">
              <p className="m-0 type-body font-semibold text-text">{item.title}</p>
              {(who.length > 0 || item.location) && <p className="m-0 mt-0.5 type-body-sm text-text-soft">{[who.join(", "), item.location].filter(Boolean).join(" · ")}</p>}
              {item.description && <p className="m-0 mt-1 type-body-sm text-text-soft">{item.description}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export function EventAgenda({ agenda, speakers }: { agenda: AgendaDay[]; speakers: Speaker[] }) {
  if (!agenda.length) return <p className="m-0 type-body text-text-soft">The organizer will share the full schedule closer to the date.</p>;
  if (agenda.length === 1) return <AgendaList day={agenda[0]!} speakers={speakers} />;
  return (
    <Tabs defaultValue={agenda[0]!.id}>
      <TabList aria-label="Agenda days">
        {agenda.map((d) => (
          <Tab key={d.id} value={d.id}>
            {d.label}
          </Tab>
        ))}
      </TabList>
      {agenda.map((d) => (
        <TabPanel key={d.id} value={d.id}>
          <AgendaList day={d} speakers={speakers} />
        </TabPanel>
      ))}
    </Tabs>
  );
}

export function SpeakerList({ speakers }: { speakers: Speaker[] }) {
  return (
    <ul className="m-0 grid list-none gap-3 p-0 sm:grid-cols-2">
      {speakers.map((s) => (
        <li key={s.id} className="flex items-center gap-3 rounded-md border border-border bg-surface p-3">
          <Avatar initials={s.initials} size={48} />
          <div className="min-w-0">
            <p className="m-0 type-body font-semibold text-text">{s.name}</p>
            <p className="m-0 type-body-sm text-text-soft">
              {s.role}, {s.organization}
            </p>
            <span className="type-label text-accent-text">{s.billing}</span>
          </div>
        </li>
      ))}
    </ul>
  );
}

/**
 * The venue map: the library's `LeafletMap` (Leaflet on OpenStreetMap), centred on the venue's pin (or on the city when the venue has none),
 * with the address and a real "open in maps" link.
 */
export function VenueMap({ venue, city }: { venue: Venue; city?: City }) {
  const query = encodeURIComponent(`${venue.name}, ${venue.address}, ${city?.name ?? ""}, Ethiopia`);
  const pin = venue.lat !== undefined && venue.lng !== undefined ? { lat: venue.lat, lng: venue.lng } : null;
  const center = pin ?? (city ? { lat: city.lat, lng: city.lng } : null);
  return (
    <div className="overflow-hidden rounded-md border border-border bg-surface">
      <div className="relative z-0 h-[240px] bg-surface-2 sm:h-[300px]">
        {center ? (
          <LeafletMap lat={center.lat} lng={center.lng} zoom={pin ? 16 : 12} pin={Boolean(pin)} label={`Map of ${venue.name}`} />
        ) : (
          <div aria-hidden="true" className="grid size-full place-items-center">
            <MapPinIcon className="size-9 text-accent" />
          </div>
        )}
      </div>
      <div className="flex flex-wrap items-start justify-between gap-3 p-4">
        <div className="min-w-0">
          <p className="m-0 type-body font-semibold text-text">{venue.name}</p>
          <p className="m-0 type-body-sm text-text-soft">
            {venue.address}
            {city ? `, ${city.name}` : ""}
          </p>
          {venue.directions && <p className="m-0 mt-2 type-body-sm text-text-soft">{venue.directions}</p>}
        </div>
        <a href={`https://www.google.com/maps/search/?api=1&query=${query}`} target="_blank" rel="noopener noreferrer" className="flex-none rounded-sm type-body-sm font-semibold text-accent-text hover:underline">
          Open in maps
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
      </div>
    </div>
  );
}

export function RefundPolicyBlock({ policy }: { policy: EventItem["refundPolicy"] }) {
  return (
    <div>
      <p className="m-0 type-body font-semibold text-text">{policy.summary}</p>
      <ul className="m-0 mt-3 flex list-none flex-col gap-2 p-0">
        {policy.details.map((d) => (
          <li key={d} className="flex gap-2 type-body-sm text-text-soft">
            <CheckThinIcon className="mt-0.5 size-3.5 flex-none text-success-text" />
            {d}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function OrganizerContact({ organizer, upcoming }: { organizer: Organizer; upcoming: number }) {
  return (
    <div className="flex flex-col gap-4 rounded-md border border-border bg-surface p-4 sm:flex-row sm:items-start">
      <Avatar initials={organizer.initials} size={48} />
      <div className="min-w-0 flex-1">
        <p className="m-0 type-h3 text-text">{organizer.name}</p>
        {organizer.bio && <p className="m-0 mt-1 type-body-sm text-text-soft">{organizer.bio}</p>}
        {/* The API tells us only the organizer's name: followers, ratings and contact details show when an organizer has them. */}
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 type-body-sm text-text-soft">
          {organizer.followers > 0 && (
            <span className="inline-flex items-center gap-1">
              <UserIcon className="size-3.5" /> {formatNumber(organizer.followers)} followers
            </span>
          )}
          {organizer.rating > 0 && (
            <span className="inline-flex items-center gap-1">
              <StarIcon className="size-3.5 text-warning" /> {organizer.rating.toFixed(1)} from past attendees
            </span>
          )}
          <span className="inline-flex items-center gap-1">
            <ClockIcon className="size-3.5" /> {upcoming === 1 ? "1 other upcoming event" : `${upcoming} other upcoming events`}
          </span>
        </div>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
          {organizer.email && (
            <a href={`mailto:${organizer.email}`} className="rounded-sm type-body-sm font-semibold text-accent-text hover:underline">
              {organizer.email}
            </a>
          )}
          {organizer.phone && (
            <a href={`tel:+251${organizer.phone.replace(/\s/g, "")}`} className="rounded-sm type-body-sm font-semibold text-accent-text hover:underline">
              +251 {organizer.phone}
            </a>
          )}
          <Link href={exploreHref({ organizer: organizer.slug })} className="rounded-sm type-body-sm font-semibold text-accent-text hover:underline">
            All events by this organizer
          </Link>
        </div>
      </div>
    </div>
  );
}
