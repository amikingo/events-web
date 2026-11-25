import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/marketplace/section";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { DocIcon } from "@/components/ui/icons";

export const metadata: Metadata = { title: "Find your ticket", robots: { index: false } };

/**
 * There are no attendee accounts yet: a registration is its code. This page says where the code is, instead of
 * pretending to list tickets it can't look up.
 */
export default function MyTicketsPage() {
  return (
    <Container className="py-10 sm:py-14">
      <EmptyState
        size="lg"
        tone="accent"
        icon={<DocIcon />}
        title="Your ticket is your code"
        description="When you register, we show an 8-character code on screen and text it to your phone. Show it at the door. Lost it? Look for the SMS from the organizer, or ask them at the event."
        actions={
          <Button asChild>
            <Link href="/events">Browse events</Link>
          </Button>
        }
      />
    </Container>
  );
}
