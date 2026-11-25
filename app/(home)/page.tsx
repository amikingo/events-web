import Link from "next/link";
import { CategoryBento } from "../../components/marketplace/home/category-bento";
import { LandingHeading, LandingSection } from "../../components/marketplace/home/landing-section";
import { landingType } from "../../components/marketplace/home/landing-type";
import { Hero } from "../../components/marketplace/home/hero";
import { QuickPicks } from "../../components/marketplace/home/quick-picks";
import type { PickTab } from "../../components/marketplace/home/quick-picks";
import { PinnedTrack, PinnedTrackItem } from "../../components/marketplace/home/pinned-track";
import { Reveal } from "../../components/marketplace/home/reveal";
import { ScrollZoomGallery } from "../../components/marketplace/home/scroll-zoom-gallery";
import { SpotlightCarousel } from "../../components/marketplace/home/spotlight-carousel";
import { WhyBookReveal } from "../../components/marketplace/home/why-book-reveal";
import { EventCard, whereLabel } from "../../components/marketplace/event-card";
import { NearbyEvents } from "../../components/marketplace/nearby-events";
import { NewsletterSignup } from "../../components/marketplace/newsletter-signup";
import { OrganizerShowcase } from "../../components/marketplace/home/organizer-showcase";
import type { ShowcaseEvent } from "../../components/marketplace/home/organizer-showcase";
import { Container, EventGrid } from "../../components/marketplace/section";
import { Button } from "../../components/ui/button";
import { EmptyState } from "../../components/ui/empty-state";
import { CalendarIcon } from "../../components/ui/icons";
import { exploreHref } from "../../lib/marketplace/query";
import { cn } from "../../lib/utils";
import { CatalogUnavailable } from "../../components/marketplace/public/catalog-states";
import { eventsService } from "../../lib/services/events-service";
import type { EventSummary } from "../../types/marketplace";

function PickPanel({ events, now, empty }: { events: EventSummary[]; now: string; empty: string }) {
  if (!events.length) {
    return (
      <EmptyState
        icon={<CalendarIcon />}
        title={empty}
        description="New events are added every day. Browse everything coming up."
        actions={
          <Button asChild variant="secondary">
            <Link href="/events">Browse upcoming events</Link>
          </Button>
        }
      />
    );
  }
  return <EventGrid events={events} now={now} />;
}

