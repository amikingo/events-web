"use client";

import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import type { FormEvent } from "react";
import { exploreHref } from "../../lib/marketplace/query";
import { cn } from "../../lib/utils";
import type { City, CityId, DateFilter } from "../../types/marketplace";
import { Button } from "../ui/button";
import { SearchIcon } from "../ui/icons";
import { InputAddon, InputGroup } from "../ui/input";
import { Select } from "../ui/select";

/** Compact search used in the header and the mobile menu: one field, Enter goes to Explore. */
export function HeaderSearch({ className, onNavigate, autoFocus }: { className?: string; onNavigate?: () => void; autoFocus?: boolean }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const id = useId();

  function submit(e: FormEvent) {
    e.preventDefault();
    router.push(exploreHref({ q: q.trim() }));
    onNavigate?.();
  }

  return (
    <form role="search" onSubmit={submit} className={className}>
      <label htmlFor={id} className="sr-only">
        Search events
      </label>
      <InputGroup
        id={id}
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search events, artists or organizers"
        enterKeyHint="search"
        autoFocus={autoFocus}
        leading={
          <InputAddon variant="plain">
            <SearchIcon className="size-4 text-text-faint" />
          </InputAddon>
        }
      />
    </form>
  );
}

const DATE_OPTIONS: { value: DateFilter; label: string }[] = [
  { value: "upcoming", label: "Any date" },
  { value: "today", label: "Today" },
  { value: "weekend", label: "This weekend" },
  { value: "week", label: "Next 7 days" },
  { value: "month", label: "Next 30 days" },
];

/** Field label: visible above the field on phones; on the desktop capsule the placeholder and icon carry it (screen readers still get it). */
function GlassLabel({ htmlFor, children }: { htmlFor: string; children: string }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block type-label text-text-faint md:sr-only">
      {children}
    </label>
  );
}

/** Thin vertical rule between capsule segments (desktop only). */
function Divider() {
  return <span aria-hidden="true" className="hidden h-7 w-px flex-none bg-border md:block" />;
}

/*
 * Landing-page restyle of the library field components (agreed for this hero only): from `md` up the input and selects
 * drop their white box and border and blend into the glass, 48px tall, theme text. Below `md` they keep the library look.
 */
const segment = "min-w-0 md:rounded-full md:px-1 md:transition-colors md:hover:bg-text/5 md:focus-within:bg-text/10";
const fieldGroup = "md:h-12 md:border-transparent md:bg-transparent md:focus-within:border-transparent md:focus-within:shadow-none";
const fieldInput = "md:h-12 md:text-text md:placeholder:text-text-faint";
const selectTrigger = "md:h-12 md:border-transparent md:bg-transparent md:text-text md:shadow-none md:[&>svg]:text-text-faint";

/**
 * The hero's discovery search: what, where and when, then straight into filtered results.
 *
 * Desktop and tablet: one slim frosted-glass capsule — What | Where | When | Find events — with the fields blended into
 * the glass. Phones: a stacked glass panel with visible labels and the library's white fields, which read better at that
 * size. A soft accent glow sits behind both.
 */
export function SearchBar({ cities, className }: { cities: City[]; className?: string }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [city, setCity] = useState<CityId | "online" | "all">("all");
  const [date, setDate] = useState<DateFilter>("upcoming");
  const [pending, setPending] = useState(false);
  const qId = useId();
  const cityId = useId();
  const dateId = useId();

  function submit(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    router.push(exploreHref({ q: q.trim(), city, date }));
  }

  return (
    <form role="search" aria-label="Find events" onSubmit={submit} className={cn("relative isolate", className)}>
      {/* Soft glow behind the glass, so the panel reads as lit from within. */}
      <div aria-hidden="true" className="pointer-events-none absolute -inset-4 -z-10 rounded-[28px] bg-accent-fill opacity-20 blur-3xl md:rounded-full" />
      <div className="grid gap-3 rounded-lg border border-border bg-[linear-gradient(to_bottom,color-mix(in_srgb,var(--color-white)_var(--glass-top),transparent),color-mix(in_srgb,var(--color-white)_var(--glass-bottom),transparent))] p-3 shadow-raised backdrop-blur-xl transition-colors focus-within:border-border-strong md:flex md:items-center md:gap-1 md:rounded-full md:p-1.5 md:pl-3">
        <div className={cn(segment, "md:flex-1")}>
          <GlassLabel htmlFor={qId}>What</GlassLabel>
          <InputGroup
            id={qId}
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search events or artists"
            enterKeyHint="search"
            groupClassName={fieldGroup}
            className={fieldInput}
            leading={
              <InputAddon variant="plain">
                <SearchIcon className="size-4 text-text-faint md:size-[18px] md:text-text-faint" />
              </InputAddon>
            }
          />
        </div>
        <Divider />
        <div className="grid grid-cols-2 gap-3 md:contents">
          <div className={cn(segment, "md:w-[140px] md:flex-none")}>
            <GlassLabel htmlFor={cityId}>Where</GlassLabel>
            <Select id={cityId} value={city} onValueChange={(v) => setCity(v as CityId | "online" | "all")} className={selectTrigger} options={[{ value: "all", label: "Anywhere" }, ...cities.map((c) => ({ value: c.id, label: c.name })), { value: "online", label: "Online" }]} />
          </div>
          <Divider />
          <div className={cn(segment, "md:w-[140px] md:flex-none")}>
            <GlassLabel htmlFor={dateId}>When</GlassLabel>
            <Select id={dateId} value={date} onValueChange={(v) => setDate(v as DateFilter)} className={selectTrigger} options={DATE_OPTIONS} />
          </div>
        </div>
        <Button type="submit" loading={pending} loadingLabel="Searching" className="md:h-12 md:flex-none md:rounded-full md:px-6">
          <SearchIcon className="size-4" />
          Find events
        </Button>
      </div>
    </form>
  );
}
