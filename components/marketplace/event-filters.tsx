"use client";

import { useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useId, useRef, useState, useTransition } from "react";
import type { FormEvent, ReactNode } from "react";
import { DATE_LABELS, exploreHref, PRICE_LABELS, SORT_LABELS, SORT_SHORT_LABELS, activeFilterCount } from "../../lib/marketplace/query";
import { cn } from "../../lib/utils";
import type { DateFilter, EventQuery, PriceFilter, SortOption } from "../../types/marketplace";
import type { Facets } from "../../lib/services/events-service";
import { BottomSheet } from "../ui/bottom-sheet";
import { Button } from "../ui/button";
import { Chip } from "../ui/chip";
import { CloseButton } from "../ui/close-button";
import { CountBadge } from "../ui/count-badge";
import { FilterIcon, SearchIcon } from "../ui/icons";
import { InputAddon, InputGroup } from "../ui/input";
import { SegmentedControl } from "../ui/segmented-control";
import { Select } from "../ui/select";
import { Spinner } from "../ui/spinner";
import { TextLink } from "../ui/text-link";

/**
 * Explore filters. The URL is the state: every change pushes a new query string, the server re-renders the results,
 * and while that happens the current results are dimmed (a transition) instead of being swapped for a spinner.
 *
 * Layout: desktop puts search, date, location and price on one toolbar row with categories under it; tablet wraps the
 * filters onto a second row. Phones show search plus a Filters button (opening a bottom sheet of chip choices, per the
 * guideline's "filter choices on a phone") and a Sort menu. Sorting lives in the results bar, apart from the filters.
 */

interface ExploreCtx {
  query: EventQuery;
  pending: boolean;
  navigate: (patch: Partial<EventQuery>) => void;
}

const Ctx = createContext<ExploreCtx | null>(null);

function useExplore(): ExploreCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error("useExplore must be used inside <ExploreShell>");
  return c;
}

export function ExploreShell({ query, children }: { query: EventQuery; children: ReactNode }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const navigate = (patch: Partial<EventQuery>) => {
    startTransition(() => router.push(exploreHref({ ...query, page: 1, ...patch }), { scroll: false }));
  };
  return <Ctx.Provider value={{ query, pending, navigate }}>{children}</Ctx.Provider>;
}

/** Wraps the results so they dim while new ones load. */
export function ExploreResultsFrame({ children }: { children: ReactNode }) {
  const { pending } = useExplore();
  return (
    <div aria-busy={pending} className={cn("relative transition-opacity", pending && "pointer-events-none opacity-50")}>
      {pending && (
        <div className="absolute left-1/2 top-16 z-[2] -translate-x-1/2">
          <Spinner size="lg" label="Updating results" />
        </div>
      )}
      {children}
    </div>
  );
}

function SearchField({ className }: { className?: string }) {
  const { query, navigate } = useExplore();
  const [q, setQ] = useState(query.q);
  const [syncedQ, setSyncedQ] = useState(query.q);
  // The query can change from outside (header search, "Clear all"): follow it, unless it's just our own debounced text.
  if (query.q !== syncedQ) {
    setSyncedQ(query.q);
    if (q.trim() !== query.q) setQ(query.q);
  }
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navigateRef = useRef(navigate);
  useEffect(() => {
    navigateRef.current = navigate;
  });
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  function change(value: string) {
    setQ(value);
    if (timer.current) clearTimeout(timer.current);
    // Search as you type, but only after a pause, so each keystroke isn't a request.
    timer.current = setTimeout(() => {
      if (value.trim() !== query.q) navigateRef.current({ q: value.trim() });
    }, 450);
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    if (timer.current) clearTimeout(timer.current);
    navigate({ q: q.trim() });
  }

  function clear() {
    if (timer.current) clearTimeout(timer.current);
    setQ("");
    if (query.q) navigate({ q: "" });
    inputRef.current?.focus();
  }

  return (
    <form role="search" onSubmit={submit} className={cn("w-full", className)}>
      <label htmlFor={id} className="sr-only">
        Search by event, keyword or organizer
      </label>
      <InputGroup
        ref={inputRef}
        id={id}
        type="search"
        value={q}
        onChange={(e) => change(e.target.value)}
        placeholder="Search by event, keyword or organizer"
        enterKeyHint="search"
        // The library clear button replaces the browser's own, so there is one consistent ×.
        className="[&::-webkit-search-cancel-button]:appearance-none"
        leading={
          <InputAddon variant="plain">
            <SearchIcon className="size-4 text-text-faint" />
          </InputAddon>
        }
        trailing={q ? <CloseButton aria-label="Clear search" onClick={clear} className="mr-1.5 self-center" /> : undefined}
      />
    </form>
  );
}

