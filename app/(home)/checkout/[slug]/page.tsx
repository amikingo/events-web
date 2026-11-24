import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckoutFlow } from "../../../../components/marketplace/checkout/checkout-flow";
import { whereLabel } from "../../../../components/marketplace/event-card";
import { Container } from "../../../../components/marketplace/section";
import { ArrowLeftIcon } from "../../../../components/ui/icons";
import { eventsService } from "../../../../lib/services/events-service";

type Params = Promise<{ slug: string }>;

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };

/**
 * The event is read on every request (no caching), so availability is current when checkout opens; the draft, hold,
 * verification and payment all live in the client flow. An unknown slug answers with a real 404.
 */
export default async function CheckoutPage({ params }: { params: Params }) {
  const { slug } = await params;
  const detail = await eventsService.getBySlug(slug);
  if (!detail) notFound();
  const { event, summary, now } = detail;

  return (
    <Container className="py-6 sm:py-8">
      <Link href={`/events/${event.slug}`} className="mb-5 inline-flex items-center gap-1.5 rounded-sm type-body-sm font-semibold text-text-soft hover:text-text">
        <ArrowLeftIcon className="size-4" /> Back to {event.title}
      </Link>
      <CheckoutFlow
        serverNow={now}
        event={{
          id: event.id,
          slug: event.slug,
          title: event.title,
          startsAt: event.startsAt,
          endsAt: event.endsAt,
          where: whereLabel(summary),
          categoryId: event.categoryId,
          coverPattern: event.coverPattern,
          lifecycle: event.lifecycle,
          ticketTypes: event.ticketTypes,
          attendeeQuestions: event.attendeeQuestions,
          refundSummary: event.refundPolicy.summary,
        }}
      />
    </Container>
  );
}