/** The marketplace landing page, at `/`. Header and footer come from the layout in this route group. */
export default async function HomePage() {
  // An empty list would read as "no events": when the API can't be reached, say so instead.
  if (!(await eventsService.isAvailable())) {
    return (
      <Container className="py-24">
        <CatalogUnavailable retryHref="/" />
      </Container>
    );
  }
  const home = await eventsService.getHome();
  const { picks, now } = home;

  // Each organizer's next three events on sale, soonest first, for the organizers spotlight.
  const organizerEvents: Record<string, ShowcaseEvent[]> = {};
  for (const e of [...home.wall].sort((a, b) => a.startsAt.localeCompare(b.startsAt))) {
    const list = (organizerEvents[e.organizerId] ??= []);
    if (list.length < 3) list.push({ id: e.id, slug: e.slug, title: e.title, startsAt: e.startsAt, timezone: e.timezone, where: whereLabel(e) });
  }

  const tabs: PickTab[] = [
    { value: "week", label: "This week", count: home.thisWeek.length, href: exploreHref({ date: "week" }), content: <PickPanel events={home.thisWeek} now={now} empty="Nothing on this week" /> },
    { value: "today", label: "Today", count: picks.today.length, href: exploreHref({ date: "today" }), content: <PickPanel events={picks.today} now={now} empty="Nothing on today" /> },
    { value: "weekend", label: "Weekend", count: picks.weekend.length, href: exploreHref({ date: "weekend" }), content: <PickPanel events={picks.weekend} now={now} empty="Nothing on this weekend" /> },
    { value: "free", label: "Free", count: picks.free.length, href: exploreHref({ price: "free" }), content: <PickPanel events={picks.free} now={now} empty="No free events right now" /> },
    { value: "online", label: "Online", count: picks.online.length, href: exploreHref({ city: "online" }), content: <PickPanel events={picks.online} now={now} empty="No online events right now" /> },
  ];

  return (
    <>
      {/* 1–2. Hero: search over a live wall of what's on */}
      <Hero cities={home.cities} wall={home.wall} liveCount={home.liveCount} />

      {/* 3. Featured, as a cinematic carousel */}
      {/* {home.spotlight.length > 0 && (
        <section aria-labelledby="spotlight" className="overflow-hidden py-14 sm:py-20">
          <Container>
            <SpotlightCarousel events={home.spotlight} now={now} />
          </Container>
        </section>
      )} */}

      {/* 7. This week (and today / weekend / free / online) */}
      {/* <section aria-labelledby="quick-picks" className="border-y border-border bg-surface py-14 sm:py-20">
        <Container>
          <QuickPicks tabs={tabs} />
        </Container>
      </section> */}

      {/* 4. Trending */}
      <PinnedTrack header={<LandingHeading id="trending" eyebrow="Hot right now" title="Trending now" description="What people are booking fastest this week." href={exploreHref()} />}>
        {home.trending.slice(0, 5).map((e, i) => (
          <PinnedTrackItem key={e.id}>
            <EventCard event={e} now={now} rank={i + 1} />
          </PinnedTrackItem>
        ))}
      </PinnedTrack>

      {/* Scroll-driven fly-through of the poster wall */}
      
      {home.wall.length > 0 && <ScrollZoomGallery events={home.wall.slice(0, 7)} />}

      {/* 6. Categories */}
      <LandingSection id="categories" eyebrow="Explore" title="Browse by category" description="From jazz nights to tech summits." href="/events" linkLabel="All events" className="pt-4 sm:pt-8">
        <CategoryBento categories={home.categories} />
      </LandingSection>

      {/* 5. Upcoming */}
      <LandingSection id="upcoming" eyebrow="On sale now" title="Coming up" description="The next events you can still get tickets for." href={exploreHref({ sort: "upcoming" })} className="pt-0 sm:pt-0">
        <EventGrid events={home.upcoming.slice(0, 6)} now={now} mobileLimit={3} />
      </LandingSection>

      {/* 8. Near you */}
      <LandingSection id="near-you" eyebrow="Close to home" title="Events near you" description="Pick a city, or let your browser find the closest one." className="border-y border-border bg-surface">
        <NearbyEvents cities={home.cities} byCity={home.nearby} now={now} />
      </LandingSection>

      {/* Why book here: a dark circle opens, then the promises light up */}
      <WhyBookReveal />

      {/* 9. Organizers */}
      <LandingSection id="organizers" eyebrow="Organizers" title="The people behind the events" description="Follow the organizers you love and never miss their next one." className="pt-4 sm:pt-8">
        <OrganizerShowcase organizers={home.organizers} events={organizerEvents} />
      </LandingSection>

      {/* 10. Newsletter */}
      {/* <section aria-labelledby="newsletter-title" className="pb-4 pt-8 sm:pt-12">
        <Container>
          <div className="relative isolate overflow-hidden rounded-lg bg-paper-ink px-6 py-12 text-white sm:px-12 sm:py-16">
            <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-24 -z-10 size-[380px] rounded-full bg-accent-fill opacity-30 blur-[110px]" />
            <div aria-hidden="true" className="pointer-events-none absolute -bottom-32 left-1/3 -z-10 size-[320px] rounded-full bg-cbe opacity-30 blur-[110px]" />
            <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,440px)]">
              <div>
                <p className={cn("m-0 text-accent-light", landingType.eyebrow)}>Every Friday</p>
                <h2 id="newsletter-title" className={cn("m-0 mt-3 max-w-[560px] text-white", landingType.title)}>
                  The week&rsquo;s best events, before they sell out
                </h2>
                <p className={cn("m-0 mt-3 max-w-[480px] text-white/75", landingType.lead)}>One short email with hand-picked events and early-bird releases. Unsubscribe any time.</p>
              </div>
              <NewsletterSignup className="max-w-[520px] lg:max-w-none" />
            </div>
          </div>
        </Container>
      </section> */}
    </>
  );
}
