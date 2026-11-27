"use client";

import { useQueries, useQuery } from "@tanstack/react-query";
import { Blocks, Building2, CalendarDays, LayoutTemplate, ShieldCheck, UserCog, UserRound, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useModuleAccess } from "@/components/ability-provider";
import { ActionCard } from "@/components/ui/action-card";
import { Button } from "@/components/ui/button";
import { CardGrid, CardLink } from "@/components/ui/card";
import { IconTile } from "@/components/ui/icon-tile";
import { KpiCard } from "@/components/ui/kpi-card";
import { ListCard } from "@/components/ui/list-card";
import { StatusPill } from "@/components/ui/status-pill";
import { listEvents } from "@/lib/api/events";
import { listPlatformStaff } from "@/lib/api/platform";
import { useAuth } from "@/lib/auth-context";
import { MODULE_CODES } from "@/lib/constants/modules";
import { formatNumber } from "@/lib/format";
import { useOrganization } from "@/lib/organization-context";
import { eventQk, platformStaffQk } from "@/lib/query-keys";
import { RevenueCard, SourcesCard, TicketSalesCard } from "./sales-charts";
import { SampleCharts } from "./sample-charts";
import { useTicketReport } from "./use-ticket-report";

const PLATFORM_STAFF = { page: 1, pageSize: 1 };
/** How many organizations get their event count. */
const COUNTED = 50;
/** How many organizations the list shows. */
const LISTED = 4;


const greetingFor = (hour: number) => (hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening");

/** The Super Admin's home: the platform in numbers, sales, the organizations and shortcuts. About one screen. */
export function PlatformDashboard() {
  const router = useRouter();
  const { user } = useAuth();
  const { can } = useModuleAccess();
  const { choices, selectOrganization } = useOrganization();
  const [hour] = useState(() => new Date().getHours());

  const staff = useQuery({ queryKey: platformStaffQk.list(PLATFORM_STAFF), queryFn: ({ signal }) => listPlatformStaff(PLATFORM_STAFF, signal) });
  const counted = choices.slice(0, COUNTED);
  const eventCounts = useQueries({
    queries: counted.map((o) => ({
      queryKey: eventQk.list(o.id, { page: 1, pageSize: 100 }),
      queryFn: ({ signal }: { signal: AbortSignal }) => listEvents(o.id, { page: 1, pageSize: 100 }, signal),
    })),
  });
  const eventsOf = new Map(counted.map((o, i) => [o.id, eventCounts[i]?.data?.totalItems]));
  // Tickets and revenue across every organization, from their events' guest lists.
  const report = useTicketReport(eventCounts.flatMap((q) => q.data?.data ?? []), true);
  const active = choices.filter((o) => o.is_active).length;
  const totalEvents = eventCounts.reduce((sum, q) => sum + (q.data?.totalItems ?? 0), 0);
  const busiest = [...choices].sort((a, b) => (eventsOf.get(b.id) ?? 0) - (eventsOf.get(a.id) ?? 0)).slice(0, LISTED);

  const shortcuts = [
    { title: "Organizations", subtitle: "Create, edit, switch off", href: "/admin/organizations", icon: <Building2 /> },
    { title: "Platform staff", subtitle: "Who runs the platform", href: "/admin/platform/staff", icon: <Users /> },
    { title: "Platform roles", subtitle: "What platform staff can do", href: "/admin/platform/roles", icon: <ShieldCheck /> },
    { title: "Role templates", subtitle: "Ready-made roles for organizations", href: "/admin/access/role-templates", icon: <LayoutTemplate /> },
    { title: "Modules", subtitle: "The menu and its permissions", href: "/admin/access/modules", icon: <Blocks /> },
    { title: "My profile", subtitle: "Your name and password", href: "/admin/settings", icon: <UserRound /> },
  ];

  return (
    <div className="flex w-full flex-col gap-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-0.5">
          <h1 className="type-h1 m-0 text-text">
            {greetingFor(hour)}, {user?.firstname || "there"}
          </h1>
          <p className="type-body m-0 text-text-soft">The whole platform at a glance.</p>
        </div>
        {can("create", MODULE_CODES.ORGANIZATIONS) && <Button onClick={() => router.push("/admin/organizations/new")}>New organization</Button>}
      </div>

      <CardGrid size="narrow">
        <KpiCard label="Organizations" value={formatNumber(choices.length)} icon={<Building2 />} iconTone="accent" />
        <KpiCard label="Active" value={formatNumber(active)} icon={<ShieldCheck />} iconTone="success" />
        <KpiCard label="Events" value={formatNumber(totalEvents)} icon={<CalendarDays />} iconTone="charcoal" loading={eventCounts.some((q) => q.isPending)} />
        {!staff.isError && <KpiCard label="Platform team" value={formatNumber(staff.data?.totalItems ?? 0)} icon={<UserCog />} iconTone="charcoal" loading={staff.isPending} />}
      </CardGrid>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <TicketSalesCard className="xl:col-span-2" report={report} />
        <SourcesCard report={report} />
        <div className="min-w-0 xl:col-span-2">
          <ListCard
            className="h-full"
            title="Organizations"
            subtitle="Busiest first. Open one to see its dashboard."
            action={<CardLink onClick={() => router.push("/admin/organizations")}>Manage</CardLink>}
            rows={busiest.map((o) => ({
              leading: (
                <IconTile tone={o.is_active ? "accent" : "charcoal"} size="sm">
                  <Building2 />
                </IconTile>
              ),
              name: (
                <button type="button" className="truncate text-left hover:underline" onClick={() => selectOrganization(o.id)}>
                  {o.name}
                </button>
              ),
              meta: `events/${o.slug}`,
              amount: eventsOf.get(o.id) === undefined ? "…" : `${formatNumber(eventsOf.get(o.id)!)} ${eventsOf.get(o.id) === 1 ? "event" : "events"}`,
              status: <StatusPill kind="account" status={o.is_active ? "active" : "inactive"} />,
            }))}
          />
        </div>
        <RevenueCard report={report} />
      </div>

      <SampleCharts scope="platform" />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {shortcuts.map((s) => (
          <ActionCard key={s.href} icon={s.icon} title={s.title} subtitle={s.subtitle} onClick={() => router.push(s.href)} />
        ))}
      </div>
    </div>
  );
}
