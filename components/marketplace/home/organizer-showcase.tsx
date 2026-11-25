"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import type { KeyboardEvent } from "react";
import { formatNumber } from "../../../lib/format";
import { dateChip } from "../../../lib/marketplace/datetime";
import { exploreHref } from "../../../lib/marketplace/query";
import { cn } from "../../../lib/utils";
import type { CategoryId, CoverPattern, Organizer } from "../../../types/marketplace";
import { Avatar } from "../../ui/avatar";
import { CardLink } from "../../ui/card";
import { Chip } from "../../ui/chip";
import { CheckThinIcon, ChevRightIcon, StarIcon } from "../../ui/icons";
import { Pill } from "../../ui/pill";
import { EventCover } from "../event-cover";

export interface ShowcaseEvent {
  id: string;
  slug: string;
  title: string;
  startsAt: string;
  timezone?: string;
  where: string;
}

type ShowcaseOrganizer = Organizer & { upcomingCount: number };

/** Seconds each organizer stays in the spotlight before the next one. */
const DWELL_SECONDS = 7;

/* ───────── generated banner art: the same organizer always gets the same pattern, tinted for what they run ───────── */

const PATTERNS: CoverPattern[] = ["rings", "arcs", "waves", "burst", "blocks", "dots", "grid", "stripes"];
const CATEGORY_HINTS: [RegExp, CategoryId][] = [
  [/live|music|jazz|sound/i, "music"],
  [/taste|food|coffee|kitchen/i, "food"],
  [/tech|code|digital/i, "tech"],
  [/business|forum|summit|trade/i, "business"],
  [/art|gallery|culture|heritage/i, "arts"],
  [/sport|run|fit/i, "sports"],
];
const CATEGORIES: CategoryId[] = ["music", "food", "tech", "business", "arts", "sports"];

function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

function bannerFor(o: Organizer): { pattern: CoverPattern; category: CategoryId } {
  const hint = CATEGORY_HINTS.find(([re]) => re.test(`${o.slug} ${o.name}`))?.[1];
  return { pattern: PATTERNS[hash(o.id) % PATTERNS.length]!, category: hint ?? CATEGORIES[hash(o.slug) % CATEGORIES.length]! };
}

/* ───────── motion helpers ───────── */

const subscribeMotion = (cb: () => void) => {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
};
const subscribeVisibility = (cb: () => void) => {
  document.addEventListener("visibilitychange", cb);
  return () => document.removeEventListener("visibilitychange", cb);
};

