import type { Metadata } from "next";
import { OrderStatusView } from "@/components/marketplace/public/order-status";
import { Container } from "@/components/marketplace/section";

type Params = Promise<{ reference: string }>;

export const metadata: Metadata = { title: "Your order", robots: { index: false } };

/** Where Cheche Pay sends the buyer back: `/orders/{reference}`. Everything else happens in the browser, with the stored token. */
export default async function OrderPage({ params }: { params: Params }) {
  const { reference } = await params;
  return (
    <Container className="max-w-[720px] py-10">
      <OrderStatusView reference={decodeURIComponent(reference)} />
    </Container>
  );
}
