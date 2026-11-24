import type { Metadata } from "next";
import { Suspense } from "react";
import { Container } from "../../../../components/marketplace/section";
import { TicketDetailView } from "../../../../components/marketplace/tickets/ticket-detail-view";
import { Skeleton } from "../../../../components/ui/skeleton";
import { eventsService } from "../../../../lib/services/events-service";

export const metadata: Metadata = { title: "Ticket", robots: { index: false } };

type Params = Promise<{ ticketId: string }>;

async function Ticket({ params }: { params: Params }) {
  const { ticketId } = await params;
  const [events, now] = await Promise.all([eventsService.getSummaryLookup(), eventsService.getNow()]);
  return <TicketDetailView ticketId={decodeURIComponent(ticketId)} events={events} serverNow={now} />;
}

export default function TicketPage({ params }: { params: Params }) {
  return (
    <Container className="py-8 sm:py-10">
      <Suspense fallback={<Skeleton className="mx-auto h-[320px] max-w-[760px] rounded-lg" />}>
        <Ticket params={params} />
      </Suspense>
    </Container>
  );
}
