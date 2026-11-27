"use client";

import { useQuery } from "@tanstack/react-query";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { NoOrganization, useOrganizationId } from "@/app/admin/_components/organization-scope";
import { OrderPage, OrdersTab } from "@/app/admin/events/[[...slug]]/orders-tab";
import { ArrowUpRight, CalendarDays, Receipt, UserCheck, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardGrid } from "@/components/ui/card";
import { Combobox } from "@/components/ui/combobox";
import { EmptyState } from "@/components/ui/empty-state";
import { IconTile } from "@/components/ui/icon-tile";
import { KpiCard } from "@/components/ui/kpi-card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusPill } from "@/components/ui/status-pill";
import { describeApiError } from "@/lib/api/errors";
import { getEvent, listEvents } from "@/lib/api/events";
import type { StaffEvent } from "@/lib/api/events";
import { listOrders } from "@/lib/api/orders";
import { getRegistrationSummary } from "@/lib/api/registrations";
import { formatMomentShort } from "@/lib/ethiopian-datetime";
import { formatNumber } from "@/lib/format";
import { eventQk, orderQk, registrationQk } from "@/lib/query-keys";

const EVENT_PAGE = { page: 1, pageSize: 100 };

/** The chosen event at a glance: its orders, the tickets confirmed and the places left. */
function EventGlance({ event }: { event: StaffEvent }) {
  const orgId = event.organization_id;
  const orders = useQuery({ queryKey: orderQk.list(orgId, event.id, { page: 1, pageSize: 1 }), queryFn: ({ signal }) => listOrders(orgId, event.id, { page: 1, pageSize: 1 }, signal) });
  const summary = useQuery({ queryKey: registrationQk.summary(orgId, event.id), queryFn: ({ signal }) => getRegistrationSummary(orgId, event.id, signal) });
  const remaining = summary.data?.remaining ?? null;
  return (
    <CardGrid size="narrow">
      <KpiCard label="Orders" value={formatNumber(orders.data?.totalItems ?? 0)} icon={<Receipt />} iconTone="accent" loading={orders.isPending} />
      <KpiCard
        label="Tickets confirmed"
        value={formatNumber(summary.data?.confirmed ?? 0)}
        unit={summary.data?.capacity ? `of ${formatNumber(summary.data.capacity)}` : undefined}
        icon={<UserCheck />}
        iconTone="success"
        loading={summary.isPending}
      />
      <KpiCard label="Places left" value={remaining === null ? "No limit" : formatNumber(remaining)} icon={<Users />} iconTone={remaining === 0 ? "danger" : "charcoal"} loading={summary.isPending} />
    </CardGrid>
  );
}

/** One order, opened from the Orders page: `/admin/orders/{eventId}/{orderId}`. Back returns to the same event's orders. */
function OrderDetail({ organizationId, eventId, orderId }: { organizationId: string; eventId: string; orderId: string }) {
  const router = useRouter();
  const event = useQuery({ queryKey: eventQk.detail(organizationId, eventId), queryFn: ({ signal }) => getEvent(organizationId, eventId, signal) });
  const backHref = `/admin/orders?event=${encodeURIComponent(eventId)}`;
  if (event.isPending) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton shape="title" />
        <Skeleton shape="block" height={88} />
        <Skeleton shape="block" height={240} />
      </div>
    );
  }
  if (event.isError) {
    return (
      <EmptyState
        size="lg"
        tone="danger"
        title="We couldn't load this order's event"
        description={describeApiError(event.error, "event")}
        actions={<Button onClick={() => router.push(backHref)}>Back to orders</Button>}
      />
    );
  }
  return <OrderPage event={event.data} orderId={orderId} back={{ label: "Back to orders", href: backHref }} />;
}

/**
 * Orders across the organization's events, one event at a time. The API lists orders per event only (there is no
 * organization-wide order list yet), so the page asks which event first: the newest one, or the one in `?event=`.
 * The table is the event's own Orders tab; a row opens the order under the event.
 */
