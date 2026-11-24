import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DetailSection, EventAgenda, EventDetailsHeader, EventNotices, OrganizerContact, RefundPolicyBlock, SpeakerList, VenueMap } from "../../../../components/marketplace/event-details";
import { Container, EventGrid } from "../../../../components/marketplace/section";
import { TicketSelector } from "../../../../components/marketplace/ticket-selector";
import { MonitorIcon } from "../../../../components/ui/icons";
import { formatEventDate } from "../../../../lib/marketplace/datetime";
import { SERVICE_FEE_RATE, VAT_RATE } from "../../../../lib/marketplace/config";
import { eventsService } from "../../../../lib/services/events-service";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const detail = await eventsService.getBySlug(slug);
  if (!detail) return { title: "Event not found", robots: { index: false } };
  const { event, city } = detail;
  return {
    title: event.title,
    description: `${event.summary} ${formatEventDate(event.startsAt, { weekday: true })}${city ? `, ${city.name}` : ""}.`,
  };
}

/** Rendered on every request (no caching); an unknown slug answers with a real 404 and the not-found screen. */
export default async function EventPage({ params }: { params: Params }) {
  const { slug } = await params;
  const detail = await eventsService.getBySlug(slug);
  if (!detail) notFound();
  const { event, organizer, venue, city, category, related, now, organizerUpcoming } = detail;

  return (
    <>
      <Container className="pb-28 pt-6 lg:pb-12">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-10">
          <div className="min-w-0">
            <EventDetailsHeader event={event} organizer={organizer} venue={venue} city={city} categoryName={category.name} now={now} />
            <div className="mt-6">
              <EventNotices event={event} now={now} />
            </div>

            <DetailSection id="about" title="About this event">
              <div className="flex max-w-[680px] flex-col gap-3">
                {event.description.map((p) => (
                  <p key={p.slice(0, 32)} className="m-0 type-body text-text-soft">
                    {p}
                  </p>
                ))}
              </div>
              <dl className="m-0 mt-5 flex flex-wrap gap-x-8 gap-y-2 type-body-sm">
                <div>
                  <dt className="type-label text-text-faint">Language</dt>
                  <dd className="m-0 text-text">{event.language}</dd>
                </div>
                {event.ageRestriction && (
                  <div>
                    <dt className="type-label text-text-faint">Age</dt>
                    <dd className="m-0 text-text">{event.ageRestriction}</dd>
                  </div>
                )}
                {venue && (
                  <div>
                    <dt className="type-label text-text-faint">Capacity</dt>
                    <dd className="m-0 text-text">{venue.capacity.toLocaleString("en-US")} people</dd>
                  </div>
                )}
              </dl>
            </DetailSection>

            <DetailSection id="agenda" title="Agenda">
              <EventAgenda agenda={event.agenda} speakers={event.speakers} />
            </DetailSection>

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
                    <p className="m-0 type-body font-semibold text-text">Online on {event.onlinePlatform}</p>
                    <p className="m-0 type-body-sm text-text-soft">The join link appears on your ticket and is sent by email after you register.</p>
                  </div>
                </div>
              )}
              {event.format === "hybrid" && <p className="m-0 mt-3 type-body-sm text-text-soft">You can also join online on {event.onlinePlatform}. Pick an online seat when choosing tickets.</p>}
            </DetailSection>

            <DetailSection id="pricing" title="Pricing and fees">
              <p className="m-0 max-w-[680px] type-body text-text-soft">
                Ticket prices are set by the organizer. A service fee of {Math.round(SERVICE_FEE_RATE * 100)}% per paid ticket and VAT of {Math.round(VAT_RATE * 100)}% on that fee are added at checkout, and the full total is shown before you pay. Free tickets have no fees.
              </p>
            </DetailSection>

            <DetailSection id="refunds" title="Refunds and cancellation">
              <RefundPolicyBlock policy={event.refundPolicy} />
            </DetailSection>

            <DetailSection id="organizer" title="Organizer">
              <OrganizerContact organizer={organizer} upcoming={organizerUpcoming} />
            </DetailSection>
          </div>

          <aside id="tickets" aria-label="Tickets" className="scroll-mt-24 lg:sticky lg:top-24 lg:self-start">
            <TicketSelector
              serverNow={now}
              event={{ id: event.id, slug: event.slug, title: event.title, lifecycle: event.lifecycle, startsAt: event.startsAt, endsAt: event.endsAt, ticketTypes: event.ticketTypes }}
            />
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
