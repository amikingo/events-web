"use client";

import { useOrganizationId } from "@/app/admin/_components/organization-scope";
import { useOrganization } from "@/lib/organization-context";
import { OrganizationDashboard } from "./organization-dashboard";
import { PlatformDashboard } from "./platform-dashboard";

/**
 * Dashboard (menu-only module, address /dashboard, guarded by EVENTS). A platform role sees the platform overview
 * until it picks an organization; everyone else (and a platform role inside an organization) sees the organization's.
 */
export default function DashboardPage() {
  const organizationId = useOrganizationId();
  const { isPlatform, choices, clearOrganization } = useOrganization();
  if (organizationId === undefined) return null;
  if (organizationId === null) return isPlatform ? <PlatformDashboard /> : null;
  return (
    <OrganizationDashboard
      key={organizationId}
      organizationId={organizationId}
      organizationName={choices.find((o) => o.id === organizationId)?.name}
      onPlatformOverview={isPlatform ? clearOrganization : undefined}
    />
  );
}
