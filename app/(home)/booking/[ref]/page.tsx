import type { Metadata } from "next";
import { Suspense } from "react";
import { BookingConfirmation } from "../../../../components/marketplace/booking-confirmation";
import { Container } from "../../../../components/marketplace/section";
import { Skeleton } from "../../../../components/ui/skeleton";
import { eventsService } from "../../../../lib/services/events-service";

export const metadata: Metadata = { title: "Booking confirmation", robots: { index: false } };

type Params = Promise<{ ref: string }>;

/** The reference is request data (not known at build time), so the booking streams in behind a skeleton. */
async function Booking({ params }: { params: Params }) {
  const { ref } = await params;
  const [events, now] = await Promise.all([eventsService.getSummaryLookup(), eventsService.getNow()]);
  return <BookingConfirmation orderRef={decodeURIComponent(ref)} events={events} serverNow={now} />;
}

export default function BookingPage({ params }: { params: Params }) {
  return (
    <Container className="py-10">
      <Suspense
        fallback={
          <div className="mx-auto flex max-w-[760px] flex-col gap-4">
            <Skeleton shape="title" />
            <Skeleton shape="block" />
          </div>
        }
      >
        <Booking params={params} />
      </Suspense>
    </Container>
  );
}
