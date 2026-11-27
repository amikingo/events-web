"use client";

import { useQueries, useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Banknote,
  Building2,
  CalendarDays,
  DoorOpen,
  FilePen,
  MapPin,
  Radio,
  Receipt,
  Ticket,
  UserRound,
  Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { RevenueCard, SourcesCard, TicketSalesCard } from "./sales-charts";
import { SampleCharts } from "./sample-charts";
import { useTicketReport } from "./use-ticket-report";
import { useModuleAccess } from "@/components/ability-provider";
import { ActionCard } from "@/components/ui/action-card";
import { Button } from "@/components/ui/button";
import { Card, CardGrid, CardLink } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { IconTile } from "@/components/ui/icon-tile";
import { KpiCard } from "@/components/ui/kpi-card";
import { ListCard } from "@/components/ui/list-card";
import { Pill } from "@/components/ui/pill";
import { StatusPill } from "@/components/ui/status-pill";
import { describeApiError } from "@/lib/api/errors";
import { listEvents } from "@/lib/api/events";
import type { StaffEvent } from "@/lib/api/events";
import { listPaymentCases, PAYMENT_CASE_KIND_LABEL } from "@/lib/api/payment-cases";
import { getRegistrationSummary } from "@/lib/api/registrations";
import type { RegistrationSummary } from "@/lib/api/registrations";
import { useAuth } from "@/lib/auth-context";
import { MODULE_CODES } from "@/lib/constants/modules";
import { formatMomentShort } from "@/lib/ethiopian-datetime";
import { formatNumber } from "@/lib/format";
import { formatPrice } from "@/lib/price";
import { eventQk, paymentCaseQk, registrationQk } from "@/lib/query-keys";

const EVENT_PAGE = { page: 1, pageSize: 100 };
const OPEN_CASES = { status: "OPEN" as const, page: 1, pageSize: 5 };
/** How many live and coming events get their sales figures. */
const SHOWN = 6;


const greetingFor = (hour: number) => (hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening");

/**
 * An organization's home, after bookings': a greeting, the organization in numbers, charts, what's live and coming up
 * with how it's selling, refunds waiting, drafts, and shortcuts to the pages this role can open. Real data, then a separate "More charts" section of labelled examples. A platform role also gets "Platform overview".
 */
export function OrganizationDashboard({ organizationId, organizationName, onPlatformOverview }: { organizationId: string; organizationName?: string; onPlatformOverview?: () => void }) {
  const router = useRouter();
  const { user, assignment } = useAuth();
  const { can } = useModuleAccess();
  const canGuests = can("read", MODULE_CODES.REGISTRATIONS);
  const canPayments = can("read", MODULE_CODES.PAYMENTS);
  const canEvents = can("read", MODULE_CODES.EVENTS);
  const [now] = useState(() => Date.now());
  const [hour] = useState(() => new Date().getHours());

  const events = useQuery({ queryKey: eventQk.list(organizationId, EVENT_PAGE), queryFn: ({ signal }) => listEvents(organizationId, EVENT_PAGE, signal), enabled: canEvents });
  const cases = useQuery({
    queryKey: paymentCaseQk.list(organizationId, OPEN_CASES),
    queryFn: ({ signal }) => listPaymentCases(organizationId, OPEN_CASES, signal),
    enabled: canPayments,
  });

  const all = events.data?.data ?? [];
  const live = all.filter((e) => e.display_status === "LIVE");
  const upcoming = all
    .filter((e) => e.status === "PUBLISHED" && e.display_status !== "LIVE" && e.starts_at && Date.parse(e.starts_at) > now)
    .sort((a, b) => Date.parse(a.starts_at!) - Date.parse(b.starts_at!));
  const drafts = all.filter((e) => e.status === "DRAFT");
  const shown = [...live, ...upcoming].slice(0, SHOWN);

  const summaries = useQueries({
    queries: shown.map((e) => ({
      queryKey: registrationQk.summary(organizationId, e.id),
      queryFn: ({ signal }: { signal: AbortSignal }) => getRegistrationSummary(organizationId, e.id, signal),
      enabled: canGuests,
    })),
  });
  const report = useTicketReport(all, canGuests);
  const summaryOf = new Map<string, RegistrationSummary | undefined>(shown.map((e, i) => [e.id, summaries[i]?.data]));
  const sold = summaries.reduce((sum, q) => sum + (q.data?.confirmed ?? 0), 0);
  const summariesLoading = canGuests && summaries.some((q) => q.isPending);

  const open = (e: StaffEvent) => router.push(`/admin/events/${e.id}`);
  const orgName = assignment?.organization?.name ?? organizationName ?? "your organization";

  // Shortcuts: only the pages this role can open.
  const shortcuts = [
    canEvents && { title: "Events", subtitle: "Create, publish, reschedule", href: "/admin/events", icon: <CalendarDays /> },
    canGuests && { title: "Guests", subtitle: "Everyone who registered", href: "/admin/guests", icon: <Users /> },
    canGuests && { title: "Orders", subtitle: "Tickets bought and issued", href: "/admin/orders", icon: <Receipt /> },
    can("update", MODULE_CODES.REGISTRATIONS) && { title: "Door", subtitle: "Scan tickets as guests arrive", href: "/admin/door", icon: <DoorOpen /> },
    canPayments && { title: "Payments", subtitle: "Refunds and payment problems", href: "/admin/payments", icon: <Banknote /> },
    canEvents && { title: "Venues", subtitle: "Where events happen", href: "/admin/venues", icon: <MapPin /> },
    { title: "My profile", subtitle: "Your name and password", href: "/admin/settings", icon: <UserRound /> },
  ].filter((s): s is { title: string; subtitle: string; href: string; icon: React.JSX.Element } => Boolean(s));

  return (
    <div className="flex w-full flex-col gap-5">
      {/* Who you are here and the main actions. */}
      <Card className="overflow-hidden p-0">
        <div className="flex flex-col gap-4 bg-[linear-gradient(120deg,var(--color-accent-soft),var(--color-surface)_60%)] p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-2">
            <div>
              <Pill tone="accent" size="sm">
                <Building2 className="mr-1 inline size-3.5" />
                {orgName}
              </Pill>
            </div>
            <h1 className="type-h1 m-0 text-text">
              {greetingFor(hour)}, {user?.firstname || "there"}
            </h1>
            <p className="type-body m-0 max-w-2xl text-text-soft">Here&apos;s how your events are doing: what&apos;s live, what&apos;s selling and what needs you.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {onPlatformOverview && (
              <Button variant="secondary" onClick={onPlatformOverview}>
                <ArrowLeft className="size-4" />
                Platform overview
              </Button>
            )}
            {can("update", MODULE_CODES.REGISTRATIONS) && live.length > 0 && (
              <Button variant="secondary" onClick={() => router.push(`/admin/door?event=${live[0]!.id}`)}>
                <Radio className="size-4" />
                Open the door
              </Button>
            )}
            {can("create", MODULE_CODES.EVENTS) && <Button onClick={() => router.push("/admin/events/new")}>New event</Button>}
          </div>
        </div>
      </Card>

      {events.isError ? (
        <EmptyState size="lg" tone="danger" title="We couldn't load your events" description={describeApiError(events.error, "event")} actions={<Button onClick={() => void events.refetch()}>Try again</Button>} />
      ) : (
        <>
          {/* The organization in numbers (real). */}
          {canEvents && (
            <CardGrid size="narrow">
              <KpiCard label="Live now" value={formatNumber(live.length)} icon={<Radio />} iconTone={live.length ? "success" : "charcoal"} loading={events.isPending} />
              <KpiCard label="Coming up" value={formatNumber(upcoming.length)} icon={<CalendarDays />} iconTone="accent" loading={events.isPending} />
              {canGuests && (
                <KpiCard
                  label="Tickets, next events"
                  value={formatNumber(sold)}
                  unit={shown.length ? `across ${shown.length}` : undefined}
                  icon={<Ticket />}
                  iconTone="charcoal"
                  loading={events.isPending || summariesLoading}
                />
              )}
              {canPayments && (
                <KpiCard
                  label="Refunds waiting"
                  value={formatNumber(cases.data?.totalItems ?? 0)}
                  icon={<Banknote />}
                  iconTone={(cases.data?.totalItems ?? 0) > 0 ? "warning" : "charcoal"}
                  loading={cases.isPending}
                />
              )}
              {!canPayments && <KpiCard label="Drafts" value={formatNumber(drafts.length)} icon={<FilePen />} iconTone="charcoal" loading={events.isPending} />}
            </CardGrid>
          )}

          {/* Sales (from the guest lists, so only with Guests access), what's coming, and only the lists with something in them. */}
          {canEvents && (
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
              {canGuests && <TicketSalesCard className="xl:col-span-2" report={report} />}
              {canGuests && <SourcesCard report={report} />}
              <div className="min-w-0 xl:col-span-2">
                <ListCard
                  className="h-full"
                  title="Live and coming up"
                  subtitle={shown.length ? "How each event is selling." : "Published events with a date appear here."}
                  action={<CardLink onClick={() => router.push("/admin/events")}>All events</CardLink>}
                  loading={events.isPending}
                  rows={shown.slice(0, 4).map((e) => {
                    const sum = summaryOf.get(e.id);
                    return {
                      leading: (
                        <IconTile tone="accent" size="sm">
                          <CalendarDays />
                        </IconTile>
                      ),
                      name: (
                        <button type="button" className="truncate text-left hover:underline" onClick={() => open(e)}>
                          {e.name}
                        </button>
                      ),
                      meta: e.starts_at ? formatMomentShort(e.starts_at, e.timezone) : "No date yet",
                      amount: !canGuests ? undefined : sum ? `${formatNumber(sum.confirmed)}${sum.capacity ? ` of ${formatNumber(sum.capacity)}` : ""} sold` : "…",
                      status: <StatusPill kind="event" status={e.display_status} />,
                    };
                  })}
                />
              </div>
              {canGuests && <RevenueCard report={report} />}
            </div>
          )}

          {canEvents && ((cases.data?.totalItems ?? 0) > 0 || drafts.length > 0) && (
            <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-2">
              {canPayments && (cases.data?.totalItems ?? 0) > 0 && (
                <ListCard
                  title="Refunds waiting"
                  subtitle="Move the money in Cheche Pay, then record it."
                  action={<CardLink onClick={() => router.push("/admin/payments")}>Open payments</CardLink>}
                  rows={(cases.data?.data ?? []).map((c) => ({
                    leading: (
                      <IconTile tone="warning" size="sm">
                        <Banknote />
                      </IconTile>
                    ),
                    name: (
                      <button type="button" className="truncate text-left hover:underline" onClick={() => router.push(`/admin/payments/${c.id}`)}>
                        {PAYMENT_CASE_KIND_LABEL[c.kind]}
                      </button>
                    ),
                    meta: all.find((e) => e.id === c.event_id)?.name ?? "An event",
                    amount: formatPrice(c.amount, c.currency),
                  }))}
                />
              )}
              {drafts.length > 0 && (
                <ListCard
                  title="Drafts"
                  subtitle="Not on sale yet. Publish them when they're ready."
                  rows={drafts.slice(0, 5).map((e) => ({
                    leading: (
                      <IconTile tone="charcoal" size="sm">
                        <FilePen />
                      </IconTile>
                    ),
                    name: (
                      <button type="button" className="truncate text-left hover:underline" onClick={() => open(e)}>
                        {e.name}
                      </button>
                    ),
                    meta: e.starts_at ? formatMomentShort(e.starts_at, e.timezone) : "No date yet",
                  }))}
                />
              )}
            </div>
          )}

          {canEvents && <SampleCharts scope="organization" />}

          {/* Shortcuts to the pages this role can open; a role without events gets these as its home. */}
          <section className="flex flex-col gap-3">
            <div className="flex flex-col gap-0.5">
              <h2 className="type-h3 m-0 text-text">{canEvents ? "Shortcuts" : "Your pages"}</h2>
              <p className="type-body-sm m-0 text-text-soft">{canEvents ? "Where the day's work happens." : "What your role can open."}</p>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {shortcuts.map((s) => (
                <ActionCard key={s.href} icon={s.icon} title={s.title} subtitle={s.subtitle} onClick={() => router.push(s.href)} />
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
