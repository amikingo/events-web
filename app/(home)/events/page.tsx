import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { EventFilters, ExploreResultsFrame, ExploreShell } from "../../../components/marketplace/event-filters";
import { Pagination } from "../../../components/marketplace/pagination";
import { Container, EventGrid, EventGridSkeleton } from "../../../components/marketplace/section";
import { Button } from "../../../components/ui/button";
import { EmptyState } from "../../../components/ui/empty-state";
import { SearchIcon } from "../../../components/ui/icons";
import { Skeleton } from "../../../components/ui/skeleton";
import { parseEventQuery } from "../../../lib/marketplace/query";
import { CatalogUnavailable } from "../../../components/marketplace/public/catalog-states";
import { eventsService } from "../../../lib/services/events-service";

export const metadata: Metadata = {
  title: "Explore events",
  description: "Search concerts, conferences, festivals, workshops and more by date, city and price.",
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

async function ExploreResults({ searchParams }: { searchParams: SearchParams }) {
  const query = parseEventQuery(await searchParams);
  if (!(await eventsService.isAvailable())) return <CatalogUnavailable retryHref="/events" />;
  const [result, facets, now] = await Promise.all([eventsService.list(query), eventsService.getFacets(), eventsService.getNow()]);
  const filtered = Boolean(query.q) || query.category !== "all" || query.city !== "all" || query.date !== "upcoming" || query.price !== "all" || query.organizer !== "all";

  return (
    <ExploreShell query={query}>
      <EventFilters facets={facets} total={result.total} />
      <div className="mt-8">
        <ExploreResultsFrame>
          {result.items.length ? (
            <>
              <EventGrid events={result.items} now={now} />
              <Pagination query={query} page={result.page} totalPages={result.totalPages} />
            </>
          ) : (
            <EmptyState
              size="lg"
              tone="charcoal"
              icon={<SearchIcon />}
              title={query.q ? "No events match your search" : "No events match these filters"}
              description={query.q ? <>Nothing found for <code>{query.q}</code>. Check the spelling or try a broader word.</> : "Try another date or city, or clear the filters."}
              actions={
                filtered ? (
                  <Button asChild variant="secondary">
                    <Link href="/events">Clear filters</Link>
                  </Button>
                ) : undefined
              }
              animate
            />
          )}
        </ExploreResultsFrame>
      </div>
    </ExploreShell>
  );
}

/** Same shape as the filters and results, so nothing jumps when they stream in. */
function ExploreSkeleton() {
  return (
    <div aria-hidden="true">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <Skeleton shape="input" className="lg:flex-1" />
        <div className="hidden gap-2 md:flex">
          <Skeleton shape="input" width={160} />
          <Skeleton shape="input" width={160} />
          <Skeleton shape="input" width={210} />
        </div>
        <div className="grid grid-cols-2 gap-2 md:hidden">
          <Skeleton shape="button" width="100%" />
          <Skeleton shape="input" />
        </div>
      </div>
      <div className="mt-4 flex gap-2 overflow-hidden">
        {Array.from({ length: 7 }, (_, i) => (
          <Skeleton key={i} shape="pill" width={i === 0 ? 116 : 92} height={30} className="flex-none" />
        ))}
      </div>
      <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
        <Skeleton width={80} />
        <Skeleton shape="input" width={240} className="hidden md:block" />
      </div>
      <div className="mt-8">
        <EventGridSkeleton count={6} />
      </div>
    </div>
  );
}

export default function ExplorePage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <Container className="py-8 sm:py-10">
      <div className="mb-6">
        <h1 className="m-0 type-h1 text-text">Explore events</h1>
        <p className="m-0 mt-1 type-body text-text-soft">Concerts, conferences, festivals and workshops across Ethiopia and online.</p>
      </div>
      {/* Search params are request data: the filters and results stream in behind this skeleton. */}
      <Suspense fallback={<ExploreSkeleton />}>
        <ExploreResults searchParams={searchParams} />
      </Suspense>
    </Container>
  );
}
