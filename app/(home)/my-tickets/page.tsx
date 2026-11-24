import type { Metadata } from "next";
import { Container } from "../../../components/marketplace/section";
import { MyTicketsView } from "../../../components/marketplace/tickets/my-tickets-view";
import { eventsService } from "../../../lib/services/events-service";

export const metadata: Metadata = { title: "My tickets", robots: { index: false } };

export default async function MyTicketsPage() {
  const [events, now] = await Promise.all([eventsService.getSummaryLookup(), eventsService.getNow()]);
  return (
    <Container className="py-8 sm:py-10">
      <div className="mb-6">
        <h1 className="m-0 type-h1 text-text">My tickets</h1>
        <p className="m-0 mt-1 type-body text-text-soft">Your bookings, ready to show at the door.</p>
      </div>
      <MyTicketsView events={events} serverNow={now} />
    </Container>
  );
}
