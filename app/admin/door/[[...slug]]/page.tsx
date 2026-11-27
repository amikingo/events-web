"use client";

import { useQuery } from "@tanstack/react-query";
import { DoorOpen } from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { NoOrganization, useOrganizationId } from "@/app/admin/_components/organization-scope";
import { DoorScreen } from "@/app/admin/events/[[...slug]]/door";
import { useModuleAccess } from "@/components/ability-provider";
import { Combobox } from "@/components/ui/combobox";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { describeApiError } from "@/lib/api/errors";
import { listEvents } from "@/lib/api/events";
import type { StaffEvent } from "@/lib/api/events";
import { MODULE_CODES } from "@/lib/constants/modules";
import { formatMomentShort } from "@/lib/ethiopian-datetime";
import { eventQk } from "@/lib/query-keys";

/** Only published events let guests in. */
const PUBLISHED = { page: 1, pageSize: 100, status: "PUBLISHED" as const };

/**
 * The event most likely at the door now: one running, then the next to start, then the latest that started.
 * `now` is read once per render; the door screen keeps its own clock for the door window.
 */
function likelyEvent(events: StaffEvent[], now: number): StaffEvent | undefined {
  const live = events.find((e) => e.display_status === "LIVE");
  if (live) return live;
  const opensAt = (e: StaffEvent) => Date.parse(e.doors_open_at ?? e.starts_at ?? "");
  const upcoming = events.filter((e) => opensAt(e) > now).sort((a, b) => opensAt(a) - opensAt(b));
  return upcoming[0] ?? events[0];
}

/**
 * Door (menu-only module, guarded by Guests): pick a published event, then scan or type codes. The same screen as
 * an event's own Door page; the chosen event lives in `?event=` so a gate phone can be bookmarked on it.
 */
function DoorView({ organizationId }: { organizationId: string }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { can } = useModuleAccess();
  const events = useQuery({ queryKey: eventQk.list(organizationId, PUBLISHED), queryFn: ({ signal }) => listEvents(organizationId, PUBLISHED, signal) });
  const all = events.data?.data ?? [];
  const wanted = searchParams.get("event");
  // eslint-disable-next-line react-hooks/purity -- picking a default event only; a stale "now" just picks the same one
  const picked = all.find((e) => e.id === wanted) ?? likelyEvent(all, Date.now());

  const pick = (id: string) => window.history.replaceState(null, "", `${pathname}?event=${encodeURIComponent(id)}`);

  if (!can("update", MODULE_CODES.REGISTRATIONS)) {
    return <EmptyState size="lg" title="You can't let guests in" description="Ask an admin for the Guests › update right." />;
  }
  if (events.isError) {
    return <EmptyState size="lg" tone="danger" title="We couldn't load your events" description={describeApiError(events.error, "event")} />;
  }
  if (events.isPending) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton shape="title" />
        <Skeleton shape="block" height={88} />
        <Skeleton shape="block" height={360} />
      </div>
    );
  }
  if (!picked) {
    return <EmptyState size="lg" icon={<DoorOpen />} title="No published events" description="Publish an event to let its guests in here." />;
  }

  return (
    <DoorScreen
      key={picked.id}
      event={picked}
      picker={
        <div className="w-full md:w-[360px]">
          <Combobox
            id="door-event"
            options={all.map((e) => ({ value: e.id, label: e.name, sub: e.starts_at ? formatMomentShort(e.starts_at, e.timezone) : "No date yet" }))}
            value={picked.id}
            onValueChange={pick}
            placeholder="Search events"
            emptyText="No event by that name"
          />
        </div>
      }
    />
  );
}

function DoorPageScreen() {
  const organizationId = useOrganizationId();
  if (organizationId === undefined) return null;
  if (organizationId === null) return <NoOrganization what="Door" />;
  return <DoorView organizationId={organizationId} />;
}

export default function DoorPage() {
  return (
    <Suspense>
      <DoorPageScreen />
    </Suspense>
  );
}