/** A number that glides to its new value (and shows the first value at once, with no count from zero). Instant when motion is reduced. */
function useTween(target: number, reduced: boolean): number {
  const [shown, setShown] = useState(target);
  const current = useRef(target);
  useEffect(() => {
    if (reduced) {
      current.current = target;
      const t = requestAnimationFrame(() => setShown(target));
      return () => cancelAnimationFrame(t);
    }
    const from = current.current;
    const start = performance.now();
    let frame = 0;
    const step = (now: number) => {
      const k = Math.min(1, (now - start) / 650);
      const eased = 1 - Math.pow(1 - k, 3);
      current.current = from + (target - from) * eased;
      setShown(current.current);
      if (k < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [target, reduced]);
  return shown;
}

/**
 * The organizers as an interactive spotlight: a list on the left, and on the right the chosen organizer's compact profile with
 * a strip of generated banner art, live-counting numbers and their next events. It rotates by itself every few seconds (the active
 * row's line fills as the timer), pauses on hover, while focus is inside and while the tab is hidden, and never
 * rotates for visitors who prefer reduced motion. Hovering a row (mouse), clicking, tapping or the arrow keys choose
 * one. Below `lg` the list becomes a row of chips above the profile.
 */
export function OrganizerShowcase({ organizers, events }: { organizers: ShowcaseOrganizer[]; events: Record<string, ShowcaseEvent[]> }) {
  const uid = useId();
  const [active, setActive] = useState(0);
  const [hovering, setHovering] = useState(false);
  const [focusInside, setFocusInside] = useState(false);
  const reduced = useSyncExternalStore(subscribeMotion, () => window.matchMedia("(prefers-reduced-motion: reduce)").matches, () => true);
  const hidden = useSyncExternalStore(subscribeVisibility, () => document.hidden, () => true);
  const count = organizers.length;
  const running = count > 1 && !reduced && !hovering && !focusInside && !hidden;

  useEffect(() => {
    if (!running) return;
    const t = setTimeout(() => setActive((a) => (a + 1) % count), DWELL_SECONDS * 1000);
    return () => clearTimeout(t);
  }, [running, active, count]);

  const o = organizers[active] ?? organizers[0];
  const followers = useTween(o?.followers ?? 0, reduced);
  const rating = useTween(o?.rating ?? 0, reduced);
  const upcoming = useTween(o?.upcomingCount ?? 0, reduced);
  if (!o) return null;

  const { pattern, category } = bannerFor(o);
  const next = events[o.id] ?? [];
  const tabId = (i: number) => `${uid}-tab-${i}`;
  const panelId = `${uid}-panel`;

  function onTabKeys(e: KeyboardEvent<HTMLElement>) {
    const keys: Record<string, number> = { ArrowDown: active + 1, ArrowRight: active + 1, ArrowUp: active - 1, ArrowLeft: active - 1, Home: 0, End: count - 1 };
    if (!(e.key in keys)) return;
    e.preventDefault();
    const to = (keys[e.key]! + count) % count;
    setActive(to);
    document.getElementById(tabId(to))?.focus();
  }

  return (
    <div
      className="grid gap-6 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)] lg:gap-10"
      onPointerEnter={() => setHovering(true)}
      onPointerLeave={() => setHovering(false)}
      onFocus={() => setFocusInside(true)}
      onBlur={(e) => !e.currentTarget.contains(e.relatedTarget as Node | null) && setFocusInside(false)}
    >
      {/* Phones and tablets: a row of chips. */}
      <div role="tablist" aria-label="Organizers" onKeyDown={onTabKeys} className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] lg:hidden [&::-webkit-scrollbar]:hidden">
        {organizers.map((x, i) => (
          <Chip key={x.id} id={tabId(i)} role="tab" aria-selected={i === active} aria-controls={panelId} tabIndex={i === active ? 0 : -1} selected={i === active} onClick={() => setActive(i)} className="flex-none">
            {x.name}
          </Chip>
        ))}
      </div>

      {/* Desktop: a slim list; the active row carries the timer. */}
      <div role="tablist" aria-label="Organizers" aria-orientation="vertical" onKeyDown={onTabKeys} className="hidden flex-col border-t border-border lg:flex">
        {organizers.map((x, i) => {
          const on = i === active;
          return (
            <button
              key={x.id}
              id={tabId(i)}
              type="button"
              role="tab"
              aria-selected={on}
              aria-controls={panelId}
              tabIndex={on ? 0 : -1}
              onClick={() => setActive(i)}
              onPointerEnter={(e) => e.pointerType === "mouse" && setActive(i)}
              className="group relative flex items-center gap-4 border-b border-border py-4 text-left outline-offset-2 focus-visible:outline-2 focus-visible:outline-accent"
            >
              <span className={cn("w-5 type-label tabular-nums transition-colors", on ? "text-accent-text" : "text-text-faint")}>{String(i + 1).padStart(2, "0")}</span>
              <span className="min-w-0 flex-1">
                <span className={cn("block truncate text-[1.0625rem] font-semibold leading-tight tracking-tight transition-colors", on ? "text-text" : "text-text-faint group-hover:text-text-soft")}>{x.name}</span>
                <span className="block type-body-sm text-text-faint">{x.followers > 0 ? `${formatNumber(x.followers)} followers` : `${x.upcomingCount} upcoming`}</span>
              </span>
              <ChevRightIcon className={cn("size-3.5 flex-none text-accent transition-all", on ? "translate-x-0 opacity-100" : "-translate-x-2 opacity-0")} />
              {on && (
                <span
                  aria-hidden="true"
                  className="absolute inset-x-0 -bottom-px h-0.5 origin-left animate-slide-progress bg-accent"
                  style={{ animationDuration: `${DWELL_SECONDS}s`, animationPlayState: running ? "running" : "paused" }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* The profile, small: a slim banner, one line of identity, one line of numbers, the next events. Keyed by organizer so it eases in again on every change. */}
      <div id={panelId} role="tabpanel" aria-labelledby={tabId(active)} className="relative overflow-hidden rounded-lg border border-border bg-surface shadow-raised">
        <div key={o.id} className="animate-blur-in">
          <div className="relative h-24 overflow-hidden">
            <EventCover seed={o.id} pattern={pattern} category={category} className="scale-110" />
            <span aria-hidden="true" className="absolute right-4 top-0 select-none text-[4rem] font-bold leading-none tracking-tighter text-white/25">
              {String(active + 1).padStart(2, "0")}
            </span>
            <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-surface via-transparent to-transparent" />
          </div>

          <div className="relative -mt-8 px-5 pb-5 sm:px-6">
            <div className="flex items-end gap-3">
              <span className="flex-none rounded-lg ring-4 ring-surface">
                <Avatar initials={o.initials} size={48} />
              </span>
              <h3 className="m-0 min-w-0 flex-1 line-clamp-2 text-[1.375rem] font-semibold leading-tight tracking-tight text-text">{o.name}</h3>
              {o.verified && (
                <Pill tone="success" size="sm" className="mb-0.5 flex-none">
                  <CheckThinIcon className="size-3" /> Verified
                </Pill>
              )}
            </div>

            {o.bio && <p className="m-0 mt-3 line-clamp-2 max-w-[600px] type-body text-text-soft">{o.bio}</p>}

            {/* The API tells us an organizer's name only: followers and ratings show once an organizer has them. */}
            <dl className={cn("m-0 mt-4 grid divide-x divide-border rounded-md border border-border bg-surface-2/50", o.followers > 0 || o.rating > 0 ? "grid-cols-3" : "grid-cols-1")}>
              {o.followers > 0 && (
                <div className="px-3 py-2 sm:px-4">
                  <dt className="type-label uppercase tracking-wide text-text-faint">Followers</dt>
                  <dd className="m-0 mt-0.5 text-[1.125rem] font-semibold leading-tight tabular-nums text-text">{formatNumber(Math.round(followers))}</dd>
                </div>
              )}
              {o.rating > 0 && (
                <div className="px-3 py-2 sm:px-4">
                  <dt className="type-label uppercase tracking-wide text-text-faint">Rating</dt>
                  <dd className="m-0 mt-0.5 inline-flex items-center gap-1 text-[1.125rem] font-semibold leading-tight tabular-nums text-text">
                    <StarIcon className="size-4 text-warning" /> {rating.toFixed(1)}
                  </dd>
                </div>
              )}
              <div className="px-3 py-2 sm:px-4">
                <dt className="type-label uppercase tracking-wide text-text-faint">Upcoming</dt>
                <dd className="m-0 mt-0.5 text-[1.125rem] font-semibold leading-tight tabular-nums text-text">{Math.round(upcoming)}</dd>
              </div>
            </dl>

            <div className="mt-5 flex items-center justify-between">
              <p className="m-0 type-label uppercase tracking-wide text-text-faint">Next up</p>
              <CardLink href={exploreHref({ organizer: o.slug })}>{o.upcomingCount === 1 ? "See their event" : `See all ${o.upcomingCount}`}</CardLink>
            </div>
            {next.length ? (
              <ul className="m-0 mt-1 flex list-none flex-col p-0">
                {next.slice(0, 3).map((e) => {
                  const d = dateChip(e.startsAt, e.timezone);
                  return (
                    <li key={e.id}>
                      <Link href={`/events/${e.slug}`} className="group -mx-2 flex items-center gap-3 rounded-md px-2 py-1.5 transition-colors hover:bg-surface-2">
                        <span className="grid w-10 flex-none place-items-center rounded-md bg-surface-2 py-0.5 text-center group-hover:bg-surface">
                          <span className="type-label text-accent-text">{d.month}</span>
                          <span className="type-body-sm font-semibold leading-none text-text">{d.day}</span>
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate type-body-sm font-semibold text-text">{e.title}</span>
                          <span className="block truncate type-label normal-case tracking-normal text-text-faint">{e.where}</span>
                        </span>
                        <ChevRightIcon className="size-3.5 flex-none text-text-faint transition-transform group-hover:translate-x-0.5 group-hover:text-accent" />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="m-0 mt-1 type-body-sm text-text-soft">No events on sale right now.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
