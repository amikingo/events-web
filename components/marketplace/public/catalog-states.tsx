import Link from "next/link";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { CalendarIcon } from "@/components/ui/icons";

/** Shown when the public API can't be reached: the page stays up and says so, with a way to try again. */
export function CatalogUnavailable({ retryHref }: { retryHref: string }) {
  return (
    <EmptyState
      size="lg"
      tone="danger"
      title="We can't load events right now"
      description="The events service isn't answering. Nothing is wrong with your connection or your registration. Try again in a moment."
      actions={
        <Button asChild>
          <Link href={retryHref}>Try again</Link>
        </Button>
      }
    />
  );
}

/** Shown when there is nothing to list yet, or nothing matches the filter. */
export function NoEvents({ filtered }: { filtered: boolean }) {
  return (
    <EmptyState
      size="lg"
      tone={filtered ? "charcoal" : "accent"}
      icon={<CalendarIcon />}
      title={filtered ? "No events match this filter" : "No events yet"}
      description={filtered ? "Try another category, or see everything that's coming up." : "Organizers haven't published any public events yet. Check back soon."}
      actions={
        filtered ? (
          <Button asChild variant="secondary">
            <Link href="/events">See all events</Link>
          </Button>
        ) : undefined
      }
    />
  );
}
