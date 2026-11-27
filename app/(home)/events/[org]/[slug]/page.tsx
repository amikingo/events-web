import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DetailSection, EventAgenda, EventHero, EventNotices, OrganizerContact, SpeakerList, VenueMap } from "@/components/marketplace/event-details";
import { Container, EventGrid } from "@/components/marketplace/section";
import { CheckoutForm } from "@/components/marketplace/public/checkout-form";
import { formatPrice } from "@/lib/price";
import { Card } from "@/components/ui/card";
import { MonitorIcon } from "@/components/ui/icons";
import { formatDateShort, formatMomentFull } from "@/lib/ethiopian-datetime";
import { eventsService } from "@/lib/services/events-service";

type Params = Promise<{ org: string; slug: string }>;

/** The catalog's event slug is `<organization>/<event>`: the API needs both to find an event. */
const keyOf = async (params: Params) => {
  const { org, slug } = await params;
  return `${org}/${slug}`;
};

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const detail = await eventsService.getBySlug(await keyOf(params));
  if (!detail) return { title: "Event not found", robots: { index: false } };
  const { event, city } = detail;
  return {
    title: event.title,
    description: event.description[0]?.slice(0, 160) ?? `${event.title}, by ${detail.organizer.name}. ${formatDateShort(event.startsAt, event.timezone)}${city ? `, ${city.name}` : ""}.`,
  };
}

/** Why the form isn't shown, in words. */
function registrationClosedText(event: { endsAt: string; timezone?: string; registration?: { opensAt: string | null } }, nowIso: string): string {
  const now = Date.parse(nowIso);
  if (now >= Date.parse(event.endsAt)) return "This event has ended.";
  const opens = event.registration?.opensAt;
  if (opens && now < Date.parse(opens)) return `Registration opens ${formatMomentFull(opens, event.timezone)}.`;
  return "Registration for this event has closed.";
}

/** Rendered on every request (no caching); an unknown event answers with a real 404 and the not-found screen. */
export default async function EventPage({ params }: { params: Params }) {
  const detail = await eventsService.getBySlug(await keyOf(params));
  if (!detail) notFound();
  const { event, organizer, venue, city, category, related, now, organizerUpcoming } = detail;

  return (
    <>
      <EventHero event={event} venue={venue} city={city} categoryName={category.name} now={now} />
      <Container className="pb-28 pt-2 lg:pb-12">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-12">
          <div className="min-w-0">
            <EventNotices event={event} now={now} />

            {event.description.length > 0 && (
            <DetailSection id="about" title="About this event">
              <div className="flex max-w-[680px] flex-col gap-3">
                {event.description.map((p) => (
                  <p key={p.slice(0, 32)} className="m-0 type-body text-text-soft">
                    {p}
                  </p>
                ))}
              </div>
              <dl className="m-0 mt-5 flex flex-wrap gap-x-8 gap-y-2 type-body-sm">
                {event.language && (
                  <div>
                    <dt className="type-label text-text-faint">Language</dt>
                    <dd className="m-0 text-text">{event.language}</dd>
                  </div>
                )}
                {event.ageRestriction && (
                  <div>
                    <dt className="type-label text-text-faint">Age</dt>
                    <dd className="m-0 text-text">{event.ageRestriction}</dd>
                  </div>
                )}
                {venue && venue.capacity > 0 && (
                  <div>
                    <dt className="type-label text-text-faint">Capacity</dt>
                    <dd className="m-0 text-text">{venue.capacity.toLocaleString("en-US")} people</dd>
                  </div>
                )}
              </dl>
            </DetailSection>
            )}

            {event.agenda.length > 0 && (
              <DetailSection id="agenda" title="Agenda">
                <EventAgenda agenda={event.agenda} speakers={event.speakers} />
              </DetailSection>
            )}

            {event.speakers.length > 0 && (
              <DetailSection id="speakers" title={event.categoryId === "music" ? "Line-up" : "Speakers and hosts"}>
                <SpeakerList speakers={event.speakers} />
              </DetailSection>
            )}

            <DetailSection id="location" title="Location">
              {venue ? (
                <VenueMap venue={venue} city={city} />
              ) : (
                <div className="flex items-start gap-3 rounded-md border border-border bg-surface p-4">
                  <MonitorIcon className="mt-0.5 size-5 flex-none text-accent-text" />
                  <div>
                    <p className="m-0 type-body font-semibold text-text">Venue to be announced</p>
                    <p className="m-0 type-body-sm text-text-soft">The organizer hasn&apos;t chosen a venue yet. Check back closer to the date.</p>
                  </div>
                </div>
              )}
            </DetailSection>

            <DetailSection id="organizer" title="Organizer">
              <OrganizerContact organizer={organizer} upcoming={organizerUpcoming} />
            </DetailSection>
          </div>

          <aside id="tickets" aria-label="Tickets" className="scroll-mt-24 lg:sticky lg:top-24 lg:self-start">
            <Card>
              <h2 className="m-0 type-h2 text-text">Tickets</h2>
              {/* While tickets are on sale the checkout lists them with prices; otherwise show what there will be. */}
              {!event.registration?.open && (event.registration?.ticketTypes.length ?? 0) > 0 && (
                <ul className="m-0 mt-3 flex list-none flex-col divide-y divide-border rounded-md border border-border p-0" aria-label="Tickets">
                  {event.registration!.ticketTypes.map((t) => (
                    <li key={t.code} className="flex items-center justify-between gap-3 px-3 py-2.5">
                      <span className="type-body text-text">{t.name}</span>
                      <span className="type-body font-semibold text-text">{formatPrice(t.price, t.currency)}</span>
                    </li>
                  ))}
                </ul>
              )}
              {event.lifecycle === "cancelled" ? (
                <p className="m-0 mt-3 type-body text-text-soft" role="status">
                  This event was cancelled.
                </p>
              ) : event.registration?.open ? (
                <div className="mt-4">
                  <CheckoutForm organizationSlug={event.registration.organizationSlug} eventSlug={event.registration.eventSlug} registration={event.registration} />
                </div>
              ) : (
                <p className="m-0 mt-3 type-body text-text-soft" role="status">
                  {registrationClosedText(event, now)}
                </p>
              )}
            </Card>
          </aside>
        </div>
      </Container>

      {related.length > 0 && (
        <section aria-labelledby="related" className="border-t border-border bg-surface py-10">
          <Container>
            <h2 id="related" className="m-0 mb-5 type-h2 text-text">
              You might also like
            </h2>
            <EventGrid events={related} now={now} scroll />
          </Container>
        </section>
      )}
    </>
  );
}