function OrdersView({ organizationId, eventFromPath }: { organizationId: string; eventFromPath?: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const events = useQuery({ queryKey: eventQk.list(organizationId, EVENT_PAGE), queryFn: ({ signal }) => listEvents(organizationId, EVENT_PAGE, signal) });
  const all = events.data?.data ?? [];
  // ?event= wins, then /admin/orders/{eventId} (the breadcrumb's "Event" crumb), then the newest event.
  const wanted = searchParams.get("event") ?? eventFromPath;
  const picked = all.find((e) => e.id === wanted) ?? all[0];

  // The chosen event lives in the address, so the page can be shared and reloaded on the same event.
  const pick = (id: string) => window.history.replaceState(null, "", `${pathname}?event=${encodeURIComponent(id)}`);

  return (
    <div className="flex w-full flex-col gap-6">
      {/* Title on the left, the event to look at on the right. */}
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-0.5">
          <h1 className="type-h1 m-0 text-text">Orders</h1>
          <p className="type-body m-0 text-text-soft">Tickets bought online and issued by staff, one event at a time.</p>
        </div>
        {all.length > 0 && (
          <div className="w-full md:w-[360px]">
            <Combobox
              id="orders-event"
              options={all.map((e) => ({ value: e.id, label: e.name, sub: e.starts_at ? formatMomentShort(e.starts_at, e.timezone) : "No date yet" }))}
              value={picked?.id ?? ""}
              onValueChange={pick}
              placeholder="Search events"
              emptyText="No event by that name"
            />
          </div>
        )}
      </div>

      {events.isError ? (
        <EmptyState size="lg" tone="danger" title="We couldn't load your events" description={describeApiError(events.error, "event")} />
      ) : events.isPending ? (
        <div className="flex flex-col gap-4">
          <Skeleton shape="block" height={88} />
          <Skeleton shape="block" height={320} />
        </div>
      ) : all.length === 0 || !picked ? (
        <EmptyState size="lg" icon={<Receipt />} title="No events yet" description="Orders appear here once an event takes registrations." />
      ) : (
        <>
          {/* The event in view: name, date, status, and a way into it. */}
          <Card>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <IconTile tone="accent" size="md">
                  <CalendarDays />
                </IconTile>
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="type-body flex flex-wrap items-center gap-2 font-semibold text-text">
                    {picked.name}
                    <StatusPill kind="event" status={picked.display_status} />
                  </span>
                  <span className="type-body-sm text-text-soft">{picked.starts_at ? formatMomentShort(picked.starts_at, picked.timezone) : "No date yet"}</span>
                </div>
              </div>
              <Button variant="secondary" onClick={() => router.push(`/admin/events/${picked.id}`)}>
                Open event
                <ArrowUpRight className="size-4" />
              </Button>
            </div>
          </Card>
          <EventGlance key={`glance-${picked.id}`} event={picked} />
          <OrdersTab key={picked.id} event={picked} orderHref={(o) => `/admin/orders/${picked.id}/${o.id}`} />
        </>
      )}
    </div>
  );
}

function OrdersScreen() {
  const organizationId = useOrganizationId();
  const pathname = usePathname();
  if (organizationId === undefined) return null;
  if (organizationId === null) return <NoOrganization what="Orders" />;
  // /admin/orders → the list; /admin/orders/{eventId}/{orderId} → one order.
  const [eventId, orderId] = pathname.replace(/^\/admin\/orders\/?/, "").split("/").filter(Boolean);
  if (eventId && orderId) return <OrderDetail organizationId={organizationId} eventId={eventId} orderId={orderId} />;
  return <OrdersView organizationId={organizationId} eventFromPath={eventId} />;
}

export default function OrdersPage() {
  return (
    <Suspense>
      <OrdersScreen />
    </Suspense>
  );
}
