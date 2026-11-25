import Link from "next/link";
import { Container } from "@/components/marketplace/section";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { SearchIcon } from "@/components/ui/icons";

export default function EventNotFound() {
  return (
    <Container className="py-16">
      <EmptyState
        size="lg"
        tone="charcoal"
        ring
        icon={<SearchIcon />}
        title="We can't find that event"
        description="The link may be wrong, or the organizer hasn't published the event."
        actions={
          <Button asChild>
            <Link href="/events">Explore events</Link>
          </Button>
        }
      />
    </Container>
  );
}