const DATE_OPTIONS = (Object.keys(DATE_LABELS) as DateFilter[]).map((d) => ({ value: d, label: DATE_LABELS[d] }));
const PRICE_OPTIONS = (Object.keys(PRICE_LABELS) as PriceFilter[]).map((p) => ({ value: p, label: PRICE_LABELS[p] }));

function locationOptions(facets: Facets) {
  return [{ value: "all", label: "Anywhere" }, ...facets.cities.map((c) => ({ value: c.id, label: c.name })), { value: "online", label: "Online" }];
}

/** A labelled group in the phone filter sheet. */
function SheetSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section aria-label={title} className="flex flex-col gap-2.5">
      <h3 className="m-0 type-label text-text-faint">{title}</h3>
      {children}
    </section>
  );
}

export function EventFilters({ facets, total }: { facets: Facets; total: number }) {
  const { query, pending, navigate } = useExplore();
  const [sheetOpen, setSheetOpen] = useState(false);
  const dateId = useId();
  const cityId = useId();
  const sortId = useId();
  const sortMobileId = useId();
  const organizerName = facets.organizers.find((o) => o.slug === query.organizer)?.name;
  const cityName = query.city === "online" ? "Online" : facets.cities.find((c) => c.id === query.city)?.name;
  const locations = locationOptions(facets);
  // What the Filters button counts: the choices that live in the sheet (categories stay visible as chips).
  const sheetCount = [query.date !== "upcoming", query.city !== "all", query.price !== "all"].filter(Boolean).length;

  const applied: { key: string; label: string; clear: Partial<EventQuery> }[] = [];
  if (query.q) applied.push({ key: "q", label: `“${query.q}”`, clear: { q: "" } });
  if (query.category !== "all") applied.push({ key: "category", label: facets.categories.find((c) => c.id === query.category)?.name ?? query.category, clear: { category: "all" } });
  if (query.city !== "all") applied.push({ key: "city", label: cityName ?? query.city, clear: { city: "all" } });
  if (query.date !== "upcoming") applied.push({ key: "date", label: DATE_LABELS[query.date], clear: { date: "upcoming" } });
  if (query.price !== "all") applied.push({ key: "price", label: PRICE_LABELS[query.price], clear: { price: "all" } });
  if (query.organizer !== "all") applied.push({ key: "organizer", label: organizerName ?? query.organizer, clear: { organizer: "all" } });

  const clearAll = () => navigate({ q: "", category: "all", city: "all", date: "upcoming", price: "all", organizer: "all" });

  return (
    <div className="flex flex-col gap-4">
      {/* Row 1: search, then the filters inline from tablet up (same row on desktop). */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <SearchField className="lg:min-w-0 lg:flex-1" />

        <div className="hidden flex-wrap items-center gap-2 md:flex lg:flex-none">
          <label htmlFor={dateId} className="sr-only">
            Date
          </label>
          <Select id={dateId} value={query.date} onValueChange={(v) => navigate({ date: v as DateFilter })} options={DATE_OPTIONS} className="w-40" />
          <label htmlFor={cityId} className="sr-only">
            Location
          </label>
          <Select id={cityId} value={query.city} onValueChange={(v) => navigate({ city: v as EventQuery["city"] })} options={locations} className="w-40" />
          <SegmentedControl aria-label="Price" value={query.price} onValueChange={(v) => navigate({ price: v as PriceFilter })} options={PRICE_OPTIONS} />
        </div>

        {/* Phones: one tap to all filters, plus sorting. */}
        <div className="grid grid-cols-2 gap-2 md:hidden">
          <Button variant="secondary" onClick={() => setSheetOpen(true)} aria-haspopup="dialog">
            <FilterIcon className="size-4" />
            Filters
            {sheetCount > 0 && (
              <CountBadge inline soft>
                {sheetCount}
              </CountBadge>
            )}
          </Button>
          <div>
            <label htmlFor={sortMobileId} className="sr-only">
              Sort by
            </label>
            <Select id={sortMobileId} value={query.sort} onValueChange={(v) => navigate({ sort: v as SortOption })} options={(Object.keys(SORT_SHORT_LABELS) as SortOption[]).map((o) => ({ value: o, label: `Sort: ${SORT_SHORT_LABELS[o]}` }))} />
          </div>
        </div>
      </div>

      {/* Row 2: categories, always one tap away. Scrolls sideways on phones, wraps from tablet up. */}
      <div role="group" aria-label="Category" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-0.5 [scrollbar-width:none] sm:-mx-6 sm:px-6 md:mx-0 md:flex-wrap md:overflow-visible md:px-0 [&::-webkit-scrollbar]:hidden">
        <Chip className="flex-none" selected={query.category === "all"} aria-pressed={query.category === "all"} onClick={() => navigate({ category: "all" })}>
          All categories
        </Chip>
        {facets.categories.map((c) => (
          <Chip key={c.id} className="flex-none" selected={query.category === c.id} aria-pressed={query.category === c.id} onClick={() => navigate({ category: query.category === c.id ? "all" : c.id })}>
            {c.name}
          </Chip>
        ))}
      </div>

      {/* Row 3: the results bar — count, what's applied, and sorting (desktop) on the right. */}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-2 border-t border-border pt-4">
        <p className="m-0 mr-1 type-body font-semibold text-text" aria-live="polite">
          {total === 1 ? "1 event" : `${total} events`}
        </p>
        {applied.map((a) => (
          <Chip key={a.key} selected onRemove={() => navigate(a.clear)} removeLabel={`Remove ${a.label}`}>
            {a.label}
          </Chip>
        ))}
        {(applied.length > 1 || activeFilterCount(query) > 0) && (
          <TextLink type="button" onClick={clearAll}>
            Clear all
          </TextLink>
        )}
        <div className="ml-auto hidden items-center gap-2 md:flex">
          <label htmlFor={sortId} className="type-body-sm text-text-soft">
            Sort by
          </label>
          <Select id={sortId} value={query.sort} onValueChange={(v) => navigate({ sort: v as SortOption })} options={(Object.keys(SORT_LABELS) as SortOption[]).map((o) => ({ value: o, label: SORT_LABELS[o] }))} className="w-44" />
        </div>
      </div>

      {/* Phone filter sheet: chips apply at once, the button shows the live count and closes the sheet. */}
      <BottomSheet open={sheetOpen} onOpenChange={setSheetOpen} title="Filters" subtitle="Choices apply as you tap them.">
        <div className="flex flex-col gap-6 pt-2">
          <SheetSection title="Date">
            <div className="flex flex-wrap gap-2">
              {DATE_OPTIONS.map((o) => (
                <Chip key={o.value} selected={query.date === o.value} aria-pressed={query.date === o.value} onClick={() => navigate({ date: o.value })}>
                  {o.label}
                </Chip>
              ))}
            </div>
          </SheetSection>
          <SheetSection title="Location">
            <div className="flex flex-wrap gap-2">
              {locations.map((o) => (
                <Chip key={o.value} selected={query.city === o.value} aria-pressed={query.city === o.value} onClick={() => navigate({ city: o.value as EventQuery["city"] })}>
                  {o.label}
                </Chip>
              ))}
            </div>
          </SheetSection>
          <SheetSection title="Price">
            <SegmentedControl aria-label="Price" block value={query.price} onValueChange={(v) => navigate({ price: v as PriceFilter })} options={PRICE_OPTIONS} />
          </SheetSection>
        </div>
        <div className="sticky bottom-0 -mx-4 mt-6 flex flex-col gap-2 border-t border-border bg-surface px-4 pt-3">
          <Button className="w-full" loading={pending} loadingLabel="Updating" onClick={() => setSheetOpen(false)}>
            {total === 1 ? "Show 1 event" : `Show ${total} events`}
          </Button>
          {sheetCount > 0 && (
            <TextLink type="button" soft className="self-center py-1" onClick={() => navigate({ date: "upcoming", city: "all", price: "all" })}>
              Reset filters
            </TextLink>
          )}
        </div>
      </BottomSheet>
    </div>
  );
}
