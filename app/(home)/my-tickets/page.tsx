import type { Metadata } from "next";
import { MyTicketsView } from "@/components/marketplace/my-tickets-view";
import { Container } from "@/components/marketplace/section";

export const metadata: Metadata = { title: "My tickets", robots: { index: false } };

/** Guest registrations across organizers (`GET /v1/customer/registrations`), or the signed-out code guide. */
export default function MyTicketsPage() {
  return (
    <Container className="py-8 sm:py-12">
      <h1 className="m-0 mb-6 type-h1 text-text">My tickets</h1>
      <MyTicketsView />
    </Container>
  );
}
